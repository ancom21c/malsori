import { create } from "zustand";
import dayjs from "dayjs";
import { appDb } from "../data/app-db";
import type { AppSetting } from "../data/app-db";

const DEFAULT_API_BASE_URL =
  (typeof window !== "undefined" && window.__MALSORI_CONFIG__?.apiBaseUrl) ||
  import.meta.env.VITE_API_BASE ||
  "/api";

export type SettingKey =
  | "apiBaseUrl"
  | "realtimeAutoSaveSeconds"
  | "activeBackendPresetId"
  | "defaultSpeakerName";

type SettingsState = {
  apiBaseUrl: string;
  realtimeAutoSaveSeconds: number;
  activeBackendPresetId: string | null;
  defaultSpeakerName: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  updateSetting: <T extends SettingKey>(
    key: T,
    value: SettingsState[T]
  ) => Promise<void>;
};

async function loadSetting(key: SettingKey): Promise<string | undefined> {
  const record = await appDb.settings.get(key);
  return record?.value;
}

async function persistSetting(key: SettingKey, value: string) {
  const payload: AppSetting = {
    key,
    value,
    updatedAt: dayjs().toISOString(),
  };
  await appDb.settings.put(payload);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiBaseUrl: DEFAULT_API_BASE_URL,
  realtimeAutoSaveSeconds: 10,
  activeBackendPresetId: null,
  defaultSpeakerName: "Speaker",
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const [apiBaseUrl, autoSave, activeBackendPresetId, defaultSpeakerName] = await Promise.all([
      loadSetting("apiBaseUrl"),
      loadSetting("realtimeAutoSaveSeconds"),
      loadSetting("activeBackendPresetId"),
      loadSetting("defaultSpeakerName"),
    ]);
    set({
      apiBaseUrl: apiBaseUrl ?? DEFAULT_API_BASE_URL,
      realtimeAutoSaveSeconds: autoSave ? Number(autoSave) : 10,
      activeBackendPresetId:
        activeBackendPresetId && activeBackendPresetId.trim().length > 0
          ? activeBackendPresetId
          : null,
      defaultSpeakerName: defaultSpeakerName ?? "Speaker",
      hydrated: true,
    });
  },
  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    await persistSetting(
      key,
      key === "realtimeAutoSaveSeconds"
        ? String(value)
        : typeof value === "string"
          ? value
          : value === null
            ? ""
            : String(value)
    );
  },
}));
