import { describe, expect, it } from "vitest";
import type { BackendEndpointPreset } from "../data/app-db";
import {
  IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
  createImplicitSttServerDefaultProfile,
  deriveSttCompatibilityState,
  mapBackendEndpointPresetToBackendProfile,
} from "./sttBackendCompatibility";

const presetFixture: BackendEndpointPreset = {
  id: "preset-1",
  name: "RTZR Cloud",
  deployment: "cloud",
  apiBaseUrl: "https://openapi.vito.ai",
  clientId: "client-id",
  clientSecret: "client-secret",
  verifySsl: true,
  isDefault: true,
  createdAt: "2026-03-10T00:00:00.000Z",
  updatedAt: "2026-03-10T00:00:00.000Z",
};

describe("createImplicitSttServerDefaultProfile", () => {
  it("creates a server-default STT profile from the current public API base", () => {
    const profile = createImplicitSttServerDefaultProfile("https://malsori.ancom.duckdns.org");

    expect(profile).toMatchObject({
      id: IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
      label: "Server Default STT",
      kind: "stt",
      baseUrl: "https://malsori.ancom.duckdns.org",
      metadata: {
        source: "server-default",
      },
    });
    expect(profile.capabilities).toEqual(["stt.file", "stt.realtime"]);
  });
});

describe("mapBackendEndpointPresetToBackendProfile", () => {
  it("maps a legacy STT backend preset into a backend profile", () => {
    const profile = mapBackendEndpointPresetToBackendProfile(presetFixture);

    expect(profile).toMatchObject({
      id: "preset:preset-1",
      label: "RTZR Cloud",
      kind: "stt",
      baseUrl: "https://openapi.vito.ai",
      authStrategy: {
        type: "provider_native",
      },
      metadata: {
        legacyPresetId: "preset-1",
        deployment: "cloud",
        verifySsl: "true",
        source: "preset",
        hasClientId: "true",
        hasClientSecret: "true",
      },
    });
  });
});

describe("deriveSttCompatibilityState", () => {
  it("binds capture features to the implicit server-default profile when no preset is selected", () => {
    const state = deriveSttCompatibilityState({
      publicApiBaseUrl: "https://malsori.ancom.duckdns.org",
      activeBackendPresetId: null,
      backendPresets: [presetFixture],
    });

    expect(state.selection).toMatchObject({
      source: "server-default",
      selectedProfileId: IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
    });
    expect(state.bindings.map((binding) => binding.primaryBackendProfileId)).toEqual([
      IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
      IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
    ]);
  });

  it("binds capture features to the mapped preset profile when a preset is selected", () => {
    const state = deriveSttCompatibilityState({
      publicApiBaseUrl: "https://malsori.ancom.duckdns.org",
      activeBackendPresetId: "preset-1",
      backendPresets: [presetFixture],
    });

    expect(state.selection).toMatchObject({
      source: "preset",
      selectedProfileId: "preset:preset-1",
      selectedPresetId: "preset-1",
    });
    expect(state.bindings.map((binding) => binding.primaryBackendProfileId)).toEqual([
      "preset:preset-1",
      "preset:preset-1",
    ]);
  });

  it("preserves unknown legacy preset state while falling back to the implicit runtime profile", () => {
    const state = deriveSttCompatibilityState({
      publicApiBaseUrl: "https://malsori.ancom.duckdns.org",
      activeBackendPresetId: "deleted-preset",
      backendPresets: [presetFixture],
    });

    expect(state.selection).toMatchObject({
      source: "unknown",
      legacyPresetId: "deleted-preset",
      selectedProfileId: IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
    });
    expect(state.bindings.map((binding) => binding.primaryBackendProfileId)).toEqual([
      IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
      IMPLICIT_STT_SERVER_DEFAULT_PROFILE_ID,
    ]);
  });
});
