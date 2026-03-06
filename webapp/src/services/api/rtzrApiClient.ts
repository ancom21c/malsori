import type {
  BackendEndpointState,
  BackendEndpointUpdatePayload,
  FileTranscriptionRequest,
  FileTranscriptionResponse,
  FileTranscriptionResult,
  FileTranscriptionSegment,
  HealthStatus,
  RawBackendEndpointState,
  RawHealthStatus,
  TranscriptionStatus,
  WordTimestamp,
} from "./types";
import { tStatic } from "../../i18n/static";
import { joinBaseUrl } from "../../utils/baseUrl";

type RawFileTranscribeResponse = {
  id?: string;
  transcribe_id?: string;
  status?: string;
  created_at?: string;
};

type RawWordEntry = {
  text?: string;
  word?: string;
  start_at?: number;
  start_ms?: number;
  start?: number;
  end_at?: number;
  end_ms?: number;
  end?: number;
  duration?: number;
  duration_ms?: number;
  confidence?: number;
};

type RawSegmentEntry = {
  speaker?: string;
  spk?: string;
  speaker_label?: string;
  language?: string;
  lang?: string;
  startMs?: number;
  endMs?: number;
  start_ms?: number;
  start?: number;
  start_at?: number;
  end_ms?: number;
  end?: number;
  end_at?: number;
  duration?: number;
  duration_ms?: number;
  msg?: string;
  text?: string;
  words?: RawWordEntry[];
};

type RawTranscriptionStatusResponse = {
  id?: string;
  status?: string;
  text?: string;
  audio_url?: string;
  error?: string;
  segments?: RawSegmentEntry[];
};

type ParsedApiError = {
  code?: string;
  message?: string;
};

const TRANSCRIPTION_STATUSES: TranscriptionStatus[] = [
  "queued",
  "processing",
  "transcribing",
  "completed",
  "failed",
];

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeMillis(value: unknown): number | undefined {
  const coerced = coerceFiniteNumber(value);
  if (coerced === undefined) {
    return undefined;
  }
  return Math.max(0, Math.round(coerced));
}

function pickFirstString(record: RawSegmentEntry, fields: Array<keyof RawSegmentEntry>): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeWords(words: RawWordEntry[] | undefined): WordTimestamp[] | undefined {
  if (!Array.isArray(words)) {
    return undefined;
  }
  const normalized = words
    .map((word): WordTimestamp | null => {
      if (!word) {
        return null;
      }
      const text = (word.text ?? word.word ?? "").trim();
      if (!text) {
        return null;
      }
      const start =
        normalizeMillis(word.start_ms) ??
        normalizeMillis(word.start_at) ??
        normalizeMillis(word.start);
      const end =
        normalizeMillis(word.end_ms) ??
        normalizeMillis(word.end_at) ??
        normalizeMillis(word.end);
      const duration = normalizeMillis(word.duration_ms ?? word.duration);
      const resolvedEnd = end ?? (start !== undefined && duration !== undefined ? start + duration : undefined);
      const normalizedWord: WordTimestamp = { text };
      if (start !== undefined) {
        normalizedWord.startMs = start;
      }
      if (resolvedEnd !== undefined) {
        normalizedWord.endMs = resolvedEnd;
      }
      if (duration !== undefined) {
        normalizedWord.durationMs = duration;
      }
      if (typeof word.confidence === "number") {
        normalizedWord.confidence = word.confidence;
      }
      return normalizedWord;
    })
    .filter((word): word is WordTimestamp => Boolean(word));
  return normalized.length ? normalized : undefined;
}

function normalizeSegmentPayload(segment: RawSegmentEntry): FileTranscriptionSegment {
  const start =
    normalizeMillis(segment.startMs) ??
    normalizeMillis(segment.start_ms) ??
    normalizeMillis(segment.start_at) ??
    normalizeMillis(segment.start);
  const end =
    normalizeMillis(segment.endMs) ??
    normalizeMillis(segment.end_ms) ??
    normalizeMillis(segment.end_at) ??
    normalizeMillis(segment.end);
  const duration = normalizeMillis(segment.duration) ?? normalizeMillis(segment.duration_ms);
  const resolvedEnd = end ?? (start !== undefined && duration !== undefined ? start + duration : undefined);
  const text = (segment.msg ?? segment.text ?? "").toString();
  const spk = pickFirstString(segment, ["spk"]);
  const speakerLabel = pickFirstString(segment, ["speaker_label", "speaker"]);
  const speaker = speakerLabel ?? spk;
  const language = pickFirstString(segment, ["language", "lang"]);
  const words = normalizeWords(segment.words);
  return {
    speaker,
    spk,
    speakerLabel,
    language,
    startMs: start,
    endMs: resolvedEnd,
    text,
    words,
  } satisfies FileTranscriptionSegment;
}

function normalizeStatus(value: unknown): TranscriptionStatus {
  if (TRANSCRIPTION_STATUSES.includes(value as TranscriptionStatus)) {
    return value as TranscriptionStatus;
  }
  return "processing";
}

export class RtzrApiClient {
  private readonly getPublicBaseUrl: () => string;
  private readonly getAdminBaseUrl: () => string;

  constructor(getPublicBaseUrl: () => string, getAdminBaseUrl: () => string) {
    this.getPublicBaseUrl = getPublicBaseUrl;
    this.getAdminBaseUrl = getAdminBaseUrl;
  }

  private buildPublicUrl(path: string): string {
    return joinBaseUrl(this.getPublicBaseUrl(), path);
  }

  private buildAdminUrl(path: string): string {
    const base = this.getAdminBaseUrl().trim();
    if (!base) {
      throw new Error(tStatic("internalAdminApiBaseUrlRequired"));
    }
    return joinBaseUrl(base, path);
  }

  private async ensureOk(response: Response): Promise<Response> {
    if (response.ok) {
      return response;
    }
    let parsedJson: unknown = null;
    try {
      const bodyText = await response.text();
      const trimmed = bodyText.trim();
      if (trimmed.length > 0) {
        parsedJson = JSON.parse(trimmed);
      }
    } catch {
      parsedJson = null;
    }

    const parsedError = this.parseApiErrorPayload(parsedJson);
    const mappedMessage = this.mapApiErrorCodeToMessage(parsedError.code);
    const message =
      mappedMessage ??
      (parsedError.code ? tStatic("unknownErrorTryAgain") : undefined) ??
      tStatic("requestFailedWithStatus", { values: { status: response.status } });
    throw new Error(message);
  }

  private parseApiErrorPayload(payload: unknown): ParsedApiError {
    if (!payload || typeof payload !== "object") {
      return {};
    }
    const record = payload as Record<string, unknown>;

    const asErrorRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === "object" ? (value as Record<string, unknown>) : null;

    const directError = asErrorRecord(record.error);
    if (directError) {
      return {
        code:
          typeof directError.code === "string" ? directError.code : undefined,
        message:
          typeof directError.message === "string" ? directError.message : undefined,
      };
    }

    const detailRecord = asErrorRecord(record.detail);
    if (detailRecord) {
      const nested = asErrorRecord(detailRecord.error);
      if (nested) {
        return {
          code: typeof nested.code === "string" ? nested.code : undefined,
          message:
            typeof nested.message === "string" ? nested.message : undefined,
        };
      }
      return {
        code: typeof detailRecord.code === "string" ? detailRecord.code : undefined,
        message:
          typeof detailRecord.message === "string" ? detailRecord.message : undefined,
      };
    }
    return {};
  }

  private mapApiErrorCodeToMessage(code: string | undefined): string | undefined {
    if (!code) {
      return undefined;
    }
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }
    if (normalized === "BACKEND_ADMIN_DISABLED") {
      return tStatic("backendAdminDisabled");
    }
    if (normalized === "BACKEND_ADMIN_UNAUTHORIZED") {
      return tStatic("backendAdminUnauthorized");
    }
    if (normalized === "BACKEND_ADMIN_MISCONFIGURED") {
      return tStatic("backendAdminMisconfigured");
    }
    if (normalized === "BACKEND_API_BASE_REQUIRED") {
      return tStatic("pleaseEnterTheApiBaseUrl");
    }
    if (normalized === "BACKEND_API_BASE_INVALID") {
      return tStatic("pleaseEnterAValidApiBaseUrl");
    }
    if (normalized === "SERVER_CONFIG_ERROR") {
      return tStatic("serverConfigurationError");
    }
    if (normalized === "INVALID_CONFIG_JSON") {
      return tStatic("invalidConfigurationJson");
    }
    if (normalized === "INVALID_CONFIG_TYPE") {
      return tStatic("configJsonMustBeObject");
    }
    if (normalized === "UPSTREAM_REQUEST_FAILED") {
      return tStatic("transcriptionRequestFailedTryAgain");
    }
    if (normalized.startsWith("OAUTH_")) {
      return tStatic("googleDriveReconnectRequired");
    }
    return undefined;
  }

  private withAdminHeaders(
    headers: Record<string, string>,
    adminToken?: string
  ): Record<string, string> {
    const resolved = { ...headers };
    const trimmed = adminToken?.trim();
    if (trimmed) {
      resolved["X-Malsori-Admin-Token"] = trimmed;
    }
    return resolved;
  }

  async requestFileTranscription(
    payload: FileTranscriptionRequest
  ): Promise<FileTranscriptionResponse> {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("config", payload.configJson);
    if (payload.title) {
      formData.append("title", payload.title);
    }

    const response = await fetch(this.buildPublicUrl("/v1/transcribe"), {
      method: "POST",
      body: formData,
    });

    const data = (await (await this.ensureOk(response)).json()) as RawFileTranscribeResponse;
    const transcribeId = data.transcribe_id ?? data.id;
    if (!transcribeId) {
      throw new Error(tStatic("responseIsMissingTranscribeId"));
    }

    return {
      transcribeId,
      status: normalizeStatus(data.status),
      createdAt: data.created_at ?? new Date().toISOString(),
    };
  }

  async getFileTranscriptionStatus(
    transcribeId: string
  ): Promise<FileTranscriptionResult> {
    const response = await fetch(
      this.buildPublicUrl(`/v1/transcribe/${encodeURIComponent(transcribeId)}`),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = (await (await this.ensureOk(response)).json()) as RawTranscriptionStatusResponse;

    return {
      transcribeId: data.id ?? transcribeId,
      status: normalizeStatus(data.status),
      text: data.text,
      audioUrl: data.audio_url,
      error: data.error,
      segments: Array.isArray(data.segments)
        ? data.segments.map((segment) => normalizeSegmentPayload(segment))
        : undefined,
    };
  }

  private normalizeBackendState(raw: RawBackendEndpointState): BackendEndpointState {
    return {
      deployment: raw.deployment,
      apiBaseUrl: raw.api_base_url,
      transcribePath: raw.transcribe_path,
      streamingPath: raw.streaming_path,
      authEnabled: raw.auth_enabled,
      hasClientId: raw.has_client_id,
      hasClientSecret: raw.has_client_secret,
      verifySsl: raw.verify_ssl,
      source: raw.source,
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const response = await fetch(this.buildPublicUrl("/v1/health"), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawHealthStatus;
    return {
      status: raw.status,
      service: raw.service,
      version: raw.version,
      deployment: raw.deployment,
      authEnabled: raw.auth_enabled,
      source: raw.source,
      backendAdminEnabled:
        typeof raw.backend_admin_enabled === "boolean"
          ? raw.backend_admin_enabled
          : undefined,
    };
  }

  async getBackendEndpointState(options?: {
    adminToken?: string;
  }): Promise<BackendEndpointState> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/endpoint"), {
      method: "GET",
      headers: this.withAdminHeaders(
        {
          Accept: "application/json",
        },
        options?.adminToken
      ),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendEndpointState;
    return this.normalizeBackendState(raw);
  }

  async updateBackendEndpoint(
    payload: BackendEndpointUpdatePayload,
    options?: { adminToken?: string }
  ): Promise<BackendEndpointState> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/endpoint"), {
      method: "POST",
      headers: this.withAdminHeaders(
        {
          "Content-Type": "application/json",
        },
        options?.adminToken
      ),
      body: JSON.stringify({
        deployment: payload.deployment,
        api_base_url: payload.apiBaseUrl,
        client_id: payload.clientId ?? null,
        client_secret: payload.clientSecret ?? null,
        verify_ssl: payload.verifySsl ?? true,
      }),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendEndpointState;
    return this.normalizeBackendState(raw);
  }

  async resetBackendEndpoint(options?: {
    adminToken?: string;
  }): Promise<BackendEndpointState> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/endpoint"), {
      method: "DELETE",
      headers: this.withAdminHeaders(
        {
          Accept: "application/json",
        },
        options?.adminToken
      ),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendEndpointState;
    return this.normalizeBackendState(raw);
  }
}
