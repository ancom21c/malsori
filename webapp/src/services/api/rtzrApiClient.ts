import type {
  BackendEndpointState,
  BackendEndpointUpdatePayload,
  FileTranscriptionRequest,
  FileTranscriptionResponse,
  FileTranscriptionResult,
  FileTranscriptionSegment,
  RawBackendEndpointState,
  TranscriptionStatus,
  WordTimestamp,
} from "./types";

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
  private readonly getBaseUrl: () => string;

  constructor(getBaseUrl: () => string) {
    this.getBaseUrl = getBaseUrl;
  }

  private buildUrl(path: string): string {
    const base = this.getBaseUrl().replace(/\/?$/, "");
    return `${base}${path}`;
  }

  private async ensureOk(response: Response): Promise<Response> {
    if (response.ok) {
      return response;
    }
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    const message = detail?.trim().length ? detail : `요청 실패 (${response.status})`;
    throw new Error(message);
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

    const response = await fetch(this.buildUrl("/v1/transcribe"), {
      method: "POST",
      body: formData,
    });

    const data = (await (await this.ensureOk(response)).json()) as RawFileTranscribeResponse;
    const transcribeId = data.transcribe_id ?? data.id;
    if (!transcribeId) {
      throw new Error("응답에 transcribe_id가 없습니다.");
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
      this.buildUrl(`/v1/transcribe/${encodeURIComponent(transcribeId)}`),
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

  async getBackendEndpointState(): Promise<BackendEndpointState> {
    const response = await fetch(this.buildUrl("/v1/backend/endpoint"), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendEndpointState;
    return this.normalizeBackendState(raw);
  }

  async updateBackendEndpoint(
    payload: BackendEndpointUpdatePayload
  ): Promise<BackendEndpointState> {
    const response = await fetch(this.buildUrl("/v1/backend/endpoint"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

  async resetBackendEndpoint(): Promise<BackendEndpointState> {
    const response = await fetch(this.buildUrl("/v1/backend/endpoint"), {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendEndpointState;
    return this.normalizeBackendState(raw);
  }
}
