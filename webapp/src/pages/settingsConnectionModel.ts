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

export function normalizeConnectionSettingsDraft(
  value: ConnectionSettingsDraft
): ConnectionSettingsDraft {
  return {
    apiBaseUrl: normalizePublicApiBaseUrl(value.apiBaseUrl),
    adminApiBaseUrl: normalizeAdminApiBaseUrl(value.adminApiBaseUrl),
  };
}

export function areConnectionSettingsDraftEqual(
  a: ConnectionSettingsDraft,
  b: ConnectionSettingsDraft
): boolean {
  return a.apiBaseUrl === b.apiBaseUrl && a.adminApiBaseUrl === b.adminApiBaseUrl;
}

export function hasConnectionSettingsDraftChanges(
  saved: ConnectionSettingsDraft,
  draft: ConnectionSettingsDraft
): boolean {
  return !areConnectionSettingsDraftEqual(
    normalizeConnectionSettingsDraft(saved),
    normalizeConnectionSettingsDraft(draft)
  );
}

export function buildConnectionSettingsUpdatePlan(
  saved: ConnectionSettingsDraft,
  draft: ConnectionSettingsDraft
): ConnectionSettingsUpdate[] {
  const normalizedSaved = normalizeConnectionSettingsDraft(saved);
  const normalizedDraft = normalizeConnectionSettingsDraft(draft);

  const updates: ConnectionSettingsUpdate[] = [];

  if (normalizedDraft.apiBaseUrl !== normalizedSaved.apiBaseUrl) {
    updates.push({ key: "apiBaseUrl", value: normalizedDraft.apiBaseUrl });
  }
  if (normalizedDraft.adminApiBaseUrl !== normalizedSaved.adminApiBaseUrl) {
    updates.push({ key: "adminApiBaseUrl", value: normalizedDraft.adminApiBaseUrl });
  }

  return updates;
}

type SyncConnectionSettingsDraftFromPersistedArgs = {
  persisted: ConnectionSettingsDraft;
  committed: ConnectionSettingsDraft;
  draft: ConnectionSettingsDraft;
  savingConnectionSettings: boolean;
};

export function syncConnectionSettingsDraftFromPersisted({
  persisted,
  committed,
  draft,
  savingConnectionSettings,
}: SyncConnectionSettingsDraftFromPersistedArgs): {
  committed: ConnectionSettingsDraft;
  draft: ConnectionSettingsDraft;
} {
  const normalizedPersisted = normalizeConnectionSettingsDraft(persisted);
  const normalizedCommitted = normalizeConnectionSettingsDraft(committed);

  if (areConnectionSettingsDraftEqual(normalizedPersisted, normalizedCommitted)) {
    return { committed, draft };
  }

  if (savingConnectionSettings || hasConnectionSettingsDraftChanges(committed, draft)) {
    return { committed, draft };
  }

  return {
    committed: normalizedPersisted,
    draft: normalizedPersisted,
  };
}

export function shouldBlockOperatorActions(
  connectionSettingsDirty: boolean,
  savingConnectionSettings: boolean
): boolean {
  return connectionSettingsDirty || savingConnectionSettings;
}
