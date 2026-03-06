import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { appDb } from "../data/app-db";

describe("settingsStore realtimeAutoSaveSeconds guardrails", () => {
  beforeEach(async () => {
    await appDb.settings.clear();
    useSettingsStore.setState({
      apiBaseUrl: "/",
      adminApiBaseUrl: "",
      realtimeAutoSaveSeconds: 10,
      activeBackendPresetId: null,
      defaultSpeakerName: "Speaker",
      hydrated: false,
    });
  });

  it("hydrates invalid persisted value as default", async () => {
    await appDb.settings.put({
      key: "realtimeAutoSaveSeconds",
      value: "not-a-number",
      updatedAt: new Date().toISOString(),
    });

    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().realtimeAutoSaveSeconds).toBe(10);
  });

  it("hydrates lower-bound persisted value to minimum", async () => {
    await appDb.settings.put({
      key: "realtimeAutoSaveSeconds",
      value: "0",
      updatedAt: new Date().toISOString(),
    });

    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().realtimeAutoSaveSeconds).toBe(1);
  });

  it("sanitizes updateSetting for out-of-range values and persists normalized value", async () => {
    await useSettingsStore.getState().updateSetting("realtimeAutoSaveSeconds", 0);
    expect(useSettingsStore.getState().realtimeAutoSaveSeconds).toBe(1);
    expect((await appDb.settings.get("realtimeAutoSaveSeconds"))?.value).toBe("1");

    await useSettingsStore.getState().updateSetting("realtimeAutoSaveSeconds", 99999);
    expect(useSettingsStore.getState().realtimeAutoSaveSeconds).toBe(3600);
    expect((await appDb.settings.get("realtimeAutoSaveSeconds"))?.value).toBe("3600");
  });

  it("normalizes cleared public api base to same-origin root and keeps admin base optional", async () => {
    await useSettingsStore.getState().updateSetting("apiBaseUrl", "");
    await useSettingsStore.getState().updateSetting("adminApiBaseUrl", "  ");

    expect(useSettingsStore.getState().apiBaseUrl).toBe("/");
    expect(useSettingsStore.getState().adminApiBaseUrl).toBe("");
    expect((await appDb.settings.get("apiBaseUrl"))?.value).toBe("/");
    expect((await appDb.settings.get("adminApiBaseUrl"))?.value).toBe("");
  });
});
