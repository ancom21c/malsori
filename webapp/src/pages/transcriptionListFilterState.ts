import dayjs from "dayjs";
import type { LocalTranscriptionKind } from "../data/app-db";

export const ALL_TRANSCRIPTION_LIST_FILTER_KINDS: LocalTranscriptionKind[] = [
  "file",
  "realtime",
];

const VALID_KINDS = new Set<LocalTranscriptionKind>(ALL_TRANSCRIPTION_LIST_FILTER_KINDS);
const EMPTY_KIND_SENTINEL = "none";

export type TranscriptionListFilterState = {
  titleQuery: string;
  contentQuery: string;
  startDate: string;
  endDate: string;
  selectedKinds: LocalTranscriptionKind[];
  selectedModels: string[];
  selectedEndpoints: string[];
};

export const DEFAULT_TRANSCRIPTION_LIST_FILTER_STATE: TranscriptionListFilterState = {
  titleQuery: "",
  contentQuery: "",
  startDate: "",
  endDate: "",
  selectedKinds: [...ALL_TRANSCRIPTION_LIST_FILTER_KINDS],
  selectedModels: [],
  selectedEndpoints: [],
};

function normalizeQueryText(value: string | null): string {
  return value?.trim() ?? "";
}

function normalizeDateValue(value: string | null): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return "";
  }
  return dayjs(normalized).isValid() && dayjs(normalized).format("YYYY-MM-DD") === normalized
    ? normalized
    : "";
}

function normalizeStringList(values: string[], transform?: (value: string) => string): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const nextValue = transform ? transform(trimmed) : trimmed;
    if (!nextValue || seen.has(nextValue)) {
      return;
    }
    seen.add(nextValue);
    normalized.push(nextValue);
  });

  return normalized;
}

export function parseTranscriptionListFilterState(
  searchParams: URLSearchParams
): TranscriptionListFilterState {
  const rawKinds = normalizeStringList(searchParams.getAll("kind"));
  const parsedKinds = rawKinds.filter(
    (value): value is LocalTranscriptionKind => VALID_KINDS.has(value as LocalTranscriptionKind)
  );
  const explicitEmptyKinds = rawKinds.includes(EMPTY_KIND_SENTINEL) && parsedKinds.length === 0;

  return {
    titleQuery: normalizeQueryText(searchParams.get("title")),
    contentQuery: normalizeQueryText(searchParams.get("content")),
    startDate: normalizeDateValue(searchParams.get("start")),
    endDate: normalizeDateValue(searchParams.get("end")),
    selectedKinds: explicitEmptyKinds
      ? []
      : parsedKinds.length > 0
        ? parsedKinds
        : [...ALL_TRANSCRIPTION_LIST_FILTER_KINDS],
    selectedModels: normalizeStringList(searchParams.getAll("model"), (value) => value.toLowerCase()),
    selectedEndpoints: normalizeStringList(searchParams.getAll("endpoint")),
  };
}

export function buildTranscriptionListFilterSearchParams(
  state: TranscriptionListFilterState
): URLSearchParams {
  const searchParams = new URLSearchParams();
  const titleQuery = normalizeQueryText(state.titleQuery);
  const contentQuery = normalizeQueryText(state.contentQuery);
  const startDate = normalizeDateValue(state.startDate);
  const endDate = normalizeDateValue(state.endDate);
  const selectedKinds = normalizeStringList(state.selectedKinds);
  const selectedModels = normalizeStringList(state.selectedModels, (value) => value.toLowerCase());
  const selectedEndpoints = normalizeStringList(state.selectedEndpoints);

  if (titleQuery) {
    searchParams.set("title", titleQuery);
  }
  if (contentQuery) {
    searchParams.set("content", contentQuery);
  }
  if (startDate) {
    searchParams.set("start", startDate);
  }
  if (endDate) {
    searchParams.set("end", endDate);
  }
  if (selectedKinds.length === 0) {
    searchParams.set("kind", EMPTY_KIND_SENTINEL);
  } else if (selectedKinds.length < ALL_TRANSCRIPTION_LIST_FILTER_KINDS.length) {
    selectedKinds.forEach((kind) => searchParams.append("kind", kind));
  }
  selectedModels.forEach((model) => searchParams.append("model", model));
  selectedEndpoints.forEach((endpoint) => searchParams.append("endpoint", endpoint));

  return searchParams;
}

export function areTranscriptionListFilterStatesEqual(
  left: TranscriptionListFilterState,
  right: TranscriptionListFilterState
): boolean {
  return (
    left.titleQuery === right.titleQuery &&
    left.contentQuery === right.contentQuery &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.selectedKinds.length === right.selectedKinds.length &&
    left.selectedKinds.every((value, index) => value === right.selectedKinds[index]) &&
    left.selectedModels.length === right.selectedModels.length &&
    left.selectedModels.every((value, index) => value === right.selectedModels[index]) &&
    left.selectedEndpoints.length === right.selectedEndpoints.length &&
    left.selectedEndpoints.every((value, index) => value === right.selectedEndpoints[index])
  );
}
