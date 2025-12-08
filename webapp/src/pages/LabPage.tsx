import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  FormHelperText,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useSnackbar } from "notistack";
import { useI18n } from "../i18n";
import { useSettingsStore } from "../store/settingsStore";
import { RtzrStreamingClient } from "../services/api/rtzrStreamingClient";
import type { StreamingConnectionState } from "../services/api/rtzrStreamingClient";
import { usePresets } from "../hooks/usePresets";
import { DEFAULT_STREAMING_PRESETS } from "../data/defaultPresets";

type UploadState = "idle" | "preparing" | "streaming" | "finished" | "error";

type StreamingSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  speakerLabel?: string;
  language?: string;
};

type NormalizedRealtimeSegmentPayload = {
  text: string;
  startMs?: number;
  endMs?: number;
  spk?: string;
  speakerLabel?: string;
  language?: string;
  words?: Array<{ startMs: number; endMs: number }>;
};

const SIMULATION_CHUNK_MS = 160;
const BURST_CHUNK_MS = 400;

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

function pickTimestamp(records: Array<Record<string, unknown>>, fields: string[]): number | undefined {
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

function normalizeWordFromRecord(word: unknown): { startMs: number; endMs: number } | null {
  if (!isRecord(word)) {
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
  return { startMs, endMs };
}

function collectWordTimings(records: Array<Record<string, unknown>>): Array<{ startMs: number; endMs: number }> | undefined {
  const collected: Array<{ startMs: number; endMs: number }> = [];
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

  const startValue = pickTimestamp(candidateRecords, ["startMs", "start_ms", "start", "start_at"]);
  const endValue = pickTimestamp(candidateRecords, ["endMs", "end_ms", "end", "end_at"]);
  const durationValue = pickTimestamp(candidateRecords, ["durationMs", "duration_ms", "duration"]);

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

  return {
    text,
    startMs: normalizedStart,
    endMs: normalizedEnd,
    spk,
    speakerLabel,
    language,
    words,
  };
}

function extractSampleRateFromConfig(config: Record<string, unknown>, fallback = 16000): number {
  const maybeSampleRate =
    typeof (config as { sample_rate?: unknown }).sample_rate === "number"
      ? (config as { sample_rate: number }).sample_rate
      : typeof (config as { sampleRate?: unknown }).sampleRate === "number"
        ? (config as { sampleRate: number }).sampleRate
        : undefined;
  if (typeof maybeSampleRate === "number" && Number.isFinite(maybeSampleRate) && maybeSampleRate > 0) {
    return Math.floor(maybeSampleRate);
  }
  return fallback;
}

async function decodeFileToPcm(file: File, targetSampleRate: number) {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : null;

  if (!AudioContextClass) {
    throw new Error("AudioContext is not available in this environment.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContextClass({ sampleRate: targetSampleRate });
  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void audioContext.close();
  }

  let buffer = decoded;
  if (Math.abs(decoded.sampleRate - targetSampleRate) > 1) {
    const OfflineContextClass =
      typeof window !== "undefined"
        ? window.OfflineAudioContext ||
        (window as typeof window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
        : null;
    if (OfflineContextClass) {
      const frameCount = Math.ceil(decoded.duration * targetSampleRate);
      const offlineContext = new OfflineContextClass(1, frameCount, targetSampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = decoded;
      source.connect(offlineContext.destination);
      source.start(0);
      buffer = await offlineContext.startRendering();
    }
  }

  const channelCount = buffer.numberOfChannels || 1;
  const length = buffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channelCount; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i];
    }
  }
  if (channelCount > 1) {
    for (let i = 0; i < mono.length; i++) {
      mono[i] /= channelCount;
    }
  }

  const pcm = new Int16Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const clamped = Math.max(-1, Math.min(1, mono[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const durationMs = Math.round((pcm.length / buffer.sampleRate) * 1000);

  return { pcm, sampleRate: buffer.sampleRate, durationMs };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMs(ms?: number) {
  if (ms === undefined || Number.isNaN(ms)) {
    return "";
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function LabPage() {
  const { t } = useI18n();
  const { enqueueSnackbar } = useSnackbar();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const defaultSpeakerName = useSettingsStore((state) => state.defaultSpeakerName);
  const streamingPresets = usePresets("streaming");
  const fallbackStreamingConfig = useMemo(
    () => DEFAULT_STREAMING_PRESETS[0]?.configJson ?? "{}",
    []
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [configJson, setConfigJson] = useState(fallbackStreamingConfig);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [connectionState, setConnectionState] = useState<StreamingConnectionState>("idle");
  const [progress, setProgress] = useState(0);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [segments, setSegments] = useState<StreamingSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null);

  const pcmDataRef = useRef<Int16Array | null>(null);
  const audioSampleRateRef = useRef<number>(16000);
  const streamingClientRef = useRef<RtzrStreamingClient | null>(null);
  const cancelRef = useRef(false);
  const sendingRef = useRef(false);
  const segmentsRef = useRef<StreamingSegment[]>([]);
  const simulationFlagRef = useRef(false);
  const uploadStateRef = useRef<UploadState>("idle");

  useEffect(() => {
    if (!streamingPresets || streamingPresets.length === 0) {
      setSelectedPresetId(null);
      setConfigJson(fallbackStreamingConfig);
      return;
    }
    setSelectedPresetId((prev) => {
      if (prev && streamingPresets.some((preset) => preset.id === prev)) {
        return prev;
      }
      const fallback = streamingPresets.find((preset) => preset.isDefault) ?? streamingPresets[0];
      return fallback?.id ?? null;
    });
  }, [streamingPresets, fallbackStreamingConfig]);

  useEffect(() => {
    if (!streamingPresets || streamingPresets.length === 0) {
      setConfigJson(fallbackStreamingConfig);
      return;
    }
    const preset =
      streamingPresets.find((entry) => entry.id === selectedPresetId) ??
      streamingPresets.find((entry) => entry.isDefault) ??
      streamingPresets[0];
    setConfigJson(preset?.configJson ?? fallbackStreamingConfig);
  }, [selectedPresetId, streamingPresets, fallbackStreamingConfig]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      streamingClientRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    uploadStateRef.current = uploadState;
  }, [uploadState]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleStreamingMessage = (event: MessageEvent) => {
    if (!event.data) return;
    let payload: unknown = event.data;
    try {
      payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    const payloadRecord = isRecord(payload) ? payload : ({} as Record<string, unknown>);
    const payloadType =
      typeof payloadRecord.type === "string" ? payloadRecord.type.toLowerCase() : undefined;
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
      setError(message);
      setUploadState("error");
      enqueueSnackbar(message, { variant: "error" });
      return;
    }

    const normalized = normalizeRealtimeSegmentPayload(payload);
    if (treatAsFinal) {
      const words = normalized.words && normalized.words.length > 0 ? normalized.words : undefined;
      const fallbackStart = words?.[0]?.startMs;
      const fallbackEnd = words?.[words.length - 1]?.endMs;
      const startMs = normalized.startMs ?? fallbackStart ?? 0;
      const endMs = normalized.endMs ?? fallbackEnd ?? startMs;

      let speakerLabel = normalized.speakerLabel;
      if (normalized.spk === "0" && !speakerLabel) {
        speakerLabel = defaultSpeakerName;
      }

      const nextSegment: StreamingSegment = {
        id: `${Date.now()}-${segmentsRef.current.length}`,
        text: normalized.text,
        startMs,
        endMs,
        speakerLabel,
        language: normalized.language,
      };
      segmentsRef.current = [...segmentsRef.current, nextSegment];
      setSegments([...segmentsRef.current]);
      setPartialText(null);
      return;
    }

    if (treatAsPartial) {
      setPartialText(normalized.text);
    }
  };

  const sendPcmData = async () => {
    if (sendingRef.current) return;
    const pcm = pcmDataRef.current;
    const client = streamingClientRef.current;
    if (!pcm || !client) return;
    sendingRef.current = true;
    const simulation = simulationFlagRef.current;
    const sampleRate = audioSampleRateRef.current || 16000;
    const chunkMs = simulation ? SIMULATION_CHUNK_MS : BURST_CHUNK_MS;
    const chunkSize = Math.max(1, Math.round((sampleRate * chunkMs) / 1000));
    let sent = 0;

    for (let offset = 0; offset < pcm.length && !cancelRef.current; offset += chunkSize) {
      const chunk = pcm.subarray(offset, Math.min(offset + chunkSize, pcm.length));
      client.sendAudioChunk(chunk);
      sent += chunk.length;
      setProgress(Math.round((sent / pcm.length) * 100));

      if (simulation) {
        const waitFor = Math.max(100, Math.min(200, Math.round((chunk.length / sampleRate) * 1000)));
        await sleep(waitFor);
      }
    }

    if (!cancelRef.current) {
      client.requestFinal();
      setUploadState("finished");
    }
    sendingRef.current = false;
  };

  const handleStartUpload = async () => {
    if (uploadState === "preparing" || uploadState === "streaming") {
      return;
    }
    if (!apiBaseUrl || apiBaseUrl.trim().length === 0) {
      setError(t("pleaseSetThePythonApiBaseUrlFirst"));
      enqueueSnackbar(t("pleaseSetThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }
    if (!selectedFile) {
      setError(t("thereAreNoFilesSelected"));
      enqueueSnackbar(t("thereAreNoFilesSelected"), { variant: "info" });
      return;
    }

    let decoderConfig: Record<string, unknown>;
    const normalizedJson = configJson?.trim() ?? "";
    try {
      decoderConfig = JSON.parse(normalizedJson || fallbackStreamingConfig);
    } catch (parseError) {
      console.error("Failed to parse streaming config", parseError);
      setError(t("settingsJsonMustBeInObjectForm"));
      enqueueSnackbar(t("settingsJsonMustBeInObjectForm"), { variant: "error" });
      return;
    }

    cancelRef.current = false;
    setError(null);
    setProgress(0);
    setPartialText(null);
    setSegments([]);
    segmentsRef.current = [];
    simulationFlagRef.current = simulationEnabled;
    setUploadState("preparing");
    setConnectionState("connecting");

    const desiredSampleRate = extractSampleRateFromConfig(decoderConfig);
    let resolvedDurationMs: number | null = null;
    try {
      const audioData = await decodeFileToPcm(selectedFile, desiredSampleRate);
      pcmDataRef.current = audioData.pcm;
      audioSampleRateRef.current = audioData.sampleRate;
      decoderConfig.sample_rate = audioData.sampleRate;
      resolvedDurationMs = audioData.durationMs;
      setAudioDurationMs(audioData.durationMs);
    } catch (decodeError) {
      console.error("Failed to decode file for streaming", decodeError);
      setUploadState("error");
      setConnectionState("error");
      const message =
        decodeError instanceof Error ? decodeError.message : t("anErrorOccurredDuringStreaming");
      setError(message);
      enqueueSnackbar(message, { variant: "error" });
      return;
    }

    streamingClientRef.current?.disconnect();
    const client = new RtzrStreamingClient();
    streamingClientRef.current = client;

    client.connect({
      baseUrl: apiBaseUrl,
      decoderConfig,
      metadata: {
        filename: selectedFile.name,
        file_size: selectedFile.size,
        simulation: simulationEnabled,
        duration_ms: resolvedDurationMs ?? undefined,
      },
      reconnectAttempts: 0,
      onMessage: handleStreamingMessage,
      onOpen: () => {
        setConnectionState("open");
        setUploadState("streaming");
        void sendPcmData();
      },
      onError: (event) => {
        if (cancelRef.current) return;
        console.error("Streaming error", event);
        setUploadState("error");
        setConnectionState("error");
        setError(t("aStreamingErrorOccurredTryReconnecting"));
        enqueueSnackbar(t("aStreamingErrorOccurredTryReconnecting"), { variant: "warning" });
      },
      onClose: (event) => {
        if (cancelRef.current) {
          setConnectionState("closed");
          return;
        }
        const state = uploadStateRef.current;
        const reason = event.reason || t("yourStreamingSessionHasEnded");
        setConnectionState("closed");
        if (state !== "finished") {
          setError(reason);
          enqueueSnackbar(reason, { variant: "info" });
        }
      },
      onPermanentFailure: (event) => {
        if (cancelRef.current) return;
        console.error("Streaming fatal failure", event);
        setUploadState("error");
        setConnectionState("error");
        const reason =
          event instanceof CloseEvent
            ? event.reason || t("aFatalErrorOccurredInYourStreamingSession")
            : t("aFatalErrorOccurredInYourStreamingSession");
        setError(reason);
        enqueueSnackbar(reason, { variant: "error" });
      },
    });
  };

  const handleStopUpload = () => {
    cancelRef.current = true;
    streamingClientRef.current?.disconnect();
    setUploadState("idle");
    setConnectionState("idle");
    setProgress(0);
  };

  const presetOptions = useMemo(
    () =>
      (streamingPresets ?? []).map((preset) => ({
        value: preset.id,
        label: preset.name,
      })),
    [streamingPresets]
  );

  const busy = uploadState === "preparing" || uploadState === "streaming";
  const showProgress = busy || progress > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ScienceIcon color="primary" />
        <Typography variant="h4" component="h1">
          {t("lab")}
        </Typography>
      </Stack>
      <Card>
        <CardHeader
          title={t("labRealtimeUploadTitle")}
          subheader={t("labRealtimeUploadDescription")}
        />
        <CardContent>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label={t("settingsPresets")}
              value={selectedPresetId ?? ""}
              onChange={(event) => setSelectedPresetId(event.target.value || null)}
              helperText={
                presetOptions.length === 0
                  ? t("pleaseAddStreamingPresetsInSettingsManageTranscriptionSettings")
                  : undefined
              }
            >
              {presetOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t("settingsJson")}
              value={configJson}
              onChange={(event) => setConfigJson(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              disabled={busy}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={simulationEnabled}
                  onChange={(event) => setSimulationEnabled(event.target.checked)}
                  color="primary"
                  disabled={busy}
                />
              }
              label={t("realtimeSimulationOption")}
            />
            <FormHelperText>{t("realtimeSimulationHelper")}</FormHelperText>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={busy}
              >
                {t("selectAudioFile")}
                <input type="file" accept="audio/*,video/*" hidden onChange={handleFileChange} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedFile
                  ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB`
                  : t("thereAreNoFilesSelected")}
              </Typography>
            </Stack>

            {audioDurationMs ? (
              <Typography variant="body2" color="text.secondary">
                {t("duration")}: {formatMs(audioDurationMs)}
              </Typography>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                onClick={handleStartUpload}
                disabled={busy}
              >
                {t("startRealtimeUpload")}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopCircleIcon />}
                onClick={handleStopUpload}
                disabled={!busy}
              >
                {t("stopRealtimeUpload")}
              </Button>
            </Stack>

            {showProgress ? (
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle2">{t("streamingUploadStatus")}</Typography>
                  <Chip
                    label={
                      connectionState === "connecting"
                        ? t("connecting")
                        : connectionState === "open"
                          ? t("realTimeTranscription")
                          : connectionState === "closed"
                            ? t("complete")
                            : t("waiting")
                    }
                    color={
                      connectionState === "open"
                        ? "success"
                        : connectionState === "connecting"
                          ? "warning"
                          : "default"
                    }
                    size="small"
                  />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ mt: 1, height: 10, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {t("streamingUploadProgress")}: {progress}%
                </Typography>
              </Box>
            ) : null}

            {error ? (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("streamingResponse")} />
        <CardContent>
          <Stack spacing={2}>
            {partialText ? (
              <Alert severity="info" icon={false}>
                <Typography variant="subtitle2" gutterBottom>
                  {t("recentPartialResult")}
                </Typography>
                <Typography variant="body1">{partialText}</Typography>
              </Alert>
            ) : null}

            <Divider />

            {segments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("noStreamingResultsYet")}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {segments.map((segment) => (
                  <Box
                    key={segment.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                    >
                      <Chip
                        size="small"
                        label={`${formatMs(segment.startMs)} ~ ${formatMs(segment.endMs)}`}
                      />
                      {segment.language ? <Chip size="small" label={segment.language} /> : null}
                      {segment.speakerLabel ? (
                        <Chip size="small" label={segment.speakerLabel} />
                      ) : null}
                    </Stack>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {segment.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
