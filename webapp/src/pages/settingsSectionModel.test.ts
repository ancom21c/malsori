import { describe, expect, it } from "vitest";
import {
  normalizeSettingsSectionSearchParams,
  parseSettingsSectionQuery,
} from "./settingsSectionModel";

describe("settingsSectionModel", () => {
  it("parses known section ids", () => {
    expect(parseSettingsSectionQuery("backend")).toBe("backend");
    expect(parseSettingsSectionQuery("permissions")).toBe("permissions");
  });

  it("falls back to transcription for invalid or missing section ids", () => {
    expect(parseSettingsSectionQuery("unknown")).toBe("transcription");
    expect(parseSettingsSectionQuery(null)).toBe("transcription");
    expect(parseSettingsSectionQuery(undefined)).toBe("transcription");
  });

  it("normalizes invalid section search params to the active section", () => {
    const next = normalizeSettingsSectionSearchParams(
      new URLSearchParams("section=unknown&foo=bar"),
      "transcription"
    );

    expect(next?.toString()).toBe("section=transcription&foo=bar");
  });

  it("skips normalization when section is absent or already valid", () => {
    expect(
      normalizeSettingsSectionSearchParams(new URLSearchParams("foo=bar"), "transcription")
    ).toBeNull();
    expect(
      normalizeSettingsSectionSearchParams(
        new URLSearchParams("section=backend&foo=bar"),
        "backend"
      )
    ).toBeNull();
  });
});
