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
  SummaryMutationTrigger,
  SummaryPresetApplyScope,
  SummaryPresetSelection,
  SummaryPresetSelectionSource,
  SummaryPresetSuggestion,
  SummaryPartition,
  SummaryPartitionReason,
  SummaryPartitionStatus,
  SummaryRegenerationScope,
  SummaryRun,
  SummaryRunScope,
  SummaryRunStatus,
  SummaryRunTrigger,
} from "../../domain/session";
import { resolveSummaryStalePropagation } from "../../domain/summaryRuntime";

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
    turnIds: partition.turnIds ? [...partition.turnIds] : undefined,
    status: partition.status as SummaryPartitionStatus,
    reason: partition.reason as SummaryPartitionReason,
  };
}

function mapLocalSummaryRun(run: LocalSummaryRun): SummaryRun {
  return {
    ...run,
    mode: run.mode as SummaryMode,
    scope: run.scope as SummaryRunScope,
    regenerationScope: run.regenerationScope as SummaryRegenerationScope,
    trigger: run.trigger as SummaryRunTrigger,
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
    staleReason: summary.staleReason ?? null,
    staleAt: summary.staleAt ?? null,
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
  turnIds?: string[];
  turnCount: number;
  startedAt: string;
  endedAt: string;
  status: SummaryPartitionStatus;
  reason: SummaryPartitionReason;
  sourceRevision: string;
  staleReason?: SummaryMutationTrigger | null;
  staleAt?: string | null;
}): Promise<SummaryPartition> {
  const payload: LocalSummaryPartition = {
    id: input.id ?? uuid(),
    sessionId: input.sessionId,
    startTurnId: input.startTurnId,
    endTurnId: input.endTurnId,
    turnIds: input.turnIds ? [...input.turnIds] : undefined,
    turnCount: input.turnCount,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    status: input.status as LocalSummaryPartitionStatus,
    reason: input.reason as LocalSummaryPartitionReason,
    sourceRevision: input.sourceRevision,
    staleReason: input.staleReason ?? null,
    staleAt: input.staleAt ?? null,
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
  if (patch.turnIds !== undefined) {
    updates.turnIds = patch.turnIds ? [...patch.turnIds] : undefined;
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
  if (patch.staleReason !== undefined) {
    updates.staleReason = patch.staleReason;
  }
  if (patch.staleAt !== undefined) {
    updates.staleAt = patch.staleAt;
  }
  await appDb.summaryPartitions.update(id, updates);
}

export async function createSummaryRun(input: {
  id?: string;
  sessionId: string;
  mode: SummaryMode;
  scope: SummaryRunScope;
  regenerationScope?: SummaryRegenerationScope | null;
  trigger?: SummaryRunTrigger | null;
  partitionIds?: string[];
  presetId?: string;
  presetVersion?: string;
  selectionSource?: SummaryPresetSelectionSource;
  providerLabel?: string | null;
  model?: string | null;
  sourceRevision: string;
  timeoutMs?: number | null;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  } | null;
  fallbackBackendProfileId?: string | null;
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
    regenerationScope: input.regenerationScope ?? null,
    trigger: input.trigger ?? null,
    partitionIds: [...(input.partitionIds ?? [])],
    presetId: input.presetId,
    presetVersion: input.presetVersion,
    selectionSource:
      (input.selectionSource ?? "default") as LocalSummaryPresetSelectionSource,
    providerLabel: input.providerLabel ?? undefined,
    model: input.model ?? undefined,
    sourceRevision: input.sourceRevision,
    timeoutMs: input.timeoutMs ?? null,
    retryPolicy: input.retryPolicy ?? null,
    fallbackBackendProfileId: input.fallbackBackendProfileId ?? null,
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
  if (patch.regenerationScope !== undefined) {
    updates.regenerationScope = patch.regenerationScope;
  }
  if (patch.trigger !== undefined) {
    updates.trigger = patch.trigger;
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
  if (patch.timeoutMs !== undefined) {
    updates.timeoutMs = patch.timeoutMs ?? null;
  }
  if (patch.retryPolicy !== undefined) {
    updates.retryPolicy = patch.retryPolicy ?? null;
  }
  if (patch.fallbackBackendProfileId !== undefined) {
    updates.fallbackBackendProfileId = patch.fallbackBackendProfileId ?? null;
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
  staleReason?: SummaryMutationTrigger | null;
  staleAt?: string | null;
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
    staleReason: input.staleReason ?? null,
    staleAt: input.staleAt ?? null,
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
  await markSummaryStateStaleByMutation({
    sessionId,
    sourceRevision,
    trigger: "partition_boundary_change",
  });
}

export async function markSummaryStateStaleByMutation(input: {
  sessionId: string;
  sourceRevision: string;
  trigger: SummaryMutationTrigger;
  turnId?: string;
  partitionId?: string;
  staleAt?: string;
}): Promise<void> {
  const partitions = await listSummaryPartitions(input.sessionId);
  const propagation = resolveSummaryStalePropagation({
    summaryState: { partitions },
    trigger: input.trigger,
    turnId: input.turnId,
    partitionId: input.partitionId,
    staleAt: input.staleAt,
  });

  await appDb.transaction(
    "rw",
    [appDb.summaryPartitions, appDb.publishedSummaries],
    async () => {
      await appDb.summaryPartitions
        .where("sessionId")
        .equals(input.sessionId)
        .modify((partition) => {
          if (
            propagation.affectedPartitionIds.length > 0 &&
            !propagation.affectedPartitionIds.includes(partition.id)
          ) {
            return;
          }
          partition.status = "stale";
          partition.sourceRevision = input.sourceRevision;
          partition.staleReason = input.trigger;
          partition.staleAt = propagation.staleAt;
        });

      await appDb.publishedSummaries
        .where("sessionId")
        .equals(input.sessionId)
        .modify((summary) => {
          const affectsSummary =
            summary.partitionIds.length === 0 ||
            summary.partitionIds.some((partitionId) =>
              propagation.affectedPartitionIds.includes(partitionId)
            );
          if (!affectsSummary) {
            return;
          }
          summary.freshness = "stale";
          summary.staleReason = input.trigger;
          summary.staleAt = propagation.staleAt;
          summary.stalePartitionIds =
            summary.partitionIds.length > 0
              ? summary.partitionIds.filter((partitionId) =>
                  propagation.affectedPartitionIds.includes(partitionId)
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
