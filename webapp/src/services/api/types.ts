import type { BackendCapability, BackendProfile } from "../../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../../domain/featureBinding";

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
}

export interface RawHealthStatus {
  status: "ok";
  service: string;
  version: string;
  deployment: BackendDeployment;
  auth_enabled: boolean;
  source: "default" | "override";
  backend_admin_enabled?: boolean;
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
