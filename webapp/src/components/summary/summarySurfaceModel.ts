import { resolveSummaryPreset } from "../../domain/summaryPreset";
import type {
  ArtifactSupportingSnippet,
  SessionSummaryArtifactInput,
  SummaryBlock,
  SummaryMode,
  SummaryPresetSelection,
  SummaryRun,
} from "../../domain/session";
import type { ArtifactBindingPresentation } from "../../pages/artifactBindingModel";

export type SummarySurfaceMode = "off" | SummaryMode;

export type SummarySurfaceStatus =
  | "idle"
  | "disabled"
  | "pending"
  | "updating"
  | "ready"
  | "stale"
  | "failed";

export interface SummarySurfaceSection {
  id: string;
  title: string;
  content: string;
  supportingSnippets: ArtifactSupportingSnippet[];
}

export interface SummarySurfaceView {
  mode: SummarySurfaceMode;
  status: SummarySurfaceStatus;
  statusLabelKey:
    | "disabled"
    | "artifactPending"
    | "artifactReady"
    | "artifactFailed"
    | "summaryUpdating"
    | "summaryStale"
    | null;
  helperTextKey:
    | "summarySurfaceDisabledHelper"
    | "summaryArtifactPendingHelper"
    | "summaryArtifactFailedHelper"
    | "summaryArtifactNotRequestedHelper"
    | "summaryStaleHelper"
    | "summaryUpdatingHelper";
  sections: SummarySurfaceSection[];
  presetLabel: string;
  presetBadgeKey:
    | "summaryAutoSelected"
    | "summaryManualSelected"
    | "summaryDefaultSelected"
    | null;
  providerLabel: string | null;
}

function buildSectionsFromBlocks(blocks: SummaryBlock[]): SummarySurfaceSection[] {
  return blocks
    .filter((block) => block.content.trim().length > 0)
    .map((block) => ({
      id: block.id,
      title: block.title?.trim() || block.kind,
      content: block.content.trim(),
      supportingSnippets: block.supportingSnippets.map((snippet) => ({ ...snippet })),
    }));
}

function buildFallbackSection(input: {
  id: string;
  title: string;
  content?: string | null;
  supportingSnippets?: ArtifactSupportingSnippet[];
}) {
  const content = input.content?.trim();
  if (!content) {
    return [];
  }
  return [
    {
      id: input.id,
      title: input.title,
      content,
      supportingSnippets: (input.supportingSnippets ?? []).map((snippet) => ({ ...snippet })),
    },
  ];
}

function getPresetBadgeKey(selection: SummaryPresetSelection | null) {
  if (!selection) {
    return null;
  }
  switch (selection.selectionSource) {
    case "auto":
      return "summaryAutoSelected";
    case "manual":
      return "summaryManualSelected";
    case "default":
      return "summaryDefaultSelected";
  }
}

function pickPublishedSummaryForMode(
  summaryState: SessionSummaryArtifactInput | null | undefined,
  mode: SummaryMode
) {
  const summaries = summaryState?.publishedSummaries ?? [];
  return summaries
    .filter((summary) => summary.mode === mode)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function pickLatestRunForMode(
  summaryState: SessionSummaryArtifactInput | null | undefined,
  mode: SummaryMode
) {
  const runs = summaryState?.runs ?? [];
  return runs
    .filter((run) => run.mode === mode)
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
}

function buildSectionsFromRun(run: SummaryRun | undefined) {
  if (!run) {
    return [];
  }
  const fromBlocks = buildSectionsFromBlocks(run.blocks);
  if (fromBlocks.length > 0) {
    return fromBlocks;
  }
  return [];
}

export function buildSummarySurfaceView(input: {
  mode: SummarySurfaceMode;
  summaryState?: SessionSummaryArtifactInput | null;
  binding: ArtifactBindingPresentation;
}): SummarySurfaceView {
  const selection = input.summaryState?.presetSelection ?? null;
  const resolvedPreset = resolveSummaryPreset(
    selection?.selectedPresetId ?? input.summaryState?.runs[0]?.presetId ?? null
  );

  if (input.mode === "off") {
    return {
      mode: "off",
      status: "idle",
      statusLabelKey: null,
      helperTextKey: "summaryArtifactNotRequestedHelper",
      sections: [],
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel: null,
    };
  }

  const publishedSummary = pickPublishedSummaryForMode(input.summaryState, input.mode);
  const latestRun = pickLatestRunForMode(input.summaryState, input.mode);
  const latestReadyRun = latestRun?.status === "ready" ? latestRun : undefined;
  const sections =
    publishedSummary && publishedSummary.blocks.length > 0
      ? buildSectionsFromBlocks(publishedSummary.blocks)
      : latestReadyRun
        ? buildSectionsFromRun(latestReadyRun)
        : buildFallbackSection({
            id: `${input.mode}-summary`,
            title: publishedSummary?.title ?? resolvedPreset.label,
            content: publishedSummary?.content,
            supportingSnippets: publishedSummary?.supportingSnippets,
          });

  const hasContent = sections.length > 0;
  const providerLabel =
    publishedSummary?.providerLabel ??
    latestRun?.providerLabel ??
    null;

  if (
    input.binding.statusLabelKey !== "artifactReady" &&
    !publishedSummary &&
    !latestReadyRun &&
    latestRun?.status !== "pending"
  ) {
    return {
      mode: input.mode,
      status: "disabled",
      statusLabelKey: "disabled",
      helperTextKey: "summarySurfaceDisabledHelper",
      sections: [],
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel,
    };
  }

  if (publishedSummary || latestReadyRun) {
    if (latestRun?.status === "failed") {
      return {
        mode: input.mode,
        status: "failed",
        statusLabelKey: "artifactFailed",
        helperTextKey: "summaryArtifactFailedHelper",
        sections,
        presetLabel: resolvedPreset.label,
        presetBadgeKey: getPresetBadgeKey(selection),
        providerLabel,
      };
    }
    if (publishedSummary?.freshness === "stale") {
      return {
        mode: input.mode,
        status: "stale",
        statusLabelKey: "summaryStale",
        helperTextKey: "summaryStaleHelper",
        sections,
        presetLabel: resolvedPreset.label,
        presetBadgeKey: getPresetBadgeKey(selection),
        providerLabel,
      };
    }
    if (latestRun?.status === "pending") {
      return {
        mode: input.mode,
        status: "updating",
        statusLabelKey: "summaryUpdating",
        helperTextKey: "summaryUpdatingHelper",
        sections,
        presetLabel: resolvedPreset.label,
        presetBadgeKey: getPresetBadgeKey(selection),
        providerLabel,
      };
    }
    return {
      mode: input.mode,
      status: hasContent ? "ready" : "idle",
      statusLabelKey: hasContent ? "artifactReady" : null,
      helperTextKey: "summaryArtifactNotRequestedHelper",
      sections,
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel,
    };
  }

  if (latestRun?.status === "pending") {
    return {
      mode: input.mode,
      status: "pending",
      statusLabelKey: "artifactPending",
      helperTextKey: "summaryArtifactPendingHelper",
      sections: [],
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel,
    };
  }

  if (latestRun?.status === "failed") {
    return {
      mode: input.mode,
      status: "failed",
      statusLabelKey: "artifactFailed",
      helperTextKey: "summaryArtifactFailedHelper",
      sections: [],
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel,
    };
  }

  if (
    input.mode === "realtime" &&
    (input.summaryState?.partitions ?? []).some((partition) => partition.status === "draft")
  ) {
    return {
      mode: input.mode,
      status: "pending",
      statusLabelKey: "artifactPending",
      helperTextKey: "summaryArtifactPendingHelper",
      sections: [],
      presetLabel: resolvedPreset.label,
      presetBadgeKey: getPresetBadgeKey(selection),
      providerLabel,
    };
  }

  return {
    mode: input.mode,
    status: "idle",
    statusLabelKey: null,
    helperTextKey: "summaryArtifactNotRequestedHelper",
    sections: [],
    presetLabel: resolvedPreset.label,
    presetBadgeKey: getPresetBadgeKey(selection),
    providerLabel,
  };
}
