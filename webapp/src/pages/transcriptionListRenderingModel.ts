export const LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD = 100;
export const LARGE_TRANSCRIPTION_LIST_INITIAL_RENDER_COUNT = 40;
export const LARGE_TRANSCRIPTION_LIST_INCREMENT_COUNT = 40;

export type TranscriptionListRenderMode = "standard" | "optimized";

export function getTranscriptionListRenderMode(
  itemCount: number
): TranscriptionListRenderMode {
  return itemCount >= LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD ? "optimized" : "standard";
}

export function getOptimizedTranscriptionListVisibleCount(
  itemCount: number,
  expansionStep: number
): number {
  if (itemCount <= 0) {
    return 0;
  }
  const safeStep = Math.max(1, expansionStep);
  const visibleCount =
    LARGE_TRANSCRIPTION_LIST_INITIAL_RENDER_COUNT +
    (safeStep - 1) * LARGE_TRANSCRIPTION_LIST_INCREMENT_COUNT;
  return Math.min(itemCount, visibleCount);
}
