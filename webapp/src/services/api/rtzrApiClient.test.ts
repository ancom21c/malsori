import { afterEach, describe, expect, it, vi } from "vitest";
import { RtzrApiClient } from "./rtzrApiClient";
import { tStatic } from "../../i18n/static";

const originalFetch = globalThis.fetch;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("RtzrApiClient.getFileTranscriptionStatus", () => {
  it("treats a missing upstream status as processing during polling", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "job-missing-status",
        text: "partial text",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.getFileTranscriptionStatus("job-missing-status");

    expect(result.status).toBe("processing");
    expect(result.rawStatus).toBeUndefined();
    expect(result.statusReason).toBeUndefined();
  });

  it("keeps segments undefined when upstream payload omits the field", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "job-1",
        status: "processing",
        text: "partial text",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.getFileTranscriptionStatus("job-1");

    expect(result.status).toBe("processing");
    expect(result.segments).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("promotes unknown upstream status to failed and preserves the raw value", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "job-unknown",
        status: "archived_by_vendor",
        text: "partial text",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.getFileTranscriptionStatus("job-unknown");

    expect(result.status).toBe("failed");
    expect(result.rawStatus).toBe("archived_by_vendor");
    expect(result.statusReason).toBe("unknown_upstream_status");
  });

  it("normalizes speaker id/label fields from diverse segment shapes", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "job-2",
        status: "completed",
        segments: [
          {
            spk: "2",
            speaker_label: "Agent",
            start_ms: 120,
            duration: 80,
            msg: "안녕하세요",
          },
        ],
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.getFileTranscriptionStatus("job-2");
    const segment = result.segments?.[0];

    expect(segment).toBeTruthy();
    expect(segment?.spk).toBe("2");
    expect(segment?.speakerLabel).toBe("Agent");
    expect(segment?.speaker).toBe("Agent");
    expect(segment?.startMs).toBe(120);
    expect(segment?.endMs).toBe(200);
    expect(segment?.text).toBe("안녕하세요");
  });
});

describe("RtzrApiClient.requestFileTranscription", () => {
  it("treats a missing submit status as queued when the job id is present", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        transcribe_id: "job-submit-missing-status",
        created_at: "2026-03-08T00:00:00.000Z",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const file = new File(["hello"], "hello.wav", { type: "audio/wav" });
    const result = await client.requestFileTranscription({
      file,
      configJson: "{}",
      title: "hello",
    });

    expect(result.status).toBe("queued");
    expect(result.rawStatus).toBeUndefined();
    expect(result.statusReason).toBeUndefined();
  });

  it("preserves raw status detail when the submit response returns an unknown status", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        transcribe_id: "job-submit",
        status: "queued_on_partner_side",
        created_at: "2026-03-06T00:00:00.000Z",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const file = new File(["hello"], "hello.wav", { type: "audio/wav" });
    const result = await client.requestFileTranscription({
      file,
      configJson: "{}",
      title: "hello",
    });

    expect(result.status).toBe("failed");
    expect(result.rawStatus).toBe("queued_on_partner_side");
    expect(result.statusReason).toBe("unknown_upstream_status");
  });
});

describe("RtzrApiClient.requestFullSummary", () => {
  it("posts transcript turns to the public summary endpoint and normalizes the response", async () => {
    let capturedBody = "";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = String(init?.body ?? "");
      return jsonResponse({
        run_id: "run-1",
        session_id: "tx-1",
        mode: "full",
        scope: "session",
        trigger: "session_ready",
        regeneration_scope: null,
        preset_id: "meeting",
        preset_version: "2026-03-11",
        selection_source: "auto",
        source_revision: "rev-1",
        source_language: "ko",
        output_language: "ko",
        requested_at: "2026-03-12T00:00:00.000Z",
        completed_at: "2026-03-12T00:00:03.000Z",
        title: "Meeting summary",
        content: "Overview: Launch checklist confirmed.",
        partition_ids: [],
        supporting_snippets: [
          {
            id: "overview:turn-1:0",
            turn_id: "turn-1",
            speaker_label: "Alice",
            start_ms: 0,
            end_ms: 1200,
            text: "Let's confirm the launch checklist today.",
          },
        ],
        blocks: [
          {
            id: "overview",
            kind: "overview",
            title: "Overview",
            content: "Launch checklist confirmed.",
            supporting_snippets: [
              {
                id: "overview:turn-1:0",
                turn_id: "turn-1",
                speaker_label: "Alice",
                start_ms: 0,
                end_ms: 1200,
                text: "Let's confirm the launch checklist today.",
              },
            ],
          },
        ],
        binding: {
          feature_key: "artifact.summary",
          resolved_backend_profile_id: "summary-primary",
          fallback_backend_profile_id: "summary-fallback",
          used_fallback: false,
          provider_label: "Summary primary",
          model: "gpt-5-mini",
          timeout_ms: 30000,
          retry_policy: {
            max_attempts: 2,
            backoff_ms: 1000,
          },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.requestFullSummary({
      sessionId: "tx-1",
      title: "Launch review",
      sourceRevision: "rev-1",
      sourceLanguage: "ko",
      outputLanguage: "ko",
      selectionSource: "auto",
      trigger: "session_ready",
      regenerationScope: null,
      preset: {
        id: "meeting",
        version: "2026-03-11",
        label: "Meeting",
        description: "Highlights overview, decisions, owners, and open questions.",
        language: "auto",
        outputSchema: [
          {
            id: "overview",
            label: "Overview",
            kind: "narrative",
            required: true,
          },
        ],
      },
      turns: [
        {
          id: "turn-1",
          text: "Let's confirm the launch checklist today.",
          speakerLabel: "Alice",
          language: "ko",
          startMs: 0,
          endMs: 1200,
        },
      ],
    });

    expect(result.binding.resolvedBackendProfileId).toBe("summary-primary");
    expect(result.binding.retryPolicy).toEqual({ maxAttempts: 2, backoffMs: 1000 });
    expect(result.blocks[0].supportingSnippets[0].turnId).toBe("turn-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/summary/full",
      expect.objectContaining({ method: "POST" })
    );

    const body = JSON.parse(capturedBody || "{}");
    expect(body).toMatchObject({
      session_id: "tx-1",
      source_revision: "rev-1",
      selection_source: "auto",
      preset: {
        id: "meeting",
      },
      turns: [
        {
          id: "turn-1",
          speaker_label: "Alice",
          language: "ko",
          start_ms: 0,
          end_ms: 1200,
        },
      ],
    });
  });
});

describe("RtzrApiClient.requestFinalTurnTranslation", () => {
  it("posts translate.turn_final requests and normalizes the response", async () => {
    let capturedBody: string | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string | undefined;
      return jsonResponse({
        translation_id: "translation-1",
        session_id: "rt-1",
        turn_id: "turn-1",
        scope: "turn",
        source_revision: "turn-1:final:0:1200:ko:안녕하세요",
        source_language: "ko",
        target_language: "en",
        requested_at: "2026-03-12T00:00:00.000Z",
        completed_at: "2026-03-12T00:00:01.000Z",
        text: "Hello.",
        binding: {
          feature_key: "translate.turn_final",
          resolved_backend_profile_id: "translate-primary",
          fallback_backend_profile_id: "translate-fallback",
          used_fallback: false,
          provider_label: "Translate Primary",
          model: "gpt-4.1-mini",
          timeout_ms: 20000,
          retry_policy: {
            max_attempts: 2,
            backoff_ms: 1500,
          },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    const result = await client.requestFinalTurnTranslation({
      sessionId: "rt-1",
      turnId: "turn-1",
      sourceRevision: "turn-1:final:0:1200:ko:안녕하세요",
      text: "안녕하세요",
      speakerLabel: "Alice",
      sourceLanguage: "ko",
      targetLanguage: "en",
      startMs: 0,
      endMs: 1200,
    });

    expect(result.translationId).toBe("translation-1");
    expect(result.scope).toBe("turn");
    expect(result.binding.resolvedBackendProfileId).toBe("translate-primary");
    expect(result.binding.retryPolicy).toEqual({ maxAttempts: 2, backoffMs: 1500 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/translate/turn-final",
      expect.objectContaining({ method: "POST" })
    );

    const body = JSON.parse(capturedBody || "{}");
    expect(body).toMatchObject({
      session_id: "rt-1",
      turn_id: "turn-1",
      source_revision: "turn-1:final:0:1200:ko:안녕하세요",
      text: "안녕하세요",
      speaker_label: "Alice",
      source_language: "ko",
      target_language: "en",
      start_ms: 0,
      end_ms: 1200,
    });
  });
});

describe("RtzrApiClient backend error mapping", () => {
  it("maps standardized backend admin error codes to localized messages", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          detail: {
            error: {
              code: "BACKEND_ADMIN_UNAUTHORIZED",
              message: "Invalid backend admin token.",
            },
          },
        },
        401
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");

    await expect(client.getBackendEndpointState()).rejects.toThrow(
      tStatic("backendAdminUnauthorized")
    );
  });

  it("falls back to unknown error message for unmapped standardized codes", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          detail: {
            error: {
              code: "SOME_UNKNOWN_CODE",
              message: "Internal debug text",
            },
          },
        },
        500
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    await expect(client.getBackendEndpointState()).rejects.toThrow(
      tStatic("unknownErrorTryAgain")
    );
  });

  it("maps translate provider failures to localized messages", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          detail: {
            error: {
              code: "TRANSLATE_PROVIDER_REQUEST_FAILED",
              message: "Provider request failed",
            },
          },
        },
        502
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "/internal");
    await expect(
      client.requestFinalTurnTranslation({
        sessionId: "rt-1",
        turnId: "turn-1",
        sourceRevision: "rev-1",
        text: "안녕하세요",
        sourceLanguage: "ko",
        targetLanguage: "en",
      })
    ).rejects.toThrow(tStatic("translationProviderRequestFailed"));
  });

  it("uses the admin base url for backend endpoint requests", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        deployment: "cloud",
        api_base_url: "https://openapi.vito.ai",
        transcribe_path: "/v1/transcribe",
        streaming_path: "/v1/streaming",
        auth_enabled: true,
        has_client_id: true,
        has_client_secret: true,
        verify_ssl: true,
        source: "default",
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "https://internal.example.local");
    await client.getBackendEndpointState({ adminToken: "token" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://internal.example.local/v1/backend/endpoint",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("requests refreshed backend profile health snapshots from the admin surface", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        profile_id: "summary-primary",
        refreshed: true,
        health: {
          status: "healthy",
          checked_at: "2026-03-12T00:00:00.000Z",
          message: "HTTP 200",
        },
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new RtzrApiClient(() => "/", () => "https://internal.example.local");
    const result = await client.getBackendProfileHealth("summary-primary", {
      adminToken: "token",
      refresh: true,
    });

    expect(result).toEqual({
      profileId: "summary-primary",
      refreshed: true,
      health: {
        status: "healthy",
        checkedAt: "2026-03-12T00:00:00.000Z",
        message: "HTTP 200",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://internal.example.local/v1/backend/profiles/summary-primary/health?refresh=true",
      expect.objectContaining({ method: "GET" })
    );
  });
});
