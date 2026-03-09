import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("commits connection settings only after batch persistence succeeds", async () => {
    await useSettingsStore.getState().updateConnectionSettings({
      apiBaseUrl: " https://example.com/api ",
      adminApiBaseUrl: " https://internal.example.local ",
    });

    expect(useSettingsStore.getState().apiBaseUrl).toBe("https://example.com/api");
    expect(useSettingsStore.getState().adminApiBaseUrl).toBe("https://internal.example.local");
    expect((await appDb.settings.get("apiBaseUrl"))?.value).toBe("https://example.com/api");
    expect((await appDb.settings.get("adminApiBaseUrl"))?.value).toBe(
      "https://internal.example.local"
    );
  });

  it("keeps runtime connection settings unchanged when batch persistence fails", async () => {
    const transactionSpy = vi
      .spyOn(appDb, "transaction")
      .mockRejectedValueOnce(new Error("persist failed"));

    await expect(
      useSettingsStore.getState().updateConnectionSettings({
        apiBaseUrl: "https://failed.example.com",
        adminApiBaseUrl: "https://failed.internal.example.com",
      })
    ).rejects.toThrow("persist failed");

    expect(useSettingsStore.getState().apiBaseUrl).toBe("/");
    expect(useSettingsStore.getState().adminApiBaseUrl).toBe("");
    expect(await appDb.settings.get("apiBaseUrl")).toBeUndefined();
    expect(await appDb.settings.get("adminApiBaseUrl")).toBeUndefined();

    transactionSpy.mockRestore();
  });
});
