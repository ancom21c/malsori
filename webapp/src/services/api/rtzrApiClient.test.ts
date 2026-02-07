import { afterEach, describe, expect, it, vi } from "vitest";
import { RtzrApiClient } from "./rtzrApiClient";

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

    const client = new RtzrApiClient(() => "/api");
    const result = await client.getFileTranscriptionStatus("job-1");

    expect(result.status).toBe("processing");
    expect(result.segments).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

    const client = new RtzrApiClient(() => "/api");
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
