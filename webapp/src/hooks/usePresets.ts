import { useLiveQuery } from "dexie-react-hooks";
import type { PresetConfig } from "../data/app-db";
import { appDb } from "../data/app-db";

const EMPTY_PRESETS: PresetConfig[] = [];

export function usePresets(type: PresetConfig["type"]): PresetConfig[] {
  return (
    useLiveQuery(
      async () => {
        return await appDb.presets.where("type").equals(type).sortBy("createdAt");
      },
      [type],
      EMPTY_PRESETS
    ) ?? EMPTY_PRESETS
  );
}
