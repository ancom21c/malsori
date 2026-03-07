import { describe, expect, it } from "vitest";
import {
  LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD,
  getTranscriptionListRenderMode,
} from "./transcriptionListRenderingModel";

describe("transcriptionListRenderingModel", () => {
  it("keeps standard rendering below the optimization threshold", () => {
    expect(getTranscriptionListRenderMode(0)).toBe("standard");
    expect(
      getTranscriptionListRenderMode(LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD - 1)
    ).toBe("standard");
  });

  it("switches to optimized rendering at the threshold", () => {
    expect(
      getTranscriptionListRenderMode(LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD)
    ).toBe("optimized");
    expect(
      getTranscriptionListRenderMode(LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD + 100)
    ).toBe("optimized");
  });
});
