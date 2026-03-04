import { create } from "zustand";
import dayjs from "dayjs";
import { appDb } from "../data/app-db";
import type { AppSetting } from "../data/app-db";

const DEFAULT_API_BASE_URL =
  (typeof window !== "undefined" && window.__MALSORI_CONFIG__?.apiBaseUrl) ||
  import.meta.env.VITE_API_BASE ||
  "/api";
const DEFAULT_REALTIME_AUTOSAVE_SECONDS = 10;
const MIN_REALTIME_AUTOSAVE_SECONDS = 1;
const MAX_REALTIME_AUTOSAVE_SECONDS = 3600;

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

function sanitizeRealtimeAutoSaveSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.round(value);
    if (normalized < MIN_REALTIME_AUTOSAVE_SECONDS) {
      return MIN_REALTIME_AUTOSAVE_SECONDS;
    }
    if (normalized > MAX_REALTIME_AUTOSAVE_SECONDS) {
      return MAX_REALTIME_AUTOSAVE_SECONDS;
    }
    return normalized;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return sanitizeRealtimeAutoSaveSeconds(Number(value));
  }
  return DEFAULT_REALTIME_AUTOSAVE_SECONDS;
}

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
  realtimeAutoSaveSeconds: DEFAULT_REALTIME_AUTOSAVE_SECONDS,
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
      realtimeAutoSaveSeconds: sanitizeRealtimeAutoSaveSeconds(autoSave),
      activeBackendPresetId:
        activeBackendPresetId && activeBackendPresetId.trim().length > 0
          ? activeBackendPresetId
          : null,
      defaultSpeakerName: defaultSpeakerName ?? "Speaker",
      hydrated: true,
    });
  },
  updateSetting: async (key, value) => {
    const normalizedValue =
      key === "realtimeAutoSaveSeconds"
        ? sanitizeRealtimeAutoSaveSeconds(value)
        : value;
    set({ [key]: normalizedValue } as Partial<SettingsState>);
    await persistSetting(
      key,
      key === "realtimeAutoSaveSeconds"
        ? String(normalizedValue)
        : typeof normalizedValue === "string"
          ? normalizedValue
          : normalizedValue === null
            ? ""
            : String(normalizedValue)
    );
  },
}));
