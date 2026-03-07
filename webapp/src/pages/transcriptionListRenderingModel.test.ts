import { describe, expect, it } from "vitest";
import {
  LARGE_TRANSCRIPTION_LIST_INCREMENT_COUNT,
  LARGE_TRANSCRIPTION_LIST_INITIAL_RENDER_COUNT,
  LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD,
  getOptimizedTranscriptionListVisibleCount,
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

  it("returns incremental visible counts for optimized mode", () => {
    expect(getOptimizedTranscriptionListVisibleCount(0, 1)).toBe(0);
    expect(getOptimizedTranscriptionListVisibleCount(20, 1)).toBe(20);
    expect(getOptimizedTranscriptionListVisibleCount(120, 1)).toBe(
      LARGE_TRANSCRIPTION_LIST_INITIAL_RENDER_COUNT
    );
    expect(getOptimizedTranscriptionListVisibleCount(120, 2)).toBe(
      LARGE_TRANSCRIPTION_LIST_INITIAL_RENDER_COUNT + LARGE_TRANSCRIPTION_LIST_INCREMENT_COUNT
    );
    expect(getOptimizedTranscriptionListVisibleCount(120, 99)).toBe(120);
  });
});
