import Dexie from "dexie";
import type { Table } from "dexie";

export type LocalTranscriptionKind = "file" | "realtime";
export type LocalSttTransport = "batch" | "streaming";
export type LocalCaptureInput = "uploaded_file" | "microphone";

export type BackendEndpointDeployment = "cloud" | "onprem";

export interface LocalTranscription {
  id: string;
  title: string;
  kind: LocalTranscriptionKind;
  status: "pending" | "processing" | "completed" | "failed";
  processingStage?: "idle" | "connecting" | "recording" | "paused" | "finalizing" | "saving";
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
  durationMs?: number;
  audioBlobKey?: string;
  audioSampleRate?: number;
  audioChannels?: number;
  remoteAudioUrl?: string;
  errorMessage?: string;
  transcriptText?: string;
  sttTransport?: LocalSttTransport;
  captureInput?: LocalCaptureInput;
  configSnapshotJson?: string;
  configPresetId?: string;
  configPresetName?: string;
  modelName?: string;
  backendEndpointId?: string | null;
  backendEndpointName?: string;
  backendEndpointSource?: "preset" | "server-default" | "unknown";
  backendDeployment?: BackendEndpointDeployment;
  backendApiBaseUrl?: string;
  upstreamStatusRaw?: string;
  upstreamStatusReason?: "unknown_upstream_status";
  realtimeBufferedAudioMs?: number;
  realtimeDroppedAudioMs?: number;
  realtimeReplayedAudioMs?: number;
  realtimeDroppedAudioRatio?: number;
  realtimeQualityState?: "normal" | "degraded";
  realtimeSimulationEnabled?: boolean;
  searchTitle?: string;
  searchTranscript?: string;
  isCloudSynced?: boolean;
  downloadStatus?: "not_downloaded" | "downloading" | "downloaded";
  lastSyncedAt?: string;
  syncRetryCount?: number;
  nextSyncAttemptAt?: string;
  syncErrorMessage?: string;
  sourceFileName?: string;
  sourceFileMimeType?: string;
  sourceFileSize?: number;
  sourceFileStorageState?: "pending" | "ready" | "failed";
  sourceFileChunkCount?: number;
  sourceFileStoredBytes?: number;
}

export interface LocalWordTiming {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface LocalSegment {
  id: string;
  transcriptionId: string;
  spk?: string;
  speaker_label?: string;
  language?: string;
  startMs: number;
  endMs: number;
  text: string;
  rawText?: string;
  correctedText?: string;
  isPartial?: boolean;
  isFinal?: boolean;
  hasTiming?: boolean;
  words?: LocalWordTiming[];
  createdAt: string;
}

export interface LocalAudioChunk {
  id: string;
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
  role?: "capture" | "source_file";
  createdAt: string;
}

export interface LocalVideoChunk {
  id: string;
  transcriptionId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  mimeType?: string;
  createdAt: string;
}

export interface PresetConfig {
  id: string;
  type: "file" | "streaming";
  name: string;
  description?: string;
  configJson: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackendEndpointPreset {
  id: string;
  name: string;
  description?: string;
  deployment: BackendEndpointDeployment;
  apiBaseUrl: string;
  clientId?: string;
  clientSecret?: string;
  verifySsl?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface TranscriptionSearchIndex {
  transcriptionId: string;
  normalizedTranscript?: string;
  tokenSet?: string[];
  ngramSet?: string[];
  updatedAt: string;
}

export type LocalSummaryMode = "realtime" | "full";

export type LocalSummaryPartitionStatus = "draft" | "finalized" | "stale";

export type LocalSummaryPartitionReason =
  | "manual"
  | "silence_gap"
  | "speaker_shift"
  | "topic_shift"
  | "max_turns"
  | "max_duration"
  | "token_budget"
  | "session_end";

export type LocalSummaryRunScope = "partition" | "session";

export type LocalSummaryRunStatus = "pending" | "ready" | "failed";

export type LocalSummaryFreshness = "fresh" | "stale";

export type LocalSummaryPresetSelectionSource = "default" | "auto" | "manual";

export type LocalSummaryPresetApplyScope = "from_now" | "regenerate_all";

export interface LocalSummarySupportingSnippet {
  id: string;
  turnId?: string;
  speakerLabel?: string;
  startMs?: number;
  endMs?: number;
  text: string;
}

export interface LocalSummaryBlock {
  id: string;
  kind: string;
  title?: string;
  content: string;
  supportingSnippets: LocalSummarySupportingSnippet[];
}

export interface LocalSummaryPartition {
  id: string;
  sessionId: string;
  startTurnId: string;
  endTurnId: string;
  turnIds?: string[];
  turnCount: number;
  startedAt: string;
  endedAt: string;
  status: LocalSummaryPartitionStatus;
  reason: LocalSummaryPartitionReason;
  sourceRevision: string;
  staleReason?:
    | "late_final_turn"
    | "segment_correction"
    | "speaker_relabel"
    | "partition_boundary_change"
    | null;
  staleAt?: string | null;
}

export interface LocalSummaryRun {
  id: string;
  sessionId: string;
  mode: LocalSummaryMode;
  scope: LocalSummaryRunScope;
  regenerationScope?: "partition" | "mode" | "session" | null;
  trigger?:
    | "realtime_batch"
    | "session_ready"
    | "manual_regenerate"
    | "manual_retry"
    | "preset_apply_from_now"
    | "preset_rerun_all"
    | null;
  partitionIds: string[];
  presetId?: string;
  presetVersion?: string;
  selectionSource: LocalSummaryPresetSelectionSource;
  providerLabel?: string;
  model?: string;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  timeoutMs?: number | null;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  } | null;
  fallbackBackendProfileId?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  status: LocalSummaryRunStatus;
  errorMessage?: string | null;
  blocks: LocalSummaryBlock[];
}

export interface LocalPublishedSummary {
  id: string;
  sessionId: string;
  mode: LocalSummaryMode;
  runId: string;
  title: string;
  content: string;
  requestedAt?: string | null;
  updatedAt: string;
  providerLabel?: string;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  partitionIds: string[];
  supportingSnippets: LocalSummarySupportingSnippet[];
  blocks: LocalSummaryBlock[];
  freshness: LocalSummaryFreshness;
  stalePartitionIds: string[];
  staleReason?:
    | "late_final_turn"
    | "segment_correction"
    | "speaker_relabel"
    | "partition_boundary_change"
    | null;
  staleAt?: string | null;
}

export interface LocalSummaryPresetSuggestion {
  suggestedPresetId: string;
  appliedPresetId: string;
  confidence: number;
  reason: string;
  evaluatedTurnStartTurnId?: string | null;
  evaluatedTurnEndTurnId?: string | null;
  createdAt: string;
  fallbackApplied: boolean;
}

export interface LocalSummaryPresetSelection {
  sessionId: string;
  selectedPresetId: string;
  selectedPresetVersion: string;
  selectionSource: LocalSummaryPresetSelectionSource;
  applyScope: LocalSummaryPresetApplyScope;
  lockedByUser: boolean;
  updatedAt: string;
  suggestion?: LocalSummaryPresetSuggestion | null;
}

export type LocalTurnTranslationStatus = "pending" | "ready" | "failed";

export interface LocalTurnTranslation {
  id: string;
  sessionId: string;
  turnId: string;
  sourceRevision: string;
  sourceText: string;
  sourceLanguage?: string | null;
  targetLanguage: string;
  text: string;
  status: LocalTurnTranslationStatus;
  requestedAt: string;
  completedAt?: string | null;
  providerLabel?: string;
  model?: string | null;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  errorMessage?: string | null;
}

class AppDatabase extends Dexie {
  transcriptions!: Table<LocalTranscription, string>;
  segments!: Table<LocalSegment, string>;
  audioChunks!: Table<LocalAudioChunk, string>;
  videoChunks!: Table<LocalVideoChunk, string>;
  presets!: Table<PresetConfig, string>;
  settings!: Table<AppSetting, string>;
  backendEndpoints!: Table<BackendEndpointPreset, string>;
  searchIndexes!: Table<TranscriptionSearchIndex, string>;
  summaryPartitions!: Table<LocalSummaryPartition, string>;
  summaryRuns!: Table<LocalSummaryRun, string>;
  publishedSummaries!: Table<LocalPublishedSummary, string>;
  summaryPresetSelections!: Table<LocalSummaryPresetSelection, string>;
  turnTranslations!: Table<LocalTurnTranslation, string>;

  constructor() {
    super("rtzr-stt-webapp");

    this.version(1).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
    });

    this.version(2)
      .stores({
        transcriptions: "id, createdAt, kind, status",
        segments: "id, transcriptionId, startMs",
        audioChunks: "id, transcriptionId, chunkIndex",
        presets: "id, type, isDefault",
        settings: "key",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("audioChunks")
          .toCollection()
          .modify(async (chunk) => {
            const legacyBlob = (chunk as { blob?: Blob }).blob;
            if (legacyBlob && !(chunk as { data?: ArrayBuffer }).data) {
              try {
                const buffer = await legacyBlob.arrayBuffer();
                (chunk as { data: ArrayBuffer }).data = buffer;
              } catch (error) {
                console.warn("Failed to migrate legacy audio blob.", error);
              }
            }
            delete (chunk as { blob?: Blob }).blob;
          });
      });

    this.version(3).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
    });

    this.version(4).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });

    this.version(5)
      .stores({
        transcriptions: "id, createdAt, kind, status",
        segments: "id, transcriptionId, startMs",
        audioChunks: "id, transcriptionId, chunkIndex",
        presets: "id, type, isDefault",
        settings: "key",
        backendEndpoints: "id, deployment, isDefault, createdAt",
        searchIndexes: "transcriptionId",
      })
      .upgrade(async (transaction) => {
        const speakerMap = new Map<string, string>();
        let nextSpkId = 1;

        await transaction
          .table("segments")
          .toCollection()
          .modify((segment) => {
            const oldSpeaker = (segment as { speaker?: string }).speaker;
            if (oldSpeaker === undefined) {
              return;
            }

            const transcriptionId = (segment as LocalSegment).transcriptionId;
            const mapKey = `${transcriptionId || "unknown"}::${oldSpeaker}`;

            let spkId = speakerMap.get(mapKey);
            if (!spkId) {
              spkId = String(nextSpkId++);
              speakerMap.set(mapKey, spkId);
            }

            (segment as LocalSegment).speaker_label = oldSpeaker;
            (segment as LocalSegment).spk = spkId;
            delete (segment as { speaker?: string }).speaker;
          });
      });

    this.version(6).stores({
      transcriptions: "id, createdAt, kind, status",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });

    this.version(7).stores({
      transcriptions: "id, createdAt, kind, status, isCloudSynced",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
    });

    this.version(8)
      .stores({
        transcriptions: "id, createdAt, kind, status, isCloudSynced",
        segments: "id, transcriptionId, startMs",
        audioChunks: "id, transcriptionId, chunkIndex",
        videoChunks: "id, transcriptionId, chunkIndex",
        presets: "id, type, isDefault",
        settings: "key",
        backendEndpoints: "id, deployment, isDefault, createdAt",
        searchIndexes: "transcriptionId",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("audioChunks")
          .toCollection()
          .modify((chunk) => {
            const typed = chunk as LocalAudioChunk;
          if (!typed.role) {
            typed.role = "capture";
          }
        });
      });

    this.version(9).stores({
      transcriptions: "id, createdAt, kind, status, isCloudSynced",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
      summaryPartitions:
        "id, sessionId, [sessionId+status], startedAt, endedAt, sourceRevision",
      summaryRuns:
        "id, sessionId, [sessionId+status], mode, requestedAt, completedAt, sourceRevision",
      publishedSummaries:
        "id, sessionId, [sessionId+mode], mode, runId, updatedAt, freshness, sourceRevision",
    });

    this.version(10).stores({
      transcriptions: "id, createdAt, kind, status, isCloudSynced",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
      summaryPartitions:
        "id, sessionId, [sessionId+status], startedAt, endedAt, sourceRevision",
      summaryRuns:
        "id, sessionId, [sessionId+status], mode, requestedAt, completedAt, sourceRevision",
      publishedSummaries:
        "id, sessionId, [sessionId+mode], mode, runId, updatedAt, freshness, sourceRevision",
      summaryPresetSelections:
        "sessionId, selectedPresetId, selectionSource, updatedAt",
    });

    this.version(11).stores({
      transcriptions: "id, createdAt, kind, status, isCloudSynced",
      segments: "id, transcriptionId, startMs",
      audioChunks: "id, transcriptionId, chunkIndex",
      videoChunks: "id, transcriptionId, chunkIndex",
      presets: "id, type, isDefault",
      settings: "key",
      backendEndpoints: "id, deployment, isDefault, createdAt",
      searchIndexes: "transcriptionId",
      summaryPartitions:
        "id, sessionId, [sessionId+status], startedAt, endedAt, sourceRevision",
      summaryRuns:
        "id, sessionId, [sessionId+status], mode, requestedAt, completedAt, sourceRevision",
      publishedSummaries:
        "id, sessionId, [sessionId+mode], mode, runId, updatedAt, freshness, sourceRevision",
      summaryPresetSelections:
        "sessionId, selectedPresetId, selectionSource, updatedAt",
      turnTranslations:
        "id, sessionId, [sessionId+targetLanguage], turnId, targetLanguage, status, requestedAt, sourceRevision",
    });
  }
}

export const appDb = new AppDatabase();
