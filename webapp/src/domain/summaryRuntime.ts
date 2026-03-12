import type { FeatureBinding } from "./featureBinding";
import type {
  SessionSummaryArtifactInput,
  SummaryMode,
  SummaryMutationTrigger,
  SummaryPartition,
  SummaryPartitionReason,
  SummaryPresetSelection,
  SummaryRegenerationScope,
  SummaryRunTrigger,
} from "./session";

export interface SummaryRuntimePolicy {
  realtimeDebounceMs: number;
  realtimeBatchWindowMs: number;
  realtimeMinTurnCount: number;
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  fallbackBackendProfileId: string | null;
}

export interface SummaryStalePropagation {
  affectedPartitionIds: string[];
  affectsSessionSummary: boolean;
  trigger: SummaryMutationTrigger;
  staleAt: string;
}

export interface SummaryRuntimeTurnWindow {
  id: string;
  startMs: number;
  endMs: number;
}

export interface RealtimeSummaryDraftWindow {
  turnIds: string[];
  startTurnId: string | null;
  endTurnId: string | null;
  turnCount: number;
  startMs: number | null;
  endMs: number | null;
}

export interface RealtimeSummaryFinalizeDecision {
  shouldFinalize: boolean;
  reason: SummaryPartitionReason | null;
  waitMs: number | null;
}

export interface SummaryRunLifecycleInput {
  sessionId: string;
  mode: SummaryMode;
  scope: "partition" | "session";
  regenerationScope: SummaryRegenerationScope;
  trigger: SummaryRunTrigger;
  partitionIds: string[];
  presetId: string;
  presetVersion: string;
  selectionSource: SummaryPresetSelection["selectionSource"];
  sourceRevision: string;
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  fallbackBackendProfileId: string | null;
  requestedAt: string;
  status: "pending";
}

export const DEFAULT_SUMMARY_RUNTIME_POLICY: SummaryRuntimePolicy = {
  realtimeDebounceMs: 2500,
  realtimeBatchWindowMs: 15000,
  realtimeMinTurnCount: 3,
  timeoutMs: 20000,
  retryPolicy: {
    maxAttempts: 2,
    backoffMs: 1500,
  },
  fallbackBackendProfileId: null,
};

export function resolveSummaryRuntimePolicy(
  binding?: Pick<FeatureBinding, "timeoutMs" | "retryPolicy" | "fallbackBackendProfileId"> | null
): SummaryRuntimePolicy {
  return {
    ...DEFAULT_SUMMARY_RUNTIME_POLICY,
    timeoutMs: binding?.timeoutMs ?? DEFAULT_SUMMARY_RUNTIME_POLICY.timeoutMs,
    retryPolicy: binding?.retryPolicy ?? DEFAULT_SUMMARY_RUNTIME_POLICY.retryPolicy,
    fallbackBackendProfileId:
      binding?.fallbackBackendProfileId ??
      DEFAULT_SUMMARY_RUNTIME_POLICY.fallbackBackendProfileId,
  };
}

export function resolveSummaryStalePropagation(input: {
  summaryState?: Pick<SessionSummaryArtifactInput, "partitions"> | null;
  trigger: SummaryMutationTrigger;
  turnId?: string;
  partitionId?: string;
  staleAt?: string;
}): SummaryStalePropagation {
  const partitions = input.summaryState?.partitions ?? [];
  const partitionIdSet = new Set<string>();

  if (input.partitionId) {
    partitionIdSet.add(input.partitionId);
  } else if (input.turnId) {
    partitions
      .filter((partition) => partition.turnIds?.includes(input.turnId ?? ""))
      .forEach((partition) => {
        partitionIdSet.add(partition.id);
      });
  }

  const affectedPartitionIds =
    partitionIdSet.size > 0
      ? Array.from(partitionIdSet)
      : partitions.map((partition) => partition.id);

  return {
    affectedPartitionIds,
    affectsSessionSummary: affectedPartitionIds.length > 0,
    trigger: input.trigger,
    staleAt: input.staleAt ?? new Date().toISOString(),
  };
}

export function buildSummaryRunLifecycleInput(input: {
  sessionId: string;
  mode: SummaryMode;
  scope: "partition" | "session";
  regenerationScope: SummaryRegenerationScope;
  trigger: SummaryRunTrigger;
  partitionIds?: string[];
  selection: SummaryPresetSelection;
  sourceRevision: string;
  requestedAt?: string;
  binding?: Pick<FeatureBinding, "timeoutMs" | "retryPolicy" | "fallbackBackendProfileId"> | null;
}): SummaryRunLifecycleInput {
  const policy = resolveSummaryRuntimePolicy(input.binding);
  return {
    sessionId: input.sessionId,
    mode: input.mode,
    scope: input.scope,
    regenerationScope: input.regenerationScope,
    trigger: input.trigger,
    partitionIds: [...(input.partitionIds ?? [])],
    presetId: input.selection.selectedPresetId,
    presetVersion: input.selection.selectedPresetVersion,
    selectionSource: input.selection.selectionSource,
    sourceRevision: input.sourceRevision,
    timeoutMs: policy.timeoutMs,
    retryPolicy: policy.retryPolicy,
    fallbackBackendProfileId: policy.fallbackBackendProfileId,
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    status: "pending",
  };
}

export function resolveRealtimeSummaryDraftWindow(input: {
  turns: SummaryRuntimeTurnWindow[];
  partitions?: Pick<SummaryPartition, "status" | "turnIds">[] | null;
}): RealtimeSummaryDraftWindow {
  const coveredTurnIds = new Set(
    (input.partitions ?? [])
      .filter((partition) => partition.status !== "draft")
      .flatMap((partition) => partition.turnIds ?? [])
  );
  const draftTurns = input.turns.filter((turn) => !coveredTurnIds.has(turn.id));
  return {
    turnIds: draftTurns.map((turn) => turn.id),
    startTurnId: draftTurns[0]?.id ?? null,
    endTurnId: draftTurns[draftTurns.length - 1]?.id ?? null,
    turnCount: draftTurns.length,
    startMs: draftTurns[0]?.startMs ?? null,
    endMs: draftTurns[draftTurns.length - 1]?.endMs ?? null,
  };
}

export function resolveRealtimeSummaryFinalizeDecision(input: {
  draft: Pick<RealtimeSummaryDraftWindow, "turnCount" | "startMs" | "endMs">;
  sessionActive: boolean;
  lastSourceUpdatedAt?: string | null;
  policy: Pick<
    SummaryRuntimePolicy,
    "realtimeDebounceMs" | "realtimeBatchWindowMs" | "realtimeMinTurnCount"
  >;
  now?: string;
}): RealtimeSummaryFinalizeDecision {
  if (input.draft.turnCount === 0) {
    return {
      shouldFinalize: false,
      reason: null,
      waitMs: null,
    };
  }

  if (!input.sessionActive) {
    return {
      shouldFinalize: true,
      reason: "session_end",
      waitMs: 0,
    };
  }

  if (input.draft.turnCount < input.policy.realtimeMinTurnCount) {
    return {
      shouldFinalize: false,
      reason: null,
      waitMs: null,
    };
  }

  if (
    input.draft.startMs !== null &&
    input.draft.endMs !== null &&
    input.draft.endMs - input.draft.startMs >= input.policy.realtimeBatchWindowMs
  ) {
    return {
      shouldFinalize: true,
      reason: "max_duration",
      waitMs: 0,
    };
  }

  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  const updatedAtMs = Date.parse(input.lastSourceUpdatedAt ?? "");
  if (Number.isFinite(nowMs) && Number.isFinite(updatedAtMs)) {
    const elapsedMs = Math.max(0, nowMs - updatedAtMs);
    if (elapsedMs >= input.policy.realtimeDebounceMs) {
      return {
        shouldFinalize: true,
        reason: "silence_gap",
        waitMs: 0,
      };
    }
    return {
      shouldFinalize: false,
      reason: null,
      waitMs: Math.max(0, input.policy.realtimeDebounceMs - elapsedMs),
    };
  }

  return {
    shouldFinalize: false,
    reason: null,
    waitMs: input.policy.realtimeDebounceMs,
  };
}
