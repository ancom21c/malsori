import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("keeps the existing default when promoting a new default fails", async () => {
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
    const updateSpy = vi
      .spyOn(appDb.presets, "update")
      .mockRejectedValueOnce(new Error("persist failed"));

    await expect(updatePreset(challenger.id, { isDefault: true })).rejects.toThrow(
      "persist failed"
    );

    const storedBaseline = await appDb.presets.get(baseline.id);
    const storedChallenger = await appDb.presets.get(challenger.id);

    expect(storedBaseline?.isDefault).toBe(true);
    expect(storedChallenger?.isDefault).toBe(false);

    updateSpy.mockRestore();
  });

  it("keeps the existing default when creating a new default fails", async () => {
    const baseline = await createPreset({
      type: "streaming",
      name: "기본",
      configJson: "{}",
      isDefault: true,
    });
    const putSpy = vi
      .spyOn(appDb.presets, "put")
      .mockRejectedValueOnce(new Error("persist failed"));

    await expect(
      createPreset({
        type: "streaming",
        name: "후보",
        configJson: "{}",
        isDefault: true,
      })
    ).rejects.toThrow("persist failed");

    const storedBaseline = await appDb.presets.get(baseline.id);
    const defaults = await appDb.presets
      .where("type")
      .equals("streaming")
      .and((preset) => preset.isDefault === true)
      .toArray();

    expect(storedBaseline?.isDefault).toBe(true);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(baseline.id);

    putSpy.mockRestore();
  });
});
