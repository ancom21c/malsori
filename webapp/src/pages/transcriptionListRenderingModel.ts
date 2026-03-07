export const LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD = 100;

export type TranscriptionListRenderMode = "standard" | "optimized";

export function getTranscriptionListRenderMode(
  itemCount: number
): TranscriptionListRenderMode {
  return itemCount >= LARGE_TRANSCRIPTION_LIST_OPTIMIZATION_THRESHOLD ? "optimized" : "standard";
}
