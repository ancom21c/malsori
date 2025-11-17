import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { appDb } from "../data/app-db";
import { DEFAULT_FILE_PRESETS } from "../data/defaultPresets";
import { ensureDefaultPreset } from "../services/data/presetRepository";
import { usePresets } from "./usePresets";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("usePresets", () => {
  it("returns presets seeded via ensureDefaultPreset", async () => {
    await ensureDefaultPreset("file", DEFAULT_FILE_PRESETS);
    const { result } = renderHook(() => usePresets("file"));

    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    });

    expect(result.current[0].type).toBe("file");
  });
});
