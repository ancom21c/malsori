import { describe, expect, it } from "vitest";
import { DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON } from "../data/defaultPresets";
import {
  buildTranscriptionDetailPath,
  resolveRealtimeStreamingConfigString,
} from "./realtimeSessionModel";

describe("resolveRealtimeStreamingConfigString", () => {
  it("prefers edited JSON when present", () => {
    expect(
      resolveRealtimeStreamingConfigString({
        draftJson: '{\n  "sample_rate": 8000\n}',
        activePresetConfigJson: '{"sample_rate":16000}',
        defaultPresetConfigJson: '{"sample_rate":44100}',
      })
    ).toBe('{\n  "sample_rate": 8000\n}');
  });

  it("ignores blank edited JSON and falls back to active preset", () => {
    expect(
      resolveRealtimeStreamingConfigString({
        draftJson: "   ",
        activePresetConfigJson: '{"sample_rate":16000}',
        defaultPresetConfigJson: '{"sample_rate":44100}',
      })
    ).toBe('{"sample_rate":16000}');
  });

  it("falls back to default preset and then known-good template", () => {
    expect(
      resolveRealtimeStreamingConfigString({
        activePresetConfigJson: null,
        defaultPresetConfigJson: '{"sample_rate":44100}',
      })
    ).toBe('{"sample_rate":44100}');

    expect(
      resolveRealtimeStreamingConfigString({
        activePresetConfigJson: null,
        defaultPresetConfigJson: null,
        fallbackConfigJson: null,
      })
    ).toBe(DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON);
  });
});

describe("buildTranscriptionDetailPath", () => {
  it("returns the canonical session detail route without extra spaces", () => {
    expect(buildTranscriptionDetailPath("abc-123")).toBe("/sessions/abc-123");
  });
});
