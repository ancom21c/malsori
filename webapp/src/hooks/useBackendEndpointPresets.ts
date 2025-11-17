import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { BackendEndpointPreset } from "../data/app-db";
import { appDb } from "../data/app-db";
import { DEFAULT_BACKEND_ENDPOINT_PRESETS } from "../data/defaultPresets";
import { ensureDefaultBackendEndpointPresets } from "../services/data/backendEndpointRepository";

const EMPTY_BACKEND_PRESETS: BackendEndpointPreset[] = [];

export function useBackendEndpointPresets(): BackendEndpointPreset[] {
  useEffect(() => {
    void ensureDefaultBackendEndpointPresets(DEFAULT_BACKEND_ENDPOINT_PRESETS);
  }, []);

  return (
    useLiveQuery(
      async () => {
        return await appDb.backendEndpoints.orderBy("createdAt").toArray();
      },
      [],
      EMPTY_BACKEND_PRESETS
    ) ?? EMPTY_BACKEND_PRESETS
  );
}
