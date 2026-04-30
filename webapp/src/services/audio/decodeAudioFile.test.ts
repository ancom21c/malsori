import { describe, expect, it } from "vitest";
import { extractSampleRateFromAudioConfig } from "./decodeAudioFile";

describe("decodeAudioFile helpers", () => {
  it("extracts snake-case and camel-case sample rates", () => {
    expect(extractSampleRateFromAudioConfig({ sample_rate: 8000 })).toBe(8000);
    expect(extractSampleRateFromAudioConfig({ sampleRate: 44100 })).toBe(44100);
  });

  it("falls back when the sample rate is missing or invalid", () => {
    expect(extractSampleRateFromAudioConfig({ sample_rate: 0 })).toBe(16000);
    expect(extractSampleRateFromAudioConfig({}, 22050)).toBe(22050);
  });
});
