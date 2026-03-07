import { describe, expect, it } from "vitest";
import {
  buildConnectionSettingsUpdatePlan,
  hasConnectionSettingsDraftChanges,
  shouldBlockOperatorActions,
} from "./settingsConnectionModel";

describe("settingsConnectionModel", () => {
  it("treats edited connection inputs as dirty before save", () => {
    expect(
      hasConnectionSettingsDraftChanges(
        { apiBaseUrl: "/", adminApiBaseUrl: "/internal" },
        { apiBaseUrl: "https://api.example.com", adminApiBaseUrl: "/internal" }
      )
    ).toBe(true);
  });

  it("normalizes draft values and returns only changed persisted settings", () => {
    expect(
      buildConnectionSettingsUpdatePlan(
        { apiBaseUrl: "/", adminApiBaseUrl: "/internal" },
        { apiBaseUrl: " https://api.example.com/ ", adminApiBaseUrl: "  /internal  " }
      )
    ).toEqual([{ key: "apiBaseUrl", value: "https://api.example.com/" }]);
  });

  it("avoids store writes when the draft only differs by empty or whitespace defaults", () => {
    expect(
      buildConnectionSettingsUpdatePlan(
        { apiBaseUrl: "/", adminApiBaseUrl: "" },
        { apiBaseUrl: "", adminApiBaseUrl: "   " }
      )
    ).toEqual([]);
  });

  it("blocks operator actions while the draft is dirty or being saved", () => {
    expect(shouldBlockOperatorActions(true, false)).toBe(true);
    expect(shouldBlockOperatorActions(false, true)).toBe(true);
    expect(shouldBlockOperatorActions(false, false)).toBe(false);
  });
});
