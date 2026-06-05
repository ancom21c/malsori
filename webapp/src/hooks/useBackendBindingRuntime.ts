import { useMemo } from "react";
import { useSettingsStore } from "../store/settingsStore";
import type { BackendBindingRuntimeConfig } from "../app/backendBindingRuntime";

export function useBackendBindingRuntime(): BackendBindingRuntimeConfig {
  const profiles = useSettingsStore((state) => state.backendProfiles);
  const bindings = useSettingsStore((state) => state.featureBindings);

  return useMemo(
    () => ({
      profiles,
      bindings,
    }),
    [profiles, bindings]
  );
}
