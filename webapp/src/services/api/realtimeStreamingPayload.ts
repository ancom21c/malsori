import type { LocalWordTiming } from "../../data/app-db";

export type NormalizedRealtimeSegmentPayload = {
  text: string;
  rawText?: string;
  startMs?: number;
  endMs?: number;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  words?: LocalWordTiming[];
};

export type ClassifiedRealtimeStreamingPayload =
  | { kind: "final"; segment: NormalizedRealtimeSegmentPayload }
  | { kind: "partial"; segment: NormalizedRealtimeSegmentPayload }
  | { kind: "error"; message?: string }
  | { kind: "ignore" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function coerceBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

type CandidateRecordEntry = {
  record: Record<string, unknown>;
  depth: number;
  order: number;
};

function collectCandidateRecordEntries(payload: unknown): CandidateRecordEntry[] {
  const records: CandidateRecordEntry[] = [];
  let order = 0;
  const traverse = (entry: unknown, depth: number) => {
    if (Array.isArray(entry)) {
      entry.forEach((item) => traverse(item, depth));
      return;
    }
    if (!isRecord(entry)) {
      return;
    }
    records.push({ record: entry, depth, order: order++ });
    const nested = entry.results;
    if (nested !== undefined) {
      traverse(nested, depth + 1);
    }
    const utterances = entry.utterances;
    if (utterances !== undefined) {
      traverse(utterances, depth + 1);
    }
    const alternatives = entry.alternatives;
    if (alternatives !== undefined) {
      traverse(alternatives, depth + 1);
    }
  };
  traverse(payload, 0);
  return records;
}

function getTextCandidate(record: Record<string, unknown>): string | undefined {
  return [record.text, record.transcript, record.msg, record.partial].find(isNonEmptyString);
}

function hasTimestamp(record: Record<string, unknown>): boolean {
  return [
    "startMs",
    "start_ms",
    "start",
    "start_at",
    "endMs",
    "end_ms",
    "end",
    "end_at",
    "durationMs",
    "duration_ms",
    "duration",
  ].some((field) => coerceFiniteNumber(record[field]) !== undefined);
}

function hasWordTimings(record: Record<string, unknown>): boolean {
  return Array.isArray(record.words) && record.words.length > 0;
}

function selectPrimaryTextEntry(entries: CandidateRecordEntry[]): CandidateRecordEntry | undefined {
  const textEntries = entries.filter((entry) => getTextCandidate(entry.record));
  if (!textEntries.length) {
    return undefined;
  }
  return [...textEntries].sort((a, b) => {
    const score = (entry: CandidateRecordEntry) =>
      (hasTimestamp(entry.record) ? 100 : 0) +
      (hasWordTimings(entry.record) ? 50 : 0) +
      entry.depth * 10 -
      entry.order;
    return score(b) - score(a);
  })[0];
}

function pickFirstString(records: Array<Record<string, unknown>>, fields: string[]): string | undefined {
  for (const record of records) {
    for (const field of fields) {
      const value = record[field];
      if (isNonEmptyString(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function pickTimestamp(records: Array<Record<string, unknown>>, fields: string[]): number | undefined {
  for (const record of records) {
    for (const field of fields) {
      const value = coerceFiniteNumber(record[field]);
      if (value !== undefined) {
        return value;
      }
    }
  }
  return undefined;
}

function normalizeWordFromRecord(word: unknown): LocalWordTiming | null {
  if (!isRecord(word)) {
    return null;
  }
  const textCandidate = word.text ?? word.word ?? word.msg;
  if (!isNonEmptyString(textCandidate)) {
    return null;
  }
  const startValue = pickTimestamp([word], ["startMs", "start_ms", "start", "start_at"]);
  const endValue = pickTimestamp([word], ["endMs", "end_ms", "end", "end_at"]);
  const durationValue = pickTimestamp([word], ["duration", "duration_ms", "durationMs"]);
  const normalizedStart = startValue !== undefined ? Math.max(0, Math.round(startValue)) : undefined;
  const normalizedEnd =
    endValue !== undefined
      ? Math.max(0, Math.round(endValue))
      : normalizedStart !== undefined && durationValue !== undefined
        ? Math.max(0, Math.round(normalizedStart + durationValue))
        : undefined;
  const startMs = normalizedStart ?? normalizedEnd ?? 0;
  const endMs = normalizedEnd ?? startMs;
  const confidenceValue = word.confidence;
  return {
    text: textCandidate,
    startMs,
    endMs,
    confidence: typeof confidenceValue === "number" ? confidenceValue : undefined,
  };
}

function collectWordTimings(records: Array<Record<string, unknown>>): LocalWordTiming[] | undefined {
  const collected: LocalWordTiming[] = [];
  for (const record of records) {
    const wordsField = record.words;
    if (Array.isArray(wordsField)) {
      for (const word of wordsField) {
        const normalized = normalizeWordFromRecord(word);
        if (normalized) {
          collected.push(normalized);
        }
      }
    }
  }
  if (!collected.length) {
    return undefined;
  }
  collected.sort((a, b) => a.startMs - b.startMs);
  return collected;
}

export function normalizeRealtimeSegmentPayload(
  payload: unknown
): NormalizedRealtimeSegmentPayload {
  const candidateEntries = collectCandidateRecordEntries(payload);
  if (candidateEntries.length === 0) {
    candidateEntries.push({ record: {}, depth: 0, order: 0 });
  }

  const primaryTextEntry = selectPrimaryTextEntry(candidateEntries);
  const candidateRecords = candidateEntries.map((entry) => entry.record);
  const prioritizedRecords = primaryTextEntry
    ? [
        primaryTextEntry.record,
        ...candidateRecords.filter((record) => record !== primaryTextEntry.record),
      ]
    : candidateRecords;
  const text = primaryTextEntry ? getTextCandidate(primaryTextEntry.record) ?? "" : "";

  const startValue = pickTimestamp(prioritizedRecords, [
    "startMs",
    "start_ms",
    "start",
    "start_at",
  ]);
  const endValue = pickTimestamp(prioritizedRecords, [
    "endMs",
    "end_ms",
    "end",
    "end_at",
  ]);
  const durationValue = pickTimestamp(prioritizedRecords, [
    "durationMs",
    "duration_ms",
    "duration",
  ]);

  const normalizedStart = startValue !== undefined ? Math.max(0, Math.round(startValue)) : undefined;
  const normalizedEnd =
    endValue !== undefined
      ? Math.max(0, Math.round(endValue))
      : normalizedStart !== undefined && durationValue !== undefined
        ? Math.max(0, Math.round(normalizedStart + durationValue))
        : undefined;

  const spk = pickFirstString(prioritizedRecords, ["spk", "speaker"]) ?? "0";
  const speakerLabel = pickFirstString(prioritizedRecords, ["speaker_label", "speaker_name"]);
  const language = pickFirstString(prioritizedRecords, ["language", "lang"]);
  const words = collectWordTimings(prioritizedRecords);
  const rawText =
    pickFirstString(prioritizedRecords, ["raw_text", "rawText"]) ||
    (words ? words.map((word) => word.text).join(" ") : undefined);

  return {
    text,
    rawText,
    startMs: normalizedStart,
    endMs: normalizedEnd,
    spk,
    speakerLabel,
    language,
    words,
  };
}

function extractPayloadType(payload: Record<string, unknown>): string | undefined {
  const value = payload.type ?? payload.event ?? payload.state;
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

export function classifyRealtimeStreamingPayload(
  payload: unknown
): ClassifiedRealtimeStreamingPayload {
  const payloadRecord = isRecord(payload) ? payload : {};
  const payloadType = extractPayloadType(payloadRecord);

  if (payloadType === "error") {
    return {
      kind: "error",
      message: typeof payloadRecord.message === "string" ? payloadRecord.message : undefined,
    };
  }

  const rawPartialField = payloadRecord.partial;
  const finalFlag =
    coerceBooleanFlag(payloadRecord.is_final) ??
    coerceBooleanFlag(payloadRecord.final);
  const partialFlag =
    coerceBooleanFlag(payloadRecord.is_partial) ??
    coerceBooleanFlag(rawPartialField);
  const typeIndicatesFinal =
    payloadType === "final" || payloadType === "result" || payloadType === "transcript";
  const typeIndicatesPartial =
    payloadType === "partial" || payloadType === "intermediate" || payloadType === "hypothesis";
  const treatAsFinal = finalFlag !== undefined ? finalFlag : typeIndicatesFinal;
  const hasLoosePartial = partialFlag === undefined && Boolean(rawPartialField);
  const treatAsPartial =
    !treatAsFinal &&
    (partialFlag === true || finalFlag === false || typeIndicatesPartial || hasLoosePartial);

  if (treatAsFinal) {
    return { kind: "final", segment: normalizeRealtimeSegmentPayload(payload) };
  }
  if (treatAsPartial) {
    return { kind: "partial", segment: normalizeRealtimeSegmentPayload(payload) };
  }
  return { kind: "ignore" };
}
