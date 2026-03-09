import { describe, expect, it } from "vitest";
import {
  areConnectionSettingsDraftEqual,
  buildConnectionSettingsUpdatePlan,
  hasConnectionSettingsDraftChanges,
  normalizeConnectionSettingsDraft,
  shouldBlockOperatorActions,
  syncConnectionSettingsDraftFromPersisted,
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

  it("treats normalized whitespace-only URL differences as clean", () => {
    expect(
      hasConnectionSettingsDraftChanges(
        { apiBaseUrl: "/", adminApiBaseUrl: "/internal" },
        { apiBaseUrl: "   ", adminApiBaseUrl: "  /internal  " }
      )
    ).toBe(false);
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

  it("normalizes connection drafts consistently", () => {
    expect(
      normalizeConnectionSettingsDraft({
        apiBaseUrl: "  ",
        adminApiBaseUrl: "  https://internal.example.com/  ",
      })
    ).toEqual({
      apiBaseUrl: "/",
      adminApiBaseUrl: "https://internal.example.com/",
    });
  });

  it("keeps a dirty draft when persisted values change later", () => {
    const current = syncConnectionSettingsDraftFromPersisted({
      persisted: { apiBaseUrl: "/next", adminApiBaseUrl: "/admin-next" },
      committed: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      draft: { apiBaseUrl: "https://api.example.com", adminApiBaseUrl: "/admin" },
      savingConnectionSettings: false,
    });

    expect(current).toEqual({
      committed: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      draft: { apiBaseUrl: "https://api.example.com", adminApiBaseUrl: "/admin" },
    });
  });

  it("reseeds committed and draft when persisted values change while clean", () => {
    const current = syncConnectionSettingsDraftFromPersisted({
      persisted: { apiBaseUrl: "/next", adminApiBaseUrl: " /admin-next " },
      committed: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      draft: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      savingConnectionSettings: false,
    });

    expect(current).toEqual({
      committed: { apiBaseUrl: "/next", adminApiBaseUrl: "/admin-next" },
      draft: { apiBaseUrl: "/next", adminApiBaseUrl: "/admin-next" },
    });
  });

  it("does not reseed while a save is in flight", () => {
    const current = syncConnectionSettingsDraftFromPersisted({
      persisted: { apiBaseUrl: "/next", adminApiBaseUrl: "/admin-next" },
      committed: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      draft: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      savingConnectionSettings: true,
    });

    expect(current).toEqual({
      committed: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
      draft: { apiBaseUrl: "/", adminApiBaseUrl: "/admin" },
    });
  });

  it("compares normalized drafts for equality", () => {
    expect(
      areConnectionSettingsDraftEqual(
        normalizeConnectionSettingsDraft({
          apiBaseUrl: " / ",
          adminApiBaseUrl: " /internal ",
        }),
        {
          apiBaseUrl: "/",
          adminApiBaseUrl: "/internal",
        }
      )
    ).toBe(true);
  });

  it("blocks operator actions while the draft is dirty or being saved", () => {
    expect(shouldBlockOperatorActions(true, false)).toBe(true);
    expect(shouldBlockOperatorActions(false, true)).toBe(true);
    expect(shouldBlockOperatorActions(false, false)).toBe(false);
  });
});
