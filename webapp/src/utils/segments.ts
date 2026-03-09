import type { LocalSegment } from "../data/app-db";

export function resolveSegmentText(segment: LocalSegment, preferCorrected = false) {
  if (preferCorrected) {
    const corrected = segment.correctedText;
    if (corrected && corrected.trim().length > 0) {
      return corrected;
    }
  }
  return segment.text ?? "";
}

export function aggregateSegmentText(
  segments: LocalSegment[] | undefined,
  preferCorrected: boolean
): string | undefined {
  if (!segments || segments.length === 0) {
    return undefined;
  }
  const entries = segments
    .map((segment) => resolveSegmentText(segment, preferCorrected).trim())
    .filter((text) => text.length > 0);
  if (!entries.length) {
    return undefined;
  }
  return entries.join("\n");
}

export function getSegmentStartMs(segment: LocalSegment): number | null {
  if (typeof segment.startMs === "number" && Number.isFinite(segment.startMs)) {
    return segment.startMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[0].startMs;
  }
  return null;
}

export function getSegmentEndMs(segment: LocalSegment): number | null {
  if (typeof segment.endMs === "number" && Number.isFinite(segment.endMs)) {
    return segment.endMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[segment.words.length - 1].endMs;
  }
  return null;
}

export function segmentHasTiming(segment: LocalSegment): boolean {
  if (segment.hasTiming === false) {
    return Boolean(segment.words && segment.words.length > 0);
  }
  if (segment.words && segment.words.length > 0) {
    return true;
  }
  return (
    (typeof segment.startMs === "number" && Number.isFinite(segment.startMs)) ||
    (typeof segment.endMs === "number" && Number.isFinite(segment.endMs))
  );
}

const WORD_TIMING_RELATIVE_TOLERANCE_MS = 250;

export function resolveWordTimingMs(
  segment: LocalSegment,
  word: { startMs?: number | null; endMs?: number | null }
): { startMs: number; durationMs: number } {
  const segmentStart = getSegmentStartMs(segment) ?? 0;
  const segmentEnd = getSegmentEndMs(segment);
  const hasSegmentDuration =
    segmentEnd !== null && typeof segmentEnd === "number" && segmentEnd >= segmentStart;
  const segmentDuration = hasSegmentDuration ? segmentEnd - segmentStart : null;

  const normalizeSource = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const rawStart = normalizeSource(word.startMs);
  const rawEnd = normalizeSource(word.endMs);

  const isWithinDurationRange = (value: number | null) => {
    if (value === null || segmentDuration === null) {
      return true;
    }
    return value <= segmentDuration + WORD_TIMING_RELATIVE_TOLERANCE_MS;
  };

  const startLooksRelative =
    rawStart !== null &&
    segmentStart > WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    rawStart < segmentStart - WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    isWithinDurationRange(rawStart);

  const endLooksRelative =
    rawEnd !== null &&
    segmentStart > WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    rawEnd < segmentStart - WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    isWithinDurationRange(rawEnd);

  const normalizedStart =
    rawStart !== null
      ? startLooksRelative
        ? segmentStart + rawStart
        : rawStart
      : endLooksRelative && rawEnd !== null
        ? segmentStart + rawEnd
        : segmentStart;

  const normalizedEndCandidate =
    rawEnd !== null
      ? endLooksRelative
        ? segmentStart + rawEnd
        : rawEnd
      : startLooksRelative && rawStart !== null
        ? segmentStart + rawStart
        : segmentEnd ?? segmentStart;

  const normalizedEnd =
    normalizedEndCandidate !== null && normalizedEndCandidate >= normalizedStart
      ? normalizedEndCandidate
      : normalizedStart;

  return {
    startMs: normalizedStart,
    durationMs: normalizedEnd - normalizedStart,
  };
}
