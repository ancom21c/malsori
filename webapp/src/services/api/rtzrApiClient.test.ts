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
});
