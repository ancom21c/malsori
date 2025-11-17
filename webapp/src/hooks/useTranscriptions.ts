import { useLiveQuery } from "dexie-react-hooks";
import type { LocalTranscription } from "../data/app-db";
import { appDb } from "../data/app-db";

export function useTranscriptions() {
  const transcriptions = useLiveQuery(async () => {
    const records = await appDb.transcriptions.orderBy("createdAt").reverse().toArray();
    return records as LocalTranscription[];
  }, [], undefined);

  return transcriptions;
}
