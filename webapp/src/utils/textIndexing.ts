const TOKEN_REGEX = /[\p{Letter}\p{Number}]+/gu;

export function normalizeSearchText(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const lowered = value.toLowerCase().replace(/\s+/g, " ").trim();
  return lowered.length > 0 ? lowered : undefined;
}

export function extractSearchTokens(text: string | undefined): string[] {
  if (!text) {
    return [];
  }
  const matches = text.match(TOKEN_REGEX);
  if (!matches) {
    return [];
  }
  const unique = new Set<string>();
  for (const token of matches) {
    const trimmed = token.trim();
    if (trimmed.length === 0) continue;
    unique.add(trimmed);
  }
  return Array.from(unique.values());
}

export function buildCharNgrams(text: string | undefined, size = 3): string[] {
  if (!text || size <= 0) {
    return [];
  }
  const normalized = text.replace(/[\s\p{P}\p{S}]+/gu, "");
  if (normalized.length < size) {
    return normalized ? [normalized] : [];
  }
  const set = new Set<string>();
  for (let i = 0; i <= normalized.length - size; i += 1) {
    const slice = normalized.slice(i, i + size);
    if (slice.trim().length === 0) continue;
    set.add(slice);
  }
  return Array.from(set.values());
}
