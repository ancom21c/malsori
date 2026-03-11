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
import type { PointerEvent as ReactPointerEvent } from "react";
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
import {
  RecorderManager,
  type RecorderChunkInfo,
} from "../services/audio/recorderManager";
import type { LocalWordTiming, PresetConfig } from "../data/app-db";
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
import { platformBackendBindingRuntime } from "../app/backendBindingRuntime";
import { resolveArtifactBindingPresentation } from "./artifactBindingModel";
import { readSessionSummaryState } from "../services/data/summaryRepository";
import {
  resolveSummaryPresetSelection,
} from "../domain/summaryPreset";
import SummarySurface from "../components/summary/SummarySurface";
import {
  buildSummarySurfaceView,
  type SummarySurfaceMode,
} from "../components/summary/summarySurfaceModel";

type SessionState = "idle" | "countdown" | "connecting" | "recording" | "paused" | "stopping" | "saving";

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

type NormalizedRealtimeSegmentPayload = {
  text: string;
  rawText?: string;
  startMs?: number;
  endMs?: number;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  words?: LocalWordTiming[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function coerceBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function collectCandidateRecords(payload: unknown): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const traverse = (entry: unknown) => {
    if (Array.isArray(entry)) {
      entry.forEach((item) => traverse(item));
      return;
    }
    if (!isRecord(entry)) {
      return;
    }
    records.push(entry);
    const nested = (entry as { results?: unknown }).results;
    if (nested !== undefined) {
      traverse(nested);
    }
    const utterances = (entry as { utterances?: unknown }).utterances;
    if (utterances !== undefined) {
      traverse(utterances);
    }
    const alternatives = (entry as { alternatives?: unknown }).alternatives;
    if (alternatives !== undefined) {
      traverse(alternatives);
    }
  };
  traverse(payload);
  return records;
}

function pickFirstString(records: Array<Record<string, unknown>>, fields: string[]): string | undefined {
  for (const record of records) {
    for (const field of fields) {
      const value = (record as Record<string, unknown>)[field];
      if (isNonEmptyString(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function normalizeWordFromRecord(word: unknown): LocalWordTiming | null {
  if (!isRecord(word)) {
    return null;
  }
  const textCandidate =
    (word as { text?: unknown }).text ??
    (word as { word?: unknown }).word ??
    (word as { msg?: unknown }).msg;
  if (!isNonEmptyString(textCandidate)) {
    return null;
  }
  const startValue = pickTimestamp([word], ["startMs", "start_ms", "start", "start_at"]);
  const endValue = pickTimestamp([word], ["endMs", "end_ms", "end", "end_at"]);
  const durationValue = pickTimestamp([word], ["duration", "duration_ms", "durationMs"]);
  const normalizedStart = startValue !== undefined ? Math.max(0, Math.round(startValue)) : undefined;
  const normalizedEnd =
    endValue !== undefined
      ? Math.max(0, Math.round(endValue))
      : normalizedStart !== undefined && durationValue !== undefined
        ? Math.max(0, Math.round(normalizedStart + durationValue))
        : undefined;
  const startMs = normalizedStart ?? normalizedEnd ?? 0;
  const endMs = normalizedEnd ?? startMs;
  const confidenceValue = (word as { confidence?: unknown }).confidence;
  return {
    text: textCandidate,
    startMs,
    endMs,
    confidence: typeof confidenceValue === "number" ? confidenceValue : undefined,
  };
}

function collectWordTimings(records: Array<Record<string, unknown>>): LocalWordTiming[] | undefined {
  const collected: LocalWordTiming[] = [];
  for (const record of records) {
    const wordsField = (record as { words?: unknown }).words;
    if (Array.isArray(wordsField)) {
      for (const word of wordsField) {
        const normalized = normalizeWordFromRecord(word);
        if (normalized) {
          collected.push(normalized);
        }
      }
    }
  }
  if (!collected.length) {
    return undefined;
  }
  collected.sort((a, b) => a.startMs - b.startMs);
  return collected;
}

function normalizeRealtimeSegmentPayload(payload: unknown): NormalizedRealtimeSegmentPayload {
  const candidateRecords = collectCandidateRecords(payload);
  if (candidateRecords.length === 0) {
    candidateRecords.push({});
  }

  const textSources: string[] = [];
  for (const record of candidateRecords) {
    const candidates = [
      (record as { text?: unknown }).text,
      (record as { transcript?: unknown }).transcript,
      (record as { msg?: unknown }).msg,
    ];
    const text = candidates.find(isNonEmptyString);
    if (text) {
      textSources.push(text);
    }
  }
  const text = textSources.find((entry) => entry.length > 0) ?? "";

  const startValue = pickTimestamp(candidateRecords, [
    "startMs",
    "start_ms",
    "start",
    "start_at",
  ]);
  const endValue = pickTimestamp(candidateRecords, [
    "endMs",
    "end_ms",
    "end",
    "end_at",
  ]);
  const durationValue = pickTimestamp(candidateRecords, [
    "durationMs",
    "duration_ms",
    "duration",
  ]);

  const normalizedStart = startValue !== undefined ? Math.max(0, Math.round(startValue)) : undefined;
  const normalizedEnd =
    endValue !== undefined
      ? Math.max(0, Math.round(endValue))
      : normalizedStart !== undefined && durationValue !== undefined
        ? Math.max(0, Math.round(normalizedStart + durationValue))
        : undefined;

  const spk = pickFirstString(candidateRecords, ["spk", "speaker"]) ?? "0";
  const speakerLabel = pickFirstString(candidateRecords, ["speaker_label", "speaker_name"]);
  const language = pickFirstString(candidateRecords, ["language", "lang"]);
  const words = collectWordTimings(candidateRecords);
  const rawText =
    pickFirstString(candidateRecords, ["raw_text", "rawText"]) ||
    (words ? words.map((word) => word.text).join(" ") : undefined);

  return {
    text,
    rawText,
    startMs: normalizedStart,
    endMs: normalizedEnd,
    spk,
    speakerLabel,
    language,
    words,
  };
}

function pickTimestamp(
  records: Array<Record<string, unknown>>,
  fields: string[]
): number | undefined {
  for (const record of records) {
    for (const field of fields) {
      const value = coerceFiniteNumber((record as Record<string, unknown>)[field]);
      if (value !== undefined) {
        return value;
      }
    }
  }
  return undefined;
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

export default function RealtimeSessionPage() {
  const compactRealtimeLayout = useMediaQuery("(max-width: 959px), (hover: none) and (pointer: coarse)");
  const featureAvailability = derivePlatformFeatureAvailability(
    platformFeatureFlags,
    platformCapabilities
  );
  const { enqueueSnackbar } = useSnackbar();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
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
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [latencyStaleMs, setLatencyStaleMs] = useState<number | null>(null);
  const [runtimeSettingsOpen, setRuntimeSettingsOpen] = useState(false);
  const [streamingJsonEditorOpen, setStreamingJsonEditorOpen] = useState(false);
  const [runtimeStreamConfigOpen, setRuntimeStreamConfigOpen] = useState(false);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsState>(DEFAULT_RUNTIME_SETTINGS);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [activeTranscriptionId, setActiveTranscriptionId] = useState<string | null>(null);
  const summaryModeTouchedRef = useRef(false);
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
  const connectionUxStateRef = useRef(connectionUxState);
  const streamingBufferMetricsRef = useRef<StreamingBufferMetrics>({
    ...EMPTY_STREAMING_BUFFER_METRICS,
  });
  const suppressRecorderOnStopRef = useRef(false);
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
  const synthesizedSummaryState = useMemo(() => {
    const sessionId = activeTranscriptionId ?? "realtime-preview";
    const fallbackSelection = resolveSummaryPresetSelection({
      sessionId,
      turns: segments.slice(0, 6).map((segment) => ({
        id: segment.id,
        text: segment.text,
        speakerLabel: segment.speakerLabel,
      })),
      requestedMode: summarySurfaceMode === "off" ? "realtime" : summarySurfaceMode,
    });

    return {
      partitions: summaryState?.partitions ?? [],
      runs: summaryState?.runs ?? [],
      publishedSummaries: summaryState?.publishedSummaries ?? [],
      presetSelection: summaryState?.presetSelection ?? fallbackSelection,
    };
  }, [activeTranscriptionId, segments, summaryState, summarySurfaceMode]);
  const summarySurfaceView = useMemo(
    () =>
      buildSummarySurfaceView({
        mode: summarySurfaceMode,
        summaryState: synthesizedSummaryState,
        binding: summaryBinding,
      }),
    [summaryBinding, summarySurfaceMode, synthesizedSummaryState]
  );
  const handleSummaryModeChange = useCallback((mode: SummarySurfaceMode) => {
    summaryModeTouchedRef.current = true;
    setSummarySurfaceMode(mode);
  }, []);
  const handleSummaryToggle = useCallback(() => {
    summaryModeTouchedRef.current = true;
    setSummarySurfaceMode((prev) => (prev === "off" ? preferredSummaryMode : "off"));
  }, [preferredSummaryMode]);
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
  const sessionStateLabel = t(SESSION_STATE_LABEL_KEY[sessionState]);
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

    const payloadRecord = isRecord(payload) ? payload : ({} as Record<string, unknown>);
    const payloadType =
      typeof payloadRecord.type === "string"
        ? payloadRecord.type.toLowerCase()
        : undefined;
    const rawPartialField = (payloadRecord as { partial?: unknown }).partial;
    const finalFlag =
      coerceBooleanFlag((payloadRecord as { is_final?: unknown }).is_final) ??
      coerceBooleanFlag((payloadRecord as { final?: unknown }).final);
    const partialFlag =
      coerceBooleanFlag((payloadRecord as { is_partial?: unknown }).is_partial) ??
      coerceBooleanFlag(rawPartialField);
    const typeIndicatesFinal =
      payloadType === "final" || payloadType === "result" || payloadType === "transcript";
    const typeIndicatesPartial =
      payloadType === "partial" || payloadType === "intermediate" || payloadType === "hypothesis";
    const treatAsFinal = finalFlag !== undefined ? finalFlag : typeIndicatesFinal;
    const hasLoosePartial = partialFlag === undefined && Boolean(rawPartialField);
    const treatAsPartial =
      !treatAsFinal &&
      (partialFlag === true || finalFlag === false || typeIndicatesPartial || hasLoosePartial);

    if (payloadType === "error") {
      const message =
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : t("anErrorOccurredDuringStreaming");
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

    let normalizedPayload: NormalizedRealtimeSegmentPayload | null = null;
    const getNormalizedPayload = () => {
      if (!normalizedPayload) {
        normalizedPayload = normalizeRealtimeSegmentPayload(payload);
      }
      return normalizedPayload;
    };

    if (treatAsFinal) {
      const normalized = getNormalizedPayload();
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

    if (treatAsPartial) {
      const normalized = getNormalizedPayload();
      setPartialText(normalized.text);
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
      event as Event & { detail?: { code?: string } }
    ).detail?.code;
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

  const prepareSession = async (decoderConfig: Record<string, unknown>) => {
    sessionConnectedRef.current = false;
    connectionReadyRef.current = false;
    resetStreamingBufferMetrics();

    const recorder = new RecorderManager();
    recorderRef.current = recorder;
    const client = new RtzrStreamingClient();
    streamingClientRef.current = client;
    const sampleRate = extractSampleRateFromConfig(decoderConfig);

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

  const handleStartSession = async () => {
    if (sessionState !== "idle") {
      enqueueRealtimeSnackbar(t("thereIsRealTimeTranscriptionAlreadyUnderway"), { variant: "info" });
      return;
    }
    if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
      setErrorMessage(t("pleaseSetThePythonApiBaseUrlFirst"));
      enqueueRealtimeSnackbar(t("pleaseSetThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }

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
    streamingConfigRef.current = decoderConfig;

    const sampleRate = extractSampleRateFromConfig(decoderConfig);
    const backendSnapshot = await resolveBackendEndpointSnapshot(activeBackendPresetId);
    const modelName = extractModelNameFromConfig(decoderConfig);

    try {
      const record = await createLocalTranscription({
        title: `${t("realTimeTranscription")} ${formatLocalizedDateTime(new Date(), locale)} `,
        kind: "realtime",
        status: "processing",
        metadata: {
          processingStage: "recording",
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
    cameraShouldRecordRef.current = true;
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

    void prepareSession(decoderConfig).catch((error) => {
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
              cameraSupported={cameraSupported}
              cameraEnabled={cameraEnabled}
              onToggleCamera={handleToggleCamera}
              audioLevel={audioLevel}
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
          cameraSupported={cameraSupported}
          cameraEnabled={cameraEnabled}
          onToggleCamera={handleToggleCamera}
          audioLevel={audioLevel}
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
