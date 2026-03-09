import { buildCharNgrams } from "./textIndexing";

export type ParsedSearchQuery = {
  groups: string[][];
  excludes: string[];
};

export type SearchIndexSnapshot = {
  normalizedTranscript?: string;
  tokenSet?: string[];
  ngramSet?: string[];
};

type Token = {
  value: string;
  quoted: boolean;
};

function tokenizeSearchQuery(input: string): Token[] {
  const tokens: Token[] = [];
  let buffer = "";
  let insideQuote = false;
  let tokenQuoted = false;

  for (const char of input) {
    if (char === '"') {
      insideQuote = !insideQuote;
      if (insideQuote) {
        tokenQuoted = true;
      }
      continue;
    }
    if (insideQuote) {
      buffer += char;
      continue;
    }
    if (/\s/.test(char)) {
      if (buffer.length > 0) {
        tokens.push({ value: buffer, quoted: tokenQuoted });
        buffer = "";
        tokenQuoted = false;
      }
      continue;
    }
    buffer += char;
  }

  if (buffer.length > 0) {
    tokens.push({ value: buffer, quoted: tokenQuoted });
  }

  return tokens;
}

function normalizeTerm(value: string): string {
  return value.toLowerCase();
}

function isOrOperator(token: Token, normalizedValue: string, hasPrefix: boolean): boolean {
  if (token.quoted || hasPrefix) {
    return false;
  }
  return normalizedValue === "or";
}

export function parseSearchQuery(input: string): ParsedSearchQuery {
  const tokens = tokenizeSearchQuery(input || "");
  const groups: string[][] = [];
  const excludes: string[] = [];
  let currentGroup: string[] = [];

  const commitGroup = () => {
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    currentGroup = [];
  };

  for (const token of tokens) {
    const trimmed = token.value.trim();
    if (!trimmed) {
      continue;
    }
    const hasPrefix = trimmed.startsWith("-") && trimmed.length > 1;
    const termWithoutPrefix = hasPrefix ? trimmed.slice(1).trim() : trimmed;
    if (!termWithoutPrefix) {
      continue;
    }
    const normalized = normalizeTerm(termWithoutPrefix);

    if (isOrOperator(token, normalized, hasPrefix)) {
      commitGroup();
      continue;
    }

    if (hasPrefix) {
      excludes.push(normalized);
    } else {
      currentGroup.push(normalized);
    }
  }

  commitGroup();

  return {
    groups,
    excludes,
  };
}

export function matchesSearchQuery(
  sourceText: string | undefined,
  query: ParsedSearchQuery | string
): boolean {
  const parsed = typeof query === "string" ? parseSearchQuery(query) : query;
  if (parsed.groups.length === 0 && parsed.excludes.length === 0) {
    return true;
  }
  const haystack = sourceText?.toLowerCase() ?? "";
  if (parsed.excludes.some((term) => term && haystack.includes(term))) {
    return false;
  }
  if (parsed.groups.length === 0) {
    return true;
  }
  return parsed.groups.some((group) => group.every((term) => haystack.includes(term)));
}

function ensureSearchSets(index?: SearchIndexSnapshot) {
  if (!index) {
    return { tokenSet: undefined, ngramSet: undefined };
  }
  const tokenSet = index.tokenSet ? new Set(index.tokenSet) : undefined;
  const ngramSet = index.ngramSet ? new Set(index.ngramSet) : undefined;
  return { tokenSet, ngramSet };
}

function containsTermUsingIndex(
  normalizedTerm: string,
  normalizedText: string,
  tokenSet?: Set<string>,
  ngramSet?: Set<string>
) {
  if (!normalizedTerm) {
    return true;
  }
  const isPhrase = normalizedTerm.includes(" ");
  if (isPhrase) {
    return normalizedText.includes(normalizedTerm);
  }
  if (tokenSet && tokenSet.has(normalizedTerm)) {
    return true;
  }
  if (normalizedTerm.length >= 3 && ngramSet) {
    const grams = buildCharNgrams(normalizedTerm, 3);
    if (grams.length > 0 && grams.every((gram) => ngramSet.has(gram))) {
      return true;
    }
  }
  return normalizedText.includes(normalizedTerm);
}

export function matchesSearchQueryWithIndex(
  query: ParsedSearchQuery,
  index?: SearchIndexSnapshot,
  fallbackText?: string
): boolean {
  if (query.groups.length === 0 && query.excludes.length === 0) {
    return true;
  }
  const normalizedText =
    index?.normalizedTranscript ?? fallbackText?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
  const { tokenSet, ngramSet } = ensureSearchSets(index);

  if (
    query.excludes.some((term) =>
      containsTermUsingIndex(term.toLowerCase(), normalizedText, tokenSet, ngramSet)
    )
  ) {
    return false;
  }
  if (query.groups.length === 0) {
    return true;
  }
  return query.groups.some((group) =>
    group.every((term) => containsTermUsingIndex(term.toLowerCase(), normalizedText, tokenSet, ngramSet))
  );
}
