import { describe, expect, it } from "vitest";
import {
  classifyRealtimeStreamingPayload,
  normalizeRealtimeSegmentPayload,
} from "./realtimeStreamingPayload";

describe("realtimeStreamingPayload", () => {
  it("normalizes nested final payloads", () => {
    const payload = {
      type: "result",
      results: [
        {
          alternatives: [
            {
              text: "hello world",
              start_at: 120,
              duration: 380,
              speaker_label: "Speaker 1",
              language: "en",
              words: [
                { text: "hello", start_at: 120, duration: 100, confidence: 0.9 },
                { text: "world", start_at: 240, duration: 120, confidence: 0.8 },
              ],
            },
          ],
        },
      ],
    };

    const classified = classifyRealtimeStreamingPayload(payload);

    expect(classified.kind).toBe("final");
    if (classified.kind !== "final") {
      throw new Error("expected final payload");
    }
    expect(classified.segment.text).toBe("hello world");
    expect(classified.segment.startMs).toBe(120);
    expect(classified.segment.endMs).toBe(500);
    expect(classified.segment.speakerLabel).toBe("Speaker 1");
    expect(classified.segment.language).toBe("en");
    expect(classified.segment.words?.map((word) => word.text)).toEqual(["hello", "world"]);
  });

  it("prefers the nested alternative that carries timing over wrapper event text", () => {
    const normalized = normalizeRealtimeSegmentPayload({
      type: "result",
      text: "wrapper status text",
      results: [
        {
          alternatives: [
            {
              text: "final transcript text",
              start_at: 1000,
              duration: 250,
              words: [
                { text: "final", start_at: 1000, duration: 100 },
                { text: "text", start_at: 1120, duration: 130 },
              ],
            },
          ],
        },
      ],
    });

    expect(normalized.text).toBe("final transcript text");
    expect(normalized.startMs).toBe(1000);
    expect(normalized.endMs).toBe(1250);
  });

  it("classifies loose partial payloads", () => {
    const classified = classifyRealtimeStreamingPayload({
      partial: "draft text",
      start_ms: "20",
    });

    expect(classified.kind).toBe("partial");
    if (classified.kind !== "partial") {
      throw new Error("expected partial payload");
    }
    expect(classified.segment.text).toBe("draft text");
    expect(classified.segment.startMs).toBe(20);
  });

  it("returns error payloads without normalizing segments", () => {
    expect(classifyRealtimeStreamingPayload({ type: "error", message: "bad config" })).toEqual({
      kind: "error",
      message: "bad config",
    });
  });

  it("falls back to word timing for raw text", () => {
    const normalized = normalizeRealtimeSegmentPayload({
      type: "final",
      text: "hello world",
      words: [
        { word: "hello", start_ms: 0, end_ms: 200 },
        { word: "world", start_ms: 250, end_ms: 400 },
      ],
    });

    expect(normalized.rawText).toBe("hello world");
    expect(normalized.words?.[1].endMs).toBe(400);
  });
});
