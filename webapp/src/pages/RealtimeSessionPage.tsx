import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useSnackbar, type OptionsObject } from "notistack";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useSettingsStore } from "../store/settingsStore";
import { usePresets } from "../hooks/usePresets";
import {
  createLocalTranscription,
  updateLocalTranscription,
  replaceSegments,
  appendAudioChunk,
  appendVideoChunk,
  deleteTranscription,
} from "../services/data/transcriptionRepository";
import {
  EMPTY_STREAMING_BUFFER_METRICS,
  RtzrStreamingClient,
  type StreamingBufferMetrics,
} from "../services/api/rtzrStreamingClient";
import { classifyRealtimeStreamingPayload } from "../services/api/realtimeStreamingPayload";
import {
  RecorderManager,
  type RecorderChunkInfo,
} from "../services/audio/recorderManager";
import type { DecodedPcmAudio } from "../services/audio/decodeAudioFile";
import { appDb, type LocalWordTiming, type PresetConfig } from "../data/app-db";
import { DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON } from "../data/defaultPresets";
import {
  buildTranscriptionDetailPath,
  resolveRealtimeStreamingConfigString,
} from "./realtimeSessionModel";
import { useAppPortalContainer } from "../hooks/useAppPortalContainer";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import { useUiStore } from "../store/uiStore";
import {
  extractModelNameFromConfig,
  resolveBackendEndpointSnapshot,
} from "../utils/transcriptionMetadata";
import { useI18n } from "../i18n";
import { formatLocalizedDateTime } from "../utils/time";
import {
  checkMicrophonePermission,
  checkPersistentStoragePermission,
  requestMicrophonePermission,
  requestPersistentStoragePermission,
  type BrowserPermissionState,
} from "../services/permissions";
import {
  DEFAULT_REALTIME_CONNECTION_UX_STATE,
  classifyRealtimeLatencyLevel,
  reduceRealtimeConnectionUxState,
  type RealtimeLatencyLevel,
} from "./realtimeConnectionUx";
import RealtimeToolbar from "../components/realtime/RealtimeToolbar";
import RealtimeStatusBanner from "../components/realtime/RealtimeStatusBanner";
import RealtimeTranscript from "../components/realtime/RealtimeTranscript";
import RealtimeSettingsDialog from "../components/realtime/RealtimeSettingsDialog";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "../app/platformCapabilities";
import { platformFeatureFlags } from "../app/platformRoutes";
import {
  findPlatformBackendProfile,
  platformBackendBindingRuntime,
} from "../app/backendBindingRuntime";
import { resolveArtifactBindingPresentation } from "./artifactBindingModel";
import {
  createSummaryPartition,
  createSummaryRun,
  readSessionSummaryState,
  saveSummaryPresetSelection,
  updateSummaryPartition,
  updateSummaryRun,
  upsertPublishedSummary,
} from "../services/data/summaryRepository";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import {
  createManualSummaryPresetSelection,
  listSummaryPresets,
  resolveSummaryPreset,
  resolveSummaryPresetSelection,
} from "../domain/summaryPreset";
import SummarySurface from "../components/summary/SummarySurface";
import {
  buildSummarySurfaceView,
  type SummarySurfaceMode,
} from "../components/summary/summarySurfaceModel";
import {
  buildSummaryRunLifecycleInput,
  resolveRealtimeSummaryDraftWindow,
  resolveRealtimeSummaryFinalizeDecision,
  resolveSummaryRuntimePolicy,
} from "../domain/summaryRuntime";
import type {
  SummaryPresetApplyScope,
  SummaryPresetSelection,
  SummaryPartitionReason,
  SummaryRegenerationScope,
  SummaryRunTrigger,
} from "../domain/session";

type SessionState = "idle" | "countdown" | "connecting" | "recording" | "paused" | "stopping" | "saving";
type RealtimeInputSource = "microphone" | "uploaded_file";

type RealtimeStartInput =
  | { source: "microphone" }
  | { source: "uploaded_file"; file: File };

type RealtimeSegment = {
  id: string;
  text: string;
  rawText?: string;
  startMs: number;
  endMs: number;
  isFinal: boolean;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  words?: LocalWordTiming[];
};

const SESSION_STATE_LABEL_KEY: Record<SessionState, string> = {
  idle: "waiting",
  countdown: "sessionStateCountdown",
  connecting: "connecting",
  recording: "sessionStateRecording",
  paused: "pause",
  stopping: "stopping",
  saving: "saving",
};

const LATENCY_LEVEL_LABEL_KEY: Record<RealtimeLatencyLevel, string> = {
  unknown: "latencyUnknown",
  stable: "latencyStable",
  delayed: "latencyDelayed",
  critical: "latencyCritical",
};

const FALLBACK_STREAM_SAMPLE_RATE = 16000;
const SIMULATED_FILE_STREAM_CHUNK_MS = 160;
const VIDEO_CAPTURE_TIMESLICE_MS = 4000;
const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm;codecs=h264",
  "video/webm",
  "video/mp4",
];

type RuntimeSettingKey =
  | "maxUtterDuration"
  | "noiseThreshold"
  | "epdTime"
  | "activeThreshold"
  | "acousticScale";

type RuntimeSettingsState = Record<RuntimeSettingKey, string>;

const DEFAULT_RUNTIME_SETTINGS: RuntimeSettingsState = {
  maxUtterDuration: "",
  noiseThreshold: "0.7",
  epdTime: "",
  activeThreshold: "0.88",
  acousticScale: "",
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function areStreamingBufferMetricsEqual(
  left: StreamingBufferMetrics,
  right: StreamingBufferMetrics
): boolean {
  return (
    left.bufferedAudioMs === right.bufferedAudioMs &&
    left.replayedBufferedAudioMs === right.replayedBufferedAudioMs &&
    left.droppedBufferedAudioMs === right.droppedBufferedAudioMs &&
    left.attemptedBufferedAudioMs === right.attemptedBufferedAudioMs &&
    left.droppedBufferedAudioRatio === right.droppedBufferedAudioRatio &&
    left.degraded === right.degraded
  );
}

function buildRealtimeQualityPatch(metrics: StreamingBufferMetrics) {
  return {
    realtimeBufferedAudioMs: metrics.bufferedAudioMs,
    realtimeDroppedAudioMs: metrics.droppedBufferedAudioMs,
    realtimeReplayedAudioMs: metrics.replayedBufferedAudioMs,
    realtimeDroppedAudioRatio: Number(metrics.droppedBufferedAudioRatio.toFixed(4)),
    realtimeQualityState: metrics.degraded ? ("degraded" as const) : ("normal" as const),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSampleRateFromConfig(config: Record<string, unknown>): number {
  const maybeSampleRate =
    typeof (config as { sample_rate?: unknown }).sample_rate === "number"
      ? (config as { sample_rate: number }).sample_rate
      : typeof (config as { sampleRate?: unknown }).sampleRate === "number"
        ? (config as { sampleRate: number }).sampleRate
        : undefined;
  if (typeof maybeSampleRate === "number" && Number.isFinite(maybeSampleRate) && maybeSampleRate > 0) {
    return Math.floor(maybeSampleRate);
  }
  return FALLBACK_STREAM_SAMPLE_RATE;
}

function areStringArraysEqual(left: string[] | undefined, right: string[] | undefined) {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function summarizeRealtimeBlocks(
  blocks: Array<{ title?: string; content: string }>
) {
  return blocks
    .map((block) => {
      const title = block.title?.trim();
      const content = block.content.trim();
      if (!content) {
        return null;
      }
      return title ? `${title}\n${content}` : content;
    })
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export default function RealtimeSessionPage() {
  const compactRealtimeLayout = useMediaQuery("(max-width: 959px), (hover: none) and (pointer: coarse)");
  const featureAvailability = derivePlatformFeatureAvailability(
    platformFeatureFlags,
    platformCapabilities
  );
  const { enqueueSnackbar } = useSnackbar();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const apiClient = useRtzrApiClient();
  const enqueueRealtimeSnackbar = useCallback(
    (message: string, options?: OptionsObject) =>
      enqueueSnackbar(message, {
        anchorOrigin: { vertical: "top", horizontal: "center" },
        ...options,
      }),
    [enqueueSnackbar]
  );
  const microphonePromptedRef = useRef(false);
  const storagePromptedRef = useRef(false);
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const realtimeAutoSaveSeconds = useSettingsStore((state) => state.realtimeAutoSaveSeconds);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const defaultSpeakerName = useSettingsStore((state) => state.defaultSpeakerName);
  const setFloatingActionsVisible = useUiStore((state) => state.setFloatingActionsVisible);
  const streamingPresets = usePresets("streaming");
  const storagePermissionSupported =
    typeof navigator !== "undefined" && Boolean(navigator.storage?.persist);
  const [microphonePermissionState, setMicrophonePermissionState] =
    useState<BrowserPermissionState>("unknown");
  const [storagePermissionState, setStoragePermissionState] = useState<BrowserPermissionState>(
    storagePermissionSupported ? "unknown" : "granted"
  );

  const defaultStreamingPreset = useMemo<PresetConfig | undefined>(
    () => {
      const presets = streamingPresets ?? [];
      return presets.find((preset) => preset.isDefault) ?? presets[0];
    },
    [streamingPresets]
  );
  const fallbackStreamingConfig = DEFAULT_STREAMING_TEMPLATE_CONFIG_JSON;

  useEffect(() => {
    if (microphonePromptedRef.current) {
      return;
    }
    microphonePromptedRef.current = true;

    const requestPermission = async () => {
      const state = await checkMicrophonePermission();
      setMicrophonePermissionState(state);
      if (state === "granted") {
        return;
      }
      const granted = await requestMicrophonePermission();
      const nextState = granted ? "granted" : await checkMicrophonePermission();
      setMicrophonePermissionState(nextState);
      if (!granted) {
        enqueueRealtimeSnackbar(
          t("unableToRequestMicrophonePermissionPleaseCheckYourBrowserSettings"),
          { variant: "warning" }
        );
      }
    };

    void requestPermission();
  }, [enqueueRealtimeSnackbar, t]);

  useEffect(() => {
    if (storagePromptedRef.current) {
      return;
    }
    storagePromptedRef.current = true;

    if (!storagePermissionSupported) {
      setStoragePermissionState("granted");
      return;
    }

    const requestPermission = async () => {
      const state = await checkPersistentStoragePermission();
      setStoragePermissionState(state);
      if (state === "granted") {
        return;
      }
      const granted = await requestPersistentStoragePermission();
      const nextState = granted ? "granted" : await checkPersistentStoragePermission();
      setStoragePermissionState(nextState);
      if (!granted) {
        enqueueRealtimeSnackbar(
          t("unableToRequestStoragePermissionPleaseCheckYourBrowserSettings"),
          { variant: "warning" }
        );
      }
    };

    void requestPermission();
  }, [enqueueRealtimeSnackbar, storagePermissionSupported, t]);

  const handleRetryMicrophonePermission = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    const nextState = granted ? "granted" : await checkMicrophonePermission();
    setMicrophonePermissionState(nextState);
    enqueueRealtimeSnackbar(
      granted
        ? t("microphonePermissionHasBeenGranted")
        : t("unableToRequestMicrophonePermissionPleaseCheckYourBrowserSettings"),
      { variant: granted ? "success" : "warning" }
    );
  }, [enqueueRealtimeSnackbar, t]);

  const handleRetryStoragePermission = useCallback(async () => {
    if (!storagePermissionSupported) {
      return;
    }
    const granted = await requestPersistentStoragePermission();
    const nextState = granted ? "granted" : await checkPersistentStoragePermission();
    setStoragePermissionState(nextState);
    enqueueRealtimeSnackbar(
      granted
        ? t("storagePermissionsGranted")
        : t("unableToRequestStoragePermissionPleaseCheckYourBrowserSettings"),
      { variant: granted ? "success" : "warning" }
    );
  }, [enqueueRealtimeSnackbar, storagePermissionSupported, t]);

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const sessionStateRef = useRef<SessionState>("idle");
  const [connectionUxState, setConnectionUxState] = useState(
    DEFAULT_REALTIME_CONNECTION_UX_STATE
  );
  const [connectionEventMessage, setConnectionEventMessage] = useState<string | null>(null);
  const [streamingBufferMetrics, setStreamingBufferMetrics] = useState<StreamingBufferMetrics>({
    ...EMPTY_STREAMING_BUFFER_METRICS,
  });
  const [retryingConnection, setRetryingConnection] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [segments, setSegments] = useState<RealtimeSegment[]>([]);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [followLive, setFollowLive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [simulatedFileSession, setSimulatedFileSession] = useState(false);
  const [simulatedFileProgressPercent, setSimulatedFileProgressPercent] = useState<number | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [latencyStaleMs, setLatencyStaleMs] = useState<number | null>(null);
  const [runtimeSettingsOpen, setRuntimeSettingsOpen] = useState(false);
  const [streamingJsonEditorOpen, setStreamingJsonEditorOpen] = useState(false);
  const [runtimeStreamConfigOpen, setRuntimeStreamConfigOpen] = useState(false);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsState>(DEFAULT_RUNTIME_SETTINGS);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string | null>(null);
  const summaryModeTouchedRef = useRef(false);
  const [realtimeSummaryTick, setRealtimeSummaryTick] = useState(0);
  const [summarySurfaceMode, setSummarySurfaceMode] = useState<SummarySurfaceMode>("off");
  const [streamingRequestJson, setStreamingRequestJson] = useState("");
  const cameraSupported =
    typeof navigator !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [cameraRecording, setCameraRecording] = useState(false);
  const portalContainer = useAppPortalContainer();
  const runtimeSettingsFabRef = useRef<HTMLButtonElement | null>(null);
  const realtimeFileInputRef = useRef<HTMLInputElement | null>(null);
  const runtimeSettingsPreviouslyOpenRef = useRef(false);
  const sessionConnectedRef = useRef(false);
  const connectionReadyRef = useRef(false);
  const countdownFinishedRef = useRef(false);

  useEffect(() => {
    if (!runtimeSettingsOpen) {
      setStreamingJsonEditorOpen(false);
      setRuntimeStreamConfigOpen(false);
    }
  }, [runtimeSettingsOpen]);

  useEffect(() => {
    if (runtimeSettingsPreviouslyOpenRef.current && !runtimeSettingsOpen) {
      requestAnimationFrame(() => {
        runtimeSettingsFabRef.current?.focus();
      });
    }
    runtimeSettingsPreviouslyOpenRef.current = runtimeSettingsOpen;
  }, [runtimeSettingsOpen]);



  const countdownTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const recorderRef = useRef<RecorderManager | null>(null);
  const streamingClientRef = useRef<RtzrStreamingClient | null>(null);
  const streamingConfigRef = useRef<Record<string, unknown> | null>(null);
  const recordedSampleRateRef = useRef<number | null>(null);
  const chunkIndexRef = useRef(0);
  const transcriptionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const simulatedFileStreamingAbortRef = useRef(false);
  const simulatedFileStreamingStartedRef = useRef(false);
  const segmentsRef = useRef<RealtimeSegment[]>([]);
  const finalizeReasonRef = useRef<"normal" | "aborted">("normal");
  const finalizingRef = useRef(false);
  const stopSessionRef = useRef<(aborted: boolean) => void>(() => {
    /* noop */
  });
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunkIndexRef = useRef(0);
  const videoMimeTypeRef = useRef<string | null>(null);
  const cameraShouldRecordRef = useRef(false);
  const videoRecorderStopPromiseRef = useRef<Promise<void> | null>(null);
  const stopSafetyTimerRef = useRef<number | null>(null);
  const waitingForFinalRef = useRef(false);
  const lastAudioSentAtRef = useRef<number | null>(null);
  const lastResultAtRef = useRef<number | null>(null);
  const realtimeSummaryRunnerBusyRef = useRef(false);
  const connectionUxStateRef = useRef(connectionUxState);
  const streamingBufferMetricsRef = useRef<StreamingBufferMetrics>({
    ...EMPTY_STREAMING_BUFFER_METRICS,
  });
  const suppressRecorderOnStopRef = useRef(false);
  const activeTranscription = useLiveQuery(async () => {
    if (!activeTranscriptionId) {
      return null;
    }
    return (await appDb.transcriptions.get(activeTranscriptionId)) ?? null;
  }, [activeTranscriptionId]);
  const persistedRealtimeSegments = useLiveQuery(async () => {
    if (!activeTranscriptionId) {
      return [];
    }
    return await appDb.segments
      .where("transcriptionId")
      .equals(activeTranscriptionId)
      .sortBy("startMs");
  }, [activeTranscriptionId]);
  const summaryState = useLiveQuery(async () => {
    if (!activeTranscriptionId) {
      return null;
    }
    return await readSessionSummaryState(activeTranscriptionId);
  }, [activeTranscriptionId]);

  sessionStateRef.current = sessionState;
  connectionUxStateRef.current = connectionUxState;
  streamingBufferMetricsRef.current = streamingBufferMetrics;

  const sessionActive =
    sessionState === "recording" ||
    sessionState === "paused" ||
    sessionState === "connecting" ||
    sessionState === "countdown" ||
    sessionState === "stopping" ||
    sessionState === "saving";
  const summaryCaptureActive =
    sessionState === "recording" ||
    sessionState === "paused" ||
    sessionState === "connecting" ||
    sessionState === "countdown";

  const latencyLevel = classifyRealtimeLatencyLevel(lastLatencyMs, latencyStaleMs);
  const preferredSummaryMode = useMemo<SummarySurfaceMode>(() => {
    if (summaryState?.publishedSummaries.some((summary) => summary.mode === "full")) {
      return "full";
    }
    return "realtime";
  }, [summaryState]);
  useEffect(() => {
    if (summaryModeTouchedRef.current) {
      return;
    }
    setSummarySurfaceMode(
      featureAvailability.sessionArtifactsVisible ? preferredSummaryMode : "off"
    );
  }, [featureAvailability.sessionArtifactsVisible, preferredSummaryMode]);
  const summaryBinding = useMemo(
    () =>
      resolveArtifactBindingPresentation(
        "summary",
        platformBackendBindingRuntime.bindings,
        platformBackendBindingRuntime.profiles
      ),
    []
  );
  const summaryFeatureBinding = useMemo(
    () =>
      platformBackendBindingRuntime.bindings.find(
        (binding) => binding.featureKey === "artifact.summary"
      ) ?? null,
    []
  );
  const summaryResolvedProfile = useMemo(
    () =>
      findPlatformBackendProfile(
        summaryBinding.resolution?.resolvedBackendProfileId,
        platformBackendBindingRuntime
      ),
    [summaryBinding]
  );
  const summaryRuntimePolicy = useMemo(
    () => resolveSummaryRuntimePolicy(summaryFeatureBinding),
    [summaryFeatureBinding]
  );
  const persistedSummaryTurns = useMemo(
    () =>
      (persistedRealtimeSegments ?? [])
        .filter((segment) => segment.text.trim().length > 0)
        .map((segment) => ({
          id: segment.id,
          text: segment.text,
          speakerLabel: segment.speaker_label ?? segment.spk ?? null,
          language: segment.language ?? null,
          startMs: segment.startMs,
          endMs: segment.endMs,
        })),
    [persistedRealtimeSegments]
  );
  const fullSummaryPresetOptions = useMemo(
    () => listSummaryPresets().map((preset) => ({ value: preset.id, label: preset.label })),
    []
  );
  const synthesizedSummaryState = useMemo(() => {
    const sessionId = activeTranscriptionId ?? "realtime-preview";
    const fallbackSelection = resolveSummaryPresetSelection({
      sessionId,
      turns: persistedSummaryTurns.slice(0, 6).map((segment) => ({
        id: segment.id,
        text: segment.text,
        speakerLabel: segment.speakerLabel ?? undefined,
      })),
      requestedMode: summarySurfaceMode === "off" ? "realtime" : summarySurfaceMode,
    });

    return {
      partitions: summaryState?.partitions ?? [],
      runs: summaryState?.runs ?? [],
      publishedSummaries: summaryState?.publishedSummaries ?? [],
      presetSelection: summaryState?.presetSelection ?? fallbackSelection,
    };
  }, [activeTranscriptionId, persistedSummaryTurns, summaryState, summarySurfaceMode]);
  const fullSummarySelection = useMemo<SummaryPresetSelection | null>(() => {
    if (!activeTranscriptionId) {
      return null;
    }
    return resolveSummaryPresetSelection({
      sessionId: activeTranscriptionId,
      turns: persistedSummaryTurns.map((turn) => ({
        id: turn.id,
        text: turn.text,
        speakerLabel: turn.speakerLabel ?? undefined,
      })),
      requestedMode: "full",
      currentSelection: summaryState?.presetSelection ?? null,
    });
  }, [activeTranscriptionId, persistedSummaryTurns, summaryState?.presetSelection]);
  const realtimeSummarySelection = useMemo<SummaryPresetSelection | null>(() => {
    if (!activeTranscriptionId) {
      return null;
    }
    return resolveSummaryPresetSelection({
      sessionId: activeTranscriptionId,
      turns: persistedSummaryTurns.map((turn) => ({
        id: turn.id,
        text: turn.text,
        speakerLabel: turn.speakerLabel ?? undefined,
      })),
      requestedMode: "realtime",
      currentSelection: summaryState?.presetSelection ?? null,
    });
  }, [activeTranscriptionId, persistedSummaryTurns, summaryState?.presetSelection]);
  const realtimeSummaryDraftWindow = useMemo(
    () =>
      resolveRealtimeSummaryDraftWindow({
        turns: persistedSummaryTurns.map((turn) => ({
          id: turn.id,
          startMs: turn.startMs,
          endMs: turn.endMs,
        })),
        partitions: summaryState?.partitions ?? [],
      }),
    [persistedSummaryTurns, summaryState?.partitions]
  );
  const realtimeDraftPartition = useMemo(
    () =>
      (summaryState?.partitions ?? [])
        .filter((partition) => partition.status === "draft")
        .sort((left, right) => left.startedAt.localeCompare(right.startedAt))[0] ?? null,
    [summaryState?.partitions]
  );
  const staleRealtimePartitions = useMemo(
    () =>
      (summaryState?.partitions ?? [])
        .filter((partition) => partition.status === "stale")
        .sort((left, right) => left.startedAt.localeCompare(right.startedAt)),
    [summaryState?.partitions]
  );
  const latestRealtimeFailedRunPartitionIds = useMemo(
    () =>
      summaryState?.runs.find(
        (run) => run.mode === "realtime" && run.status === "failed"
      )?.partitionIds ?? [],
    [summaryState?.runs]
  );
  const summarySurfaceView = useMemo(() => {
    const view = buildSummarySurfaceView({
      mode: summarySurfaceMode,
      summaryState: synthesizedSummaryState,
      binding: summaryBinding,
    });
    return {
      ...view,
      providerLabel: view.providerLabel ?? summaryResolvedProfile?.label ?? null,
    };
  }, [summaryBinding, summaryResolvedProfile, summarySurfaceMode, synthesizedSummaryState]);
  const fullSummaryHasCurrentContent =
    summarySurfaceView.status === "ready" ||
    summarySurfaceView.status === "stale" ||
    summarySurfaceView.status === "updating";
  const fullSummaryActionLabelKey: "summaryGenerate" | "summaryRegenerate" | "summaryRetry" =
    summarySurfaceView.status === "failed"
      ? "summaryRetry"
      : fullSummaryHasCurrentContent
        ? "summaryRegenerate"
        : "summaryGenerate";
  const fullSummaryActionTrigger: SummaryRunTrigger =
    summarySurfaceView.status === "failed" ? "manual_retry" : "manual_regenerate";
  const fullSummaryApplyScopeHelperKey: "summaryPresetApplyFromNowHelper" | "summaryPresetRegenerateAllHelper" =
    fullSummarySelection?.applyScope === "regenerate_all"
      ? "summaryPresetRegenerateAllHelper"
      : "summaryPresetApplyFromNowHelper";
  const fullSummaryControlsDisabled =
    summarySurfaceView.status === "pending" || summarySurfaceView.status === "updating";
  const realtimeSummaryActionLabelKey: "summaryRegenerate" | "summaryRetry" | null =
    summarySurfaceView.status === "failed"
      ? "summaryRetry"
      : staleRealtimePartitions.length > 0 || summarySurfaceView.status === "stale"
        ? "summaryRegenerate"
        : null;
  const realtimeSummaryActionTrigger: SummaryRunTrigger =
    summarySurfaceView.status === "failed" ? "manual_retry" : "manual_regenerate";
  const realtimeSummaryApplyScopeHelperKey: "summaryPresetApplyFromNowHelper" | "summaryPresetRegenerateAllHelper" =
    realtimeSummarySelection?.applyScope === "regenerate_all"
      ? "summaryPresetRegenerateAllHelper"
      : "summaryPresetApplyFromNowHelper";
  const realtimeSummaryControlsDisabled =
    summarySurfaceView.status === "pending" || summarySurfaceView.status === "updating";
  const runFullSummary = useCallback(
    async (options: {
      selection?: SummaryPresetSelection | null;
      trigger: SummaryRunTrigger;
      regenerationScope?: SummaryRegenerationScope | null;
      successMessageKey?: "summaryGenerated" | "summaryRegenerated";
    }) => {
      if (!activeTranscriptionId) {
        return false;
      }
      if (summaryBinding.statusLabelKey !== "artifactReady" || !summaryBinding.resolution) {
        enqueueRealtimeSnackbar(t("summaryBindingNotReady"), { variant: "error" });
        return false;
      }
      if (persistedSummaryTurns.length === 0) {
        enqueueRealtimeSnackbar(t("summaryTranscriptEmpty"), { variant: "error" });
        return false;
      }

      const now = new Date().toISOString();
      const selection =
        options.selection ??
        resolveSummaryPresetSelection({
          sessionId: activeTranscriptionId,
          turns: persistedSummaryTurns.map((turn) => ({
            id: turn.id,
            text: turn.text,
            speakerLabel: turn.speakerLabel ?? undefined,
          })),
          requestedMode: "full",
          currentSelection: summaryState?.presetSelection ?? null,
          now,
        });
      const preset = resolveSummaryPreset(selection.selectedPresetId);
      const sourceLanguage = persistedSummaryTurns[0]?.language ?? null;
      const outputLanguage =
        preset.language && preset.language !== "auto" ? preset.language : sourceLanguage;
      const sourceRevision = activeTranscription?.updatedAt ?? now;

      let pendingRunId: string | null = null;

      try {
        await saveSummaryPresetSelection(selection);
        const pendingRun = await createSummaryRun({
          sessionId: activeTranscriptionId,
          mode: "full",
          scope: "session",
          trigger: options.trigger,
          regenerationScope: options.regenerationScope ?? null,
          partitionIds: [],
          presetId: selection.selectedPresetId,
          presetVersion: selection.selectedPresetVersion,
          selectionSource: selection.selectionSource,
          providerLabel: summaryResolvedProfile?.label ?? null,
          model: summaryBinding.resolution?.resolvedModel ?? null,
          backendProfileId: summaryBinding.resolution?.resolvedBackendProfileId ?? null,
          usedFallback: summaryBinding.resolution?.usedFallback ?? false,
          sourceRevision,
          sourceLanguage,
          outputLanguage,
          timeoutMs: summaryFeatureBinding?.timeoutMs ?? null,
          retryPolicy: summaryFeatureBinding?.retryPolicy ?? null,
          fallbackBackendProfileId: summaryFeatureBinding?.fallbackBackendProfileId ?? null,
          requestedAt: now,
          status: "pending",
          blocks: [],
        });
        pendingRunId = pendingRun.id;

        const response = await apiClient.requestFullSummary({
          sessionId: activeTranscriptionId,
          title: activeTranscription?.title ?? t("realTimeTranscription"),
          sourceRevision,
          sourceLanguage,
          outputLanguage,
          selectionSource: selection.selectionSource,
          trigger: options.trigger,
          regenerationScope: options.regenerationScope ?? null,
          preset: {
            id: preset.id,
            version: preset.version,
            label: preset.label,
            description: preset.description,
            language: preset.language,
            outputSchema: preset.outputSchema.map((section) => ({
              id: section.id,
              label: section.label,
              kind: section.kind,
              required: section.required,
            })),
          },
          turns: persistedSummaryTurns,
        });

        await updateSummaryRun(pendingRun.id, {
          status: "ready",
          completedAt: response.completedAt,
          providerLabel: response.binding.providerLabel,
          model: response.binding.model ?? null,
          backendProfileId: response.binding.resolvedBackendProfileId,
          usedFallback: response.binding.usedFallback,
          sourceLanguage: response.sourceLanguage ?? sourceLanguage,
          outputLanguage: response.outputLanguage ?? outputLanguage,
          timeoutMs: response.binding.timeoutMs ?? summaryFeatureBinding?.timeoutMs ?? null,
          retryPolicy: response.binding.retryPolicy ?? summaryFeatureBinding?.retryPolicy ?? null,
          fallbackBackendProfileId:
            response.binding.fallbackBackendProfileId ??
            summaryFeatureBinding?.fallbackBackendProfileId ??
            null,
          errorMessage: null,
          blocks: response.blocks,
        });
        await upsertPublishedSummary({
          sessionId: activeTranscriptionId,
          mode: "full",
          runId: pendingRun.id,
          title: response.title,
          content: response.content,
          requestedAt: response.requestedAt,
          updatedAt: response.completedAt,
          providerLabel: response.binding.providerLabel,
          backendProfileId: response.binding.resolvedBackendProfileId,
          usedFallback: response.binding.usedFallback,
          sourceRevision: response.sourceRevision,
          sourceLanguage: response.sourceLanguage ?? sourceLanguage,
          outputLanguage: response.outputLanguage ?? outputLanguage,
          partitionIds: response.partitionIds,
          supportingSnippets: response.supportingSnippets,
          blocks: response.blocks,
          freshness: "fresh",
        });
        enqueueRealtimeSnackbar(t(options.successMessageKey ?? "summaryGenerated"), { variant: "success" });
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("summaryProviderRequestFailed");
        if (pendingRunId) {
          await updateSummaryRun(pendingRunId, {
            status: "failed",
            completedAt: new Date().toISOString(),
            errorMessage: message,
          });
        }
        enqueueRealtimeSnackbar(message, { variant: "error" });
        return false;
      }
    },
    [
      activeTranscription,
      activeTranscriptionId,
      apiClient,
      enqueueRealtimeSnackbar,
      persistedSummaryTurns,
      summaryBinding,
      summaryFeatureBinding,
      summaryResolvedProfile,
      summaryState?.presetSelection,
      t,
    ]
  );
  const rebuildRealtimePublishedSummary = useCallback(async () => {
    if (!activeTranscriptionId) {
      return;
    }
    const nextState = await readSessionSummaryState(activeTranscriptionId);
    const readyRuns = nextState.runs
      .filter((run) => run.mode === "realtime" && run.status === "ready")
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
    if (readyRuns.length === 0) {
      return;
    }

    const stalePartitionIds = nextState.partitions
      .filter((partition) => partition.status === "stale")
      .map((partition) => partition.id);
    const visibleRuns = readyRuns.filter((run) =>
      run.partitionIds.every((partitionId) => !stalePartitionIds.includes(partitionId))
    );
    const aggregateRuns = visibleRuns.length > 0 ? visibleRuns : readyRuns;
    const blocks = aggregateRuns.flatMap((run) =>
      run.blocks.map((block) => ({
        ...block,
        id: `${run.id}-${block.id}`,
        supportingSnippets: block.supportingSnippets.map((snippet) => ({ ...snippet })),
      }))
    );
    const latestRun = aggregateRuns[aggregateRuns.length - 1];
    const requestedAt = aggregateRuns[0]?.requestedAt ?? latestRun.requestedAt;
    const firstStalePartition =
      nextState.partitions.find((partition) => stalePartitionIds.includes(partition.id)) ?? null;

    await upsertPublishedSummary({
      sessionId: activeTranscriptionId,
      mode: "realtime",
      runId: latestRun.id,
      title: t("summaryLive"),
      content: summarizeRealtimeBlocks(blocks),
      requestedAt,
      updatedAt: latestRun.completedAt ?? latestRun.requestedAt,
      providerLabel: latestRun.providerLabel ?? null,
      backendProfileId: latestRun.backendProfileId ?? null,
      usedFallback: latestRun.usedFallback ?? null,
      sourceRevision: latestRun.sourceRevision,
      sourceLanguage: latestRun.sourceLanguage ?? null,
      outputLanguage: latestRun.outputLanguage ?? null,
      partitionIds: Array.from(new Set(aggregateRuns.flatMap((run) => run.partitionIds))),
      supportingSnippets: blocks.flatMap((block) =>
        block.supportingSnippets.map((snippet) => ({ ...snippet }))
      ),
      blocks,
      freshness: stalePartitionIds.length > 0 ? "stale" : "fresh",
      stalePartitionIds,
      staleReason: firstStalePartition?.staleReason ?? null,
      staleAt: firstStalePartition?.staleAt ?? null,
    });
  }, [activeTranscriptionId, t]);
  const executeRealtimeSummaryPartition = useCallback(
    async (input: {
      partitionId: string;
      turns: typeof persistedSummaryTurns;
      selection?: SummaryPresetSelection | null;
      trigger: SummaryRunTrigger;
      partitionReason: SummaryPartitionReason;
      successMessageKey?: "summaryGenerated" | "summaryRegenerated" | null;
      notifyErrors?: boolean;
    }) => {
      if (!activeTranscriptionId) {
        return false;
      }
      if (summaryBinding.statusLabelKey !== "artifactReady" || !summaryBinding.resolution) {
        if (input.notifyErrors) {
          enqueueRealtimeSnackbar(t("summaryBindingNotReady"), { variant: "error" });
        }
        return false;
      }
      if (input.turns.length === 0) {
        if (input.notifyErrors) {
          enqueueRealtimeSnackbar(t("summaryTranscriptEmpty"), { variant: "error" });
        }
        return false;
      }

      const now = new Date().toISOString();
      const selection =
        input.selection ??
        realtimeSummarySelection ??
        resolveSummaryPresetSelection({
          sessionId: activeTranscriptionId,
          turns: input.turns.map((turn) => ({
            id: turn.id,
            text: turn.text,
            speakerLabel: turn.speakerLabel ?? undefined,
          })),
          requestedMode: "realtime",
          currentSelection: summaryState?.presetSelection ?? null,
          now,
        });
      const preset = resolveSummaryPreset(selection.selectedPresetId);
      const sourceLanguage = input.turns[0]?.language ?? null;
      const outputLanguage =
        preset.language && preset.language !== "auto" ? preset.language : sourceLanguage;
      const sourceRevision = activeTranscription?.updatedAt ?? now;

      let pendingRunId: string | null = null;

      try {
        await saveSummaryPresetSelection(selection);
        await updateSummaryPartition(input.partitionId, {
          startTurnId: input.turns[0]?.id,
          endTurnId: input.turns[input.turns.length - 1]?.id,
          turnCount: input.turns.length,
          turnIds: input.turns.map((turn) => turn.id),
          endedAt: now,
          status: "finalized",
          reason: input.partitionReason,
          sourceRevision,
          staleReason: null,
          staleAt: null,
        });

        const lifecycle = buildSummaryRunLifecycleInput({
          sessionId: activeTranscriptionId,
          mode: "realtime",
          scope: "partition",
          regenerationScope: "partition",
          trigger: input.trigger,
          partitionIds: [input.partitionId],
          selection,
          sourceRevision,
          requestedAt: now,
          binding: summaryFeatureBinding,
        });
        const pendingRun = await createSummaryRun({
          ...lifecycle,
          providerLabel: summaryResolvedProfile?.label ?? null,
          model: summaryBinding.resolution?.resolvedModel ?? null,
          backendProfileId: summaryBinding.resolution?.resolvedBackendProfileId ?? null,
          usedFallback: summaryBinding.resolution?.usedFallback ?? false,
          sourceLanguage,
          outputLanguage,
          blocks: [],
        });
        pendingRunId = pendingRun.id;

        const response = await apiClient.requestFullSummary({
          sessionId: activeTranscriptionId,
          title: activeTranscription?.title ?? t("summaryLive"),
          sourceRevision,
          sourceLanguage,
          outputLanguage,
          selectionSource: selection.selectionSource,
          trigger: input.trigger,
          regenerationScope: "partition",
          preset: {
            id: preset.id,
            version: preset.version,
            label: preset.label,
            description: preset.description,
            language: preset.language,
            outputSchema: preset.outputSchema.map((section) => ({
              id: section.id,
              label: section.label,
              kind: section.kind,
              required: section.required,
            })),
          },
          turns: input.turns,
        });

        await updateSummaryRun(pendingRun.id, {
          status: "ready",
          completedAt: response.completedAt,
          providerLabel: response.binding.providerLabel,
          model: response.binding.model ?? null,
          backendProfileId: response.binding.resolvedBackendProfileId,
          usedFallback: response.binding.usedFallback,
          sourceLanguage: response.sourceLanguage ?? sourceLanguage,
          outputLanguage: response.outputLanguage ?? outputLanguage,
          timeoutMs: response.binding.timeoutMs ?? summaryFeatureBinding?.timeoutMs ?? null,
          retryPolicy: response.binding.retryPolicy ?? summaryFeatureBinding?.retryPolicy ?? null,
          fallbackBackendProfileId:
            response.binding.fallbackBackendProfileId ??
            summaryFeatureBinding?.fallbackBackendProfileId ??
            null,
          errorMessage: null,
          blocks: response.blocks,
        });
        await updateSummaryPartition(input.partitionId, {
          status: "finalized",
          reason: input.partitionReason,
          sourceRevision: response.sourceRevision,
          staleReason: null,
          staleAt: null,
        });
        await rebuildRealtimePublishedSummary();
        if (input.successMessageKey) {
          enqueueRealtimeSnackbar(t(input.successMessageKey), { variant: "success" });
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("summaryProviderRequestFailed");
        if (pendingRunId) {
          await updateSummaryRun(pendingRunId, {
            status: "failed",
            completedAt: new Date().toISOString(),
            errorMessage: message,
          });
        }
        if (input.notifyErrors) {
          enqueueRealtimeSnackbar(message, { variant: "error" });
        }
        return false;
      }
    },
    [
      activeTranscription,
      activeTranscriptionId,
      apiClient,
      enqueueRealtimeSnackbar,
      rebuildRealtimePublishedSummary,
      realtimeSummarySelection,
      summaryBinding,
      summaryFeatureBinding,
      summaryResolvedProfile,
      summaryState?.presetSelection,
      t,
    ]
  );
  const runRealtimeSummaryPartitionBatch = useCallback(
    async (options: {
      partitionIds: string[];
      selection?: SummaryPresetSelection | null;
      trigger: SummaryRunTrigger;
      successMessageKey?: "summaryRegenerated" | null;
    }) => {
      if (!summaryState || options.partitionIds.length === 0) {
        return false;
      }
      let successCount = 0;
      for (const partitionId of options.partitionIds) {
        const partition = summaryState.partitions.find((entry) => entry.id === partitionId);
        if (!partition || !partition.turnIds || partition.turnIds.length === 0) {
          continue;
        }
        const turns = persistedSummaryTurns.filter((turn) =>
          partition.turnIds?.includes(turn.id)
        );
        const succeeded = await executeRealtimeSummaryPartition({
          partitionId,
          turns,
          selection: options.selection,
          trigger: options.trigger,
          partitionReason: partition.reason,
          successMessageKey: null,
          notifyErrors: false,
        });
        if (succeeded) {
          successCount += 1;
        }
      }
      if (successCount > 0 && options.successMessageKey) {
        enqueueRealtimeSnackbar(t(options.successMessageKey), { variant: "success" });
      } else if (successCount === 0 && options.partitionIds.length > 0) {
        enqueueRealtimeSnackbar(t("summaryProviderRequestFailed"), { variant: "error" });
      }
      return successCount > 0;
    },
    [
      enqueueRealtimeSnackbar,
      executeRealtimeSummaryPartition,
      persistedSummaryTurns,
      summaryState,
      t,
    ]
  );
  const handleSummaryModeChange = useCallback((mode: SummarySurfaceMode) => {
    summaryModeTouchedRef.current = true;
    setSummarySurfaceMode(mode);
  }, []);
  const handleSummaryToggle = useCallback(() => {
    summaryModeTouchedRef.current = true;
    setSummarySurfaceMode((prev) => (prev === "off" ? preferredSummaryMode : "off"));
  }, [preferredSummaryMode]);
  const handleFullSummaryPresetChange = useCallback((presetId: string) => {
    if (!activeTranscriptionId || !fullSummarySelection) {
      return;
    }
    const nextSelection = createManualSummaryPresetSelection(
      activeTranscriptionId,
      presetId,
      fullSummarySelection.applyScope,
      {
        suggestion: fullSummarySelection.suggestion ?? null,
      }
    );
    void (async () => {
      try {
        await saveSummaryPresetSelection(nextSelection);
        if (nextSelection.applyScope === "regenerate_all") {
          await runFullSummary({
            selection: nextSelection,
            trigger: "preset_rerun_all",
            regenerationScope: "session",
            successMessageKey: "summaryRegenerated",
          });
        }
      } catch (error) {
        enqueueRealtimeSnackbar(
          error instanceof Error ? error.message : t("summaryPresetUpdateFailed"),
          { variant: "error" }
        );
      }
    })();
  }, [activeTranscriptionId, enqueueRealtimeSnackbar, fullSummarySelection, runFullSummary, t]);
  const handleFullSummaryApplyScopeChange = useCallback((scope: SummaryPresetApplyScope) => {
    if (!activeTranscriptionId || !fullSummarySelection) {
      return;
    }
    const nextSelection = createManualSummaryPresetSelection(
      activeTranscriptionId,
      fullSummarySelection.selectedPresetId,
      scope,
      {
        suggestion: fullSummarySelection.suggestion ?? null,
      }
    );
    void saveSummaryPresetSelection(nextSelection).catch((error) => {
      enqueueRealtimeSnackbar(
        error instanceof Error ? error.message : t("summaryPresetUpdateFailed"),
        { variant: "error" }
      );
    });
  }, [activeTranscriptionId, enqueueRealtimeSnackbar, fullSummarySelection, t]);
  const handleFullSummaryAction = useCallback(() => {
    void runFullSummary({
      selection: fullSummarySelection,
      trigger: fullSummaryActionTrigger,
      regenerationScope: "session",
      successMessageKey:
        fullSummaryActionLabelKey === "summaryGenerate"
          ? "summaryGenerated"
          : "summaryRegenerated",
    });
  }, [
    fullSummaryActionLabelKey,
    fullSummaryActionTrigger,
    fullSummarySelection,
    runFullSummary,
  ]);
  const handleRealtimeSummaryPresetChange = useCallback((presetId: string) => {
    if (!activeTranscriptionId || !realtimeSummarySelection) {
      return;
    }
    const nextSelection = createManualSummaryPresetSelection(
      activeTranscriptionId,
      presetId,
      realtimeSummarySelection.applyScope,
      {
        suggestion: realtimeSummarySelection.suggestion ?? null,
      }
    );
    void (async () => {
      try {
        await saveSummaryPresetSelection(nextSelection);
        if (nextSelection.applyScope === "regenerate_all") {
          await runRealtimeSummaryPartitionBatch({
            partitionIds:
              summaryState?.partitions
                .filter((partition) => partition.status !== "draft")
                .map((partition) => partition.id) ?? [],
            selection: nextSelection,
            trigger: "preset_rerun_all",
            successMessageKey: "summaryRegenerated",
          });
        }
      } catch (error) {
        enqueueRealtimeSnackbar(
          error instanceof Error ? error.message : t("summaryPresetUpdateFailed"),
          { variant: "error" }
        );
      }
    })();
  }, [
    activeTranscriptionId,
    enqueueRealtimeSnackbar,
    realtimeSummarySelection,
    runRealtimeSummaryPartitionBatch,
    summaryState?.partitions,
    t,
  ]);
  const handleRealtimeSummaryApplyScopeChange = useCallback((scope: SummaryPresetApplyScope) => {
    if (!activeTranscriptionId || !realtimeSummarySelection) {
      return;
    }
    const nextSelection = createManualSummaryPresetSelection(
      activeTranscriptionId,
      realtimeSummarySelection.selectedPresetId,
      scope,
      {
        suggestion: realtimeSummarySelection.suggestion ?? null,
      }
    );
    void saveSummaryPresetSelection(nextSelection).catch((error) => {
      enqueueRealtimeSnackbar(
        error instanceof Error ? error.message : t("summaryPresetUpdateFailed"),
        { variant: "error" }
      );
    });
  }, [activeTranscriptionId, enqueueRealtimeSnackbar, realtimeSummarySelection, t]);
  const handleRealtimeSummaryAction = useCallback(() => {
    const partitionIds =
      realtimeSummaryActionLabelKey === "summaryRetry"
        ? latestRealtimeFailedRunPartitionIds
        : staleRealtimePartitions.map((partition) => partition.id);
    void runRealtimeSummaryPartitionBatch({
      partitionIds,
      selection: realtimeSummarySelection,
      trigger: realtimeSummaryActionTrigger,
      successMessageKey: "summaryRegenerated",
    });
  }, [
    latestRealtimeFailedRunPartitionIds,
    realtimeSummaryActionLabelKey,
    realtimeSummaryActionTrigger,
    realtimeSummarySelection,
    runRealtimeSummaryPartitionBatch,
    staleRealtimePartitions,
  ]);
  useEffect(() => {
    if (
      !featureAvailability.sessionArtifactsVisible ||
      !activeTranscriptionId ||
      !activeTranscription ||
      summaryBinding.statusLabelKey !== "artifactReady" ||
      !summaryBinding.resolution ||
      realtimeSummaryDraftWindow.turnCount === 0 ||
      realtimeSummaryRunnerBusyRef.current
    ) {
      return;
    }

    const now = activeTranscription.updatedAt;
    if (!realtimeDraftPartition) {
      void createSummaryPartition({
        sessionId: activeTranscriptionId,
        startTurnId: realtimeSummaryDraftWindow.startTurnId ?? realtimeSummaryDraftWindow.turnIds[0],
        endTurnId:
          realtimeSummaryDraftWindow.endTurnId ??
          realtimeSummaryDraftWindow.turnIds[realtimeSummaryDraftWindow.turnIds.length - 1],
        turnIds: realtimeSummaryDraftWindow.turnIds,
        turnCount: realtimeSummaryDraftWindow.turnCount,
        startedAt: now,
        endedAt: now,
        status: "draft",
        reason: "manual",
        sourceRevision: activeTranscription.updatedAt,
      });
      return;
    }

    if (
      realtimeDraftPartition.startTurnId === realtimeSummaryDraftWindow.startTurnId &&
      realtimeDraftPartition.endTurnId === realtimeSummaryDraftWindow.endTurnId &&
      realtimeDraftPartition.turnCount === realtimeSummaryDraftWindow.turnCount &&
      areStringArraysEqual(realtimeDraftPartition.turnIds ?? [], realtimeSummaryDraftWindow.turnIds)
    ) {
      return;
    }

    void updateSummaryPartition(realtimeDraftPartition.id, {
      startTurnId: realtimeSummaryDraftWindow.startTurnId ?? undefined,
      endTurnId: realtimeSummaryDraftWindow.endTurnId ?? undefined,
      turnCount: realtimeSummaryDraftWindow.turnCount,
      turnIds: realtimeSummaryDraftWindow.turnIds,
      endedAt: now,
      status: "draft",
      reason: realtimeDraftPartition.reason,
      sourceRevision: activeTranscription.updatedAt,
    });
  }, [
    activeTranscription,
    activeTranscriptionId,
    featureAvailability.sessionArtifactsVisible,
    realtimeDraftPartition,
    realtimeSummaryDraftWindow,
    summaryBinding,
  ]);
  useEffect(() => {
    if (
      !featureAvailability.sessionArtifactsVisible ||
      !activeTranscription ||
      !realtimeDraftPartition ||
      realtimeSummaryDraftWindow.turnCount === 0 ||
      summaryBinding.statusLabelKey !== "artifactReady" ||
      !summaryBinding.resolution ||
      realtimeSummaryRunnerBusyRef.current
    ) {
      return;
    }

    const decision = resolveRealtimeSummaryFinalizeDecision({
      draft: realtimeSummaryDraftWindow,
      sessionActive: summaryCaptureActive,
      lastSourceUpdatedAt: activeTranscription.updatedAt,
      policy: summaryRuntimePolicy,
      now: new Date().toISOString(),
    });

    if (!decision.shouldFinalize) {
      if (decision.waitMs === null) {
        return;
      }
      const timer = window.setTimeout(() => {
        setRealtimeSummaryTick((tick) => tick + 1);
      }, decision.waitMs);
      return () => {
        window.clearTimeout(timer);
      };
    }

    const draftTurns = persistedSummaryTurns.filter((turn) =>
      realtimeSummaryDraftWindow.turnIds.includes(turn.id)
    );
    if (draftTurns.length === 0) {
      return;
    }

    realtimeSummaryRunnerBusyRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await executeRealtimeSummaryPartition({
          partitionId: realtimeDraftPartition.id,
          turns: draftTurns,
          selection: realtimeSummarySelection,
          trigger: "realtime_batch",
          partitionReason: decision.reason ?? "silence_gap",
          successMessageKey: null,
          notifyErrors: false,
        });
      } finally {
        realtimeSummaryRunnerBusyRef.current = false;
        if (!cancelled) {
          setRealtimeSummaryTick((tick) => tick + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTranscription,
    executeRealtimeSummaryPartition,
    featureAvailability.sessionArtifactsVisible,
    persistedSummaryTurns,
    realtimeDraftPartition,
    realtimeSummaryDraftWindow,
    realtimeSummarySelection,
    realtimeSummaryTick,
    summaryBinding,
    summaryCaptureActive,
    summaryRuntimePolicy,
  ]);
  const handleOpenSummaryDetail = useCallback(() => {
    if (!activeTranscriptionId) {
      return;
    }
    navigate(buildTranscriptionDetailPath(activeTranscriptionId));
  }, [activeTranscriptionId, navigate]);
  const realtimeSummarySurfaceControls =
    summaryBinding.statusLabelKey === "artifactReady" &&
    summarySurfaceMode === "full" &&
    fullSummarySelection
      ? {
          presetOptions: fullSummaryPresetOptions,
          selectedPresetId: fullSummarySelection.selectedPresetId,
          onPresetChange: handleFullSummaryPresetChange,
          applyScope: fullSummarySelection.applyScope,
          onApplyScopeChange: handleFullSummaryApplyScopeChange,
          applyScopeHelperKey: fullSummaryApplyScopeHelperKey,
          primaryAction: {
            labelKey: fullSummaryActionLabelKey,
            onClick: handleFullSummaryAction,
          },
          secondaryAction: activeTranscriptionId
            ? {
                labelKey: "summaryOpenDetail" as const,
                onClick: handleOpenSummaryDetail,
              }
            : null,
          disabled: fullSummaryControlsDisabled,
        }
      : summaryBinding.statusLabelKey === "artifactReady" &&
        summarySurfaceMode === "realtime" &&
        realtimeSummarySelection
        ? {
            presetOptions: fullSummaryPresetOptions,
            selectedPresetId: realtimeSummarySelection.selectedPresetId,
            onPresetChange: handleRealtimeSummaryPresetChange,
            applyScope: realtimeSummarySelection.applyScope,
            onApplyScopeChange: handleRealtimeSummaryApplyScopeChange,
            applyScopeHelperKey: realtimeSummaryApplyScopeHelperKey,
            primaryAction: realtimeSummaryActionLabelKey
              ? {
                  labelKey: realtimeSummaryActionLabelKey,
                  onClick: handleRealtimeSummaryAction,
                }
              : null,
            disabled: realtimeSummaryControlsDisabled,
          }
      : undefined;
  const latencyChipColor: "default" | "success" | "warning" | "error" =
    latencyLevel === "stable"
      ? "success"
      : latencyLevel === "delayed"
        ? "warning"
        : latencyLevel === "critical"
          ? "error"
          : "default";
  const latencyValueLabel =
    lastLatencyMs !== null
      ? `${Math.round(lastLatencyMs)} ms`
      : latencyStaleMs !== null
        ? `${Math.round(latencyStaleMs / 1000)} s`
        : "--";
  const sessionStateLabel =
    simulatedFileSession && sessionState === "recording"
      ? t("recordingPlayback")
      : t(SESSION_STATE_LABEL_KEY[sessionState]);
  const latencyLevelLabel = t(LATENCY_LEVEL_LABEL_KEY[latencyLevel]);
  const connectionBannerMessage =
    connectionEventMessage ??
    (connectionUxState.phase === "failed"
      ? t("realtimeReconnectFailedDetail")
      : connectionUxState.reconnectAttempt > 0
        ? t("attemptingToReconnectToStreaming", {
          values: { attempt: connectionUxState.reconnectAttempt },
        })
        : t("aStreamingErrorOccurredTheConnectionIsBeingRestored"));

  useEffect(() => {
    setFloatingActionsVisible(false);
    return () => {
      setFloatingActionsVisible(null);
    };
  }, [setFloatingActionsVisible]);

  useEffect(() => {
    if (!sessionActive) {
      setLatencyStaleMs(null);
      return;
    }
    const timer = window.setInterval(() => {
      if (lastResultAtRef.current === null) {
        setLatencyStaleMs(null);
        return;
      }
      setLatencyStaleMs(Math.max(0, Date.now() - lastResultAtRef.current));
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [sessionActive]);

  const clearCountdown = () => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const clearAutosave = () => {
    if (autosaveTimerRef.current !== null) {
      window.clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const clearStopSafetyTimer = () => {
    if (stopSafetyTimerRef.current !== null) {
      window.clearTimeout(stopSafetyTimerRef.current);
      stopSafetyTimerRef.current = null;
    }
  };

  const resetStreamingBufferMetrics = useCallback(() => {
    const next = { ...EMPTY_STREAMING_BUFFER_METRICS };
    streamingBufferMetricsRef.current = next;
    setStreamingBufferMetrics(next);
  }, []);

  const handleStreamingBufferMetricsChange = useCallback((next: StreamingBufferMetrics) => {
    streamingBufferMetricsRef.current = next;
    setStreamingBufferMetrics((prev) => {
      if (areStreamingBufferMetricsEqual(prev, next)) {
        return prev;
      }
      return next;
    });
  }, []);

  const stopRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return false;
    }
    try {
      recorder.stop();
    } catch (error) {
      console.error("Failed to stop recorder", error);
    } finally {
      recorderRef.current = null;
      setAudioLevel(0);
    }
    return true;
  }, []);

  const stopRecorderForRecovery = useCallback(() => {
    suppressRecorderOnStopRef.current = true;
    const stopped = stopRecorder();
    if (!stopped) {
      suppressRecorderOnStopRef.current = false;
    }
  }, [stopRecorder]);

  const stopCameraStream = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    const preview = cameraPreviewRef.current;
    if (preview && preview.srcObject) {
      preview.srcObject = null;
    }
  }, []);

  const stopVideoRecorder = useCallback(async () => {
    const recorder = videoRecorderRef.current;
    if (!recorder) {
      setCameraRecording(false);
      return;
    }
    if (recorder.state === "inactive") {
      videoRecorderRef.current = null;
      setCameraRecording(false);
      return;
    }
    if (videoRecorderStopPromiseRef.current) {
      await videoRecorderStopPromiseRef.current;
      return;
    }
    videoRecorderStopPromiseRef.current = new Promise<void>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          videoRecorderStopPromiseRef.current = null;
          resolve();
        },
        { once: true }
      );
    });
    try {
      recorder.stop();
    } catch {
      videoRecorderStopPromiseRef.current = null;
    }
    await videoRecorderStopPromiseRef.current;
    videoRecorderRef.current = null;
    setCameraRecording(false);
  }, []);

  const startVideoRecordingIfNeeded = useCallback(async () => {
    if (!cameraShouldRecordRef.current) return;
    if (!cameraEnabled) return;
    const stream = cameraStreamRef.current;
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      setCameraError(t("cameraNotSupported"));
      return;
    }
    const existingRecorder = videoRecorderRef.current;
    if (existingRecorder && existingRecorder.state === "recording") {
      return;
    }
    let mimeType = videoMimeTypeRef.current;
    if (!mimeType && typeof MediaRecorder.isTypeSupported === "function") {
      mimeType =
        VIDEO_MIME_CANDIDATES.find((candidate) =>
          MediaRecorder.isTypeSupported(candidate)
        ) ?? null;
    }

    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      console.error("Failed to start camera recorder", error);
      const message = error instanceof Error ? error.message : t("cameraRecordingFailed");
      setCameraError(message);
      enqueueRealtimeSnackbar(t("cameraRecordingFailed"), { variant: "error" });
      return;
    }

    videoRecorderRef.current = recorder;
    videoMimeTypeRef.current = recorder.mimeType || mimeType || "video/webm";
    recorder.addEventListener("dataavailable", (event) => {
      if (!event.data || event.data.size === 0) {
        return;
      }
      const transcriptionId = transcriptionIdRef.current;
      if (!transcriptionId) return;
      const chunkIndex = videoChunkIndexRef.current++;
      void event.data
        .arrayBuffer()
        .then((buffer) =>
          appendVideoChunk({
            transcriptionId,
            chunkIndex,
            data: buffer,
            mimeType:
              event.data.type ||
              recorder.mimeType ||
              videoMimeTypeRef.current ||
              "video/webm",
          })
        )
        .catch((error) => {
          console.error("Failed to persist video chunk", error);
        });
    });
    recorder.addEventListener("stop", () => {
      videoRecorderRef.current = null;
      setCameraRecording(false);
    });
    recorder.addEventListener("error", (event) => {
      console.error("Camera recording error", event);
      setCameraError(t("cameraRecordingFailed"));
      enqueueRealtimeSnackbar(t("cameraRecordingFailed"), { variant: "error" });
      cameraShouldRecordRef.current = false;
      void stopVideoRecorder();
      stopCameraStream();
    });

    try {
      recorder.start(VIDEO_CAPTURE_TIMESLICE_MS);
      setCameraRecording(true);
    } catch (error) {
      console.error("Failed to capture camera stream", error);
      const message = error instanceof Error ? error.message : t("cameraRecordingFailed");
      setCameraError(message);
      enqueueRealtimeSnackbar(t("cameraRecordingFailed"), { variant: "error" });
    }
  }, [cameraEnabled, enqueueRealtimeSnackbar, stopCameraStream, stopVideoRecorder, t]);

  useEffect(() => {
    let cancelled = false;
    const activateCamera = async () => {
      if (!cameraEnabled) {
        await stopVideoRecorder();
        if (!cancelled) {
          stopCameraStream();
          setCameraError(null);
        }
        return;
      }
      if (!cameraSupported) {
        setCameraError(t("cameraNotSupported"));
        setCameraEnabled(false);
        return;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("cameraNotSupported"));
        setCameraEnabled(false);
        return;
      }
      setCameraLoading(true);
      setCameraError(null);
      try {
        await stopVideoRecorder();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        const preview = cameraPreviewRef.current;
        if (preview) {
          preview.muted = true;
          preview.playsInline = true;
          preview.autoplay = true;
          preview.controls = false;
          preview.srcObject = stream;
          void preview.play().catch(() => {
            /* ignore autoplay errors */
          });
        }
        if (cameraShouldRecordRef.current) {
          await startVideoRecordingIfNeeded();
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : t("cameraAccessFailed");
        setCameraError(message);
        setCameraEnabled(false);
        stopCameraStream();
      } finally {
        if (!cancelled) {
          setCameraLoading(false);
        }
      }
    };
    void activateCamera();
    return () => {
      cancelled = true;
    };
  }, [
    cameraEnabled,
    cameraFacingMode,
    cameraSupported,
    startVideoRecordingIfNeeded,
    stopCameraStream,
    stopVideoRecorder,
    t,
  ]);

  useEffect(() => {
    if (sessionState === "recording" && cameraShouldRecordRef.current && cameraEnabled) {
      void startVideoRecordingIfNeeded();
    }
  }, [sessionState, cameraEnabled, startVideoRecordingIfNeeded]);

  const handleRuntimeSettingChange = (key: RuntimeSettingKey, value: string) => {
    setRuntimeSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const composeRuntimeStreamConfig = useCallback(
    (baseConfig?: Record<string, unknown> | null) => {
      const config: Record<string, unknown> = baseConfig ? { ...baseConfig } : {};
      const setNumber = (stateValue: string, targetKey: string) => {
        const trimmed = stateValue.trim();
        if (!trimmed) {
          delete config[targetKey];
          return;
        }
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) {
          config[targetKey] = parsed;
        }
      };
      setNumber(runtimeSettings.maxUtterDuration, "max_utter_duration");
      setNumber(runtimeSettings.noiseThreshold, "noise_threshold");
      setNumber(runtimeSettings.epdTime, "epd_time");
      setNumber(runtimeSettings.activeThreshold, "active_threshold");
      setNumber(runtimeSettings.acousticScale, "acoustic_scale");
      return config;
    },
    [runtimeSettings]
  );

  useEffect(() => {
    if (!streamingPresets || streamingPresets.length === 0) {
      setSelectedPresetId(null);
      return;
    }
    setSelectedPresetId((prev) => {
      if (prev && streamingPresets.some((preset) => preset.id === prev)) {
        return prev;
      }
      const fallbackPreset =
        streamingPresets.find((preset) => preset.isDefault) ?? streamingPresets[0];
      return fallbackPreset?.id ?? null;
    });
  }, [streamingPresets]);

  const activeStreamingPreset = useMemo(() => {
    if (selectedPresetId && streamingPresets) {
      const match = streamingPresets.find((preset) => preset.id === selectedPresetId);
      if (match) {
        return match;
      }
    }
    return defaultStreamingPreset;
  }, [defaultStreamingPreset, selectedPresetId, streamingPresets]);
  useEffect(() => {
    const nextJson =
      activeStreamingPreset?.configJson ??
      defaultStreamingPreset?.configJson ??
      fallbackStreamingConfig;
    setStreamingRequestJson(nextJson);
  }, [
    activeStreamingPreset?.configJson,
    activeStreamingPreset?.id,
    defaultStreamingPreset?.configJson,
    defaultStreamingPreset?.id,
    fallbackStreamingConfig,
  ]);

  const resetSessionState = () => {
    clearCountdown();
    clearAutosave();
    clearStopSafetyTimer();
    stopRecorder();
    streamingClientRef.current?.disconnect();
    streamingClientRef.current = null;
    streamingConfigRef.current = null;
    transcriptionIdRef.current = null;
    setActiveTranscriptionId(null);
    segmentsRef.current = [];
    setSegments([]);
    setPartialText(null);
    setNoteMode(false);
    setFollowLive(true);
    setCountdown(3);
    sessionStartRef.current = null;
    sessionConnectedRef.current = false;
    connectionReadyRef.current = false;
    countdownFinishedRef.current = false;
    chunkIndexRef.current = 0;
    recordedSampleRateRef.current = null;
    simulatedFileStreamingAbortRef.current = false;
    simulatedFileStreamingStartedRef.current = false;
    finalizingRef.current = false;
    finalizeReasonRef.current = "normal";
    cameraShouldRecordRef.current = false;
    videoChunkIndexRef.current = 0;
    setCameraRecording(false);
    void stopVideoRecorder();
    waitingForFinalRef.current = false;
    lastAudioSentAtRef.current = null;
    lastResultAtRef.current = null;
    suppressRecorderOnStopRef.current = false;
    setLastLatencyMs(null);
    setLatencyStaleMs(null);
    setConnectionEventMessage(null);
    setRetryingConnection(false);
    setConnectionUxState(DEFAULT_REALTIME_CONNECTION_UX_STATE);
    resetStreamingBufferMetrics();
    setAudioLevel(0);
    setSimulatedFileSession(false);
    setSimulatedFileProgressPercent(null);
    setSessionState("idle");
  };

  const startAutosaveTimer = () => {
    clearAutosave();
    const intervalMs = Math.max(1, realtimeAutoSaveSeconds) * 1000;
    autosaveTimerRef.current = window.setInterval(() => {
      const id = transcriptionIdRef.current;
      if (!id) return;
      const duration = sessionStartRef.current ? Date.now() - sessionStartRef.current : undefined;
      const reconnectMetrics = streamingBufferMetricsRef.current;
      void updateLocalTranscription(id, {
        durationMs: duration,
        ...buildRealtimeQualityPatch(reconnectMetrics),
      });
    }, intervalMs);
  };

  const handleAudioChunk = (buffer: ArrayBuffer, info: RecorderChunkInfo) => {
    if (!countdownFinishedRef.current) return;
    const id = transcriptionIdRef.current;
    if (!id) return;
    const sampleRate = info?.sampleRate;
    if (sampleRate && recordedSampleRateRef.current !== sampleRate) {
      recordedSampleRateRef.current = sampleRate;
      void updateLocalTranscription(id, {
        audioSampleRate: sampleRate,
        audioChannels: 1,
      });
    }
    const index = chunkIndexRef.current++;
    void appendAudioChunk({
      transcriptionId: id,
      chunkIndex: index,
      data: buffer.slice(0),
      mimeType: sampleRate ? `audio/pcm;rate=${sampleRate}` : "audio/pcm",
    }).catch((error) => console.error(t("failedToSaveAudioChunk"), error));

    lastAudioSentAtRef.current = Date.now();
    streamingClientRef.current?.sendAudioChunk(buffer, { durationMs: info.durationMs });
  };

  const shouldStopSimulatedFileStreaming = () =>
    simulatedFileStreamingAbortRef.current ||
    finalizingRef.current ||
    finalizeReasonRef.current === "aborted" ||
    sessionStateRef.current === "idle";

  const streamSimulatedFileAudio = async (audioData: DecodedPcmAudio) => {
    while (!countdownFinishedRef.current && !shouldStopSimulatedFileStreaming()) {
      await sleep(50);
    }
    if (shouldStopSimulatedFileStreaming()) {
      return;
    }

    const id = transcriptionIdRef.current;
    if (!id) {
      return;
    }

    const sampleRate = audioData.sampleRate || FALLBACK_STREAM_SAMPLE_RATE;
    const chunkSize = Math.max(
      1,
      Math.round((sampleRate * SIMULATED_FILE_STREAM_CHUNK_MS) / 1000)
    );

    await updateLocalTranscription(id, { processingStage: "recording" });

    for (let offset = 0; offset < audioData.pcm.length; offset += chunkSize) {
      if (shouldStopSimulatedFileStreaming()) {
        return;
      }

      const chunk = audioData.pcm.subarray(
        offset,
        Math.min(offset + chunkSize, audioData.pcm.length)
      ).slice();
      const chunkBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      const durationMs = Math.round((chunk.length / sampleRate) * 1000);
      let peak = 0;
      for (let index = 0; index < chunk.length; index += 64) {
        peak = Math.max(peak, Math.abs(chunk[index]));
      }
      setAudioLevel(Math.min(1, peak / 32768));
      setSimulatedFileProgressPercent(
        Math.min(100, Math.round(((offset + chunk.length) / audioData.pcm.length) * 100))
      );
      handleAudioChunk(chunkBuffer, { sampleRate, durationMs });
      const waitFor = Math.max(100, Math.min(200, durationMs));
      await sleep(waitFor);
    }

    setAudioLevel(0);
    if (!shouldStopSimulatedFileStreaming()) {
      stopSessionRef.current(false);
    }
  };

  const persistSegments = async () => {
    const id = transcriptionIdRef.current;
    if (!id) return;
    await replaceSegments(
      id,
      segmentsRef.current.map((segment) => ({
        text: segment.text,
        rawText: segment.rawText,
        startMs: segment.startMs,
        endMs: segment.endMs,
        isFinal: segment.isFinal,
        spk: segment.spk,
        speaker_label: segment.speakerLabel,
        language: segment.language,
        words: segment.words,
      }))
    );
    const transcriptText = segmentsRef.current.map((segment) => segment.text).join("\n");
    await updateLocalTranscription(id, {
      transcriptText,
    });
  };

  const processStreamingMessage = async (event: MessageEvent) => {
    if (!event.data) return;
    let payload: unknown = event.data;
    try {
      payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch (error) {
      console.error(t("streamingMessageParsingFailure"), error);
      return;
    }

    const classified = classifyRealtimeStreamingPayload(payload);

    if (classified.kind === "error") {
      const message = classified.message ?? t("anErrorOccurredDuringStreaming");
      setErrorMessage(message);
      setConnectionEventMessage(message);
      setConnectionUxState((prev) =>
        reduceRealtimeConnectionUxState(prev, { type: "permanent-failure" })
      );
      stopRecorder();
      void stopVideoRecorder();
      if (sessionStateRef.current !== "saving" && sessionStateRef.current !== "stopping") {
        setSessionState("paused");
      }
      return;
    }

    if (classified.kind === "final") {
      const normalized = classified.segment;
      const normalizedWords = normalized.words && normalized.words.length > 0 ? normalized.words : undefined;
      const fallbackStartFromWords = normalizedWords?.[0]?.startMs;
      const fallbackEndFromWords = normalizedWords?.[normalizedWords.length - 1]?.endMs;
      const startMs = normalized.startMs ?? fallbackStartFromWords ?? 0;
      const endMs = normalized.endMs ?? fallbackEndFromWords ?? startMs;

      let speakerLabel = normalized.speakerLabel;
      if (normalized.spk === "0" && !speakerLabel) {
        speakerLabel = defaultSpeakerName;
      }

      const segment: RealtimeSegment = {
        id: `${Date.now()} -${segmentsRef.current.length} `,
        text: normalized.text,
        rawText: normalized.rawText,
        startMs,
        endMs,
        isFinal: true,
        spk: normalized.spk,
        speakerLabel,
        language: normalized.language,
        words: normalizedWords,
      };
      segmentsRef.current = [...segmentsRef.current, segment];
      setSegments([...segmentsRef.current]);
      setPartialText(null);
      const receivedAt = Date.now();
      lastResultAtRef.current = receivedAt;
      setLatencyStaleMs(0);
      if (lastAudioSentAtRef.current !== null) {
        setLastLatencyMs(Math.max(0, receivedAt - lastAudioSentAtRef.current));
      }
      await persistSegments();

      if (waitingForFinalRef.current) {
        waitingForFinalRef.current = false;
        if (sessionStateRef.current === "stopping") {
          void finalizeSession(false);
        }
      }
      return;
    }

    if (classified.kind === "partial") {
      setPartialText(classified.segment.text);
      const receivedAt = Date.now();
      lastResultAtRef.current = receivedAt;
      setLatencyStaleMs(0);
      if (lastAudioSentAtRef.current !== null) {
        setLastLatencyMs(Math.max(0, receivedAt - lastAudioSentAtRef.current));
      }
    }
  };

  const handleStreamingMessage = (event: MessageEvent) => {
    void processStreamingMessage(event);
  };

  const resolveStreamingEventMessage = (event: Event | CloseEvent) => {
    const closeReason =
      event instanceof CloseEvent && typeof event.reason === "string"
        ? event.reason.trim()
        : "";
    const detailCode = (
      event as Event & { detail?: { code?: string; message?: string } }
    ).detail?.code;
    const detailMessage = (
      event as Event & { detail?: { code?: string; message?: string } }
    ).detail?.message;
    if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
      return detailMessage.trim();
    }
    const code = closeReason || (typeof detailCode === "string" ? detailCode : "");
    if (code === "STREAM_ACK_TIMEOUT") {
      return t("streamAckTimeoutTryAgain");
    }
    if (event instanceof CloseEvent) {
      return closeReason || t("yourStreamingConnectionHasEnded");
    }
    return t("aFatalErrorOccurredInYourStreamingSession");
  };

  const handleStreamingError = (event: Event) => {
    console.error(t("streamingError"), event);
    if (finalizingRef.current) return;
    const resolvedMessage = resolveStreamingEventMessage(event);
    setErrorMessage(
      resolvedMessage === t("streamAckTimeoutTryAgain")
        ? resolvedMessage
        : t("aStreamingErrorOccurredTheConnectionIsBeingRestored")
    );
    setConnectionEventMessage(
      resolvedMessage === t("streamAckTimeoutTryAgain")
        ? resolvedMessage
        : t("aStreamingErrorOccurredTryReconnecting")
    );
    setConnectionUxState((prev) =>
      reduceRealtimeConnectionUxState(prev, { type: "streaming-error" })
    );
  };

  const prepareSession = async (
    decoderConfig: Record<string, unknown>,
    options: {
      inputSource?: RealtimeInputSource;
      simulatedFileAudio?: DecodedPcmAudio;
    } = {}
  ) => {
    const inputSource = options.inputSource ?? "microphone";
    sessionConnectedRef.current = false;
    connectionReadyRef.current = false;
    resetStreamingBufferMetrics();

    const client = new RtzrStreamingClient();
    streamingClientRef.current = client;
    const sampleRate = extractSampleRateFromConfig(decoderConfig);

    if (inputSource === "microphone") {
      const recorder = new RecorderManager();
      recorderRef.current = recorder;
      try {
        await recorder.start({
          targetSampleRate: sampleRate,
          chunkMillis: 800,
          onChunk: handleAudioChunk,
          onLevel: setAudioLevel,
          onError: (error) => {
            console.error(t("recordingError"), error);
            setErrorMessage(error.message ?? t("anErrorOccurredDuringRecording"));
            enqueueRealtimeSnackbar(t("aRecordingErrorOccurred"), { variant: "error" });
            stopSession(true);
          },
          onStop: () => {
            if (suppressRecorderOnStopRef.current) {
              suppressRecorderOnStopRef.current = false;
              return;
            }
            if (sessionStateRef.current === "stopping") {
              // Wait for socket close or safety timer
              return;
            }
            void finalizeSession(finalizeReasonRef.current === "aborted");
          },
        });
        if (recorder.recorderState !== "recording") {
          throw new Error(t("yourMicrophoneDeviceCannotBeUsed"));
        }
      } catch (error) {
        console.error(t("failedToStartRecording"), error);
        setErrorMessage(
          error instanceof Error ? error.message : t("yourMicrophoneDeviceCannotBeUsed")
        );
        enqueueRealtimeSnackbar(t("yourMicrophoneDeviceCannotBeUsed"), { variant: "error" });
        stopSession(true);
        throw error instanceof Error ? error : new Error(t("yourMicrophoneDeviceCannotBeUsed"));
      }
    } else {
      recorderRef.current = null;
    }

    client.connect({
      baseUrl: apiBaseUrl,
      decoderConfig,
      metadata: {
        transcription_id: transcriptionIdRef.current,
        preset_id: activeStreamingPreset?.id ?? defaultStreamingPreset?.id,
        sample_rate: sampleRate,
      },
      onMessage: handleStreamingMessage,
      onError: handleStreamingError,
      onBufferMetrics: handleStreamingBufferMetricsChange,
      onReconnectAttempt: (attempt) => {
        if (sessionStateRef.current === "stopping") {
          setConnectionEventMessage(t("finalizing"));
          return;
        }
        setConnectionUxState((prev) =>
          reduceRealtimeConnectionUxState(prev, { type: "reconnect-attempt", attempt })
        );
        setConnectionEventMessage(
          t("attemptingToReconnectToStreaming", { values: { attempt } })
        );
        if (countdownFinishedRef.current) {
          setSessionState("connecting");
        }
      },
      onOpen: () => {
        const recovered = connectionUxStateRef.current.phase !== "normal";
        sessionConnectedRef.current = true;
        connectionReadyRef.current = true;
        if (sessionStateRef.current === "stopping") {
          setConnectionEventMessage(t("finalizing"));
          return;
        }
        setConnectionUxState((prev) =>
          reduceRealtimeConnectionUxState(prev, { type: "socket-open" })
        );
        setConnectionEventMessage(null);
        setRetryingConnection(false);
        if (countdownFinishedRef.current) {
          setSessionState("recording");
          startAutosaveTimer();
          setErrorMessage(null);
        }
        if (recovered) {
          enqueueRealtimeSnackbar(t("streamingConnectionRecovered"), { variant: "success" });
        }
        if (
          inputSource === "uploaded_file" &&
          options.simulatedFileAudio &&
          !simulatedFileStreamingStartedRef.current
        ) {
          simulatedFileStreamingStartedRef.current = true;
          void streamSimulatedFileAudio(options.simulatedFileAudio).catch((error) => {
            console.error("Failed to stream file as realtime simulation", error);
            setErrorMessage(t("anErrorOccurredDuringStreaming"));
            enqueueRealtimeSnackbar(t("anErrorOccurredDuringStreaming"), { variant: "error" });
            stopSessionRef.current(true);
          });
        }
      },
      onClose: (event) => {
        if (finalizingRef.current) return;
        if (sessionStateRef.current === "stopping") {
          void finalizeSession(false);
          return;
        }
        const reason = resolveStreamingEventMessage(event);
        setErrorMessage(reason);
        setConnectionEventMessage(reason);
        setRetryingConnection(false);
        setConnectionUxState((prev) =>
          reduceRealtimeConnectionUxState(prev, { type: "recoverable-close" })
        );
        stopRecorderForRecovery();
        void stopVideoRecorder();
        if (
          countdownFinishedRef.current &&
          sessionStateRef.current !== "idle" &&
          sessionStateRef.current !== "saving"
        ) {
          setSessionState("paused");
          return;
        }
        stopSession(true);
      },
      onPermanentFailure: (event) => {
        if (finalizingRef.current) return;
        const message = resolveStreamingEventMessage(event);
        setErrorMessage(message);
        setConnectionEventMessage(message);
        setRetryingConnection(false);
        setConnectionUxState((prev) =>
          reduceRealtimeConnectionUxState(prev, { type: "permanent-failure" })
        );
      },
    });
  };

  const finalizeSession = async (aborted: boolean) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    clearCountdown();
    clearAutosave();
    clearStopSafetyTimer();
    stopRecorder();
    streamingClientRef.current?.disconnect();
    streamingClientRef.current = null;
    const id = transcriptionIdRef.current;
    const shouldDiscard = aborted && !sessionConnectedRef.current;
    if (sessionState !== "saving") {
      setSessionState("saving");
    }

    const duration = sessionStartRef.current ? Date.now() - sessionStartRef.current : undefined;
    const reconnectMetrics = streamingBufferMetricsRef.current;

    try {
      if (id && shouldDiscard) {
        await deleteTranscription(id);
      } else if (id) {
        await replaceSegments(
          id,
          segmentsRef.current.map((segment) => ({
            text: segment.text,
            startMs: segment.startMs,
            endMs: segment.endMs,
            isFinal: segment.isFinal,
            speaker_label: segment.speakerLabel,
            language: segment.language,
            words: segment.words,
          }))
        );
        const transcriptText = segmentsRef.current.map((segment) => segment.text).join("\n");
        await updateLocalTranscription(id, {
          status: aborted ? "failed" : "completed",
          processingStage: undefined,
          transcriptText,
          durationMs: duration,
          ...buildRealtimeQualityPatch(reconnectMetrics),
          errorMessage: aborted ? errorMessage ?? t("theSessionHasBeenAborted") : undefined,
        });
      }
    } catch (error) {
      console.error(t("realTimeTranscriptionSaveFailure"), error);
    }

    const navigateId = id;
    resetSessionState();
    if (shouldDiscard) {
      enqueueRealtimeSnackbar(t("theSessionHasBeenAborted"), { variant: "warning" });
      return;
    }
    if (navigateId) {
      navigate(buildTranscriptionDetailPath(navigateId));
    }
    if (aborted) {
      enqueueRealtimeSnackbar(t("realTimeTranscriptionWasInterruptedAndTheResultsWereTemporarilyStored"), {
        variant: "warning",
      });
    } else if (reconnectMetrics.degraded) {
      enqueueRealtimeSnackbar(t("someBufferedAudioCouldNotBeReplayedResultsMayBeIncomplete"), {
        variant: "warning",
      });
    } else {
      enqueueRealtimeSnackbar(t("realTimeTranscriptionResultsAreSaved"), { variant: "success" });
    }
  };

  const stopSession = (aborted: boolean) => {
    if (sessionState === "idle" || sessionState === "saving" || sessionState === "stopping") return;
    simulatedFileStreamingAbortRef.current = true;
    setConnectionUxState((prev) =>
      reduceRealtimeConnectionUxState(prev, { type: "session-reset" })
    );
    setConnectionEventMessage(null);
    setRetryingConnection(false);
    finalizeReasonRef.current = aborted ? "aborted" : "normal";
    cameraShouldRecordRef.current = false;
    void stopVideoRecorder();
    if (sessionState === "countdown") {
      clearCountdown();
      finalizeReasonRef.current = "aborted";
      if (!stopRecorder()) {
        void finalizeSession(true);
      }
      return;
    }
    if (!aborted) {
      setSessionState("stopping");
      const id = transcriptionIdRef.current;
      if (id) {
        void updateLocalTranscription(id, { processingStage: "finalizing" });
      }
      waitingForFinalRef.current = true;
      stopRecorder();
      streamingClientRef.current?.requestFinal();
      stopSafetyTimerRef.current = window.setTimeout(() => {
        if (sessionStateRef.current === "stopping") {
          waitingForFinalRef.current = false;
          void finalizeSession(false);
        }
      }, 3000);
    }
    if (!stopRecorder() && aborted) {
      void finalizeSession(true);
    }
    setAudioLevel(0);
  };

  stopSessionRef.current = stopSession;

  const handleRetryConnection = async () => {
    if (retryingConnection || finalizingRef.current) {
      return;
    }
    const decoderConfig = streamingConfigRef.current;
    if (!decoderConfig) {
      const message = t("cannotRetryWithoutOriginalConfiguration");
      setErrorMessage(message);
      enqueueRealtimeSnackbar(message, { variant: "error" });
      return;
    }

    setRetryingConnection(true);
    setErrorMessage(null);
    setConnectionEventMessage(null);
    setConnectionUxState((prev) =>
      reduceRealtimeConnectionUxState(prev, { type: "manual-retry" })
    );
    setSessionState("connecting");
    sessionConnectedRef.current = false;
    connectionReadyRef.current = false;
    waitingForFinalRef.current = false;
    streamingClientRef.current?.disconnect();
    streamingClientRef.current = null;

    try {
      await prepareSession(decoderConfig);
    } catch (error) {
      console.error("Failed to retry streaming session", error);
      const message = t("retryConnectionFailed");
      setErrorMessage(message);
      setConnectionEventMessage(message);
      setConnectionUxState((prev) =>
        reduceRealtimeConnectionUxState(prev, { type: "permanent-failure" })
      );
      setRetryingConnection(false);
    }
  };

  const handlePauseRecording = () => {
    if (sessionState !== "recording") return;
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.pause();
    setSessionState("paused");
  };

  const handleResumeRecording = () => {
    if (sessionState !== "paused") return;
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.resume();
    setSessionState("recording");
  };

  const cancelLongPressDetection = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPressDetection = () => {
    cancelLongPressDetection();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      longPressTimerRef.current = null;
      stopSession(false);
    }, 3000);
  };

  const handleMainButtonClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (sessionState === "idle") {
      void handleStartSession();
      return;
    }
    if (sessionState === "connecting") {
      stopSession(true);
      return;
    }
    if (sessionState === "recording") {
      handlePauseRecording();
      return;
    }
    if (sessionState === "paused") {
      if (connectionUxState.phase === "failed") {
        void handleRetryConnection();
        return;
      }
      handleResumeRecording();
    }
  };

  useEffect(() => {
    if (sessionState !== "recording") {
      cancelLongPressDetection();
      longPressTriggeredRef.current = false;
    }
  }, [sessionState]);

  useEffect(() => {
    return () => {
      cancelLongPressDetection();
    };
  }, []);

  const handleStartSession = async (input: RealtimeStartInput = { source: "microphone" }) => {
    if (sessionState !== "idle") {
      enqueueRealtimeSnackbar(t("thereIsRealTimeTranscriptionAlreadyUnderway"), { variant: "info" });
      return;
    }
    if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
      setErrorMessage(t("pleaseSetThePythonApiBaseUrlFirst"));
      enqueueRealtimeSnackbar(t("pleaseSetThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }

    const inputSource = input.source;
    let decoderConfig: Record<string, unknown>;
    const configString = resolveRealtimeStreamingConfigString({
      draftJson: streamingRequestJson,
      activePresetConfigJson: activeStreamingPreset?.configJson,
      defaultPresetConfigJson: defaultStreamingPreset?.configJson,
      fallbackConfigJson: fallbackStreamingConfig,
    });
    try {
      decoderConfig = JSON.parse(configString);
    } catch (error) {
      console.error(t("streamingSettingsJsonParsingFailure"), error);
      setErrorMessage(t("pleaseCheckTheStreamingSettingsJson"));
      enqueueRealtimeSnackbar(t("streamingSettingsJsonIsInvalid"), { variant: "error" });
      return;
    }
    const existingRuntimeConfig = isRecord((decoderConfig as { stream_config?: unknown }).stream_config)
      ? ((decoderConfig as { stream_config: Record<string, unknown> }).stream_config as Record<string, unknown>)
      : null;
    const runtimeStreamConfig = composeRuntimeStreamConfig(existingRuntimeConfig);
    if (Object.keys(runtimeStreamConfig).length > 0) {
      (decoderConfig as Record<string, unknown>).stream_config = runtimeStreamConfig;
    } else {
      delete (decoderConfig as { stream_config?: unknown }).stream_config;
    }

    let sampleRate = extractSampleRateFromConfig(decoderConfig);
    let simulatedFileAudio: DecodedPcmAudio | null = null;
    if (inputSource === "uploaded_file") {
      try {
        const { decodeAudioFileToPcm } = await import("../services/audio/decodeAudioFile");
        simulatedFileAudio = await decodeAudioFileToPcm(input.file, sampleRate);
        sampleRate = simulatedFileAudio.sampleRate || sampleRate;
        decoderConfig = { ...decoderConfig, sample_rate: sampleRate };
      } catch {
        setErrorMessage(t("audioCannotBeConverted"));
        enqueueRealtimeSnackbar(t("audioCannotBeConverted"), { variant: "error" });
        return;
      }
    }

    streamingConfigRef.current = inputSource === "microphone" ? decoderConfig : null;
    const backendSnapshot = await resolveBackendEndpointSnapshot(activeBackendPresetId);
    const modelName = extractModelNameFromConfig(decoderConfig);
    const uploadedFileTitle =
      inputSource === "uploaded_file"
        ? input.file.name.replace(/\.[^/.]+$/, "").trim() || input.file.name
        : null;

    try {
      const record = await createLocalTranscription({
        title:
          inputSource === "uploaded_file"
            ? `${t("realTimeTranscription")} ${uploadedFileTitle}`
            : `${t("realTimeTranscription")} ${formatLocalizedDateTime(new Date(), locale)} `,
        kind: "realtime",
        status: "processing",
        metadata: {
          processingStage: "recording",
          sttTransport: "streaming",
          captureInput: inputSource,
          configSnapshotJson: JSON.stringify(decoderConfig),
          configPresetId: activeStreamingPreset?.id ?? undefined,
          configPresetName: activeStreamingPreset?.name ?? undefined,
          modelName,
          backendEndpointId: backendSnapshot.id,
          backendEndpointName: backendSnapshot.name,
          backendEndpointSource: backendSnapshot.source,
          backendDeployment: backendSnapshot.deployment,
          backendApiBaseUrl: backendSnapshot.apiBaseUrl,
          ...buildRealtimeQualityPatch(EMPTY_STREAMING_BUFFER_METRICS),
        },
      });
      transcriptionIdRef.current = record.id;
      setActiveTranscriptionId(record.id);
      await updateLocalTranscription(record.id, {
        audioSampleRate: sampleRate,
        audioChannels: 1,
        durationMs: simulatedFileAudio?.durationMs,
      });
      videoChunkIndexRef.current = 0;
    } catch (error) {
      console.error(t("localTranscriptionRecordCreationFailed"), error);
      setErrorMessage(t("localTranscriptionRecordsCannotBeCreated"));
      enqueueRealtimeSnackbar(t("localTranscriptionRecordsCannotBeCreated"), { variant: "error" });
      return;
    }

    sessionStartRef.current = Date.now();
    segmentsRef.current = [];
    setSegments([]);
    setPartialText(null);
    setFollowLive(true);
    chunkIndexRef.current = 0;
    setSimulatedFileSession(inputSource === "uploaded_file");
    setSimulatedFileProgressPercent(inputSource === "uploaded_file" ? 0 : null);
    simulatedFileStreamingAbortRef.current = false;
    simulatedFileStreamingStartedRef.current = false;
    cameraShouldRecordRef.current = inputSource === "microphone";
    // Video recording will be triggered by useEffect when state becomes "recording"
    setErrorMessage(null);
    setConnectionEventMessage(null);
    setConnectionUxState(DEFAULT_REALTIME_CONNECTION_UX_STATE);
    setRetryingConnection(false);
    setLastLatencyMs(null);
    setLatencyStaleMs(null);
    lastAudioSentAtRef.current = null;
    lastResultAtRef.current = null;
    finalizeReasonRef.current = "normal";
    countdownFinishedRef.current = false;

    setCountdown(3);
    setSessionState("countdown");
    setRuntimeSettingsOpen(false);

    void prepareSession(decoderConfig, {
      inputSource,
      simulatedFileAudio: simulatedFileAudio ?? undefined,
    }).catch((error) => {
      console.error("Failed to prepare streaming session", error);
    });

    clearCountdown();
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          countdownFinishedRef.current = true;
          if (connectionReadyRef.current) {
            setSessionState("recording");
            startAutosaveTimer();
            setErrorMessage(null);
          } else {
            setSessionState("connecting");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRealtimeFileUploadAction = () => {
    if (sessionState !== "idle") {
      enqueueRealtimeSnackbar(t("thereIsRealTimeTranscriptionAlreadyUnderway"), { variant: "info" });
      return;
    }
    realtimeFileInputRef.current?.click();
  };

  const handleRealtimeFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) {
      return;
    }
    void handleStartSession({ source: "uploaded_file", file: selectedFile });
  };

  useEffect(() => {
    return () => {
      if (sessionStateRef.current !== "idle") {
        stopSessionRef.current(true);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      cameraShouldRecordRef.current = false;
      void stopVideoRecorder();
      stopCameraStream();
    };
  }, [stopCameraStream, stopVideoRecorder]);

  const noteModeText = useMemo(() => {
    const lines = segments
      .map((segment) => segment.text?.trim())
      .filter((text): text is string => Boolean(text && text.length));
    const base = lines.join("\n");
    const partial = partialText?.trim();
    if (partial) {
      return base ? `${base}\n${partial}` : partial;
    }
    return base;
  }, [segments, partialText]);

  const handleMainButtonPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (sessionState !== "recording") return;
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    startLongPressDetection();
  };

  const clearMainButtonPointerState = () => {
    cancelLongPressDetection();
  };

  const handleStopFabClick = () => {
    const shouldAbort =
      sessionState === "connecting" ||
      sessionState === "countdown" ||
      connectionUxState.phase === "failed";
    stopSession(shouldAbort ? true : false);
  };

  const handleToggleCamera = () => {
    if (!cameraSupported) {
      setCameraError(t("cameraNotSupported"));
      enqueueRealtimeSnackbar(t("cameraNotSupported"), { variant: "info" });
      return;
    }
    setCameraEnabled((prev) => !prev);
  };

  const handleSwitchCamera = () => {
    setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const showVideoSection = cameraEnabled || cameraLoading;
  const switchCameraLabel =
    cameraFacingMode === "user" ? t("switchToRearCamera") : t("switchToFrontCamera");

  return (
    <>
      <input
        ref={realtimeFileInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={handleRealtimeFileInputChange}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            "@media (orientation: landscape)": showVideoSection
              ? {
                flexDirection: "row",
                alignItems: "stretch",
                gap: 2,
              }
              : undefined,
          }}
        >
          {/* Video Section */}
          {showVideoSection && (
            <Box
              sx={{
                flex: "0 0 auto",
                p: 2,
                pb: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                zIndex: 1,
                "@media (orientation: landscape)": {
                  flexBasis: "50%",
                  maxWidth: "50%",
                  pb: 2,
                  pr: 1,
                },
              }}
            >
              <Card>
                <CardHeader
                  title={t("sessionVideoCapture")}
                  subheader={t("recordVideoAlongsideRealTimeTranscription")}
                  action={
                    <Button
                      size="small"
                      onClick={handleSwitchCamera}
                      disabled={!cameraEnabled || cameraLoading}
                      aria-label={switchCameraLabel}
                    >
                      {switchCameraLabel}
                    </Button>
                  }
                />
                <Collapse in={showVideoSection} unmountOnExit>
                  <CardContent>
                    <Stack spacing={2}>
                      {!cameraSupported && (
                        <Alert severity="info">{t("cameraNotSupported")}</Alert>
                      )}
                      {cameraError && <Alert severity="error">{cameraError}</Alert>}
                      <Box
                        sx={{
                          position: "relative",
                          borderRadius: 2,
                          overflow: "hidden",
                          border: 1,
                          borderColor: "divider",
                          aspectRatio: "16 / 9",
                          backgroundColor: (theme) => theme.palette.grey[900],
                          width: "100%",
                          maxHeight: "50vh",
                          maxWidth: "100%",
                          "@media (orientation: landscape)": {
                            maxWidth: "100%",
                            maxHeight: "100%",
                          },
                        }}
                      >
                        {!cameraEnabled && (
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "text.secondary",
                              textAlign: "center",
                              p: 2,
                              backgroundColor: (theme) => alpha(theme.palette.action.hover, 0.8),
                            }}
                          >
                            <Typography variant="body2">{t("cameraPreview")}</Typography>
                          </Box>
                        )}
                        <Box
                          component="video"
                          ref={cameraPreviewRef}
                          muted
                          playsInline
                          autoPlay
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: cameraEnabled ? "block" : "none",
                          }}
                        />
                        {cameraRecording && (
                          <Chip
                            size="small"
                            color="error"
                            icon={<FiberManualRecordRoundedIcon fontSize="small" />}
                            label={t("cameraRecording")}
                            sx={{
                              position: "absolute",
                              top: 16,
                              left: 16,
                              bgcolor: "rgba(211, 47, 47, 0.85)",
                              color: "common.white",
                            }}
                          />
                        )}
                        {cameraLoading && (
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "rgba(0,0,0,0.4)",
                            }}
                          >
                            <CircularProgress color="inherit" />
                          </Box>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {t("cameraRecordingSavedWithSession")}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Collapse>
              </Card>
            </Box>
          )}

          {/* Transcription Content Section */}
          <Box
            sx={{
              flex: "1 1 auto",
              overflowY: compactRealtimeLayout ? "hidden" : "auto",
              p: compactRealtimeLayout ? 1.5 : 2,
              display: "flex",
              flexDirection: "column",
              gap: compactRealtimeLayout ? 1.25 : 2,
              pb: {
                xs: compactRealtimeLayout ? 1.5 : "calc(220px + var(--malsori-bottom-clearance))",
                sm: "calc(180px + var(--malsori-bottom-clearance))",
              },
              minHeight: 0,
              "@media (orientation: landscape)": showVideoSection
                ? { pr: 2, pl: 1 }
                : undefined,
            }}
          >
            <RealtimeStatusBanner
              sessionState={sessionState}
              sessionStateLabel={sessionStateLabel}
              connectionUxState={connectionUxState}
              streamingBufferMetrics={streamingBufferMetrics}
              latencyLevelLabel={latencyLevelLabel}
              latencyValueLabel={latencyValueLabel}
              latencyChipColor={latencyChipColor}
              countdown={countdown}
              connectionBannerMessage={connectionBannerMessage}
              microphonePermissionState={microphonePermissionState}
              storagePermissionState={storagePermissionState}
              storagePermissionSupported={storagePermissionSupported}
              onRetryMicrophonePermission={() => void handleRetryMicrophonePermission()}
              onRetryStoragePermission={() => void handleRetryStoragePermission()}
              onManualRetryConnection={() => void handleRetryConnection()}
              compactLayout={compactRealtimeLayout}
            />

            {(errorMessage || !apiBaseUrl.trim()) && (
              <Stack spacing={2}>
                {!apiBaseUrl.trim() && (
                  <Alert severity="warning">
                    {t("pleaseEnterThePythonApiBaseUrlOnTheSettingsPage")}
                  </Alert>
                )}
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              </Stack>
            )}

            {featureAvailability.sessionArtifactsVisible && compactRealtimeLayout ? (
              <SummarySurface
                compactLayout
                open={summarySurfaceMode !== "off"}
                onToggle={handleSummaryToggle}
                selectedMode={summarySurfaceMode}
                onModeChange={handleSummaryModeChange}
                modeOptions={[
                  { value: "off", labelKey: "off" },
                  { value: "realtime", labelKey: "summaryLive" },
                  { value: "full", labelKey: "summaryFull" },
                ]}
                view={summarySurfaceView}
                controls={realtimeSummarySurfaceControls}
              />
            ) : null}

            <Box
              sx={{
                display: "flex",
                gap: compactRealtimeLayout ? 0 : 2,
                alignItems: "stretch",
                minHeight: 0,
                flex: 1,
              }}
            >
              <Box sx={{ flex: "1 1 auto", minWidth: 0, minHeight: 0 }}>
                <RealtimeTranscript
                  segments={segments}
                  partialText={partialText}
                  noteMode={noteMode}
                  onNoteModeChange={setNoteMode}
                  followLive={followLive}
                  onFollowLiveChange={setFollowLive}
                  noteModeText={noteModeText}
                  sessionState={sessionState}
                  compactLayout={compactRealtimeLayout}
                />
              </Box>

              {featureAvailability.sessionArtifactsVisible && !compactRealtimeLayout ? (
                <Box sx={{ flex: "0 0 320px", width: 320, minWidth: 280 }}>
                  <SummarySurface
                    compactLayout={false}
                    open={summarySurfaceMode !== "off"}
                    onToggle={handleSummaryToggle}
                    selectedMode={summarySurfaceMode}
                    onModeChange={handleSummaryModeChange}
                    modeOptions={[
                      { value: "off", labelKey: "off" },
                      { value: "realtime", labelKey: "summaryLive" },
                      { value: "full", labelKey: "summaryFull" },
                    ]}
                    view={summarySurfaceView}
                    controls={realtimeSummarySurfaceControls}
                  />
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>

        {compactRealtimeLayout && (
          <Box
            sx={{
              px: 1.5,
              pt: 0.75,
              pb: "calc(12px + var(--malsori-bottom-clearance))",
            }}
          >
            <RealtimeToolbar
              variant="docked"
              sessionState={sessionState}
              retryingConnection={retryingConnection}
              onMainAction={handleMainButtonClick}
              onStopAction={handleStopFabClick}
              onRuntimeSettingsOpen={() => setRuntimeSettingsOpen(true)}
              onRealtimeFileUpload={handleRealtimeFileUploadAction}
              cameraSupported={cameraSupported}
              cameraEnabled={cameraEnabled}
              onToggleCamera={handleToggleCamera}
              audioLevel={audioLevel}
              streamProgressPercent={simulatedFileProgressPercent}
              runtimeSettingsButtonRef={runtimeSettingsFabRef}
              mainButtonPointerDown={handleMainButtonPointerDown}
              clearPointerState={clearMainButtonPointerState}
            />
          </Box>
        )}
      </Box>

      {/* Toolbar and Settings */}
      {!compactRealtimeLayout && (
        <RealtimeToolbar
          sessionState={sessionState}
          retryingConnection={retryingConnection}
          onMainAction={handleMainButtonClick}
          onStopAction={handleStopFabClick}
          onRuntimeSettingsOpen={() => setRuntimeSettingsOpen(true)}
          onRealtimeFileUpload={handleRealtimeFileUploadAction}
          cameraSupported={cameraSupported}
          cameraEnabled={cameraEnabled}
          onToggleCamera={handleToggleCamera}
          audioLevel={audioLevel}
          streamProgressPercent={simulatedFileProgressPercent}
          runtimeSettingsButtonRef={runtimeSettingsFabRef}
          mainButtonPointerDown={handleMainButtonPointerDown}
          clearPointerState={clearMainButtonPointerState}
        />
      )}

      <RealtimeSettingsDialog
        open={runtimeSettingsOpen}
        onClose={() => setRuntimeSettingsOpen(false)}
        streamingPresets={streamingPresets}
        activeStreamingPreset={activeStreamingPreset}
        onSelectPreset={setSelectedPresetId}
        streamingRequestJson={streamingRequestJson}
        setStreamingRequestJson={setStreamingRequestJson}
        jsonEditorOpen={streamingJsonEditorOpen}
        setJsonEditorOpen={setStreamingJsonEditorOpen}
        streamConfigOpen={runtimeStreamConfigOpen}
        setStreamConfigOpen={setRuntimeStreamConfigOpen}
        runtimeSettings={runtimeSettings}
        onRuntimeSettingChange={handleRuntimeSettingChange}
        portalContainer={portalContainer}
      />

      {/* Countdown Overlay */}
      {sessionState === "countdown" && countdown > 0 ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0, 0, 0, 0.75)",
            zIndex: (theme) => theme.zIndex.modal + 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "common.white",
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: "35vw", md: "20vw" },
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {countdown}
          </Typography>
        </Box>
      ) : null}
    </>
  );
}
