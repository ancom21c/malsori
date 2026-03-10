import type { LocalSegment, LocalTranscription } from "../data/app-db";

export type SessionMode =
  | "capture_file"
  | "capture_realtime"
  | "translate_realtime";

export type SessionState =
  | "idle"
  | "preparing"
  | "countdown"
  | "recording"
  | "paused"
  | "reconnecting"
  | "degraded"
  | "stopping"
  | "processing"
  | "ready"
  | "failed";

export type TurnStatus = "partial" | "final";

export type TurnVariantType = "translation" | "normalized" | "redacted";

export type ArtifactType = "summary" | "action_items" | "key_terms" | "qa";

export type ArtifactStatus = "not_requested" | "pending" | "ready" | "failed";

export interface QualitySnapshot {
  latencyMs?: number;
  bufferedAudioMs: number;
  droppedAudioMs: number;
  replayedAudioMs: number;
  droppedAudioRatio?: number;
  reconnectCount?: number;
  degraded: boolean;
}

export interface SessionRecord {
  id: string;
  title: string;
  mode: SessionMode;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
  sourceLanguage?: string;
  targetLanguages: string[];
  transcriptText?: string;
  speakerCount?: number;
  quality: QualitySnapshot;
  rawStatus?: string;
  errorMessage?: string;
}

export interface SessionTurnVariant {
  type: TurnVariantType;
  language?: string;
  text: string;
  status: ArtifactStatus;
}

export interface SessionTurn {
  id: string;
  sessionId: string;
  speakerId?: string;
  speakerLabel?: string;
  sourceLanguage?: string;
  startMs: number;
  endMs: number;
  text: string;
  status: TurnStatus;
  confidence?: number;
  variants: SessionTurnVariant[];
}

export interface SessionArtifact {
  sessionId: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  content?: string;
}

export function deriveSessionMode(
  transcription: Pick<LocalTranscription, "kind">
): SessionMode {
  return transcription.kind === "realtime" ? "capture_realtime" : "capture_file";
}

export function deriveSessionState(
  transcription: Pick<
    LocalTranscription,
    "status" | "kind" | "processingStage" | "realtimeQualityState"
  >
): SessionState {
  if (transcription.status === "failed") {
    return "failed";
  }

  if (transcription.status === "completed") {
    return "ready";
  }

  if (transcription.kind === "file") {
    return transcription.status === "pending" ? "preparing" : "processing";
  }

  switch (transcription.processingStage) {
    case "connecting":
      return "preparing";
    case "recording":
      return transcription.realtimeQualityState === "degraded"
        ? "degraded"
        : "recording";
    case "paused":
      return "paused";
    case "finalizing":
    case "saving":
      return "stopping";
    default:
      return transcription.status === "pending" ? "idle" : "processing";
  }
}

export function deriveQualitySnapshot(
  transcription: Pick<
    LocalTranscription,
    | "realtimeBufferedAudioMs"
    | "realtimeDroppedAudioMs"
    | "realtimeReplayedAudioMs"
    | "realtimeDroppedAudioRatio"
    | "realtimeQualityState"
  >
): QualitySnapshot {
  return {
    bufferedAudioMs: transcription.realtimeBufferedAudioMs ?? 0,
    droppedAudioMs: transcription.realtimeDroppedAudioMs ?? 0,
    replayedAudioMs: transcription.realtimeReplayedAudioMs ?? 0,
    droppedAudioRatio: transcription.realtimeDroppedAudioRatio,
    degraded: transcription.realtimeQualityState === "degraded",
  };
}

export function mapLocalTranscriptionToSessionRecord(
  transcription: LocalTranscription
): SessionRecord {
  return {
    id: transcription.id,
    title: transcription.title,
    mode: deriveSessionMode(transcription),
    state: deriveSessionState(transcription),
    createdAt: transcription.createdAt,
    updatedAt: transcription.updatedAt,
    remoteId: transcription.remoteId,
    sourceLanguage: undefined,
    targetLanguages: [],
    transcriptText: transcription.transcriptText,
    rawStatus: transcription.upstreamStatusRaw,
    errorMessage: transcription.errorMessage,
    quality: deriveQualitySnapshot(transcription),
  };
}

export function mapLocalSegmentToSessionTurn(segment: LocalSegment): SessionTurn {
  const wordConfidence =
    segment.words && segment.words.length > 0
      ? segment.words.reduce((sum, word) => sum + (word.confidence ?? 0), 0) /
        segment.words.filter((word) => typeof word.confidence === "number").length
      : undefined;

  return {
    id: segment.id,
    sessionId: segment.transcriptionId,
    speakerId: segment.spk,
    speakerLabel: segment.speaker_label,
    sourceLanguage: segment.language,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.correctedText?.trim() || segment.text,
    status: segment.isPartial && !segment.isFinal ? "partial" : "final",
    confidence:
      typeof wordConfidence === "number" && Number.isFinite(wordConfidence)
        ? wordConfidence
        : undefined,
    variants: [],
  };
}

export function createDefaultSessionArtifacts(
  sessionId: string
): SessionArtifact[] {
  return [
    {
      sessionId,
      type: "summary",
      status: "not_requested",
      title: "Summary",
    },
    {
      sessionId,
      type: "action_items",
      status: "not_requested",
      title: "Action items",
    },
    {
      sessionId,
      type: "key_terms",
      status: "not_requested",
      title: "Key terms",
    },
    {
      sessionId,
      type: "qa",
      status: "not_requested",
      title: "Ask transcript",
    },
  ];
}
