import { appDb } from "../../data/app-db";

export async function clearCloudSyncLocalState() {
  await appDb.transaction(
    "rw",
    [
      appDb.transcriptions,
      appDb.segments,
      appDb.audioChunks,
      appDb.videoChunks,
      appDb.searchIndexes,
      appDb.summaryPartitions,
      appDb.summaryRuns,
      appDb.publishedSummaries,
      appDb.summaryPresetSelections,
      appDb.turnTranslations,
    ],
    async () => {
      await appDb.transcriptions.clear();
      await appDb.segments.clear();
      await appDb.audioChunks.clear();
      await appDb.videoChunks.clear();
      await appDb.searchIndexes.clear();
      await appDb.summaryPartitions.clear();
      await appDb.summaryRuns.clear();
      await appDb.publishedSummaries.clear();
      await appDb.summaryPresetSelections.clear();
      await appDb.turnTranslations.clear();
    }
  );
}
