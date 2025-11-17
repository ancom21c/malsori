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
}

export interface FileTranscriptionResult {
  transcribeId: string;
  status: TranscriptionStatus;
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

export interface BackendEndpointUpdatePayload {
  deployment: BackendDeployment;
  apiBaseUrl: string;
  clientId?: string | null;
  clientSecret?: string | null;
  verifySsl?: boolean;
}
