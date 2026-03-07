import {
  normalizeAdminApiBaseUrl,
  normalizePublicApiBaseUrl,
} from "../utils/baseUrl";

export type ConnectionSettingsDraft = {
  apiBaseUrl: string;
  adminApiBaseUrl: string;
};

export type ConnectionSettingsUpdate = {
  key: "apiBaseUrl" | "adminApiBaseUrl";
  value: string;
};

export function hasConnectionSettingsDraftChanges(
  saved: ConnectionSettingsDraft,
  draft: ConnectionSettingsDraft
): boolean {
  return saved.apiBaseUrl !== draft.apiBaseUrl || saved.adminApiBaseUrl !== draft.adminApiBaseUrl;
}

export function buildConnectionSettingsUpdatePlan(
  saved: ConnectionSettingsDraft,
  draft: ConnectionSettingsDraft
): ConnectionSettingsUpdate[] {
  const normalizedDraft: ConnectionSettingsDraft = {
    apiBaseUrl: normalizePublicApiBaseUrl(draft.apiBaseUrl),
    adminApiBaseUrl: normalizeAdminApiBaseUrl(draft.adminApiBaseUrl),
  };

  const updates: ConnectionSettingsUpdate[] = [];

  if (normalizedDraft.apiBaseUrl !== saved.apiBaseUrl) {
    updates.push({ key: "apiBaseUrl", value: normalizedDraft.apiBaseUrl });
  }
  if (normalizedDraft.adminApiBaseUrl !== saved.adminApiBaseUrl) {
    updates.push({ key: "adminApiBaseUrl", value: normalizedDraft.adminApiBaseUrl });
  }

  return updates;
}

export function shouldBlockOperatorActions(
  connectionSettingsDirty: boolean,
  savingConnectionSettings: boolean
): boolean {
  return connectionSettingsDirty || savingConnectionSettings;
}
