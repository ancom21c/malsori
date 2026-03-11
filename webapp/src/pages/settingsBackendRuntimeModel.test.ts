import { describe, expect, it } from "vitest";
import {
  buildBackendRuntimeSnapshotFromPreset,
  buildBackendRuntimeSnapshotFromState,
  buildServerDefaultRuntimeSnapshot,
  resolveBackendRuntimeActionAvailability,
} from "./settingsBackendRuntimeModel";

describe("settingsBackendRuntimeModel", () => {
  it("builds a current runtime snapshot from the live backend state", () => {
    expect(
      buildBackendRuntimeSnapshotFromState({
        deployment: "cloud",
        apiBaseUrl: "https://api.example.com",
        transcribePath: "/v1/transcribe",
        streamingPath: "/v1/listen",
        authEnabled: true,
        hasClientId: true,
        hasClientSecret: true,
        verifySsl: true,
        source: "override",
      })
    ).toEqual({
      source: "override",
      deployment: "cloud",
      apiBaseUrl: "https://api.example.com",
      verifySsl: true,
      usesClientCredentials: true,
    });
  });

  it("builds a next runtime snapshot from the selected preset", () => {
    expect(
      buildBackendRuntimeSnapshotFromPreset({
        id: "preset-1",
        name: "Ops RTZR",
        deployment: "onprem",
        apiBaseUrl: "https://rtzr.internal",
        clientSecret: "secret",
        verifySsl: false,
        createdAt: "2026-03-11T00:00:00.000Z",
        updatedAt: "2026-03-11T00:00:00.000Z",
      })
    ).toEqual({
      source: "override",
      deployment: "onprem",
      apiBaseUrl: "https://rtzr.internal",
      verifySsl: false,
      usesClientCredentials: true,
    });
  });

  it("represents server-default restore targets as server-managed values", () => {
    expect(buildServerDefaultRuntimeSnapshot()).toEqual({
      source: "default",
      deployment: null,
      apiBaseUrl: null,
      verifySsl: null,
      usesClientCredentials: null,
    });
  });

  it("blocks apply until a preset is selected and the live server state is known", () => {
    expect(
      resolveBackendRuntimeActionAvailability({
        selectedBackendPreset: null,
        adminApiConfigured: true,
        backendAdminTokenPresent: true,
        operatorActionsBlockedByDraft: false,
        backendState: null,
        activeBackendPresetId: null,
      })
    ).toEqual({
      applyBlockedReasonKey: "selectPresetBeforeApplyingServerSettings",
      resetBlockedReasonKey: "refreshServerStatusBeforeRestoringServerDefaults",
    });
  });

  it("blocks both actions behind draft or admin-token safety checks", () => {
    expect(
      resolveBackendRuntimeActionAvailability({
        selectedBackendPreset: {
          id: "preset-1",
          name: "Ops RTZR",
          deployment: "cloud",
          apiBaseUrl: "https://api.example.com",
          createdAt: "2026-03-11T00:00:00.000Z",
          updatedAt: "2026-03-11T00:00:00.000Z",
        },
        adminApiConfigured: true,
        backendAdminTokenPresent: false,
        operatorActionsBlockedByDraft: true,
        backendState: {
          deployment: "cloud",
          apiBaseUrl: "https://api.example.com",
          transcribePath: "/v1/transcribe",
          streamingPath: "/v1/listen",
          authEnabled: false,
          hasClientId: false,
          hasClientSecret: false,
          verifySsl: true,
          source: "default",
        },
        activeBackendPresetId: null,
      })
    ).toEqual({
      applyBlockedReasonKey: "saveConnectionSettingsToUseDraftValues",
      resetBlockedReasonKey: "saveConnectionSettingsToUseDraftValues",
    });
  });

  it("disables reset when server default is already active", () => {
    expect(
      resolveBackendRuntimeActionAvailability({
        selectedBackendPreset: {
          id: "preset-1",
          name: "Ops RTZR",
          deployment: "cloud",
          apiBaseUrl: "https://api.example.com",
          createdAt: "2026-03-11T00:00:00.000Z",
          updatedAt: "2026-03-11T00:00:00.000Z",
        },
        adminApiConfigured: true,
        backendAdminTokenPresent: true,
        operatorActionsBlockedByDraft: false,
        backendState: {
          deployment: "cloud",
          apiBaseUrl: "https://api.example.com",
          transcribePath: "/v1/transcribe",
          streamingPath: "/v1/listen",
          authEnabled: false,
          hasClientId: false,
          hasClientSecret: false,
          verifySsl: true,
          source: "default",
        },
        activeBackendPresetId: null,
      })
    ).toEqual({
      applyBlockedReasonKey: null,
      resetBlockedReasonKey: "serverDefaultAlreadyActive",
    });
  });
});
