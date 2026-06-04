import { v4 as uuid } from "uuid";
import { liveQuery } from "dexie";
import { appDb } from "../../data/app-db";
import type { PresetConfig } from "../../data/app-db";

export function listPresetsLive(type: PresetConfig["type"]) {
  return liveQuery(async () => {
    return await appDb.presets.where("type").equals(type).sortBy("createdAt");
  });
}

export async function createPreset(preset: {
  type: PresetConfig["type"];
  name: string;
  description?: string;
  configJson: string;
  isDefault?: boolean;
}) {
  const now = new Date().toISOString();
  const id = uuid();
  const payload: PresetConfig = {
    id,
    type: preset.type,
    name: preset.name,
    description: preset.description,
    configJson: preset.configJson,
    isDefault: preset.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  };
  if (preset.isDefault) {
    await appDb.transaction("rw", appDb.presets, async () => {
      await clearDefault(preset.type);
      await appDb.presets.put(payload);
    });
  } else {
    await appDb.presets.put(payload);
  }
  return payload;
}

export async function updatePreset(id: string, patch: Partial<PresetConfig>) {
  const now = new Date().toISOString();
  const existing = await appDb.presets.get(id);
  if (!existing) return;
  if (patch.isDefault) {
    await appDb.transaction("rw", appDb.presets, async () => {
      await clearDefault(existing.type);
      await appDb.presets.update(id, { ...patch, updatedAt: now });
    });
    return;
  }
  await appDb.presets.update(id, { ...patch, updatedAt: now });
}

export async function deletePreset(id: string) {
  await appDb.presets.delete(id);
}

export async function ensureDefaultPreset(type: PresetConfig["type"], defaults: PresetConfig[]) {
  const existingCount = await appDb.presets.where("type").equals(type).count();
  if (existingCount === 0) {
    for (const preset of defaults) {
      await appDb.presets.put({ ...preset, type });
    }
  }
}

async function clearDefault(type: PresetConfig["type"]) {
  await appDb.presets
    .where("type")
    .equals(type)
    .and((preset) => preset.isDefault === true)
    .modify({ isDefault: false });
}
