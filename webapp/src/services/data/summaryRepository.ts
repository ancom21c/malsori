import { v4 as uuid } from "uuid";
import { appDb } from "../../data/app-db";
import type {
  LocalPublishedSummary,
  LocalSummaryBlock,
  LocalSummaryFreshness,
  LocalSummaryMode,
  LocalSummaryPresetApplyScope,
  LocalSummaryPresetSelection,
  LocalSummaryPresetSelectionSource,
  LocalSummaryPresetSuggestion,
  LocalSummaryPartition,
  LocalSummaryPartitionReason,
  LocalSummaryPartitionStatus,
  LocalSummaryRun,
  LocalSummaryRunScope,
  LocalSummaryRunStatus,
  LocalSummarySupportingSnippet,
} from "../../data/app-db";
import type {
  PublishedSummary,
  SessionSummaryArtifactInput,
  SummaryBlock,
  SummaryFreshness,
  SummaryMode,
  SummaryPresetApplyScope,
  SummaryPresetSelection,
  SummaryPresetSelectionSource,
  SummaryPresetSuggestion,
  SummaryPartition,
  SummaryPartitionReason,
  SummaryPartitionStatus,
  SummaryRun,
  SummaryRunScope,
  SummaryRunStatus,
} from "../../domain/session";

function cloneSupportingSnippets(
  snippets: LocalSummarySupportingSnippet[]
): SummaryBlock["supportingSnippets"] {
  return snippets.map((snippet) => ({ ...snippet }));
}

function cloneBlocks(blocks: LocalSummaryBlock[]): SummaryBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    title: block.title,
    content: block.content,
    supportingSnippets: cloneSupportingSnippets(block.supportingSnippets),
  }));
}

function cloneLocalBlocks(blocks: SummaryBlock[]): LocalSummaryBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    kind: block.kind,
    title: block.title,
    content: block.content,
    supportingSnippets: block.supportingSnippets.map((snippet) => ({ ...snippet })),
  }));
}

function clonePresetSuggestion(
  suggestion: LocalSummaryPresetSuggestion
): SummaryPresetSuggestion {
  return { ...suggestion };
}

function cloneLocalPresetSuggestion(
  suggestion: SummaryPresetSuggestion
): LocalSummaryPresetSuggestion {
  return { ...suggestion };
}

function mapLocalSummaryPartition(partition: LocalSummaryPartition): SummaryPartition {
  return {
    ...partition,
    status: partition.status as SummaryPartitionStatus,
    reason: partition.reason as SummaryPartitionReason,
  };
}

function mapLocalSummaryRun(run: LocalSummaryRun): SummaryRun {
  return {
    ...run,
    mode: run.mode as SummaryMode,
    scope: run.scope as SummaryRunScope,
    selectionSource: run.selectionSource as SummaryPresetSelectionSource,
    status: run.status as SummaryRunStatus,
    partitionIds: [...run.partitionIds],
    blocks: cloneBlocks(run.blocks),
  };
}

function mapLocalPublishedSummary(summary: LocalPublishedSummary): PublishedSummary {
  return {
    ...summary,
    mode: summary.mode as SummaryMode,
    freshness: summary.freshness as SummaryFreshness,
    partitionIds: [...summary.partitionIds],
    supportingSnippets: cloneSupportingSnippets(summary.supportingSnippets),
    blocks: cloneBlocks(summary.blocks),
    stalePartitionIds: [...summary.stalePartitionIds],
  };
}

function mapLocalSummaryPresetSelection(
  selection: LocalSummaryPresetSelection
): SummaryPresetSelection {
  return {
    ...selection,
    selectionSource:
      selection.selectionSource as SummaryPresetSelectionSource,
    applyScope: selection.applyScope as SummaryPresetApplyScope,
    suggestion: selection.suggestion
      ? clonePresetSuggestion(selection.suggestion)
      : null,
  };
}

export async function createSummaryPartition(input: {
  id?: string;
  sessionId: string;
  startTurnId: string;
  endTurnId: string;
  turnCount: number;
  startedAt: string;
  endedAt: string;
  status: SummaryPartitionStatus;
  reason: SummaryPartitionReason;
  sourceRevision: string;
}): Promise<SummaryPartition> {
  const payload: LocalSummaryPartition = {
    id: input.id ?? uuid(),
    sessionId: input.sessionId,
    startTurnId: input.startTurnId,
    endTurnId: input.endTurnId,
    turnCount: input.turnCount,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    status: input.status as LocalSummaryPartitionStatus,
    reason: input.reason as LocalSummaryPartitionReason,
    sourceRevision: input.sourceRevision,
  };
  await appDb.summaryPartitions.put(payload);
  return mapLocalSummaryPartition(payload);
}

export async function updateSummaryPartition(
  id: string,
  patch: Partial<
    Omit<SummaryPartition, "id" | "sessionId" | "startTurnId" | "endTurnId" | "turnCount">
  >
): Promise<void> {
  const updates: Partial<LocalSummaryPartition> = {};
  if (patch.startedAt !== undefined) {
    updates.startedAt = patch.startedAt;
  }
  if (patch.endedAt !== undefined) {
    updates.endedAt = patch.endedAt;
  }
  if (patch.status !== undefined) {
    updates.status = patch.status as LocalSummaryPartitionStatus;
  }
  if (patch.reason !== undefined) {
    updates.reason = patch.reason as LocalSummaryPartitionReason;
  }
  if (patch.sourceRevision !== undefined) {
    updates.sourceRevision = patch.sourceRevision;
  }
  await appDb.summaryPartitions.update(id, updates);
}

export async function createSummaryRun(input: {
  id?: string;
  sessionId: string;
  mode: SummaryMode;
  scope: SummaryRunScope;
  partitionIds?: string[];
  presetId?: string;
  presetVersion?: string;
  selectionSource?: SummaryPresetSelectionSource;
  providerLabel?: string | null;
  model?: string | null;
  sourceRevision: string;
  requestedAt?: string;
  completedAt?: string | null;
  status: SummaryRunStatus;
  errorMessage?: string | null;
  blocks?: SummaryBlock[];
}): Promise<SummaryRun> {
  const payload: LocalSummaryRun = {
    id: input.id ?? uuid(),
    sessionId: input.sessionId,
    mode: input.mode as LocalSummaryMode,
    scope: input.scope as LocalSummaryRunScope,
    partitionIds: [...(input.partitionIds ?? [])],
    presetId: input.presetId,
    presetVersion: input.presetVersion,
    selectionSource:
      (input.selectionSource ?? "default") as LocalSummaryPresetSelectionSource,
    providerLabel: input.providerLabel ?? undefined,
    model: input.model ?? undefined,
    sourceRevision: input.sourceRevision,
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    completedAt: input.completedAt ?? null,
    status: input.status as LocalSummaryRunStatus,
    errorMessage: input.errorMessage ?? null,
    blocks: cloneLocalBlocks(input.blocks ?? []),
  };
  await appDb.summaryRuns.put(payload);
  return mapLocalSummaryRun(payload);
}

export async function updateSummaryRun(
  id: string,
  patch: Partial<
    Omit<SummaryRun, "id" | "sessionId" | "mode" | "scope" | "partitionIds" | "sourceRevision">
  > & {
    partitionIds?: string[];
  }
): Promise<void> {
  const updates: Partial<LocalSummaryRun> = {};
  if (patch.partitionIds !== undefined) {
    updates.partitionIds = [...patch.partitionIds];
  }
  if (patch.presetId !== undefined) {
    updates.presetId = patch.presetId;
  }
  if (patch.presetVersion !== undefined) {
    updates.presetVersion = patch.presetVersion;
  }
  if (patch.selectionSource !== undefined) {
    updates.selectionSource =
      patch.selectionSource as LocalSummaryPresetSelectionSource;
  }
  if (patch.providerLabel !== undefined) {
    updates.providerLabel = patch.providerLabel ?? undefined;
  }
  if (patch.model !== undefined) {
    updates.model = patch.model ?? undefined;
  }
  if (patch.requestedAt !== undefined) {
    updates.requestedAt = patch.requestedAt;
  }
  if (patch.completedAt !== undefined) {
    updates.completedAt = patch.completedAt;
  }
  if (patch.status !== undefined) {
    updates.status = patch.status as LocalSummaryRunStatus;
  }
  if (patch.errorMessage !== undefined) {
    updates.errorMessage = patch.errorMessage ?? null;
  }
  if (patch.blocks !== undefined) {
    updates.blocks = cloneLocalBlocks(patch.blocks);
  }
  await appDb.summaryRuns.update(id, updates);
}

export async function upsertPublishedSummary(input: {
  id?: string;
  sessionId: string;
  mode: SummaryMode;
  runId: string;
  title: string;
  content: string;
  requestedAt?: string | null;
  updatedAt?: string;
  providerLabel?: string | null;
  sourceRevision: string;
  partitionIds?: string[];
  supportingSnippets?: SummaryBlock["supportingSnippets"];
  blocks?: SummaryBlock[];
  freshness?: SummaryFreshness;
  stalePartitionIds?: string[];
}): Promise<PublishedSummary> {
  const payload: LocalPublishedSummary = {
    id: input.id ?? `${input.sessionId}-${input.mode}`,
    sessionId: input.sessionId,
    mode: input.mode as LocalSummaryMode,
    runId: input.runId,
    title: input.title,
    content: input.content,
    requestedAt: input.requestedAt ?? null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    providerLabel: input.providerLabel ?? undefined,
    sourceRevision: input.sourceRevision,
    partitionIds: [...(input.partitionIds ?? [])],
    supportingSnippets: (input.supportingSnippets ?? []).map((snippet) => ({ ...snippet })),
    blocks: cloneLocalBlocks(input.blocks ?? []),
    freshness: (input.freshness ?? "fresh") as LocalSummaryFreshness,
    stalePartitionIds: [...(input.stalePartitionIds ?? [])],
  };
  await appDb.publishedSummaries.put(payload);
  return mapLocalPublishedSummary(payload);
}

export async function listSummaryPartitions(sessionId: string): Promise<SummaryPartition[]> {
  const partitions = await appDb.summaryPartitions.where("sessionId").equals(sessionId).sortBy("startedAt");
  return partitions.map(mapLocalSummaryPartition);
}

export async function listSummaryRuns(sessionId: string): Promise<SummaryRun[]> {
  const runs = await appDb.summaryRuns.where("sessionId").equals(sessionId).toArray();
  return runs
    .map(mapLocalSummaryRun)
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export async function listPublishedSummaries(sessionId: string): Promise<PublishedSummary[]> {
  const summaries = await appDb.publishedSummaries.where("sessionId").equals(sessionId).toArray();
  return summaries
    .map(mapLocalPublishedSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveSummaryPresetSelection(input: {
  sessionId: string;
  selectedPresetId: string;
  selectedPresetVersion: string;
  selectionSource: SummaryPresetSelectionSource;
  applyScope: SummaryPresetApplyScope;
  lockedByUser: boolean;
  updatedAt?: string;
  suggestion?: SummaryPresetSuggestion | null;
}): Promise<SummaryPresetSelection> {
  const payload: LocalSummaryPresetSelection = {
    sessionId: input.sessionId,
    selectedPresetId: input.selectedPresetId,
    selectedPresetVersion: input.selectedPresetVersion,
    selectionSource:
      input.selectionSource as LocalSummaryPresetSelectionSource,
    applyScope: input.applyScope as LocalSummaryPresetApplyScope,
    lockedByUser: input.lockedByUser,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    suggestion: input.suggestion
      ? cloneLocalPresetSuggestion(input.suggestion)
      : null,
  };
  await appDb.summaryPresetSelections.put(payload);
  return mapLocalSummaryPresetSelection(payload);
}

export async function readSummaryPresetSelection(
  sessionId: string
): Promise<SummaryPresetSelection | null> {
  const selection = await appDb.summaryPresetSelections.get(sessionId);
  return selection ? mapLocalSummaryPresetSelection(selection) : null;
}

export async function readSessionSummaryState(
  sessionId: string
): Promise<SessionSummaryArtifactInput> {
  const [partitions, runs, publishedSummaries, presetSelection] = await Promise.all([
    listSummaryPartitions(sessionId),
    listSummaryRuns(sessionId),
    listPublishedSummaries(sessionId),
    readSummaryPresetSelection(sessionId),
  ]);
  return {
    partitions,
    runs,
    publishedSummaries,
    presetSelection,
  };
}

export async function markSessionSummaryStateStale(
  sessionId: string,
  sourceRevision: string
): Promise<void> {
  await appDb.transaction(
    "rw",
    [appDb.summaryPartitions, appDb.publishedSummaries],
    async () => {
      await appDb.summaryPartitions
        .where("sessionId")
        .equals(sessionId)
        .modify((partition) => {
          partition.status = "stale";
          partition.sourceRevision = sourceRevision;
        });

      const stalePartitionIds = (
        await appDb.summaryPartitions.where("sessionId").equals(sessionId).toArray()
      ).map((partition) => partition.id);

      await appDb.publishedSummaries
        .where("sessionId")
        .equals(sessionId)
        .modify((summary) => {
          summary.freshness = "stale";
          summary.stalePartitionIds =
            summary.partitionIds.length > 0
              ? summary.partitionIds.filter((partitionId) =>
                  stalePartitionIds.includes(partitionId)
                )
              : [];
        });
    }
  );
}

export async function deleteSessionSummaryState(sessionId: string): Promise<void> {
  await appDb.transaction(
    "rw",
    [
      appDb.summaryPartitions,
      appDb.summaryRuns,
      appDb.publishedSummaries,
      appDb.summaryPresetSelections,
    ],
    async () => {
      await appDb.summaryPartitions.where("sessionId").equals(sessionId).delete();
      await appDb.summaryRuns.where("sessionId").equals(sessionId).delete();
      await appDb.publishedSummaries.where("sessionId").equals(sessionId).delete();
      await appDb.summaryPresetSelections.delete(sessionId);
    }
  );
}
