import type {
  BackendCapabilitiesState,
  BackendEndpointState,
  BackendEndpointUpdatePayload,
  FinalTurnTranslationRequest,
  FinalTurnTranslationResponse,
  FileTranscriptionRequest,
  FileTranscriptionResponse,
  FileTranscriptionResult,
  FileTranscriptionSegment,
  FullSummaryRequest,
  FullSummaryResponse,
  HealthStatus,
  RawBackendEndpointState,
  RawHealthStatus,
  TranscriptionStatus,
  WordTimestamp,
} from "./types";
import {
  denormalizeBackendProfileRecord,
  denormalizeFeatureBindingRecord,
  normalizeBackendCapabilitiesState,
  normalizeBackendProfileHealthResponse,
  normalizeBackendProfileRecord,
  normalizeFeatureBindingRecord,
  type RawBackendCapabilitiesState,
  type RawBackendProfileHealthResponse,
  type RawBackendProfileRecord,
  type RawFeatureBindingRecord,
} from "./backendBindingContracts";
import type { BackendHealthSnapshot, BackendProfile } from "../../domain/backendProfile";
import type { FeatureBinding } from "../../domain/featureBinding";
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

type RawSummarySupportingSnippet = {
  id?: string;
  turn_id?: string;
  speaker_label?: string;
  start_ms?: number;
  end_ms?: number;
  text?: string;
};

type RawSummaryBlock = {
  id?: string;
  kind?: string;
  title?: string;
  content?: string;
  supporting_snippets?: RawSummarySupportingSnippet[];
};

type RawFullSummaryResponse = {
  run_id?: string;
  session_id?: string;
  mode?: "full";
  scope?: "session";
  trigger?: FullSummaryResponse["trigger"];
  regeneration_scope?: FullSummaryResponse["regenerationScope"];
  preset_id?: string;
  preset_version?: string;
  selection_source?: FullSummaryResponse["selectionSource"];
  source_revision?: string;
  source_language?: string;
  output_language?: string;
  requested_at?: string;
  completed_at?: string;
  title?: string;
  content?: string;
  partition_ids?: string[];
  supporting_snippets?: RawSummarySupportingSnippet[];
  blocks?: RawSummaryBlock[];
  binding?: {
    feature_key?: "artifact.summary";
    resolved_backend_profile_id?: string;
    fallback_backend_profile_id?: string | null;
    used_fallback?: boolean;
    provider_label?: string;
    model?: string | null;
    timeout_ms?: number | null;
    retry_policy?: {
      max_attempts?: number;
      backoff_ms?: number;
    } | null;
  };
};

type RawFinalTurnTranslationResponse = {
  translation_id?: string;
  session_id?: string;
  turn_id?: string;
  scope?: "turn";
  source_revision?: string;
  source_language?: string;
  target_language?: string;
  text?: string;
  requested_at?: string;
  completed_at?: string;
  binding?: {
    feature_key?: "translate.turn_final";
    resolved_backend_profile_id?: string;
    fallback_backend_profile_id?: string | null;
    used_fallback?: boolean;
    provider_label?: string;
    model?: string | null;
    timeout_ms?: number | null;
    retry_policy?: {
      max_attempts?: number;
      backoff_ms?: number;
    } | null;
  };
};

type ParsedApiError = {
  code?: string;
  message?: string;
};

type RawBackendProfilesResponse =
  | RawBackendProfileRecord[]
  | { profiles?: RawBackendProfileRecord[] };

type RawFeatureBindingsResponse =
  | RawFeatureBindingRecord[]
  | { bindings?: RawFeatureBindingRecord[] };

const TRANSCRIPTION_STATUSES: TranscriptionStatus[] = [
  "queued",
  "processing",
  "transcribing",
  "completed",
  "failed",
];

type NormalizedTranscriptionStatus = {
  status: TranscriptionStatus;
  rawStatus?: string;
  statusReason?: "unknown_upstream_status";
};

type MissingStatusFallback = "queued" | "processing" | "failed";

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

function normalizeSummarySupportingSnippet(
  snippet: RawSummarySupportingSnippet,
  index: number
): FullSummaryResponse["supportingSnippets"][number] | null {
  const text = (snippet.text ?? "").trim();
  if (!text) {
    return null;
  }
  return {
    id: (snippet.id ?? `snippet-${index}`).trim(),
    turnId: snippet.turn_id?.trim() || undefined,
    speakerLabel: snippet.speaker_label?.trim() || undefined,
    startMs: normalizeMillis(snippet.start_ms),
    endMs: normalizeMillis(snippet.end_ms),
    text,
  };
}

function normalizeSummaryBlocks(
  blocks: RawSummaryBlock[] | undefined
): FullSummaryResponse["blocks"] {
  if (!Array.isArray(blocks)) {
    return [];
  }
  const normalized: FullSummaryResponse["blocks"] = [];
  for (const block of blocks) {
    const content = (block.content ?? "").trim();
    const kind = (block.kind ?? block.id ?? "").trim();
    if (!content || !kind) {
      continue;
    }
    normalized.push({
      id: (block.id ?? kind).trim(),
      kind,
      title: block.title?.trim() || undefined,
      content,
      supportingSnippets:
        block.supporting_snippets
          ?.map((snippet, snippetIndex) =>
            normalizeSummarySupportingSnippet(snippet, snippetIndex)
          )
          .filter(
            (
              snippet
            ): snippet is FullSummaryResponse["blocks"][number]["supportingSnippets"][number] =>
              Boolean(snippet)
          ) ?? [],
    });
  }
  return normalized;
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

function normalizeStatus(
  value: unknown,
  fallbackWhenMissing: MissingStatusFallback = "failed"
): NormalizedTranscriptionStatus {
  const rawStatus =
    typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  const normalized = rawStatus?.toLowerCase();
  if (normalized && TRANSCRIPTION_STATUSES.includes(normalized as TranscriptionStatus)) {
    return {
      status: normalized as TranscriptionStatus,
      rawStatus,
    };
  }
  if (!normalized) {
    return {
      status: fallbackWhenMissing,
    };
  }
  return {
    status: "failed",
    rawStatus,
    statusReason: "unknown_upstream_status",
  };
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
    if (normalized === "SUMMARY_BINDING_NOT_READY") {
      return tStatic("summaryBindingNotReady");
    }
    if (normalized === "SUMMARY_TRANSCRIPT_EMPTY") {
      return tStatic("summaryTranscriptEmpty");
    }
    if (
      normalized === "SUMMARY_PROVIDER_MISCONFIGURED" ||
      normalized === "SUMMARY_PROVIDER_AUTH_UNSUPPORTED"
    ) {
      return tStatic("summaryProviderMisconfigured");
    }
    if (normalized === "SUMMARY_PROVIDER_REQUEST_FAILED") {
      return tStatic("summaryProviderRequestFailed");
    }
    if (normalized === "SUMMARY_PROVIDER_RESPONSE_INVALID") {
      return tStatic("summaryProviderResponseInvalid");
    }
    if (normalized === "TRANSLATE_BINDING_NOT_READY") {
      return tStatic("translationBindingNotReady");
    }
    if (normalized === "TRANSLATE_TEXT_EMPTY") {
      return tStatic("translationTurnTextEmpty");
    }
    if (normalized === "TRANSLATE_TARGET_LANGUAGE_REQUIRED") {
      return tStatic("translationTargetLanguageRequired");
    }
    if (
      normalized === "TRANSLATE_PROVIDER_MISCONFIGURED" ||
      normalized === "TRANSLATE_PROVIDER_AUTH_UNSUPPORTED"
    ) {
      return tStatic("translationProviderMisconfigured");
    }
    if (normalized === "TRANSLATE_PROVIDER_REQUEST_FAILED") {
      return tStatic("translationProviderRequestFailed");
    }
    if (normalized === "TRANSLATE_PROVIDER_RESPONSE_INVALID") {
      return tStatic("translationProviderResponseInvalid");
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

    const normalizedStatus = normalizeStatus(data.status, "queued");

    return {
      transcribeId,
      status: normalizedStatus.status,
      rawStatus: normalizedStatus.rawStatus,
      statusReason: normalizedStatus.statusReason,
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

    const normalizedStatus = normalizeStatus(data.status, "processing");

    return {
      transcribeId: data.id ?? transcribeId,
      status: normalizedStatus.status,
      rawStatus: normalizedStatus.rawStatus,
      statusReason: normalizedStatus.statusReason,
      text: data.text,
      audioUrl: data.audio_url,
      error: data.error,
      segments: Array.isArray(data.segments)
        ? data.segments.map((segment) => normalizeSegmentPayload(segment))
        : undefined,
    };
  }

  async requestFullSummary(payload: FullSummaryRequest): Promise<FullSummaryResponse> {
    const response = await fetch(this.buildPublicUrl("/v1/summary/full"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        session_id: payload.sessionId,
        title: payload.title ?? null,
        source_revision: payload.sourceRevision,
        source_language: payload.sourceLanguage ?? null,
        output_language: payload.outputLanguage ?? null,
        selection_source: payload.selectionSource,
        trigger: payload.trigger,
        regeneration_scope: payload.regenerationScope ?? null,
        preset: {
          id: payload.preset.id,
          version: payload.preset.version,
          label: payload.preset.label,
          description: payload.preset.description ?? null,
          language: payload.preset.language ?? null,
          output_schema: payload.preset.outputSchema.map((section) => ({
            id: section.id,
            label: section.label,
            kind: section.kind,
            required: section.required,
          })),
        },
        turns: payload.turns.map((turn) => ({
          id: turn.id,
          text: turn.text,
          speaker_label: turn.speakerLabel ?? null,
          language: turn.language ?? null,
          start_ms:
            typeof turn.startMs === "number" && Number.isFinite(turn.startMs)
              ? Math.max(0, Math.round(turn.startMs))
              : null,
          end_ms:
            typeof turn.endMs === "number" && Number.isFinite(turn.endMs)
              ? Math.max(0, Math.round(turn.endMs))
              : null,
        })),
      }),
    });

    const raw = (await (await this.ensureOk(response)).json()) as RawFullSummaryResponse;
    const blocks = normalizeSummaryBlocks(raw.blocks);
    const supportingSnippets =
      raw.supporting_snippets
        ?.map((snippet, index) => normalizeSummarySupportingSnippet(snippet, index))
        .filter(
          (
            snippet
          ): snippet is FullSummaryResponse["supportingSnippets"][number] => Boolean(snippet)
        ) ?? [];

    return {
      runId: raw.run_id ?? "",
      sessionId: raw.session_id ?? payload.sessionId,
      mode: "full",
      scope: "session",
      trigger: raw.trigger ?? payload.trigger,
      regenerationScope: raw.regeneration_scope ?? null,
      presetId: raw.preset_id ?? payload.preset.id,
      presetVersion: raw.preset_version ?? payload.preset.version,
      selectionSource: raw.selection_source ?? payload.selectionSource,
      sourceRevision: raw.source_revision ?? payload.sourceRevision,
      sourceLanguage: raw.source_language ?? null,
      outputLanguage: raw.output_language ?? null,
      requestedAt: raw.requested_at ?? new Date().toISOString(),
      completedAt: raw.completed_at ?? new Date().toISOString(),
      title: (raw.title ?? payload.preset.label).trim(),
      content: (raw.content ?? "").trim(),
      partitionIds: Array.isArray(raw.partition_ids) ? raw.partition_ids : [],
      supportingSnippets,
      blocks,
      binding: {
        featureKey: "artifact.summary",
        resolvedBackendProfileId: raw.binding?.resolved_backend_profile_id ?? "",
        fallbackBackendProfileId: raw.binding?.fallback_backend_profile_id ?? null,
        usedFallback: raw.binding?.used_fallback ?? false,
        providerLabel: raw.binding?.provider_label ?? "",
        model: raw.binding?.model ?? null,
        timeoutMs: raw.binding?.timeout_ms ?? null,
        retryPolicy: raw.binding?.retry_policy
          ? {
              maxAttempts: raw.binding.retry_policy.max_attempts ?? 0,
              backoffMs: raw.binding.retry_policy.backoff_ms ?? 0,
            }
          : null,
      },
    };
  }

  async requestFinalTurnTranslation(
    payload: FinalTurnTranslationRequest
  ): Promise<FinalTurnTranslationResponse> {
    const response = await fetch(this.buildPublicUrl("/v1/translate/turn-final"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        session_id: payload.sessionId,
        turn_id: payload.turnId,
        source_revision: payload.sourceRevision,
        text: payload.text,
        speaker_label: payload.speakerLabel ?? null,
        source_language: payload.sourceLanguage ?? null,
        target_language: payload.targetLanguage,
        start_ms:
          typeof payload.startMs === "number" && Number.isFinite(payload.startMs)
            ? Math.max(0, Math.round(payload.startMs))
            : null,
        end_ms:
          typeof payload.endMs === "number" && Number.isFinite(payload.endMs)
            ? Math.max(0, Math.round(payload.endMs))
            : null,
      }),
    });

    const raw = (await (await this.ensureOk(response)).json()) as RawFinalTurnTranslationResponse;

    return {
      translationId: raw.translation_id ?? "",
      sessionId: raw.session_id ?? payload.sessionId,
      turnId: raw.turn_id ?? payload.turnId,
      scope: raw.scope ?? "turn",
      sourceRevision: raw.source_revision ?? payload.sourceRevision,
      sourceLanguage: raw.source_language ?? payload.sourceLanguage ?? null,
      targetLanguage: raw.target_language ?? payload.targetLanguage,
      text: (raw.text ?? "").trim(),
      requestedAt: raw.requested_at ?? new Date().toISOString(),
      completedAt: raw.completed_at ?? new Date().toISOString(),
      binding: {
        featureKey: "translate.turn_final",
        resolvedBackendProfileId: raw.binding?.resolved_backend_profile_id ?? "",
        fallbackBackendProfileId: raw.binding?.fallback_backend_profile_id ?? null,
        usedFallback: raw.binding?.used_fallback ?? false,
        providerLabel: raw.binding?.provider_label ?? "",
        model: raw.binding?.model ?? null,
        timeoutMs: raw.binding?.timeout_ms ?? null,
        retryPolicy: raw.binding?.retry_policy
          ? {
              maxAttempts: raw.binding.retry_policy.max_attempts ?? 0,
              backoffMs: raw.binding.retry_policy.backoff_ms ?? 0,
            }
          : null,
      },
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
      backendAdminTokenRequired:
        typeof raw.backend_admin_token_required === "boolean"
          ? raw.backend_admin_token_required
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

  async getBackendProfiles(options?: { adminToken?: string }): Promise<BackendProfile[]> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/profiles"), {
      method: "GET",
      headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendProfilesResponse;
    const records = Array.isArray(raw) ? raw : raw.profiles ?? [];
    return records.map((record) => normalizeBackendProfileRecord(record));
  }

  async getBackendProfileHealth(
    profileId: string,
    options?: { adminToken?: string; refresh?: boolean }
  ): Promise<{
    profileId: string;
    refreshed: boolean;
    health: BackendHealthSnapshot;
  }> {
    const searchParams = new URLSearchParams();
    if (options?.refresh) {
      searchParams.set("refresh", "true");
    }
    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
    const response = await fetch(
      this.buildAdminUrl(
        `/v1/backend/profiles/${encodeURIComponent(profileId)}/health${suffix}`
      ),
      {
        method: "GET",
        headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
      }
    );
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendProfileHealthResponse;
    return normalizeBackendProfileHealthResponse(raw);
  }

  async upsertBackendProfile(
    profile: BackendProfile,
    options?: { adminToken?: string }
  ): Promise<BackendProfile> {
    const rawProfile = denormalizeBackendProfileRecord(profile);
    const response = await fetch(this.buildAdminUrl(`/v1/backend/profiles/${encodeURIComponent(profile.id)}`), {
      method: "PUT",
      headers: this.withAdminHeaders(
        {
          "Content-Type": "application/json",
        },
        options?.adminToken
      ),
      body: JSON.stringify(rawProfile),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendProfileRecord;
    return normalizeBackendProfileRecord(raw);
  }

  async deleteBackendProfile(profileId: string, options?: { adminToken?: string }): Promise<void> {
    const response = await fetch(
      this.buildAdminUrl(`/v1/backend/profiles/${encodeURIComponent(profileId)}`),
      {
        method: "DELETE",
        headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
      }
    );
    await this.ensureOk(response);
  }

  async getFeatureBindings(options?: { adminToken?: string }): Promise<FeatureBinding[]> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/bindings"), {
      method: "GET",
      headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawFeatureBindingsResponse;
    const records = Array.isArray(raw) ? raw : raw.bindings ?? [];
    return records.map((record) => normalizeFeatureBindingRecord(record));
  }

  async upsertFeatureBinding(
    binding: FeatureBinding,
    options?: { adminToken?: string }
  ): Promise<FeatureBinding> {
    const rawBinding = denormalizeFeatureBindingRecord(binding);
    const response = await fetch(
      this.buildAdminUrl(`/v1/backend/bindings/${encodeURIComponent(binding.featureKey)}`),
      {
        method: "PUT",
        headers: this.withAdminHeaders(
          {
            "Content-Type": "application/json",
          },
          options?.adminToken
        ),
        body: JSON.stringify(rawBinding),
      }
    );
    const raw = (await (await this.ensureOk(response)).json()) as RawFeatureBindingRecord;
    return normalizeFeatureBindingRecord(raw);
  }

  async deleteFeatureBinding(
    featureKey: FeatureBinding["featureKey"],
    options?: { adminToken?: string }
  ): Promise<void> {
    const response = await fetch(
      this.buildAdminUrl(`/v1/backend/bindings/${encodeURIComponent(featureKey)}`),
      {
        method: "DELETE",
        headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
      }
    );
    await this.ensureOk(response);
  }

  async getBackendCapabilities(
    options?: { adminToken?: string }
  ): Promise<BackendCapabilitiesState> {
    const response = await fetch(this.buildAdminUrl("/v1/backend/capabilities"), {
      method: "GET",
      headers: this.withAdminHeaders({ Accept: "application/json" }, options?.adminToken),
    });
    const raw = (await (await this.ensureOk(response)).json()) as RawBackendCapabilitiesState;
    return normalizeBackendCapabilitiesState(raw);
  }
}
