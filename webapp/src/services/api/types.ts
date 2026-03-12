import type { BackendCapability, BackendProfile } from "../../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../../domain/featureBinding";
import type {
  ArtifactSupportingSnippet,
  SummaryBlock,
  SummaryPresetSelectionSource,
  SummaryRegenerationScope,
  SummaryRunTrigger,
} from "../../domain/session";

export type TranscriptionStatus =
  | "queued"
  | "processing"
  | "transcribing"
  | "completed"
  | "failed";

export interface FileTranscriptionRequest {
  title?: string;
  configJson: string;
  file: File | Blob;
}

export interface FileTranscriptionResponse {
  transcribeId: string;
  status: TranscriptionStatus;
  createdAt: string;
  rawStatus?: string;
  statusReason?: "unknown_upstream_status";
}

export interface FileTranscriptionResult {
  transcribeId: string;
  status: TranscriptionStatus;
  rawStatus?: string;
  statusReason?: "unknown_upstream_status";
  text?: string;
  audioUrl?: string;
  segments?: FileTranscriptionSegment[];
  error?: string;
}

export interface WordTimestamp {
  text: string;
  startMs?: number;
  endMs?: number;
  durationMs?: number;
  confidence?: number;
}

export interface FileTranscriptionSegment {
  speaker?: string;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  startMs?: number;
  endMs?: number;
  text: string;
  words?: WordTimestamp[];
}

export interface StreamingSessionInitPayload {
  decoderConfig: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type StreamingMessage =
  | {
      type: "partial";
      text: string;
      startMs: number;
      endMs: number;
    }
  | {
      type: "final";
      text: string;
      startMs: number;
      endMs: number;
    }
  | {
      type: "error";
      message: string;
    };

export type BackendDeployment = "cloud" | "onprem";

export interface BackendEndpointState {
  deployment: BackendDeployment;
  apiBaseUrl: string;
  transcribePath: string;
  streamingPath: string;
  authEnabled: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  verifySsl: boolean;
  source: "default" | "override";
}

export interface RawBackendEndpointState {
  deployment: BackendDeployment;
  api_base_url: string;
  transcribe_path: string;
  streaming_path: string;
  auth_enabled: boolean;
  has_client_id: boolean;
  has_client_secret: boolean;
  verify_ssl: boolean;
  source: "default" | "override";
}

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  deployment: BackendDeployment;
  authEnabled: boolean;
  source: "default" | "override";
  backendAdminEnabled?: boolean;
  backendAdminTokenRequired?: boolean;
}

export interface RawHealthStatus {
  status: "ok";
  service: string;
  version: string;
  deployment: BackendDeployment;
  auth_enabled: boolean;
  source: "default" | "override";
  backend_admin_enabled?: boolean;
  backend_admin_token_required?: boolean;
}

export interface BackendEndpointUpdatePayload {
  deployment: BackendDeployment;
  apiBaseUrl: string;
  clientId?: string | null;
  clientSecret?: string | null;
  verifySsl?: boolean;
}

export interface BackendBindingCompatibilityState {
  legacySource: "default" | "override";
  endpointState: BackendEndpointState | null;
  legacyProfiles: BackendProfile[];
  legacyBindings: FeatureBinding[];
}

export interface BackendCapabilitiesState {
  capabilityKeys: BackendCapability[];
  featureKeys: FeatureKey[];
  compatibility: BackendBindingCompatibilityState;
}

export interface BackendProfileUpsertPayload {
  id: string;
  label: string;
  kind: "stt" | "llm" | "translate" | "tts" | "multimodal";
  baseUrl: string;
  transport: "http" | "websocket" | "grpc";
  authStrategy: {
    type: "none" | "bearer_secret_ref" | "oauth_broker" | "header_token" | "provider_native";
    credentialRef?: {
      kind: "kubernetes_secret" | "server_env" | "operator_token";
      id: string;
      field?: string | null;
    } | null;
  };
  capabilities: Array<
    | "stt.realtime"
    | "stt.file"
    | "artifact.summary"
    | "artifact.qa"
    | "translate.turn_final"
    | "translate.turn_partial"
    | "tts.speak"
    | "tts.stream"
  >;
  defaultModel?: string | null;
  enabled: boolean;
  metadata?: Record<string, string>;
}

export interface FeatureBindingUpsertPayload {
  featureKey:
    | "capture.realtime"
    | "capture.file"
    | "artifact.summary"
    | "artifact.qa"
    | "translate.turn_final"
    | "translate.turn_partial"
    | "tts.speak"
    | "tts.stream";
  primaryBackendProfileId: string;
  fallbackBackendProfileId?: string | null;
  enabled: boolean;
  modelOverride?: string | null;
  timeoutMs?: number | null;
  degradedBehavior?: "hide" | "disable" | "source_only" | "transcript_only" | "retry" | null;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  } | null;
}

export interface FullSummaryRequestPresetSection {
  id: string;
  label: string;
  kind: "narrative" | "bullet_list" | "quote_list";
  required: boolean;
}

export interface FullSummaryRequestPreset {
  id: string;
  version: string;
  label: string;
  description?: string | null;
  language?: string | null;
  outputSchema: FullSummaryRequestPresetSection[];
}

export interface FullSummaryRequestTurn {
  id: string;
  text: string;
  speakerLabel?: string | null;
  language?: string | null;
  startMs?: number | null;
  endMs?: number | null;
}

export interface FullSummaryRequest {
  sessionId: string;
  title?: string | null;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  selectionSource: SummaryPresetSelectionSource;
  trigger: SummaryRunTrigger;
  regenerationScope?: SummaryRegenerationScope | null;
  preset: FullSummaryRequestPreset;
  turns: FullSummaryRequestTurn[];
}

export interface FullSummaryResponse {
  runId: string;
  sessionId: string;
  mode: "full";
  scope: "session";
  trigger: SummaryRunTrigger;
  regenerationScope?: SummaryRegenerationScope | null;
  presetId: string;
  presetVersion: string;
  selectionSource: SummaryPresetSelectionSource;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  requestedAt: string;
  completedAt: string;
  title: string;
  content: string;
  partitionIds: string[];
  supportingSnippets: ArtifactSupportingSnippet[];
  blocks: SummaryBlock[];
  binding: {
    featureKey: "artifact.summary";
    resolvedBackendProfileId: string;
    fallbackBackendProfileId?: string | null;
    usedFallback: boolean;
    providerLabel: string;
    model?: string | null;
    timeoutMs?: number | null;
    retryPolicy?: {
      maxAttempts: number;
      backoffMs: number;
    } | null;
  };
}

export interface FinalTurnTranslationRequest {
  sessionId: string;
  turnId: string;
  sourceRevision: string;
  text: string;
  speakerLabel?: string | null;
  sourceLanguage?: string | null;
  targetLanguage: string;
  startMs?: number | null;
  endMs?: number | null;
}

export interface FinalTurnTranslationResponse {
  translationId: string;
  sessionId: string;
  turnId: string;
  scope: "turn";
  sourceRevision: string;
  sourceLanguage?: string | null;
  targetLanguage: string;
  text: string;
  requestedAt: string;
  completedAt: string;
  binding: {
    featureKey: "translate.turn_final";
    resolvedBackendProfileId: string;
    fallbackBackendProfileId?: string | null;
    usedFallback: boolean;
    providerLabel: string;
    model?: string | null;
    timeoutMs?: number | null;
    retryPolicy?: {
      maxAttempts: number;
      backoffMs: number;
    } | null;
  };
}
