import type { BackendEndpointPreset } from "../data/app-db";
import type { BackendEndpointState } from "../services/api/types";

export type BackendRuntimeAction = "apply" | "reset";

export type BackendRuntimeBlockReasonKey =
  | "saveConnectionSettingsToUseDraftValues"
  | "internalAdminApiBaseUrlRequired"
  | "enterAdminTokenBeforeApplyingServerSettings"
  | "refreshServerStatusBeforeApplyingServerSettings"
  | "refreshServerStatusBeforeRestoringServerDefaults"
  | "selectPresetBeforeApplyingServerSettings"
  | "serverDefaultAlreadyActive";

export interface BackendRuntimeSnapshot {
  source: "default" | "override";
  deployment: "cloud" | "onprem" | null;
  apiBaseUrl: string | null;
  verifySsl: boolean | null;
  usesClientCredentials: boolean | null;
}

export interface BackendRuntimeActionAvailability {
  applyBlockedReasonKey: BackendRuntimeBlockReasonKey | null;
  resetBlockedReasonKey: BackendRuntimeBlockReasonKey | null;
}

export function buildBackendRuntimeSnapshotFromState(
  state: BackendEndpointState
): BackendRuntimeSnapshot {
  return {
    source: state.source,
    deployment: state.deployment,
    apiBaseUrl: state.apiBaseUrl,
    verifySsl: state.verifySsl,
    usesClientCredentials: state.authEnabled,
  };
}

export function buildBackendRuntimeSnapshotFromPreset(
  preset: BackendEndpointPreset
): BackendRuntimeSnapshot {
  return {
    source: "override",
    deployment: preset.deployment,
    apiBaseUrl: preset.apiBaseUrl,
    verifySsl: preset.verifySsl ?? true,
    usesClientCredentials: Boolean(preset.clientId || preset.clientSecret),
  };
}

export function buildServerDefaultRuntimeSnapshot(): BackendRuntimeSnapshot {
  return {
    source: "default",
    deployment: null,
    apiBaseUrl: null,
    verifySsl: null,
    usesClientCredentials: null,
  };
}

export function resolveBackendRuntimeActionAvailability(input: {
  selectedBackendPreset: BackendEndpointPreset | null;
  adminApiConfigured: boolean;
  backendAdminTokenSatisfied: boolean;
  operatorActionsBlockedByDraft: boolean;
  backendState: BackendEndpointState | null;
  activeBackendPresetId: string | null;
}): BackendRuntimeActionAvailability {
  const baseBlockedReason =
    input.operatorActionsBlockedByDraft
      ? "saveConnectionSettingsToUseDraftValues"
      : !input.adminApiConfigured
        ? "internalAdminApiBaseUrlRequired"
        : !input.backendAdminTokenSatisfied
          ? "enterAdminTokenBeforeApplyingServerSettings"
          : null;

  const applyBlockedReasonKey =
    baseBlockedReason ??
    (!input.selectedBackendPreset
      ? "selectPresetBeforeApplyingServerSettings"
      : !input.backendState
        ? "refreshServerStatusBeforeApplyingServerSettings"
        : null);

  const resetBlockedReasonKey =
    baseBlockedReason ??
    (!input.backendState
      ? "refreshServerStatusBeforeRestoringServerDefaults"
      : input.backendState.source === "default" && !input.activeBackendPresetId
        ? "serverDefaultAlreadyActive"
        : null);

  return {
    applyBlockedReasonKey,
    resetBlockedReasonKey,
  };
}
