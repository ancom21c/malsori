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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
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
import { RtzrStreamingClient } from "../services/api/rtzrStreamingClient";
import {
  RecorderManager,
  type RecorderChunkInfo,
} from "../services/audio/recorderManager";
import type { LocalWordTiming, PresetConfig } from "../data/app-db";
import { DEFAULT_STREAMING_PRESETS } from "../data/defaultPresets";
import TranscriptionConfigQuickOptions from "../components/TranscriptionConfigQuickOptions";
import BackendEndpointPresetSelector from "../components/BackendEndpointPresetSelector";
import { useAppPortalContainer } from "../hooks/useAppPortalContainer";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VideocamOffRoundedIcon from "@mui/icons-material/VideocamOffRounded";
import CameraswitchRoundedIcon from "@mui/icons-material/CameraswitchRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import { useUiStore } from "../store/uiStore";
import {
  extractModelNameFromConfig,
  resolveBackendEndpointSnapshot,
} from "../utils/transcriptionMetadata";
import { useI18n } from "../i18n";

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

const FALLBACK_STREAM_SAMPLE_RATE = 16000;
const VIDEO_CAPTURE_TIMESLICE_MS = 4000;
const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
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

const RUNTIME_SETTING_FIELDS: Array<{
  key: RuntimeSettingKey;
  label: string;
  placeholder?: string;
  helperText: string;
  step?: string;
}> = [
    {
      key: "maxUtterDuration",
      label: "max_utter_duration (초)",
      placeholder: "예: 12",
      helperText: "최대 발화 길이. 기본 12초, 값이 크면 긴 발화 하나로 처리됩니다.",
      step: "1",
    },
    {
      key: "noiseThreshold",
      label: "noise_threshold",
      placeholder: "예: 0.7",
      helperText: "백그라운드 노이즈 감지 임계값. 기본 0.7.",
      step: "0.01",
    },
    {
      key: "epdTime",
      label: "epd_time (초)",
      placeholder: "예: 0.5",
      helperText: "무음 감지 시간. 0.5~1.0초 추천.",
      step: "0.1",
    },
    {
      key: "activeThreshold",
      label: "active_threshold",
      placeholder: "예: 0.88",
      helperText: "음성 활성화 임계값. 기본 0.88.",
      step: "0.01",
    },
    {
      key: "acousticScale",
      label: "acoustic_scale",
      placeholder: "예: 1.0",
      helperText: "음향 모델 스케일링. Whisper 계열 미세 조정 시 사용.",
      step: "0.01",
    },
  ];

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
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const navigate = useNavigate();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const realtimeAutoSaveSeconds = useSettingsStore((state) => state.realtimeAutoSaveSeconds);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const defaultSpeakerName = useSettingsStore((state) => state.defaultSpeakerName);
  const setFloatingActionsVisible = useUiStore((state) => state.setFloatingActionsVisible);
  const streamingPresets = usePresets("streaming");
  const defaultStreamingPreset = useMemo<PresetConfig | undefined>(
    () => {
      const presets = streamingPresets ?? [];
      return presets.find((preset) => preset.isDefault) ?? presets[0];
    },
    [streamingPresets]
  );
  const fallbackStreamingConfig = useMemo(
    () => DEFAULT_STREAMING_PRESETS[0]?.configJson ?? "{}",
    []
  );

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const sessionStateRef = useRef<SessionState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [segments, setSegments] = useState<RealtimeSegment[]>([]);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeSettingsOpen, setRuntimeSettingsOpen] = useState(false);
  const [streamingJsonEditorOpen, setStreamingJsonEditorOpen] = useState(false);
  const [runtimeStreamConfigOpen, setRuntimeStreamConfigOpen] = useState(false);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsState>(DEFAULT_RUNTIME_SETTINGS);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
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
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
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

  sessionStateRef.current = sessionState;

  const sessionActive =
    sessionState === "recording" ||
    sessionState === "paused" ||
    sessionState === "connecting" ||
    sessionState === "countdown" ||
    sessionState === "stopping" ||
    sessionState === "saving";

  useEffect(() => {
    setFloatingActionsVisible(!sessionActive);
    return () => {
      setFloatingActionsVisible(true);
    };
  }, [sessionActive, setFloatingActionsVisible]);

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
      enqueueSnackbar(t("cameraRecordingFailed"), { variant: "error" });
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
      enqueueSnackbar(t("cameraRecordingFailed"), { variant: "error" });
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
      enqueueSnackbar(t("cameraRecordingFailed"), { variant: "error" });
    }
  }, [cameraEnabled, enqueueSnackbar, stopCameraStream, stopVideoRecorder, t]);

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
          audio: true,
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
    streamingClientRef.current?.disconnect();
    streamingClientRef.current = null;
    recorderRef.current = null;
    streamingConfigRef.current = null;
    transcriptionIdRef.current = null;
    segmentsRef.current = [];
    setSegments([]);
    setPartialText(null);
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
    setSessionState("idle");
  };

  const startAutosaveTimer = () => {
    clearAutosave();
    const intervalMs = Math.max(1, realtimeAutoSaveSeconds) * 1000;
    autosaveTimerRef.current = window.setInterval(() => {
      const id = transcriptionIdRef.current;
      if (!id) return;
      const duration = sessionStartRef.current ? Date.now() - sessionStartRef.current : undefined;
      void updateLocalTranscription(id, {
        durationMs: duration,
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

    streamingClientRef.current?.sendAudioChunk(buffer);
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
      enqueueSnackbar(message, { variant: "error" });
      stopSession(true);
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
        id: `${Date.now()}-${segmentsRef.current.length}`,
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
    }
  };

  const handleStreamingMessage = (event: MessageEvent) => {
    void processStreamingMessage(event);
  };

  const handleStreamingError = (event: Event) => {
    console.error(t("streamingError"), event);
    if (finalizingRef.current) return;
    setErrorMessage(t("aStreamingErrorOccurredTheConnectionIsBeingRestored"));
    enqueueSnackbar(t("aStreamingErrorOccurredTryReconnecting"), {
      variant: "warning",
    });
  };

  const prepareSession = async (decoderConfig: Record<string, unknown>) => {
    sessionConnectedRef.current = false;
    connectionReadyRef.current = false;

    const recorder = new RecorderManager();
    recorderRef.current = recorder;
    const client = new RtzrStreamingClient();
    streamingClientRef.current = client;
    const sampleRate = extractSampleRateFromConfig(decoderConfig);

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
      onReconnectAttempt: (attempt) => {
        enqueueSnackbar(t("attemptingToReconnectToStreaming", { values: { attempt } }), {
          variant: "warning",
        });
        if (countdownFinishedRef.current) {
          setSessionState("connecting");
        }
      },
      onOpen: () => {
        sessionConnectedRef.current = true;
        connectionReadyRef.current = true;
        if (countdownFinishedRef.current) {
          setSessionState("recording");
          startAutosaveTimer();
          setErrorMessage(null);
        }
      },
      onClose: (event) => {
        if (finalizingRef.current) return;
        if (sessionStateRef.current === "stopping") {
          void finalizeSession(false);
          return;
        }
        const reason = event.reason || t("yourStreamingConnectionHasEnded");
        setErrorMessage(reason);
        enqueueSnackbar(reason, { variant: "error" });
        stopSession(true);
      },
      onPermanentFailure: (event) => {
        if (finalizingRef.current) return;
        const message =
          event instanceof CloseEvent
            ? event.reason || t("yourStreamingSessionHasEnded")
            : t("aFatalErrorOccurredInYourStreamingSession");
        setErrorMessage(message);
        enqueueSnackbar(message, { variant: "error" });
      },
    });

    try {
      await recorder.start({
        targetSampleRate: sampleRate,
        chunkMillis: 800,
        onChunk: handleAudioChunk,
        onError: (error) => {
          console.error(t("recordingError"), error);
          setErrorMessage(error.message ?? t("anErrorOccurredDuringRecording"));
          enqueueSnackbar(t("aRecordingErrorOccurred"), { variant: "error" });
          stopSession(true);
        },
        onStop: () => {
          if (sessionStateRef.current === "stopping") {
            // Wait for socket close or safety timer
            return;
          }
          void finalizeSession(finalizeReasonRef.current === "aborted");
        },
      });
    } catch (error) {
      console.error(t("failedToStartRecording"), error);
      setErrorMessage(
        error instanceof Error ? error.message : t("yourMicrophoneDeviceCannotBeUsed")
      );
      enqueueSnackbar(t("yourMicrophoneDeviceCannotBeUsed"), { variant: "error" });
      stopSession(true);
    }
  };

  const finalizeSession = async (aborted: boolean) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    clearCountdown();
    clearAutosave();
    clearStopSafetyTimer();
    streamingClientRef.current?.disconnect();
    streamingClientRef.current = null;
    const id = transcriptionIdRef.current;
    const shouldDiscard = aborted && !sessionConnectedRef.current;
    if (sessionState !== "saving") {
      setSessionState("saving");
    }

    const duration = sessionStartRef.current ? Date.now() - sessionStartRef.current : undefined;

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
          transcriptText,
          durationMs: duration,
          errorMessage: aborted ? errorMessage ?? t("theSessionHasBeenAborted") : undefined,
        });
      }
    } catch (error) {
      console.error(t("realTimeTranscriptionSaveFailure"), error);
    }

    const navigateId = id;
    resetSessionState();
    if (shouldDiscard) {
      enqueueSnackbar(t("theSessionHasBeenAborted"), { variant: "warning" });
      return;
    }
    if (navigateId) {
      navigate(`/transcriptions/${navigateId}`);
    }
    if (aborted) {
      enqueueSnackbar(t("realTimeTranscriptionWasInterruptedAndTheResultsWereTemporarilyStored"), {
        variant: "warning",
      });
    } else {
      enqueueSnackbar(t("realTimeTranscriptionResultsAreSaved"), { variant: "success" });
    }
  };

  const stopSession = (aborted: boolean) => {
    if (sessionState === "idle" || sessionState === "saving" || sessionState === "stopping") return;
    finalizeReasonRef.current = aborted ? "aborted" : "normal";
    cameraShouldRecordRef.current = false;
    void stopVideoRecorder();
    if (sessionState === "countdown") {
      clearCountdown();
      finalizeReasonRef.current = "aborted";
      if (recorderRef.current) {
        recorderRef.current.stop();
      } else {
        void finalizeSession(true);
      }
      return;
    }
    if (!aborted) {
      setSessionState("stopping");

      // If we have partial text, we should wait for the final result
      if (partialText) {
        waitingForFinalRef.current = true;
        streamingClientRef.current?.requestFinal();

        // Safety timer: if final doesn't come within 3 seconds, force stop
        stopSafetyTimerRef.current = window.setTimeout(() => {
          if (sessionStateRef.current === "stopping") {
            waitingForFinalRef.current = false;
            void finalizeSession(false);
          }
        }, 3000);
        return;
      }

      streamingClientRef.current?.requestFinal();
      // Safety timer in case server doesn't close connection
      stopSafetyTimerRef.current = window.setTimeout(() => {
        if (sessionStateRef.current === "stopping") {
          void finalizeSession(false);
        }
      }, 3000);
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
    } else {
      if (aborted) {
        void finalizeSession(true);
      }
    }
  };

  stopSessionRef.current = stopSession;

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
      enqueueSnackbar(t("thereIsRealTimeTranscriptionAlreadyUnderway"), { variant: "info" });
      return;
    }
    if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
      setErrorMessage(t("pleaseSetThePythonApiBaseUrlFirst"));
      enqueueSnackbar(t("pleaseSetThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }

    let decoderConfig: Record<string, unknown>;
    const trimmedRequest = streamingRequestJson?.trim() ?? "";
    const configString =
      trimmedRequest.length > 0
        ? trimmedRequest
        : activeStreamingPreset?.configJson ??
        defaultStreamingPreset?.configJson ??
        fallbackStreamingConfig;
    try {
      decoderConfig = JSON.parse(configString);
    } catch (error) {
      console.error(t("streamingSettingsJsonParsingFailure"), error);
      setErrorMessage(t("pleaseCheckTheStreamingSettingsJson"));
      enqueueSnackbar(t("streamingSettingsJsonIsInvalid"), { variant: "error" });
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
        title: `${t("realTimeTranscription")} ${new Date().toLocaleString()}`,
        kind: "realtime",
        status: "processing",
        metadata: {
          configPresetId: activeStreamingPreset?.id ?? undefined,
          configPresetName: activeStreamingPreset?.name ?? undefined,
          modelName,
          backendEndpointId: backendSnapshot.id,
          backendEndpointName: backendSnapshot.name,
          backendEndpointSource: backendSnapshot.source,
          backendDeployment: backendSnapshot.deployment,
          backendApiBaseUrl: backendSnapshot.apiBaseUrl,
        },
      });
      transcriptionIdRef.current = record.id;
      await updateLocalTranscription(record.id, {
        audioSampleRate: sampleRate,
        audioChannels: 1,
      });
      videoChunkIndexRef.current = 0;
    } catch (error) {
      console.error(t("localTranscriptionRecordCreationFailed"), error);
      setErrorMessage(t("localTranscriptionRecordsCannotBeCreated"));
      enqueueSnackbar(t("localTranscriptionRecordsCannotBeCreated"), { variant: "error" });
      return;
    }

    sessionStartRef.current = Date.now();
    segmentsRef.current = [];
    setSegments([]);
    setPartialText(null);
    chunkIndexRef.current = 0;
    cameraShouldRecordRef.current = true;
    // Video recording will be triggered by useEffect when state becomes "recording"
    setErrorMessage(null);
    finalizeReasonRef.current = "normal";
    countdownFinishedRef.current = false;

    setCountdown(3);
    setSessionState("countdown");
    setRuntimeSettingsOpen(false);

    void prepareSession(decoderConfig);

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
    if (segments.length === 0 && !partialText) {
      return;
    }
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments, partialText]);

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

  const formatTimeRange = (segment: RealtimeSegment) => {
    const start = (segment.startMs / 1000).toFixed(1);
    const end = (segment.endMs / 1000).toFixed(1);
    return `${start}s ~ ${end}s`;
  };

  const mainButtonDisabled = sessionState === "countdown" || sessionState === "saving" || sessionState === "stopping";
  const mainButtonLabel = (() => {
    switch (sessionState) {
      case "idle":
        return t("startSession");
      case "recording":
        return t("pause");
      case "paused":
        return t("resumption");
      case "saving":
        return t("saving");
      case "stopping":
        return t("stopping");
      case "connecting":
        return t("connecting");
      case "countdown":
        return t("readyToStartS", {
          values: { seconds: Math.max(countdown, 0) },
        });
      default:
        return t("sessionControl");
    }
  })();
  const mainButtonIcon = (() => {
    switch (sessionState) {
      case "idle":
        return <MicNoneRoundedIcon />;
      case "recording":
        return <PauseRoundedIcon />;
      case "paused":
        return <PlayArrowRoundedIcon />;
      case "connecting":
      case "countdown":
        return <HourglassBottomIcon />;
      case "saving":
      case "stopping":
        return <CircularProgress size={24} color="inherit" thickness={5} />;
      default:
        return <MicNoneRoundedIcon />;
    }
  })();
  const mainButtonColor: "primary" | "secondary" | "success" =
    sessionState === "recording" || sessionState === "paused"
      ? "secondary"
      : sessionState === "saving" || sessionState === "stopping"
        ? "success"
        : "primary";
  const mainButtonTooltip = (() => {
    if (sessionState === "recording") {
      return t("tapToPausePressAndHoldFor3SecondsToEndTheSession");
    }
    if (sessionState === "paused") {
      return t("tapToResumeTranscription");
    }
    if (sessionState === "connecting") {
      return t("sessionEnds");
    }
    if (sessionState === "idle") {
      return t("realTimeTranscriptionBeginsAfterA3SecondCountdown");
    }
    if (sessionState === "saving" || sessionState === "stopping") {
      return t("savingResults");
    }
    return t("preparingForSession");
  })();
  const showStopFab =
    sessionState === "paused" ||
    sessionState === "recording" ||
    sessionState === "connecting" ||
    sessionState === "countdown";

  const handleStopFabClick = () => {
    const shouldAbort = sessionState === "connecting" || sessionState === "countdown";
    stopSession(shouldAbort ? true : false);
  };

  const handleToggleCamera = () => {
    if (!cameraSupported) {
      setCameraError(t("cameraNotSupported"));
      enqueueSnackbar(t("cameraNotSupported"), { variant: "info" });
      return;
    }
    setCameraEnabled((prev) => !prev);
  };

  const handleSwitchCamera = () => {
    setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const showVideoSection = cameraEnabled || cameraLoading;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          overflow: "hidden",
          position: "relative",
          bgcolor: "background.default",
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: "calc(12px + env(safe-area-inset-top))",
            right: { xs: 12, sm: 16 },
            zIndex: (theme) => theme.zIndex.modal + 3,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Chip label={`${t("status")}: ${t(SESSION_STATE_LABEL_KEY[sessionState])}`} color="primary" />
          {sessionState === "countdown" && (
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
              {countdown}
            </Typography>
          )}
        </Box>

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
          {/* Fixed Video Section */}
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
                            maxHeight: "100vh",
                            marginLeft: 0,
                            marginRight: "auto",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            display: cameraEnabled ? "none" : "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "text.secondary",
                            textAlign: "center",
                            p: 2,
                            backgroundColor: (theme) => theme.palette.action.hover,
                          }}
                        >
                          <Typography variant="body2">{t("cameraPreview")}</Typography>
                        </Box>
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

          {/* Scrollable Transcript Section */}
          <Box
            sx={{
              flex: "1 1 auto",
              overflowY: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              // Add padding at bottom for floating buttons + safe area
              pb: "calc(100px + env(safe-area-inset-bottom))",
              minHeight: 0,
              "@media (orientation: landscape)": showVideoSection
                ? {
                  pr: 2,
                  pl: 1,
                }
                : undefined,
            }}
          >
            <Card sx={{ minHeight: "100%" }}>
              {!sessionActive && (
                <CardHeader
                  title={t("realTimeTranscription")}
                  subheader={t("startRecordingAfterA3SecondCountdownAndCheckThePartialFinalResultsInRealTime")}
                />
              )}
              {sessionState !== "idle" && <LinearProgress />}
              <CardContent>
                <Stack spacing={2}>
                  {!sessionActive && (
                    <Typography variant="body2" color="text.secondary">
                      {t("currentlySelectedStreamingSetting", {
                        values: {
                          name: activeStreamingPreset?.name ?? defaultStreamingPreset?.name ?? t("defaultSettings"),
                        },
                      })}
                      {activeStreamingPreset?.description
                        ? ` – ${activeStreamingPreset.description}`
                        : ""}
                      <br />
                      {t("automaticTemporaryStorageCycleSeconds", {
                        values: { seconds: realtimeAutoSaveSeconds },
                      })}
                    </Typography>
                  )}
                  {!apiBaseUrl.trim() && (
                    <Alert severity="warning">
                      {t("pleaseEnterThePythonApiBaseUrlOnTheSettingsPage")}
                    </Alert>
                  )}
                  {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                  <Divider />
                  {segments.length === 0 && sessionState === "idle" && (
                    <Typography variant="body1" color="text.secondary">
                      {t("whenYouStartASessionRecognizedSentencesWillAppearInThisAreaInOrder")}
                    </Typography>
                  )}
                  {segments.length > 0 && (
                    <Stack spacing={1.5}>
                      {segments.map((segment) => (
                        <Card key={segment.id} variant="outlined">
                          <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                              <Chip label={formatTimeRange(segment)} color="success" size="small" />
                            </Stack>
                            <Typography variant="body1">{segment.text}</Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                  {partialText && (
                    <Card variant="outlined" sx={{ borderColor: "secondary.light" }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Chip label={t("realTimeRecognition")} color="secondary" size="small" />
                        </Stack>
                        <Typography variant="body1" color="secondary.main">
                          {partialText}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                  <Box ref={transcriptEndRef} sx={{ height: 1 }} />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Floating Settings Button */}
      {!sessionActive && (
        <Box
          sx={{
            position: "fixed",
            bottom: "calc(16px + env(safe-area-inset-bottom))",
            left: { xs: 16, sm: 32 },
            zIndex: (theme) => theme.zIndex.modal + 1,
          }}
        >
          <Tooltip
            title={runtimeSettingsOpen ? t("closeSettings") : t("openRealTimeTranscriptionSettings")}
            placement="right"
          >
            <Fab
              size="small"
              color={runtimeSettingsOpen ? "secondary" : "default"}
              onClick={() => {
                runtimeSettingsFabRef.current?.blur();
                setRuntimeSettingsOpen((prev) => !prev);
              }}
              aria-label={runtimeSettingsOpen ? t("closeStreamingSettings") : t("openStreamingSettings")}
              ref={runtimeSettingsFabRef}
            >
              <SettingsRoundedIcon />
            </Fab>
          </Tooltip>
        </Box>
      )}

      {/* Floating Main Controls */}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(16px + env(safe-area-inset-bottom))",
          display: "flex",
          justifyContent: "center",
          zIndex: (theme) =>
            sessionState === "countdown"
              ? theme.zIndex.modal + 3
              : theme.zIndex.modal + 1,
          pointerEvents: "none",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ pointerEvents: "auto", flexWrap: "wrap", justifyContent: "center" }}>
          <Tooltip title={mainButtonTooltip}>
            <span>
              <Fab
                variant="extended"
                color={mainButtonColor}
                size="large"
                disabled={mainButtonDisabled}
                onClick={handleMainButtonClick}
                onPointerDown={handleMainButtonPointerDown}
                onPointerUp={clearMainButtonPointerState}
                onPointerLeave={clearMainButtonPointerState}
                onPointerCancel={clearMainButtonPointerState}
                aria-label={mainButtonLabel}
                sx={{
                  px: { xs: 4, sm: 6 },
                  minWidth: { xs: 220, sm: 280 },
                  fontWeight: 700,
                  fontSize: { xs: "1rem", sm: "1.05rem" },
                  boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
                }}
              >
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {mainButtonIcon}
                  <Box component="span" sx={{ lineHeight: 1 }}>
                    {mainButtonLabel}
                  </Box>
                </Box>
              </Fab>
            </span>
          </Tooltip>
          {showStopFab && (
            <Tooltip title={t("sessionEnds")}>
              <Fab
                color="error"
                aria-label={t("sessionEnds")}
                onClick={handleStopFabClick}
                sx={{
                  boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
                }}
              >
                <StopCircleIcon />
              </Fab>
            </Tooltip>
          )}
          <Tooltip title={cameraEnabled ? t("disableCamera") : t("enableCamera")}>
            <span>
              <Fab
                color={cameraEnabled ? "secondary" : "default"}
                size="medium"
                onClick={handleToggleCamera}
                disabled={cameraLoading || !cameraSupported}
                aria-label={cameraEnabled ? t("disableCamera") : t("enableCamera")}
                sx={{ boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
              >
                {cameraEnabled ? <VideocamOffRoundedIcon /> : <VideocamRoundedIcon />}
              </Fab>
            </span>
          </Tooltip>
          <Tooltip
            title={
              cameraFacingMode === "user" ? t("switchToRearCamera") : t("switchToFrontCamera")
            }
          >
            <span>
              <Fab
                color="default"
                size="medium"
                onClick={handleSwitchCamera}
                disabled={!cameraEnabled || cameraLoading}
                aria-label={cameraFacingMode === "user" ? t("switchToRearCamera") : t("switchToFrontCamera")}
                sx={{ boxShadow: "0 12px 32px rgba(0,0,0,0.2)" }}
              >
                <CameraswitchRoundedIcon />
              </Fab>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {/* Countdown Overlay */}
      {sessionState === "countdown" && countdown > 0 ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0, 0, 0, 0.6)",
            zIndex: (theme) => theme.zIndex.modal + 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "common.white",
            textAlign: "center",
          }}
        >
          <Typography
            component="div"
            sx={{
              fontSize: {
                xs: "26vw",
                sm: "22vw",
                md: "18vw",
              },
              fontWeight: 700,
              lineHeight: 1,
              textShadow: "0 8px 24px rgba(0,0,0,0.45)",
            }}
            aria-live="assertive"
          >
            {countdown}
          </Typography>
        </Box>
      ) : null}

      {/* Settings Dialog */}
      <Dialog
        open={runtimeSettingsOpen}
        onClose={() => setRuntimeSettingsOpen(false)}
        fullWidth
        maxWidth="md"
        slotProps={{
          root: {
            container: portalContainer ?? undefined,
            disableRestoreFocus: true,
          },
        }}
      >
        <DialogTitle>{t("streamTranscriptionSettings")}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("streamingTranscriptionPresets")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("youCanInstantlySelectSettingsToUseInYourLiveSessionOrFineTuneThemInJson")}
              </Typography>
              {!streamingPresets?.length ? (
                <Alert severity="info" variant="outlined">
                  {t("pleaseAddStreamingPresetsInSettingsManageTranscriptionSettings")}
                </Alert>
              ) : (
                <List
                  dense
                  disablePadding
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  {streamingPresets.map((preset) => (
                    <ListItemButton
                      key={preset.id}
                      selected={activeStreamingPreset?.id === preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                    >
                      <ListItemText
                        primary={preset.name}
                        secondary={preset.description || undefined}
                        primaryTypographyProps={{
                          fontWeight: activeStreamingPreset?.id === preset.id ? 700 : 500,
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {t("youCanAddEditPresetsOnTheSettingsPage")}
              </Typography>
            </Box>
            <TranscriptionConfigQuickOptions
              type="streaming"
              configJson={streamingRequestJson}
              onChange={setStreamingRequestJson}
              collapsible
            />
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => setStreamingJsonEditorOpen((prev) => !prev)}
              >
                {streamingJsonEditorOpen ? t("hideJson") : t("editJsonDirectly")}
              </Button>
              <Collapse in={streamingJsonEditorOpen} sx={{ mt: 1 }}>
                <TextField
                  multiline
                  minRows={10}
                  fullWidth
                  label="Runtime RequestConfig"
                  value={streamingRequestJson}
                  onChange={(event) => setStreamingRequestJson(event.target.value)}
                  helperText={t("editTheEntireJsonDirectlyToImmediatelyReflectTheOptionsYouNeed")}
                  InputProps={{
                    sx: { fontFamily: "Menlo, Consolas, monospace" },
                  }}
                />
              </Collapse>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("apiEndpointPresets")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("immediatelySwitchesTheSttServerEndpointThatThePythonApiWillConnectTo")}
              </Typography>
              <BackendEndpointPresetSelector />
            </Box>
            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
                    RuntimeStreamConfig (WebSocket 적용)
                  </Typography>
                  {!runtimeStreamConfigOpen && (
                    <Typography variant="body2" color="text.secondary">
                      {t("youCanAlsoPassGrpcRuntimestreamconfigValuesToWebsocketSessions")}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setRuntimeStreamConfigOpen((prev) => !prev)}
                >
                  {runtimeStreamConfigOpen ? t("hideSettings") : t("viewSettings")}
                </Button>
              </Stack>
              <Collapse in={runtimeStreamConfigOpen} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t(
                    "gRPC proto(vito-stt-client.proto)에 정의된 RuntimeStreamConfig 값을 WebSocket 세션에도 전달합니다. 입력을 비워두면 해당 필드는 제외됩니다."
                  )}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg: "repeat(auto-fit, minmax(160px, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  {RUNTIME_SETTING_FIELDS.map((field) => (
                    <TextField
                      key={field.key}
                      type="number"
                      label={t(field.label)}
                      fullWidth
                      value={runtimeSettings[field.key]}
                      onChange={(event) => handleRuntimeSettingChange(field.key, event.target.value)}
                      placeholder={field.placeholder ? t(field.placeholder) : undefined}
                      helperText={field.helperText ? t(field.helperText) : undefined}
                      inputProps={{ step: field.step ?? "0.1" }}
                    />
                  ))}
                </Box>
              </Collapse>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuntimeSettingsOpen(false)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
