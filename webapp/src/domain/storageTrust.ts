import type {
  LocalMediaStorageFaultReason,
  LocalStorageTrustState,
  LocalTranscription,
  LocalTranscriptStorageFaultReason,
} from "../data/app-db";

type StorageTrustRecord = Pick<
  LocalTranscription,
  | "transcriptStorageTrust"
  | "transcriptStorageFaultReason"
  | "transcriptStorageFaultAt"
  | "mediaStorageTrust"
  | "mediaStorageFaultReason"
  | "mediaStorageFaultAt"
>;

export function getTranscriptStorageTrust(
  record: Pick<LocalTranscription, "transcriptStorageTrust"> | null | undefined
): LocalStorageTrustState {
  return record?.transcriptStorageTrust ?? "trusted";
}

export function getMediaStorageTrust(
  record: Pick<LocalTranscription, "mediaStorageTrust"> | null | undefined
): LocalStorageTrustState {
  return record?.mediaStorageTrust ?? "trusted";
}

export function hasTranscriptStorageFault(record: StorageTrustRecord | null | undefined): boolean {
  return getTranscriptStorageTrust(record) === "broken";
}

export function hasMediaStorageFault(record: StorageTrustRecord | null | undefined): boolean {
  return getMediaStorageTrust(record) === "broken";
}

export function isTranscriptOnlySession(record: StorageTrustRecord | null | undefined): boolean {
  return !hasTranscriptStorageFault(record) && hasMediaStorageFault(record);
}

export function resolveTrustedRemoteAudioUrl(
  record: Pick<
    LocalTranscription,
    "remoteAudioUrl" | "transcriptStorageTrust" | "mediaStorageTrust"
  > | null | undefined
): string | undefined {
  if (!record || hasTranscriptStorageFault(record) || hasMediaStorageFault(record)) {
    return undefined;
  }
  return record.remoteAudioUrl;
}

export function shouldHideFromSavedHistory(
  record: Pick<LocalTranscription, "kind" | "transcriptStorageTrust"> | null | undefined
): boolean {
  return record?.kind === "realtime" && hasTranscriptStorageFault(record);
}

export function buildMediaStorageFaultPatch(
  record: Pick<
    LocalTranscription,
    "mediaStorageTrust" | "mediaStorageFaultReason" | "mediaStorageFaultAt"
  > | null | undefined,
  reason: LocalMediaStorageFaultReason,
  faultedAt = new Date().toISOString()
): Partial<LocalTranscription> {
  if (getMediaStorageTrust(record) === "broken") {
    return {};
  }
  return {
    mediaStorageTrust: "broken",
    mediaStorageFaultReason: record?.mediaStorageFaultReason ?? reason,
    mediaStorageFaultAt: record?.mediaStorageFaultAt ?? faultedAt,
  };
}

export function buildTranscriptStorageFaultPatch(
  record: Pick<
    LocalTranscription,
    "transcriptStorageTrust" | "transcriptStorageFaultReason" | "transcriptStorageFaultAt"
  > | null | undefined,
  reason: LocalTranscriptStorageFaultReason,
  faultedAt = new Date().toISOString()
): Partial<LocalTranscription> {
  if (getTranscriptStorageTrust(record) === "broken") {
    return {};
  }
  return {
    transcriptStorageTrust: "broken",
    transcriptStorageFaultReason: record?.transcriptStorageFaultReason ?? reason,
    transcriptStorageFaultAt: record?.transcriptStorageFaultAt ?? faultedAt,
  };
}
