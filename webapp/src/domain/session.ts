import type { LocalSegment, LocalTranscription } from "../data/app-db";

export type SessionMode =
  | "capture_file"
  | "capture_realtime"
  | "translate_realtime";

export type SessionState =
  | "idle"
  | "preparing"
  | "countdown"
  | "recording"
  | "paused"
  | "reconnecting"
  | "degraded"
  | "stopping"
  | "processing"
  | "ready"
  | "failed";

export type TurnStatus = "partial" | "final";

export type TurnVariantType = "translation" | "normalized" | "redacted";

export type TurnVariantStatus = "pending" | "partial" | "final" | "failed";

export type ArtifactType = "summary" | "action_items" | "key_terms" | "qa";

export type ArtifactStatus = "not_requested" | "pending" | "ready" | "failed";

export type SummaryMode = "realtime" | "full";

export type SummaryPartitionStatus = "draft" | "finalized" | "stale";

export type SummaryPartitionReason =
  | "manual"
  | "silence_gap"
  | "speaker_shift"
  | "topic_shift"
  | "max_turns"
  | "max_duration"
  | "token_budget"
  | "session_end";

export type SummaryRunScope = "partition" | "session";

export type SummaryRunStatus = Extract<ArtifactStatus, "pending" | "ready" | "failed">;

export type SummaryFreshness = "fresh" | "stale";

export type SummaryMutationTrigger =
  | "late_final_turn"
  | "segment_correction"
  | "speaker_relabel"
  | "partition_boundary_change";

export type SummaryRunTrigger =
  | "realtime_batch"
  | "session_ready"
  | "manual_regenerate"
  | "manual_retry"
  | "preset_apply_from_now"
  | "preset_rerun_all";

export type SummaryRegenerationScope = "partition" | "mode" | "session";

export type SummarySupportedMode = "realtime" | "full" | "both";

export type SummaryPresetSelectionSource = "default" | "auto" | "manual";

export type SummaryPresetApplyScope = "from_now" | "regenerate_all";

export interface ArtifactSupportingSnippet {
  id: string;
  turnId?: string;
  speakerLabel?: string;
  startMs?: number;
  endMs?: number;
  text: string;
}

export interface ArtifactRequestRecord {
  id: string;
  prompt?: string;
  status: ArtifactStatus;
  requestedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  presetId?: string;
  presetVersion?: string;
  selectionSource?: SummaryPresetSelectionSource;
  trigger?: SummaryRunTrigger | null;
  regenerationScope?: SummaryRegenerationScope | null;
  summaryMode?: SummaryMode;
  providerLabel?: string | null;
  model?: string | null;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  sourceRevision?: string | null;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  timeoutMs?: number | null;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  } | null;
  fallbackBackendProfileId?: string | null;
  partitionIds?: string[];
  supportingSnippets: ArtifactSupportingSnippet[];
}

export interface SummaryPresetSectionSchema {
  id: string;
  label: string;
  kind: "narrative" | "bullet_list" | "quote_list";
  required: boolean;
}

export interface SummaryPreset {
  id: string;
  version: string;
  label: string;
  description: string;
  language: string;
  intendedContexts: string[];
  supportedModes: SummarySupportedMode;
  outputSchema: SummaryPresetSectionSchema[];
  defaultModelHint?: string | null;
  defaultSelectionWeight: number;
}

export interface SummaryPresetSuggestion {
  suggestedPresetId: string;
  appliedPresetId: string;
  confidence: number;
  reason: string;
  evaluatedTurnStartTurnId?: string | null;
  evaluatedTurnEndTurnId?: string | null;
  createdAt: string;
  fallbackApplied: boolean;
}

export interface SummaryPresetSelection {
  sessionId: string;
  selectedPresetId: string;
  selectedPresetVersion: string;
  selectionSource: SummaryPresetSelectionSource;
  applyScope: SummaryPresetApplyScope;
  lockedByUser: boolean;
  updatedAt: string;
  suggestion?: SummaryPresetSuggestion | null;
}

export interface SummaryPartition {
  id: string;
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
}

export interface SummaryBlock {
  id: string;
  kind: string;
  title?: string;
  content: string;
  supportingSnippets: ArtifactSupportingSnippet[];
}

export interface SummaryRun {
  id: string;
  sessionId: string;
  mode: SummaryMode;
  scope: SummaryRunScope;
  regenerationScope?: SummaryRegenerationScope | null;
  trigger?: SummaryRunTrigger | null;
  partitionIds: string[];
  presetId?: string;
  presetVersion?: string;
  selectionSource: SummaryPresetSelectionSource;
  providerLabel?: string | null;
  model?: string | null;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  timeoutMs?: number | null;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  } | null;
  fallbackBackendProfileId?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  status: SummaryRunStatus;
  errorMessage?: string | null;
  blocks: SummaryBlock[];
}

export interface PublishedSummary {
  id: string;
  sessionId: string;
  mode: SummaryMode;
  runId: string;
  title: string;
  content: string;
  requestedAt?: string | null;
  updatedAt: string;
  providerLabel?: string | null;
  backendProfileId?: string | null;
  usedFallback?: boolean | null;
  sourceRevision: string;
  sourceLanguage?: string | null;
  outputLanguage?: string | null;
  partitionIds: string[];
  supportingSnippets: ArtifactSupportingSnippet[];
  blocks: SummaryBlock[];
  freshness: SummaryFreshness;
  stalePartitionIds: string[];
  staleReason?: SummaryMutationTrigger | null;
  staleAt?: string | null;
}

export interface SessionSummaryArtifactInput {
  partitions: SummaryPartition[];
  runs: SummaryRun[];
  publishedSummaries: PublishedSummary[];
  presetSelection?: SummaryPresetSelection | null;
}

export interface QualitySnapshot {
  latencyMs?: number;
  bufferedAudioMs: number;
  droppedAudioMs: number;
  replayedAudioMs: number;
  droppedAudioRatio?: number;
  reconnectCount?: number;
  degraded: boolean;
}

export interface SessionRecord {
  id: string;
  title: string;
  mode: SessionMode;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
  remoteId?: string;
  sourceLanguage?: string;
  targetLanguages: string[];
  transcriptText?: string;
  speakerCount?: number;
  quality: QualitySnapshot;
  rawStatus?: string;
  errorMessage?: string;
}

export interface SessionTurnVariant {
  id: string;
  type: TurnVariantType;
  language?: string;
  text: string;
  status: TurnVariantStatus;
  errorMessage?: string | null;
}

export interface SessionTurn {
  id: string;
  sessionId: string;
  speakerId?: string;
  speakerLabel?: string;
  sourceLanguage?: string;
  startMs: number;
  endMs: number;
  text: string;
  status: TurnStatus;
  confidence?: number;
  variants: SessionTurnVariant[];
}

export interface SessionArtifact {
  sessionId: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  content?: string;
  requestedAt?: string | null;
  updatedAt?: string | null;
  providerLabel?: string | null;
  errorMessage?: string | null;
  freshness?: SummaryFreshness | null;
  summaryMode?: SummaryMode | null;
  summarySourceRevision?: string | null;
  summarySourceLanguage?: string | null;
  summaryOutputLanguage?: string | null;
  summaryRunId?: string | null;
  summaryPartitionIds?: string[];
  stalePartitionIds?: string[];
  summaryPresetId?: string | null;
  summaryPresetVersion?: string | null;
  presetSelectionSource?: SummaryPresetSelectionSource | null;
  presetSuggestion?: SummaryPresetSuggestion | null;
  summaryBackendProfileId?: string | null;
  summaryUsedFallback?: boolean | null;
  supportingSnippets: ArtifactSupportingSnippet[];
  requests: ArtifactRequestRecord[];
}

export function deriveSessionMode(
  transcription: Pick<LocalTranscription, "kind">
): SessionMode {
  return transcription.kind === "realtime" ? "capture_realtime" : "capture_file";
}

export function deriveSessionState(
  transcription: Pick<
    LocalTranscription,
    "status" | "kind" | "processingStage" | "realtimeQualityState"
  >
): SessionState {
  if (transcription.status === "failed") {
    return "failed";
  }

  if (transcription.status === "completed") {
    return "ready";
  }

  if (transcription.kind === "file") {
    return transcription.status === "pending" ? "preparing" : "processing";
  }

  switch (transcription.processingStage) {
    case "connecting":
      return "preparing";
    case "recording":
      return transcription.realtimeQualityState === "degraded"
        ? "degraded"
        : "recording";
    case "paused":
      return "paused";
    case "finalizing":
    case "saving":
      return "stopping";
    default:
      return transcription.status === "pending" ? "idle" : "processing";
  }
}

export function deriveQualitySnapshot(
  transcription: Pick<
    LocalTranscription,
    | "realtimeBufferedAudioMs"
    | "realtimeDroppedAudioMs"
    | "realtimeReplayedAudioMs"
    | "realtimeDroppedAudioRatio"
    | "realtimeQualityState"
  >
): QualitySnapshot {
  return {
    bufferedAudioMs: transcription.realtimeBufferedAudioMs ?? 0,
    droppedAudioMs: transcription.realtimeDroppedAudioMs ?? 0,
    replayedAudioMs: transcription.realtimeReplayedAudioMs ?? 0,
    droppedAudioRatio: transcription.realtimeDroppedAudioRatio,
    degraded: transcription.realtimeQualityState === "degraded",
  };
}

export function mapLocalTranscriptionToSessionRecord(
  transcription: LocalTranscription
): SessionRecord {
  return {
    id: transcription.id,
    title: transcription.title,
    mode: deriveSessionMode(transcription),
    state: deriveSessionState(transcription),
    createdAt: transcription.createdAt,
    updatedAt: transcription.updatedAt,
    remoteId: transcription.remoteId,
    sourceLanguage: undefined,
    targetLanguages: [],
    transcriptText: transcription.transcriptText,
    rawStatus: transcription.upstreamStatusRaw,
    errorMessage: transcription.errorMessage,
    quality: deriveQualitySnapshot(transcription),
  };
}

export function mapLocalSegmentToSessionTurn(segment: LocalSegment): SessionTurn {
  const wordConfidence =
    segment.words && segment.words.length > 0
      ? segment.words.reduce((sum, word) => sum + (word.confidence ?? 0), 0) /
        segment.words.filter((word) => typeof word.confidence === "number").length
      : undefined;

  return {
    id: segment.id,
    sessionId: segment.transcriptionId,
    speakerId: segment.spk,
    speakerLabel: segment.speaker_label,
    sourceLanguage: segment.language,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.correctedText?.trim() || segment.text,
    status: segment.isPartial && !segment.isFinal ? "partial" : "final",
    confidence:
      typeof wordConfidence === "number" && Number.isFinite(wordConfidence)
        ? wordConfidence
        : undefined,
    variants: [],
  };
}

export function createDefaultSessionArtifacts(
  sessionId: string
): SessionArtifact[] {
  return [
    createBaseSessionArtifact(sessionId, "summary", "Summary"),
    createBaseSessionArtifact(sessionId, "action_items", "Action items"),
    createBaseSessionArtifact(sessionId, "key_terms", "Key terms"),
    createBaseSessionArtifact(sessionId, "qa", "Ask transcript"),
  ];
}

export function createSessionArtifacts(
  sessionId: string,
  summaryState?: SessionSummaryArtifactInput | null,
  currentSourceRevision?: string | null
): SessionArtifact[] {
  const artifacts = createDefaultSessionArtifacts(sessionId);
  if (!summaryState) {
    return artifacts;
  }

  return artifacts.map((artifact) =>
    artifact.type === "summary"
      ? createSummarySessionArtifact(sessionId, summaryState, currentSourceRevision)
      : artifact
  );
}

function createBaseSessionArtifact(
  sessionId: string,
  type: ArtifactType,
  title: string
): SessionArtifact {
  return {
    sessionId,
    type,
    status: "not_requested",
    title,
    supportingSnippets: [],
    requests: [],
  };
}

function summarizeSummaryBlocks(blocks: SummaryBlock[]): string | undefined {
  const lines = blocks
    .map((block) => {
      const heading = block.title?.trim();
      const content = block.content.trim();
      if (!content) {
        return heading;
      }
      return heading ? `${heading}: ${content}` : content;
    })
    .filter((line): line is string => Boolean(line && line.length > 0));

  return lines.length > 0 ? lines.join("\n") : undefined;
}

function rollupSupportingSnippets(input: {
  supportingSnippets: ArtifactSupportingSnippet[];
  blocks: SummaryBlock[];
}): ArtifactSupportingSnippet[] {
  if (input.supportingSnippets.length > 0) {
    return input.supportingSnippets.map((snippet) => ({ ...snippet }));
  }

  const snippets: ArtifactSupportingSnippet[] = [];
  const seenIds = new Set<string>();
  for (const block of input.blocks) {
    for (const snippet of block.supportingSnippets) {
      if (seenIds.has(snippet.id)) {
        continue;
      }
      seenIds.add(snippet.id);
      snippets.push({ ...snippet });
      if (snippets.length >= 6) {
        return snippets;
      }
    }
  }
  return snippets;
}

function sortByIsoDescending(
  left: string | null | undefined,
  right: string | null | undefined
) {
  return (right ?? "").localeCompare(left ?? "");
}

function getPublishedSummaryPriority(
  summary: PublishedSummary,
  currentSourceRevision?: string | null
) {
  const freshnessPenalty =
    summary.freshness === "fresh" &&
    (!currentSourceRevision || summary.sourceRevision === currentSourceRevision)
      ? 0
      : 2;
  const modePenalty = summary.mode === "full" ? 0 : 1;
  return freshnessPenalty + modePenalty;
}

function selectPreferredPublishedSummary(
  summaries: PublishedSummary[],
  currentSourceRevision?: string | null
) {
  return [...summaries].sort((left, right) => {
    const priorityDelta =
      getPublishedSummaryPriority(left, currentSourceRevision) -
      getPublishedSummaryPriority(right, currentSourceRevision);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return sortByIsoDescending(left.updatedAt, right.updatedAt);
  })[0];
}

function resolveSummaryFreshness(
  summary: PublishedSummary,
  partitions: SummaryPartition[],
  currentSourceRevision?: string | null
): SummaryFreshness {
  if (summary.freshness === "stale") {
    return "stale";
  }
  if (currentSourceRevision && summary.sourceRevision !== currentSourceRevision) {
    return "stale";
  }
  if (
    partitions.some(
      (partition) =>
        partition.status === "stale" && summary.partitionIds.includes(partition.id)
    )
  ) {
    return "stale";
  }
  return "fresh";
}

function createSummaryRequestRecord(run: SummaryRun): ArtifactRequestRecord {
  return {
    id: run.id,
    prompt: run.presetId,
    status: run.status,
    requestedAt: run.requestedAt,
    completedAt: run.completedAt ?? null,
    errorMessage: run.errorMessage ?? null,
    presetId: run.presetId,
    presetVersion: run.presetVersion,
    selectionSource: run.selectionSource,
    trigger: run.trigger ?? null,
    regenerationScope: run.regenerationScope ?? null,
    summaryMode: run.mode,
    providerLabel: run.providerLabel ?? null,
    model: run.model ?? null,
    backendProfileId: run.backendProfileId ?? null,
    usedFallback: run.usedFallback ?? null,
    sourceRevision: run.sourceRevision,
    sourceLanguage: run.sourceLanguage ?? null,
    outputLanguage: run.outputLanguage ?? null,
    timeoutMs: run.timeoutMs ?? null,
    retryPolicy: run.retryPolicy ?? null,
    fallbackBackendProfileId: run.fallbackBackendProfileId ?? null,
    partitionIds: [...run.partitionIds],
    supportingSnippets: rollupSupportingSnippets({
      supportingSnippets: [],
      blocks: run.blocks,
    }),
  };
}

function createSummarySessionArtifact(
  sessionId: string,
  summaryState: SessionSummaryArtifactInput,
  currentSourceRevision?: string | null
): SessionArtifact {
  const selectedPreset = summaryState.presetSelection ?? null;
  const artifact: SessionArtifact = {
    ...createBaseSessionArtifact(sessionId, "summary", "Summary"),
    summaryPresetId: selectedPreset?.selectedPresetId ?? null,
    summaryPresetVersion: selectedPreset?.selectedPresetVersion ?? null,
    presetSelectionSource: selectedPreset?.selectionSource ?? null,
    presetSuggestion: selectedPreset?.suggestion ?? null,
  };
  const runs = [...summaryState.runs].sort((left, right) => {
    const requestedDelta = sortByIsoDescending(left.requestedAt, right.requestedAt);
    if (requestedDelta !== 0) {
      return requestedDelta;
    }
    return sortByIsoDescending(left.completedAt, right.completedAt);
  });
  const preferredSummary = selectPreferredPublishedSummary(
    summaryState.publishedSummaries,
    currentSourceRevision
  );

  artifact.requests = runs.map(createSummaryRequestRecord);

  if (preferredSummary) {
    const freshness = resolveSummaryFreshness(
      preferredSummary,
      summaryState.partitions,
      currentSourceRevision
    );
    const stalePartitionIds = Array.from(
      new Set(
        freshness === "stale"
          ? [
              ...preferredSummary.stalePartitionIds,
              ...preferredSummary.partitionIds.filter((partitionId) =>
                summaryState.partitions.some(
                  (partition) =>
                    partition.id === partitionId && partition.status === "stale"
                )
              ),
            ]
          : []
      )
    );
    return {
      ...artifact,
      status: "ready",
      content:
        preferredSummary.content.trim() ||
        summarizeSummaryBlocks(preferredSummary.blocks),
      requestedAt:
        preferredSummary.requestedAt ??
        runs.find((run) => run.id === preferredSummary.runId)?.requestedAt ??
        null,
      updatedAt: preferredSummary.updatedAt,
      providerLabel: preferredSummary.providerLabel ?? null,
      freshness,
      summaryMode: preferredSummary.mode,
      summarySourceRevision: preferredSummary.sourceRevision,
      summarySourceLanguage: preferredSummary.sourceLanguage ?? null,
      summaryOutputLanguage: preferredSummary.outputLanguage ?? null,
      summaryRunId: preferredSummary.runId,
      summaryPartitionIds: [...preferredSummary.partitionIds],
      stalePartitionIds,
      summaryPresetId:
        selectedPreset?.selectedPresetId ??
        runs.find((run) => run.id === preferredSummary.runId)?.presetId ??
        null,
      summaryPresetVersion:
        selectedPreset?.selectedPresetVersion ??
        runs.find((run) => run.id === preferredSummary.runId)?.presetVersion ??
        null,
      presetSelectionSource: selectedPreset?.selectionSource ?? null,
      presetSuggestion: selectedPreset?.suggestion ?? null,
      summaryBackendProfileId: preferredSummary.backendProfileId ?? null,
      summaryUsedFallback: preferredSummary.usedFallback ?? null,
      supportingSnippets: rollupSupportingSnippets(preferredSummary),
    };
  }

  const latestRun = runs[0];
  if (!latestRun) {
    return artifact;
  }

  if (latestRun.status === "pending") {
    return {
      ...artifact,
      status: "pending",
      requestedAt: latestRun.requestedAt,
      summaryMode: latestRun.mode,
      summarySourceRevision: latestRun.sourceRevision,
      summarySourceLanguage: latestRun.sourceLanguage ?? null,
      summaryOutputLanguage: latestRun.outputLanguage ?? null,
      summaryPartitionIds: [...latestRun.partitionIds],
      summaryPresetId: selectedPreset?.selectedPresetId ?? latestRun.presetId ?? null,
      summaryPresetVersion:
        selectedPreset?.selectedPresetVersion ?? latestRun.presetVersion ?? null,
      presetSelectionSource: selectedPreset?.selectionSource ?? null,
      presetSuggestion: selectedPreset?.suggestion ?? null,
      summaryBackendProfileId: latestRun.backendProfileId ?? null,
      summaryUsedFallback: latestRun.usedFallback ?? null,
    };
  }

  if (latestRun.status === "ready") {
    return {
      ...artifact,
      status: "ready",
      content: summarizeSummaryBlocks(latestRun.blocks),
      requestedAt: latestRun.requestedAt,
      updatedAt: latestRun.completedAt ?? null,
      providerLabel: latestRun.providerLabel ?? null,
      freshness:
        currentSourceRevision && latestRun.sourceRevision !== currentSourceRevision
          ? "stale"
          : summaryState.partitions.some(
                (partition) =>
                  partition.status === "stale" &&
                  latestRun.partitionIds.includes(partition.id)
              )
            ? "stale"
            : "fresh",
      summaryMode: latestRun.mode,
      summarySourceRevision: latestRun.sourceRevision,
      summarySourceLanguage: latestRun.sourceLanguage ?? null,
      summaryOutputLanguage: latestRun.outputLanguage ?? null,
      summaryRunId: latestRun.id,
      summaryPartitionIds: [...latestRun.partitionIds],
      summaryPresetId: selectedPreset?.selectedPresetId ?? latestRun.presetId ?? null,
      summaryPresetVersion:
        selectedPreset?.selectedPresetVersion ?? latestRun.presetVersion ?? null,
      presetSelectionSource: selectedPreset?.selectionSource ?? null,
      presetSuggestion: selectedPreset?.suggestion ?? null,
      summaryBackendProfileId: latestRun.backendProfileId ?? null,
      summaryUsedFallback: latestRun.usedFallback ?? null,
      stalePartitionIds: summaryState.partitions
        .filter(
          (partition) =>
            partition.status === "stale" && latestRun.partitionIds.includes(partition.id)
        )
        .map((partition) => partition.id),
      supportingSnippets: rollupSupportingSnippets({
        supportingSnippets: [],
        blocks: latestRun.blocks,
      }),
    };
  }

  if (latestRun.status === "failed") {
    return {
      ...artifact,
      status: "failed",
      requestedAt: latestRun.requestedAt,
      updatedAt: latestRun.completedAt ?? null,
      providerLabel: latestRun.providerLabel ?? null,
      errorMessage: latestRun.errorMessage ?? null,
      summaryMode: latestRun.mode,
      summarySourceRevision: latestRun.sourceRevision,
      summarySourceLanguage: latestRun.sourceLanguage ?? null,
      summaryOutputLanguage: latestRun.outputLanguage ?? null,
      summaryPartitionIds: [...latestRun.partitionIds],
      summaryPresetId: selectedPreset?.selectedPresetId ?? latestRun.presetId ?? null,
      summaryPresetVersion:
        selectedPreset?.selectedPresetVersion ?? latestRun.presetVersion ?? null,
      presetSelectionSource: selectedPreset?.selectionSource ?? null,
      presetSuggestion: selectedPreset?.suggestion ?? null,
      summaryBackendProfileId: latestRun.backendProfileId ?? null,
      summaryUsedFallback: latestRun.usedFallback ?? null,
    };
  }

  return artifact;
}
