import { describe, expect, it } from "vitest";
import { matchesSearchQuery, matchesSearchQueryWithIndex, parseSearchQuery } from "./textSearch";
import { buildCharNgrams, extractSearchTokens, normalizeSearchText } from "./textIndexing";

describe("textSearch", () => {
  it("parses operator precedence with OR", () => {
    const parsed = parseSearchQuery('alpha beta OR "gamma delta"');
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0]).toEqual(["alpha", "beta"]);
    expect(parsed.groups[1]).toEqual(["gamma delta"]);
  });

  it("matches when content satisfies any group", () => {
    const query = parseSearchQuery("foo bar OR baz");
    expect(matchesSearchQuery("foo and bar", query)).toBe(true);
    expect(matchesSearchQuery("maybe baz only", query)).toBe(true);
    expect(matchesSearchQuery("only foo", query)).toBe(false);
  });

  it("handles quoted negative terms", () => {
    const query = parseSearchQuery('-"noise words" essential');
    expect(matchesSearchQuery("essential value", query)).toBe(true);
    expect(matchesSearchQuery("essential noise words appear", query)).toBe(false);
  });

  it("supports exclusion-only queries", () => {
    const query = parseSearchQuery("-secret");
    expect(matchesSearchQuery("visible", query)).toBe(true);
    expect(matchesSearchQuery("top secret info", query)).toBe(false);
  });

  it("leverages cached token/ngram sets", () => {
    const source = "회의록 초안 버전";
    const normalized = normalizeSearchText(source);
    const index = {
      normalizedTranscript: normalized,
      tokenSet: extractSearchTokens(normalized),
      ngramSet: buildCharNgrams(normalized, 3),
    };
    const query = parseSearchQuery("회의록 -비공개");
    expect(matchesSearchQueryWithIndex(query, index, undefined)).toBe(true);
    const unmatched = parseSearchQuery("영업 OR 보안");
    expect(matchesSearchQueryWithIndex(unmatched, index, undefined)).toBe(false);
  });
});
