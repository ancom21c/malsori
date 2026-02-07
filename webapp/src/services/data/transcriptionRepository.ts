import { liveQuery } from "dexie";
import { v4 as uuid } from "uuid";
import { appDb } from "../../data/app-db";
import type {
  LocalTranscription,
  LocalTranscriptionKind,
  LocalWordTiming,
} from "../../data/app-db";
import { normalizeSearchText, extractSearchTokens, buildCharNgrams } from "../../utils/textIndexing";

async function upsertTranscriptionSearchIndex(
  transcriptionId: string,
  transcriptText: string | undefined
) {
  const normalized = normalizeSearchText(transcriptText);
  if (!normalized) {
    await appDb.searchIndexes.delete(transcriptionId);
    return;
  }
  const now = new Date().toISOString();
  const tokenSet = extractSearchTokens(normalized);
  const ngramSet = buildCharNgrams(normalized, 3);
  await appDb.searchIndexes.put({
    transcriptionId,
    normalizedTranscript: normalized,
    tokenSet,
    ngramSet,
    updatedAt: now,
  });
}

type TranscriptionMetadataPatch = Partial<
  Pick<
    LocalTranscription,
    | "processingStage"
    | "configSnapshotJson"
    | "sourceFileName"
    | "sourceFileMimeType"
    | "sourceFileSize"
    | "sourceFileStorageState"
    | "sourceFileChunkCount"
    | "sourceFileStoredBytes"
    | "configPresetId"
    | "configPresetName"
    | "modelName"
    | "backendEndpointId"
    | "backendEndpointName"
    | "backendEndpointSource"
    | "backendDeployment"
    | "backendApiBaseUrl"
  >
>;

export function listTranscriptionsQuery() {
  return liveQuery(async () => {
    const records = await appDb.transcriptions
      .orderBy("createdAt")
      .reverse()
      .toArray();
    return records;
  });
}

export async function createLocalTranscription(params: {
  title: string;
  kind: LocalTranscriptionKind;
  status?: LocalTranscription["status"];
  remoteId?: string;
  metadata?: TranscriptionMetadataPatch;
}): Promise<LocalTranscription> {
  const id = uuid();
  const now = new Date().toISOString();
  const normalizedTitle = normalizeSearchText(params.title);
  const record: LocalTranscription = {
    id,
    title: params.title,
    kind: params.kind,
    status: params.status ?? "pending",
    remoteId: params.remoteId,
    createdAt: now,
    updatedAt: now,
    searchTitle: normalizedTitle,
    ...params.metadata,
  };
  await appDb.transcriptions.put(record);
  await upsertTranscriptionSearchIndex(id, record.transcriptText);
  return record;
}

export async function updateLocalTranscription(
  id: string,
  patch: Partial<LocalTranscription>
) {
  const now = new Date().toISOString();
  await appDb.transaction("rw", appDb.transcriptions, appDb.searchIndexes, async () => {
    const existing = await appDb.transcriptions.get(id);
    if (!existing) return;
    const nextRecord: LocalTranscription = { ...existing, ...patch } as LocalTranscription;
    const updates: Partial<LocalTranscription> = { ...patch, updatedAt: now };
    if (patch.title !== undefined || (!existing.searchTitle && nextRecord.title)) {
      updates.searchTitle = normalizeSearchText(nextRecord.title);
    }
    if (patch.transcriptText !== undefined || (!existing.searchTranscript && nextRecord.transcriptText)) {
      updates.searchTranscript = normalizeSearchText(nextRecord.transcriptText);
    }
    await appDb.transcriptions.update(id, updates);
    if (patch.transcriptText !== undefined) {
      await upsertTranscriptionSearchIndex(id, nextRecord.transcriptText);
    }
  });
}

export async function deleteTranscription(id: string) {
  await appDb.transaction(
    "rw",
    [
      appDb.transcriptions,
      appDb.segments,
      appDb.audioChunks,
      appDb.videoChunks,
      appDb.searchIndexes,
    ],
    async () => {
      await appDb.audioChunks.where("transcriptionId").equals(id).delete();
      await appDb.videoChunks.where("transcriptionId").equals(id).delete();
      await appDb.segments.where("transcriptionId").equals(id).delete();
      await appDb.searchIndexes.delete(id);
      await appDb.transcriptions.delete(id);
    }
  );
}

export async function deleteRealtimeArtifacts(transcriptionId: string) {
  await appDb.audioChunks.where("transcriptionId").equals(transcriptionId).delete();
  await appDb.videoChunks.where("transcriptionId").equals(transcriptionId).delete();
}

type ReplaceableWord = {
  text: string;
  startMs?: number | null;
  endMs?: number | null;
  confidence?: number;
};

type ReplaceableSegment = {
  spk?: string;
  speaker_label?: string;
  language?: string;
  startMs?: number | null;
  endMs?: number | null;
  text: string;
  isPartial?: boolean;
  isFinal?: boolean;
  correctedText?: string;
  words?: ReplaceableWord[];
};

type ReplaceSegmentsOptions = {
  preserveCorrections?: boolean;
};

function normalizeTimestamp(value?: number | null): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  return undefined;
}

function normalizeWordTiming(word?: ReplaceableWord | null): LocalWordTiming | null {
  const text = (word?.text ?? "").trim();
  if (!text) {
    return null;
  }
  const start = normalizeTimestamp(word?.startMs);
  const end = normalizeTimestamp(word?.endMs);
  const startMs = start ?? 0;
  const endMs = end ?? startMs;
  return {
    text,
    startMs,
    endMs,
    confidence: typeof word?.confidence === "number" ? word?.confidence : undefined,
  };
}

function normalizeSegmentMatchText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildSegmentCorrectionLookupKeys(input: {
  startMs?: number | null;
  endMs?: number | null;
  text: string;
}): string[] {
  const normalizedText = normalizeSegmentMatchText(input.text);
  if (!normalizedText) {
    return [];
  }
  const start = normalizeTimestamp(input.startMs);
  const end = normalizeTimestamp(input.endMs);
  const keys: string[] = [];
  if (start !== undefined && end !== undefined) {
    keys.push(`${start}:${end}:${normalizedText}`);
  }
  if (start !== undefined) {
    keys.push(`${start}:*:${normalizedText}`);
  }
  if (end !== undefined) {
    keys.push(`*:${end}:${normalizedText}`);
  }
  keys.push(`*:*:${normalizedText}`);
  return keys;
}

export async function replaceSegments(
  transcriptionId: string,
  segments: ReplaceableSegment[],
  options?: ReplaceSegmentsOptions
) {
  await appDb.transaction("rw", appDb.segments, async () => {
    const correctionByKey = new Map<string, string>();
    if (options?.preserveCorrections) {
      const existingSegments = await appDb.segments
        .where("transcriptionId")
        .equals(transcriptionId)
        .toArray();
      for (const existing of existingSegments) {
        const corrected = existing.correctedText?.trim();
        if (!corrected) {
          continue;
        }
        const keys = buildSegmentCorrectionLookupKeys({
          startMs: existing.startMs,
          endMs: existing.endMs,
          text: existing.text,
        });
        for (const key of keys) {
          if (!correctionByKey.has(key)) {
            correctionByKey.set(key, corrected);
          }
        }
      }
    }

    await appDb.segments.where("transcriptionId").equals(transcriptionId).delete();
    const now = new Date().toISOString();
    if (segments.length > 0) {
      await appDb.segments.bulkAdd(
        segments.map((segment, index) => {
          const normalizedStart = normalizeTimestamp(segment.startMs);
          const normalizedEnd = normalizeTimestamp(segment.endMs);
          const words =
            segment.words && segment.words.length > 0
              ? segment.words
                .map((word) => normalizeWordTiming(word))
                .filter((word): word is LocalWordTiming => Boolean(word))
                .sort((a, b) => a.startMs - b.startMs)
              : undefined;
          const fallbackStartFromWords = words && words.length > 0 ? words[0].startMs : undefined;
          const fallbackEndFromWords = words && words.length > 0 ? words[words.length - 1].endMs : undefined;
          const derivedStart = normalizedStart ?? fallbackStartFromWords ?? 0;
          const derivedEnd = normalizedEnd ?? fallbackEndFromWords ?? derivedStart;
          const hasTiming =
            normalizedStart !== undefined ||
            normalizedEnd !== undefined ||
            Boolean(fallbackStartFromWords !== undefined || fallbackEndFromWords !== undefined);
          const correctionKeys = buildSegmentCorrectionLookupKeys({
            startMs: derivedStart,
            endMs: derivedEnd,
            text: segment.text,
          });
          const preservedCorrection = options?.preserveCorrections
            ? correctionKeys.map((key) => correctionByKey.get(key)).find((value): value is string => Boolean(value))
            : undefined;
          return {
            id: `${transcriptionId}-segment-${index}`,
            transcriptionId,
            spk: segment.spk,
            speaker_label: segment.speaker_label,
            language: segment.language,
            startMs: derivedStart,
            endMs: derivedEnd,
            text: segment.text,
            isPartial: segment.isPartial,
            isFinal: segment.isFinal,
            correctedText: segment.correctedText ?? preservedCorrection,
            hasTiming,
            words,
            createdAt: now,
          };
        })
      );
    }
  });
}

export async function updateSegmentCorrection(
  segmentId: string,
  correctedText: string | null,
  updatedWords?: LocalWordTiming[]
) {
  const value = correctedText && correctedText.length > 0 ? correctedText : undefined;
  const patch: { correctedText?: string; words?: LocalWordTiming[] } = { correctedText: value };
  if (updatedWords) {
    patch.words = updatedWords;
  }
  await appDb.segments.update(segmentId, patch);
}

export async function updateSegmentSpeakerLabel(
  transcriptionId: string,
  targetSpk: string,
  newLabel: string
) {
  const normalizedNewLabel = newLabel.trim();
  if (!normalizedNewLabel) return;

  await appDb.transaction("rw", appDb.segments, async () => {
    const segments = await appDb.segments
      .where("transcriptionId")
      .equals(transcriptionId)
      .toArray();

    const targets = segments.filter((s) => (s.spk ?? "0") === targetSpk);
    for (const segment of targets) {
      await appDb.segments.update(segment.id, { speaker_label: normalizedNewLabel });
    }
  });
}

export async function updateSingleSegmentSpeakerLabel(
  segmentId: string,
  newLabel: string,
  newSpkId: string
) {
  const normalizedNewLabel = newLabel.trim();
  if (!normalizedNewLabel) return;
  await appDb.segments.update(segmentId, { speaker_label: normalizedNewLabel, spk: newSpkId });
}

export async function appendAudioChunk(params: {
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
  role?: "capture" | "source_file";
}) {
  const now = new Date().toISOString();
  const role = params.role ?? "capture";
  const idPrefix = role === "source_file" ? "source" : "chunk";
  await appDb.audioChunks.put({
    id: `${params.transcriptionId}-${idPrefix}-${params.chunkIndex}`,
    transcriptionId: params.transcriptionId,
    chunkIndex: params.chunkIndex,
    data: params.data,
    mimeType: params.mimeType,
    role,
    createdAt: now,
  });
}

export async function deleteAudioChunksByRole(
  transcriptionId: string,
  role: "capture" | "source_file"
) {
  await appDb.transaction("rw", appDb.audioChunks, async () => {
    const chunks = await appDb.audioChunks.where("transcriptionId").equals(transcriptionId).toArray();
    const targetIds = chunks
      .filter((chunk) => {
        if (role === "capture") {
          return chunk.role === "capture" || chunk.role === undefined;
        }
        return chunk.role === role;
      })
      .map((chunk) => chunk.id);
    if (targetIds.length > 0) {
      await appDb.audioChunks.bulkDelete(targetIds);
    }
  });
}

export async function listAudioChunks(
  transcriptionId: string,
  options?: { role?: "capture" | "source_file" }
) {
  const chunks = await appDb.audioChunks
    .where("transcriptionId")
    .equals(transcriptionId)
    .sortBy("chunkIndex");
  if (!options?.role) {
    return chunks;
  }
  if (options.role === "capture") {
    return chunks.filter((chunk) => chunk.role === "capture" || chunk.role === undefined);
  }
  return chunks.filter((chunk) => chunk.role === options.role);
}

export async function appendVideoChunk(params: {
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
}) {
  const now = new Date().toISOString();
  await appDb.videoChunks.put({
    id: `${params.transcriptionId}-video-${params.chunkIndex}`,
    transcriptionId: params.transcriptionId,
    chunkIndex: params.chunkIndex,
    data: params.data,
    mimeType: params.mimeType,
    createdAt: now,
  });
}

export async function listVideoChunks(transcriptionId: string) {
  return await appDb.videoChunks
    .where("transcriptionId")
    .equals(transcriptionId)
    .sortBy("chunkIndex");
}
