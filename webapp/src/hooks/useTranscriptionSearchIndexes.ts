import { useLiveQuery } from "dexie-react-hooks";
import { appDb } from "../data/app-db";
import type { TranscriptionSearchIndex } from "../data/app-db";

export type SearchIndexMap = Record<string, TranscriptionSearchIndex>;

const EMPTY_MAP: SearchIndexMap = {};

export function useTranscriptionSearchIndexes(): SearchIndexMap {
  return (
    useLiveQuery(async () => {
      const indexes = await appDb.searchIndexes.toArray();
      const map: SearchIndexMap = {};
      for (const item of indexes) {
        map[item.transcriptionId] = item;
      }
      return map;
    }, [], EMPTY_MAP) ?? EMPTY_MAP
  );
}
