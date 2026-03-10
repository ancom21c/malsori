import type { LocalSegment, LocalTranscription } from "../data/app-db";
import {
  createDefaultSessionArtifacts,
  mapLocalSegmentToSessionTurn,
  mapLocalTranscriptionToSessionRecord,
  type ArtifactStatus,
  type ArtifactType,
  type SessionArtifact,
  type SessionMode,
  type SessionTurn,
} from "../domain/session";

export interface SessionWorkspaceView {
  record: ReturnType<typeof mapLocalTranscriptionToSessionRecord>;
  turns: SessionTurn[];
  artifacts: SessionArtifact[];
  speakerCount: number;
  languageCodes: string[];
  summaryPreview: string | null;
}

function normalizeTextQuery(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLanguageCode(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizePreviewText(value: string | undefined) {
  const normalized = value
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!normalized) {
    return null;
  }

  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

export function buildSessionWorkspaceView(
  transcription: LocalTranscription,
  segments: LocalSegment[]
): SessionWorkspaceView {
  const turns = segments
    .map(mapLocalSegmentToSessionTurn)
    .sort((left, right) => left.startMs - right.startMs);

  const speakerTokens = new Set(
    turns
      .map((turn) => turn.speakerLabel?.trim() || turn.speakerId?.trim())
      .filter((value): value is string => Boolean(value && value.length))
  );

  const languageCodes = Array.from(
    new Set(
      turns
        .map((turn) => normalizeLanguageCode(turn.sourceLanguage))
        .filter((value): value is string => Boolean(value))
    )
  );

  const record = {
    ...mapLocalTranscriptionToSessionRecord(transcription),
    speakerCount: speakerTokens.size || undefined,
  };

  const summaryPreview =
    normalizePreviewText(transcription.transcriptText) ??
    normalizePreviewText(turns.map((turn) => turn.text).join("\n"));

  return {
    record,
    turns,
    artifacts: createDefaultSessionArtifacts(transcription.id),
    speakerCount: speakerTokens.size,
    languageCodes,
    summaryPreview,
  };
}

export function filterLocalSegmentsBySessionQuery(
  segments: LocalSegment[],
  query: string
) {
  const normalizedQuery = normalizeTextQuery(query);

  if (!normalizedQuery) {
    return segments;
  }

  return segments.filter((segment) => {
    const text = (
      segment.correctedText?.trim() ||
      segment.rawText?.trim() ||
      segment.text
    ).toLowerCase();
    const speaker = segment.speaker_label?.trim().toLowerCase() ?? "";
    const language = segment.language?.trim().toLowerCase() ?? "";
    return (
      text.includes(normalizedQuery) ||
      speaker.includes(normalizedQuery) ||
      language.includes(normalizedQuery)
    );
  });
}

export function formatSessionDurationLabel(durationMs: number | undefined) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatSessionLanguageSummary(languageCodes: string[]) {
  if (languageCodes.length === 0) {
    return null;
  }
  if (languageCodes.length <= 2) {
    return languageCodes.map((code) => code.toUpperCase()).join(" · ");
  }
  return `${languageCodes[0].toUpperCase()} +${languageCodes.length - 1}`;
}

export function getSessionModeLabelKey(mode: SessionMode) {
  switch (mode) {
    case "capture_file":
      return "fileTranscription";
    case "capture_realtime":
      return "realTimeTranscription";
    case "translate_realtime":
      return "realTimeTranslation";
  }
}

export function getArtifactTitleKey(type: ArtifactType) {
  switch (type) {
    case "summary":
      return "summary";
    case "action_items":
      return "actionItems";
    case "key_terms":
      return "keyTerms";
    case "qa":
      return "askTranscript";
  }
}

export function getArtifactStatusKey(status: ArtifactStatus) {
  switch (status) {
    case "pending":
      return "artifactPending";
    case "ready":
      return "artifactReady";
    case "failed":
      return "artifactFailed";
    case "not_requested":
      return "artifactNotRequested";
  }
}
