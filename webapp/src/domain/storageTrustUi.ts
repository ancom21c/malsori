import type { StatusChipItem } from "../components/studio";
import type { LocalTranscription } from "../data/app-db";
import { hasTranscriptStorageFault, isTranscriptOnlySession } from "./storageTrust";

type Translator = (key: string, options?: Record<string, unknown>) => string;

export function buildStorageTrustStatusChipItems(
  record: Pick<LocalTranscription, "kind" | "transcriptStorageTrust" | "mediaStorageTrust">,
  t: Translator
): StatusChipItem[] {
  if (hasTranscriptStorageFault(record)) {
    return [
      {
        key: "storage-stop-fault",
        label: t("storageStopFaultLabel"),
        color: "error",
      },
    ];
  }
  if (isTranscriptOnlySession(record)) {
    return [
      {
        key: "transcript-only-session",
        label: t("transcriptOnlySessionLabel"),
        color: "warning",
      },
    ];
  }
  return [];
}
