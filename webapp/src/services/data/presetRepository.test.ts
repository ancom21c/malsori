import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../../data/app-db";
import { DEFAULT_STREAMING_PRESETS } from "../../data/defaultPresets";
import { createPreset, ensureDefaultPreset, updatePreset } from "./presetRepository";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("presetRepository", () => {
  it("creates presets and keeps only one default per type", async () => {
    const first = await createPreset({
      type: "streaming",
      name: "첫 번째",
      configJson: "{}",
      isDefault: true,
    });

    const second = await createPreset({
      type: "streaming",
      name: "두 번째",
      configJson: "{}",
      isDefault: true,
    });

    const storedFirst = await appDb.presets.get(first.id);
    const storedSecond = await appDb.presets.get(second.id);

    expect(storedFirst?.isDefault).toBe(false);
    expect(storedSecond?.isDefault).toBe(true);
  });

  it("promotes preset to default when updated", async () => {
    const baseline = await createPreset({
      type: "file",
      name: "기본",
      configJson: "{}",
      isDefault: true,
    });
    const challenger = await createPreset({
      type: "file",
      name: "후보",
      configJson: "{}",
      isDefault: false,
    });

    await updatePreset(challenger.id, { isDefault: true });

    const storedBaseline = await appDb.presets.get(baseline.id);
    const storedChallenger = await appDb.presets.get(challenger.id);

    expect(storedBaseline?.isDefault).toBe(false);
    expect(storedChallenger?.isDefault).toBe(true);
  });

  it("seeds default presets only once", async () => {
    await ensureDefaultPreset("streaming", DEFAULT_STREAMING_PRESETS);
    const firstBatch = await appDb.presets.where("type").equals("streaming").toArray();

    await ensureDefaultPreset("streaming", DEFAULT_STREAMING_PRESETS);
    const secondBatch = await appDb.presets.where("type").equals("streaming").toArray();

    expect(firstBatch.length).toBeGreaterThan(0);
    expect(secondBatch.length).toBe(firstBatch.length);
    expect(new Set(secondBatch.map((preset) => preset.id)).size).toBe(secondBatch.length);
  });
});
