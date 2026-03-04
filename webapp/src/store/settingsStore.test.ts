import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { appDb } from "../data/app-db";

describe("settingsStore realtimeAutoSaveSeconds guardrails", () => {
  beforeEach(async () => {
    await appDb.settings.clear();
    useSettingsStore.setState({
      apiBaseUrl: "/api",
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
});
