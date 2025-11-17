import { v4 as uuid } from "uuid";
import { appDb } from "../../data/app-db";
import type {
  BackendEndpointDeployment,
  BackendEndpointPreset,
} from "../../data/app-db";

function sanitizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

async function clearDefaultBackendPreset() {
  await appDb.backendEndpoints
    .filter((preset) => preset.isDefault === true)
    .modify({ isDefault: false });
}

export async function createBackendEndpointPreset(preset: {
  name: string;
  description?: string;
  deployment: BackendEndpointDeployment;
  apiBaseUrl: string;
  clientId?: string;
  clientSecret?: string;
  verifySsl?: boolean;
  isDefault?: boolean;
}): Promise<BackendEndpointPreset> {
  const now = new Date().toISOString();
  if (preset.isDefault) {
    await clearDefaultBackendPreset();
  }
  const payload: BackendEndpointPreset = {
    id: uuid(),
    name: preset.name.trim(),
    description: preset.description?.trim(),
    deployment: preset.deployment,
    apiBaseUrl: sanitizeBaseUrl(preset.apiBaseUrl),
    clientId: preset.clientId?.trim(),
    clientSecret: preset.clientSecret?.trim(),
    verifySsl: preset.verifySsl ?? true,
    isDefault: preset.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await appDb.backendEndpoints.put(payload);
  return payload;
}

export async function updateBackendEndpointPreset(
  id: string,
  patch: Partial<
    Omit<
      BackendEndpointPreset,
      "id" | "createdAt" | "updatedAt" | "clientId" | "clientSecret"
    >
  > & {
    clientId?: string | null;
    clientSecret?: string | null;
  }
): Promise<void> {
  const existing = await appDb.backendEndpoints.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  const updates: Partial<BackendEndpointPreset> = {
    updatedAt: now,
  };
  if (patch.apiBaseUrl !== undefined) {
    updates.apiBaseUrl = sanitizeBaseUrl(patch.apiBaseUrl);
  }
  if (patch.name !== undefined) {
    updates.name = patch.name.trim();
  }
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim();
  }
  if (patch.deployment !== undefined) {
    updates.deployment = patch.deployment;
  }
  if (patch.verifySsl !== undefined) {
    updates.verifySsl = patch.verifySsl;
  }
  if (patch.clientId !== undefined) {
    updates.clientId = patch.clientId?.trim() || undefined;
  }
  if (patch.clientSecret !== undefined) {
    updates.clientSecret = patch.clientSecret?.trim() || undefined;
  }
  if (patch.isDefault !== undefined) {
    updates.isDefault = patch.isDefault;
  }
  if (patch.isDefault) {
    await clearDefaultBackendPreset();
  }
  await appDb.backendEndpoints.update(id, updates);
}

export async function deleteBackendEndpointPreset(id: string): Promise<void> {
  await appDb.backendEndpoints.delete(id);
}

export async function ensureDefaultBackendEndpointPresets(
  defaults: BackendEndpointPreset[]
): Promise<void> {
  const count = await appDb.backendEndpoints.count();
  if (count > 0) {
    return;
  }
  for (const preset of defaults) {
    await appDb.backendEndpoints.put({ ...preset });
  }
}
