import { beforeEach, describe, expect, it, vi } from "vitest";
import { appDb } from "../../data/app-db";
import {
  createBackendEndpointPreset,
  updateBackendEndpointPreset,
} from "./backendEndpointRepository";

beforeEach(async () => {
  await appDb.delete();
  await appDb.open();
});

describe("backendEndpointRepository", () => {
  it("keeps only one default backend endpoint preset", async () => {
    const first = await createBackendEndpointPreset({
      name: "Primary",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.com",
      isDefault: true,
    });
    const second = await createBackendEndpointPreset({
      name: "Secondary",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.org",
      isDefault: true,
    });

    const storedFirst = await appDb.backendEndpoints.get(first.id);
    const storedSecond = await appDb.backendEndpoints.get(second.id);

    expect(storedFirst?.isDefault).toBe(false);
    expect(storedSecond?.isDefault).toBe(true);
  });

  it("keeps the existing default when backend preset promotion fails", async () => {
    const baseline = await createBackendEndpointPreset({
      name: "Primary",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.com",
      isDefault: true,
    });
    const challenger = await createBackendEndpointPreset({
      name: "Secondary",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.org",
      isDefault: false,
    });
    const updateSpy = vi
      .spyOn(appDb.backendEndpoints, "update")
      .mockRejectedValueOnce(new Error("persist failed"));

    await expect(
      updateBackendEndpointPreset(challenger.id, { isDefault: true })
    ).rejects.toThrow("persist failed");

    const storedBaseline = await appDb.backendEndpoints.get(baseline.id);
    const storedChallenger = await appDb.backendEndpoints.get(challenger.id);

    expect(storedBaseline?.isDefault).toBe(true);
    expect(storedChallenger?.isDefault).toBe(false);

    updateSpy.mockRestore();
  });

  it("keeps the existing default when creating a new backend default fails", async () => {
    const baseline = await createBackendEndpointPreset({
      name: "Primary",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.com",
      isDefault: true,
    });
    const putSpy = vi
      .spyOn(appDb.backendEndpoints, "put")
      .mockRejectedValueOnce(new Error("persist failed"));

    await expect(
      createBackendEndpointPreset({
        name: "Secondary",
        deployment: "cloud",
        apiBaseUrl: "https://api.example.org",
        isDefault: true,
      })
    ).rejects.toThrow("persist failed");

    const storedBaseline = await appDb.backendEndpoints.get(baseline.id);
    const defaults = await appDb.backendEndpoints
      .filter((preset) => preset.isDefault === true)
      .toArray();

    expect(storedBaseline?.isDefault).toBe(true);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(baseline.id);

    putSpy.mockRestore();
  });
});
