import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, IconButton, InputAdornment, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useI18n } from "../i18n";
import { appDb, type LocalSegment, type LocalWordTiming } from "../data/app-db";
import {
  deleteTranscription,
  listAudioChunks,
  listVideoChunks,
  updateSegmentCorrection,
  updateSegmentSpeakerLabel,
  updateSingleSegmentSpeakerLabel,
} from "../services/data/transcriptionRepository";
import { createWavBlobFromPcmChunks } from "../services/audio/wavBuilder";
import { SpeakerEditDialog } from "../components/SpeakerEditDialog";
import { aggregateSegmentText, resolveSegmentText } from "../utils/segments";
import { useShareLink } from "../hooks/useShareLink";
import { MediaPlaybackSection } from "../components/MediaPlaybackSection";
import { TranscriptionView } from "../components/TranscriptionView";

const DEFAULT_REALTIME_SAMPLE_RATE = 16000;
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

interface RtzrWordInfo {
  text: string;
  start_at: number;
  duration: number;
  confidence: number;
}

interface RtzrStreamingAlternative {
  text: string;
  confidence: number;
  corrected_text?: string;
  words?: RtzrWordInfo[];
}

interface RtzrStreamingResult {
  start_at: number;
  duration: number;
  is_final: boolean;
  alternatives: RtzrStreamingAlternative[];
}

function buildDownloadFileName(title: string | undefined, fallbackId: string, extension: string) {
  const base = (title?.trim().length ? title.trim() : fallbackId || "transcription")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\s+/g, "_");
  return `${base}.${extension}`;
}

function buildRealtimeAudioFileName(title: string | undefined, fallbackId: string, sampleRate: number) {
  const normalizedRate =
    typeof sampleRate === "number" && Number.isFinite(sampleRate) && sampleRate > 0
      ? Math.floor(sampleRate)
      : DEFAULT_REALTIME_SAMPLE_RATE;
  const baseName = buildDownloadFileName(title, fallbackId, "wav").replace(/\.wav$/i, "");
  return `${baseName}_${normalizedRate}hz.wav`;
}

function determineVideoExtension(mimeType?: string | null) {
  if (!mimeType) {
    return "webm";
  }
  if (mimeType.includes("mp4")) {
    return "mp4";
  }
  if (mimeType.includes("ogg")) {
    return "ogv";
  }
  if (mimeType.includes("webm")) {
    return "webm";
  }
  return "webm";
}

function buildSessionVideoFileName(title: string | undefined, fallbackId: string, mimeType?: string | null) {
  const extension = determineVideoExtension(mimeType);
  return buildDownloadFileName(title, fallbackId, extension);
}

function downloadBlobContent(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatAbsoluteStartTime(startOffsetMs: number, createdAtIso: string | undefined) {
  const base = createdAtIso ? dayjs(createdAtIso) : null;
  if (base && base.isValid()) {
    return base.add(startOffsetMs, "millisecond").toISOString();
  }
  return `${startOffsetMs}ms`;
}

function getSegmentStartMs(segment: LocalSegment): number | null {
  if (typeof segment.startMs === "number" && Number.isFinite(segment.startMs)) {
    return segment.startMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[0].startMs;
  }
  return null;
}

function getSegmentEndMs(segment: LocalSegment): number | null {
  if (typeof segment.endMs === "number" && Number.isFinite(segment.endMs)) {
    return segment.endMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[segment.words.length - 1].endMs;
  }
  return null;
}

function segmentHasTiming(segment: LocalSegment): boolean {
  if (segment.hasTiming === false) {
    return Boolean(segment.words && segment.words.length > 0);
  }
  if (segment.words && segment.words.length > 0) {
    return true;
  }
  return (
    (typeof segment.startMs === "number" && Number.isFinite(segment.startMs)) ||
    (typeof segment.endMs === "number" && Number.isFinite(segment.endMs))
  );
}

function computeNextSpeakerId(segments: LocalSegment[] | undefined): string {
  if (!segments || segments.length === 0) {
    return "1";
  }
  const maxNumericId = segments.reduce((max, segment) => {
    const parsed = Number.parseInt(segment.spk ?? "0", 10);
    if (Number.isFinite(parsed) && parsed > max) {
      return parsed;
    }
    return max;
  }, 0);
  return String(maxNumericId + 1);
}

const WORD_TIMING_RELATIVE_TOLERANCE_MS = 250;
const SEGMENT_MATCH_TOLERANCE_MS = 200;

function resolveWordTimingMs(segment: LocalSegment, word: LocalWordTiming) {
  const segmentStart = getSegmentStartMs(segment) ?? 0;
  const segmentEnd = getSegmentEndMs(segment);
  const hasSegmentDuration =
    segmentEnd !== null && typeof segmentEnd === "number" && segmentEnd >= segmentStart;
  const segmentDuration = hasSegmentDuration ? segmentEnd - segmentStart : null;

  const normalizeSource = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const rawStart = normalizeSource(word.startMs);
  const rawEnd = normalizeSource(word.endMs);

  const isWithinDurationRange = (value: number | null) => {
    if (value === null || segmentDuration === null) {
      return true;
    }
    return value <= segmentDuration + WORD_TIMING_RELATIVE_TOLERANCE_MS;
  };

  const startLooksRelative =
    rawStart !== null &&
    segmentStart > WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    rawStart < segmentStart - WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    isWithinDurationRange(rawStart);

  const endLooksRelative =
    rawEnd !== null &&
    segmentStart > WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    rawEnd < segmentStart - WORD_TIMING_RELATIVE_TOLERANCE_MS &&
    isWithinDurationRange(rawEnd);

  const normalizedStart =
    rawStart !== null
      ? startLooksRelative
        ? segmentStart + rawStart
        : rawStart
      : endLooksRelative && rawEnd !== null
        ? segmentStart + rawEnd
        : segmentStart;

  const normalizedEndCandidate =
    rawEnd !== null
      ? endLooksRelative
        ? segmentStart + rawEnd
        : rawEnd
      : normalizedStart;

  const normalizedEnd = Math.max(normalizedEndCandidate, normalizedStart);
  const durationMs = Math.max(0, normalizedEnd - normalizedStart);

  return {
    startMs: normalizedStart,
    endMs: normalizedEnd,
    durationMs,
  };
}

function buildWordEditorResult(words: LocalWordTiming[], overrides: string[]) {
  const normalizedWords = words.map((word, index) => {
    const override = overrides[index]?.trim();
    return {
      ...word,
      text: override && override.length > 0 ? override : word.text,
    };
  });
  const text = normalizedWords
    .map((word) => word.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return { text, words: normalizedWords };
}

function formatSegmentPlainText(segment: LocalSegment, index: number, createdAtIso: string | undefined) {
  const startOffset = Math.max(0, Math.round(segment.startMs ?? 0));
  const hasValidEnd =
    typeof segment.endMs === "number" && Number.isFinite(segment.endMs) && segment.endMs >= segment.startMs;
  const endAt = hasValidEnd ? Math.round(segment.endMs) : null;
  const duration = endAt !== null ? Math.max(0, endAt - startOffset) : 0;
  const speaker = segment.speaker_label?.trim().length ? segment.speaker_label.trim() : "unknown";
  const header = `# ${index + 1} ${speaker} ${formatAbsoluteStartTime(
    startOffset,
    createdAtIso
  )} ${duration}ms`;
  const text = resolveSegmentText(segment, true);
  return `${header}\n${text}`;
}

function buildStreamingResultPayload(
  segments: LocalSegment[] | undefined,
  assumeFinal: boolean
): RtzrStreamingResult[] {
  if (!segments) {
    return [];
  }
  return segments.map((segment) => {
    const startAt = Math.max(0, Math.round(segment.startMs ?? 0));
    const hasValidEnd =
      typeof segment.endMs === "number" && Number.isFinite(segment.endMs) && segment.endMs >= segment.startMs;
    const isFinal = typeof segment.isFinal === "boolean" ? segment.isFinal : assumeFinal;
    const duration =
      isFinal && hasValidEnd ? Math.max(0, Math.round(segment.endMs) - startAt) : 0;
    const correctedText = segment.correctedText && segment.correctedText.trim().length > 0 ? segment.correctedText : undefined;

    const words =
      segment.words && segment.words.length > 0
        ? segment.words.map((word) => ({
          text: word.text,
          start_at: word.startMs,
          duration: Math.max(0, word.endMs - word.startMs),
          confidence: word.confidence ?? 0,
        }))
        : undefined;

    const alternatives: RtzrStreamingAlternative[] = [
      {
        text: segment.text ?? "",
        confidence: 0,
        corrected_text: correctedText,
        words,
      },
    ];

    return {
      start_at: startAt,
      duration,
      is_final: isFinal,
      alternatives,
    };
  });
}

function aggregateStreamingText(results: RtzrStreamingResult[]): string | undefined {
  if (!results.length) {
    return undefined;
  }
  const text = results
    .flatMap((result) => result.alternatives.map((alt) => alt.text?.trim() ?? ""))
    .filter((entry) => entry.length > 0)
    .join("\n");
  return text.length ? text : undefined;
}

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function TranscriptionDetailPage() {
  const { transcriptionId } = useParams<{ transcriptionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaElementRef = useRef<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);
  const videoMimeTypeRef = useRef<string | null>(null);
  const segmentEndRef = useRef<number | null>(null);
  const programmaticSeekRef = useRef(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [activeWordHighlight, setActiveWordHighlight] = useState<{ segmentId: string; index: number } | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingWordInputs, setEditingWordInputs] = useState<string[] | null>(null);
  const [editingWordTimings, setEditingWordTimings] = useState<LocalWordTiming[] | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const audioReady = Boolean(audioUrl || audioBlobRef.current) && !audioLoading;
  const shareAudioAvailable = Boolean(audioUrl || audioBlobRef.current);
  const [noteMode, setNoteMode] = useState(false);
  const [wordDetailsVisibility, setWordDetailsVisibility] = useState<Record<string, boolean>>({});
  const segmentsRef = useRef<LocalSegment[]>([]);
  const activeSegmentIdRef = useRef<string | null>(null);
  const activeWordHighlightRef = useRef<{ segmentId: string; index: number } | null>(null);
  const segmentCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [speakerEditDialogOpen, setSpeakerEditDialogOpen] = useState(false);
  const [speakerEditTarget, setSpeakerEditTarget] = useState<{
    segmentId: string;
    currentSpk: string;
    currentLabel: string;
  } | null>(null);
  const [speakerEditName, setSpeakerEditName] = useState("");

  const transcription = useLiveQuery(async () => {
    if (!transcriptionId) return null;
    return await appDb.transcriptions.get(transcriptionId);
  }, [transcriptionId]);

  const segments = useLiveQuery(async () => {
    if (!transcriptionId) return [];
    return await appDb.segments
      .where("transcriptionId")
      .equals(transcriptionId)
      .sortBy("startMs");
  }, [transcriptionId]);

  const {
    includeAudioInShare,
    sharePassword,
    setSharePassword,
    shareLink,
    shareGenerating,
    shareError,
    shareDialogOpen,
    openShareDialog: handleShareDialogOpen,
    closeShareDialog: handleShareDialogClose,
    audioTranscoding,
    handleIncludeAudioChange,
    handleGenerateShareLink,
    handleCopyShareLink,
  } = useShareLink({
    transcriptionId,
    transcription,
    segments,
    audioUrl,
    audioBlobRef,
    shareAudioAvailable,
    t,
    enqueueSnackbar,
  });

  const handleSpeakerClick = useCallback((segment: LocalSegment) => {
    setSpeakerEditTarget({
      segmentId: segment.id,
      currentSpk: segment.spk ?? "0",
      currentLabel: segment.speaker_label ?? "",
    });
    setSpeakerEditName(segment.speaker_label ?? "");
    setSpeakerEditDialogOpen(true);
  }, []);

  const handleSpeakerEditClose = useCallback(() => {
    setSpeakerEditDialogOpen(false);
    setSpeakerEditTarget(null);
    setSpeakerEditName("");
  }, []);

  const handleSpeakerUpdateAll = useCallback(async () => {
    if (!transcriptionId || !speakerEditTarget) return;
    try {
      await updateSegmentSpeakerLabel(
        transcriptionId,
        speakerEditTarget.currentSpk,
        speakerEditName
      );
      enqueueSnackbar(t("speakerUpdateSuccess"), { variant: "success" });
      handleSpeakerEditClose();
    } catch (error) {
      console.error("Failed to update speaker", error);
      enqueueSnackbar(t("failedToSaveCorrections"), { variant: "error" });
    }
  }, [transcriptionId, speakerEditTarget, speakerEditName, enqueueSnackbar, t, handleSpeakerEditClose]);

  const handleSpeakerUpdateSingle = useCallback(async () => {
    if (!speakerEditTarget) return;
    try {
      const nextSpkId = computeNextSpeakerId(segments);
      await updateSingleSegmentSpeakerLabel(speakerEditTarget.segmentId, speakerEditName, nextSpkId);
      enqueueSnackbar(t("speakerUpdateSuccess"), { variant: "success" });
      handleSpeakerEditClose();
    } catch (error) {
      console.error("Failed to update speaker", error);
      enqueueSnackbar(t("failedToSaveCorrections"), { variant: "error" });
    }
  }, [speakerEditTarget, speakerEditName, segments, enqueueSnackbar, t, handleSpeakerEditClose]);

  const handleNavigateBack = useCallback(() => {
    const fromList = Boolean((location.state as { fromList?: boolean } | null)?.fromList);
    if (fromList) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  }, [location.state, navigate]);

  const noteModeText = useMemo(() => {
    const aggregated = aggregateSegmentText(segments, true);
    if (aggregated && aggregated.trim().length > 0) {
      return aggregated;
    }
    const fallback = transcription?.transcriptText?.trim();
    return fallback && fallback.length > 0 ? fallback : "";
  }, [segments, transcription]);

  useEffect(() => {
    segmentsRef.current = segments ?? [];
  }, [segments]);

  useEffect(() => {
    setNoteMode(false);
  }, [transcriptionId]);

  useEffect(() => {
    activeSegmentIdRef.current = activeSegmentId;
    if (!activeSegmentId) {
      setActiveWordHighlight(null);
      activeWordHighlightRef.current = null;
    }
  }, [activeSegmentId]);

  useEffect(() => {
    activeWordHighlightRef.current = activeWordHighlight;
  }, [activeWordHighlight]);

  useEffect(() => {
    if (!activeSegmentId) return;
    const element = segmentCardRefs.current.get(activeSegmentId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSegmentId]);

  const isWordDetailsVisible = useCallback(
    (segmentId: string) => Boolean(wordDetailsVisibility[segmentId]),
    [wordDetailsVisibility]
  );

  useEffect(() => {
    const current = activeWordHighlightRef.current;
    if (current && !isWordDetailsVisible(current.segmentId)) {
      setActiveWordHighlight(null);
      activeWordHighlightRef.current = null;
    }
  }, [isWordDetailsVisible]);

  const updateActiveWordHighlight = useCallback(
    (segmentId: string, currentSeconds: number) => {
      if (!isWordDetailsVisible(segmentId)) {
        if (activeWordHighlightRef.current !== null) {
          setActiveWordHighlight(null);
          activeWordHighlightRef.current = null;
        }
        return;
      }
      const segment = segmentsRef.current.find((entry) => entry.id === segmentId);
      if (!segment || !segment.words || segment.words.length === 0) {
        if (activeWordHighlightRef.current !== null) {
          setActiveWordHighlight(null);
          activeWordHighlightRef.current = null;
        }
        return;
      }
      const currentMs = currentSeconds * 1000;
      const toleranceMs = 60;
      const nextIndex = segment.words.findIndex((word) => {
        const { startMs, endMs } = resolveWordTimingMs(segment, word);
        return currentMs >= startMs - toleranceMs && currentMs < endMs + toleranceMs;
      });
      const nextHighlight = nextIndex >= 0 ? { segmentId, index: nextIndex } : null;
      const prev = activeWordHighlightRef.current;
      if (
        (prev?.segmentId ?? null) !== (nextHighlight?.segmentId ?? null) ||
        (prev?.index ?? null) !== (nextHighlight?.index ?? null)
      ) {
        setActiveWordHighlight(nextHighlight);
        activeWordHighlightRef.current = nextHighlight;
      }
    },
    [isWordDetailsVisible]
  );

  const focusSegmentByDirection = useCallback(
    (direction: "previous" | "next") => {
      const entries = segmentsRef.current;
      if (!entries.length) {
        return;
      }
      const currentId = activeSegmentIdRef.current;
      let targetIndex: number;
      if (!currentId) {
        targetIndex = direction === "next" ? 0 : entries.length - 1;
      } else {
        const currentIndex = entries.findIndex((entry) => entry.id === currentId);
        if (currentIndex === -1) {
          targetIndex = direction === "next" ? 0 : entries.length - 1;
        } else if (direction === "next") {
          if (currentIndex >= entries.length - 1) {
            return;
          }
          targetIndex = currentIndex + 1;
        } else {
          if (currentIndex <= 0) {
            return;
          }
          targetIndex = currentIndex - 1;
        }
      }

      const targetSegment = entries[targetIndex];
      if (!targetSegment) {
        return;
      }
      setActiveSegmentId(targetSegment.id);
      setActiveWordHighlight(null);
      activeWordHighlightRef.current = null;
      const cardNode = segmentCardRefs.current.get(targetSegment.id);
      if (cardNode && typeof cardNode.focus === "function") {
        cardNode.focus({ preventScroll: true });
      }
    },
    []
  );

  const handleStartEdit = useCallback((segment: LocalSegment) => {
    setEditingSegmentId(segment.id);
    setEditingValue(resolveSegmentText(segment, true));
    if (segment.words && segment.words.length > 0) {
      setEditingWordInputs(segment.words.map((word) => word.text));
      setEditingWordTimings(segment.words.map((word) => ({ ...word })));
    } else {
      setEditingWordInputs(null);
      setEditingWordTimings(null);
    }
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSegmentId(null);
    setEditingValue("");
    setEditingWordInputs(null);
    setEditingWordTimings(null);
  }, []);

  const handleWordInputChange = useCallback(
    (index: number, nextValue: string) => {
      setEditingWordInputs((prev) => {
        if (!prev || !editingWordTimings || index < 0 || index >= prev.length) {
          return prev;
        }
        const next = [...prev];
        next[index] = nextValue;
        return next;
      });
    },
    [editingWordTimings]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingSegmentId) return;
    const usingWordEditor =
      editingWordInputs &&
      editingWordTimings &&
      editingWordInputs.length === editingWordTimings.length;
    const wordResult =
      usingWordEditor && editingWordTimings && editingWordInputs
        ? buildWordEditorResult(editingWordTimings, editingWordInputs)
        : null;
    const candidateText = usingWordEditor && wordResult ? wordResult.text : editingValue;
    const normalizedText = candidateText.trim();
    const hasContent = normalizedText.length > 0;
    try {
      setSavingEdit(true);
      await updateSegmentCorrection(
        editingSegmentId,
        hasContent ? normalizedText : null,
        wordResult?.words
      );
      setEditingSegmentId(null);
      setEditingValue("");
      setEditingWordInputs(null);
      setEditingWordTimings(null);
      enqueueSnackbar(t("yourCorrectionsHaveBeenSaved"), { variant: "success" });
    } catch (error) {
      console.error(t("segmentCalibrationSaveFailure"), error);
      enqueueSnackbar(t("failedToSaveCorrections"), { variant: "error" });
    } finally {
      setSavingEdit(false);
    }
  }, [editingSegmentId, editingValue, editingWordInputs, editingWordTimings, enqueueSnackbar, t]);

  const handleEditKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancelEdit();
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void handleSaveEdit();
      }
    },
    [handleCancelEdit, handleSaveEdit]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && editingSegmentId) {
        if (!event.defaultPrevented) {
          event.preventDefault();
        }
        handleCancelEdit();
        return;
      }

      if (event.defaultPrevented) {
        return;
      }

      if (editingSegmentId) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isEditableElement(event.target)) {
        return;
      }

      const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const isPreviousKey =
        event.key === "ArrowUp" || event.key === "ArrowLeft" || normalizedKey === "h" || normalizedKey === "k";
      const isNextKey =
        event.key === "ArrowDown" || event.key === "ArrowRight" || normalizedKey === "j" || normalizedKey === "l";

      if (isPreviousKey) {
        event.preventDefault();
        focusSegmentByDirection("previous");
        return;
      }

      if (isNextKey) {
        event.preventDefault();
        focusSegmentByDirection("next");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [editingSegmentId, focusSegmentByDirection, handleCancelEdit]);

  const handleDownloadJson = useCallback(() => {
    if (!transcription) {
      return;
    }
    const segmentList = segments ?? [];
    const assumeFinal = transcription.status === "completed" || transcription.status === "failed";
    const streamingResults = buildStreamingResultPayload(segmentList, assumeFinal);
    const storedTranscript = transcription.transcriptText;
    const aggregatedText =
      storedTranscript && storedTranscript.trim().length
        ? storedTranscript
        : aggregateStreamingText(streamingResults);
    const correctedAggregatedText = aggregateSegmentText(segmentList, true) ?? aggregatedText;

    const payload = {
      transcribe_id: transcription.remoteId ?? transcription.id,
      status: transcription.status,
      text: aggregatedText,
      corrected_text: correctedAggregatedText,
      results: streamingResults,
      audio_url: transcription.remoteAudioUrl,
      error: transcription.errorMessage,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    downloadBlobContent(blob, buildDownloadFileName(transcription.title, transcription.id, "json"));
  }, [segments, transcription]);

  const handleDownloadText = useCallback(() => {
    if (!transcription) {
      return;
    }
    const segmentList = segments ?? [];
    let formattedSegments = "";
    if (segmentList.length > 0) {
      formattedSegments = segmentList
        .map((segment, index) => formatSegmentPlainText(segment, index, transcription.createdAt))
        .join("\n\n");
    } else if (transcription.transcriptText?.trim().length) {
      formattedSegments = formatSegmentPlainText(
        {
          id: "transcript",
          transcriptionId: transcription.id,
          startMs: 0,
          endMs: 0,
          text: transcription.transcriptText.trim(),
          createdAt: transcription.createdAt,
        },
        0,
        transcription.createdAt
      );
    }

    if (!formattedSegments.trim().length) {
      enqueueSnackbar(t("thereAreNoTranscriptionResultsToDownload"), { variant: "info" });
      return;
    }

    const respondedAt = transcription.updatedAt ?? transcription.createdAt;
    const headerLines = [
      `title:${transcription.title ?? ""}`,
      `localId:${transcription.id}`,
      `type:${transcription.kind}`,
      `status:${transcription.status}`,
      `createdAt:${dayjs(transcription.createdAt).toISOString()}`,
      `respondedAt:${respondedAt ? dayjs(respondedAt).toISOString() : ""}`,
      `segmentCount:${segmentList.length || 1}`,
    ];
    const blob = new Blob([`${headerLines.join("\n")}\n\n${formattedSegments}`], {
      type: "text/plain;charset=utf-8",
    });
    downloadBlobContent(blob, buildDownloadFileName(transcription.title, transcription.id, "txt"));
  }, [enqueueSnackbar, segments, t, transcription]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    audioBlobRef.current = null;
    setAudioError(null);
    segmentEndRef.current = null;
    setActiveSegmentId(null);
    setActiveWordHighlight(null);
    activeWordHighlightRef.current = null;

    if (!transcription) {
      setAudioUrl(null);
      setAudioLoading(false);
      return () => {
        cancelled = true;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }

    if (transcription.kind === "realtime") {
      setAudioLoading(true);
      (async () => {
        try {
          const chunks = await listAudioChunks(transcription.id);
          if (cancelled) return;
          if (chunks.length === 0) {
            setAudioUrl(null);
            setAudioError(t("theSavedAudioDataCannotBeFound"));
            return;
          }
          const buffers = chunks.map((chunk) => chunk.data);
          const wavBlob = createWavBlobFromPcmChunks(
            buffers,
            transcription.audioSampleRate ?? DEFAULT_REALTIME_SAMPLE_RATE,
            transcription.audioChannels ?? 1
          );
          if (!wavBlob) {
            setAudioUrl(null);
            setAudioError(t("audioCannotBeConverted"));
            return;
          }
          audioBlobRef.current = wavBlob;
          objectUrl = URL.createObjectURL(wavBlob);
          setAudioUrl(objectUrl);
        } catch (error) {
          console.error(t("localAudioLoadFailed"), error);
          if (!cancelled) {
            setAudioError(t("localAudioFailedToLoad"));
          }
        } finally {
          if (!cancelled) {
            setAudioLoading(false);
          }
        }
      })();
    } else if (transcription.remoteAudioUrl) {
      setAudioUrl(transcription.remoteAudioUrl);
      setAudioLoading(false);
    } else {
      setAudioUrl(null);
      setAudioLoading(false);
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [t, transcription]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    videoBlobRef.current = null;
    videoMimeTypeRef.current = null;
    setVideoError(null);

    if (!transcription || transcription.kind !== "realtime") {
      setVideoUrl(null);
      setVideoLoading(false);
      return () => {
        cancelled = true;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }

    setVideoLoading(true);
    (async () => {
      try {
        const chunks = await listVideoChunks(transcription.id);
        if (cancelled) return;
        if (chunks.length === 0) {
          setVideoUrl(null);
          return;
        }
        const mimeType =
          chunks.find((chunk) => chunk.mimeType)?.mimeType ?? "video/webm";
        const blob = new Blob(chunks.map((chunk) => chunk.data), { type: mimeType });
        videoBlobRef.current = blob;
        videoMimeTypeRef.current = mimeType;
        objectUrl = URL.createObjectURL(blob);
        setVideoUrl(objectUrl);
      } catch (error) {
        console.error("Failed to load recorded video", error);
        if (!cancelled) {
          setVideoError(t("videoCannotBeLoaded"));
        }
      } finally {
        if (!cancelled) {
          setVideoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [t, transcription]);

  const handleDelete = useCallback(async () => {
    if (!transcriptionId) return;
    if (!window.confirm(t("wouldYouLikeToDeleteYourTranscriptionHistory"))) {
      return;
    }
    await deleteTranscription(transcriptionId);
    enqueueSnackbar(t("theTranscriptionRecordHasBeenDeleted"), { variant: "success" });
    navigate("/");
  }, [enqueueSnackbar, navigate, t, transcriptionId]);

  const handleDownloadAudio = useCallback(() => {
    if (!transcription) return;
    const useRealtimeName = transcription.kind === "realtime";
    const downloadName = useRealtimeName
      ? buildRealtimeAudioFileName(
        transcription.title,
        transcription.id,
        transcription.audioSampleRate ?? DEFAULT_REALTIME_SAMPLE_RATE
      )
      : buildDownloadFileName(transcription.title, transcription.id, "wav");
    if (audioBlobRef.current) {
      const url = URL.createObjectURL(audioBlobRef.current);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    }
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }, [audioUrl, transcription]);

  const handleDownloadVideo = useCallback(() => {
    if (!transcription) return;
    if (!videoBlobRef.current && !videoUrl) {
      return;
    }
    const downloadName = buildSessionVideoFileName(
      transcription.title,
      transcription.id,
      videoMimeTypeRef.current
    );
    if (videoBlobRef.current) {
      downloadBlobContent(videoBlobRef.current, downloadName);
      return;
    }
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }, [transcription, videoUrl]);

  const findSegmentForPlaybackTime = useCallback((currentSeconds: number): LocalSegment | null => {
    const entries = segmentsRef.current;
    if (!entries || entries.length === 0) {
      return null;
    }
    const currentMs = currentSeconds * 1000;
    for (let index = 0; index < entries.length; index += 1) {
      const segment = entries[index];
      const startMs = getSegmentStartMs(segment);
      if (startMs === null) {
        continue;
      }
      const nextStartMs = index + 1 < entries.length ? getSegmentStartMs(entries[index + 1]) : null;
      let endMs = getSegmentEndMs(segment);
      if (endMs === null && nextStartMs !== null) {
        endMs = nextStartMs;
      }
      if (endMs === null) {
        endMs = Number.POSITIVE_INFINITY;
      }
      const startBoundary = startMs - SEGMENT_MATCH_TOLERANCE_MS;
      const endBoundary = endMs + SEGMENT_MATCH_TOLERANCE_MS;
      if (currentMs >= startBoundary && currentMs <= endBoundary) {
        return segment;
      }
      if (currentMs < startBoundary) {
        break;
      }
    }
    return null;
  }, []);

  const syncActiveSegmentWithPlayback = useCallback(
    (currentSeconds: number) => {
      const match = findSegmentForPlaybackTime(currentSeconds);
      const currentActiveId = activeSegmentIdRef.current;
      if (match) {
        if (currentActiveId !== match.id) {
          setActiveSegmentId(match.id);
        }
        updateActiveWordHighlight(match.id, currentSeconds);
        return match.id;
      }
      if (currentActiveId) {
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
        activeWordHighlightRef.current = null;
      }
      return null;
    },
    [findSegmentForPlaybackTime, updateActiveWordHighlight]
  );

  const handlePlaySegment = useCallback(
    (segment: LocalSegment) => {
      if (!audioReady) {
        enqueueSnackbar(t("theAudioIsNotReadyYet"), { variant: "info" });
        return;
      }
      const media = mediaElementRef.current;
      if (!media) return;
      const currentActiveId = activeSegmentIdRef.current;
      if (currentActiveId === segment.id && !media.paused) {
        media.pause();
        segmentEndRef.current = null;
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
        activeWordHighlightRef.current = null;
        return;
      }
      if (!segmentHasTiming(segment)) {
        enqueueSnackbar(t("itCannotBePlayedBecauseThereIsNoSectionInformation"), { variant: "info" });
        return;
      }

      const startMs = getSegmentStartMs(segment);
      if (startMs === null) {
        enqueueSnackbar(t("itCannotBePlayedBecauseThereIsNoSectionInformation"), { variant: "info" });
        return;
      }
      const endMs = getSegmentEndMs(segment);
      const startSeconds = Math.max(0, startMs / 1000);
      const hasValidEnd = typeof endMs === "number" && Number.isFinite(endMs) && endMs > startMs;
      const endSeconds = hasValidEnd ? endMs / 1000 : null;

      if (!media.paused) {
        media.pause();
      }
      programmaticSeekRef.current = false;
      if (Math.abs(media.currentTime - startSeconds) > 0.05) {
        programmaticSeekRef.current = true;
        media.currentTime = startSeconds;
      }

      segmentEndRef.current = endSeconds;
      setActiveSegmentId(segment.id);
      updateActiveWordHighlight(segment.id, startSeconds);

      try {
        const playResult = media.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch((error: unknown) => {
            console.error(t("segmentPlaybackFailed"), error);
            segmentEndRef.current = null;
            setActiveSegmentId(null);
            setActiveWordHighlight(null);
            activeWordHighlightRef.current = null;
            enqueueSnackbar(t("thatSectionCannotBePlayed"), { variant: "error" });
          });
        }
      } catch (error) {
        console.error(t("segmentPlaybackFailed"), error);
        segmentEndRef.current = null;
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
        activeWordHighlightRef.current = null;
        enqueueSnackbar(t("thatSectionCannotBePlayed"), { variant: "error" });
      }

      // When the segment does not provide an end timestamp we simply let the audio continue.
    },
    [audioReady, enqueueSnackbar, t, updateActiveWordHighlight]
  );

  useEffect(() => {
    const media = mediaElementRef.current;
    if (!media) return;

    const handleTimeUpdate = () => {
      const endBoundary = segmentEndRef.current;
      if (endBoundary !== null && Number.isFinite(endBoundary)) {
        if (media.currentTime >= endBoundary - 0.05) {
          media.pause();
          media.currentTime = endBoundary;
          segmentEndRef.current = null;
          setActiveSegmentId(null);
          setActiveWordHighlight(null);
          activeWordHighlightRef.current = null;
          return;
        }
      }
      syncActiveSegmentWithPlayback(media.currentTime);
    };

    const clearSegmentPlayback = () => {
      segmentEndRef.current = null;
      setActiveSegmentId(null);
      setActiveWordHighlight(null);
      activeWordHighlightRef.current = null;
    };

    const handleStop = () => {
      clearSegmentPlayback();
    };

    const handleSeeking = () => {
      if (programmaticSeekRef.current) {
        return;
      }
      clearSegmentPlayback();
    };

    const handleSeeked = () => {
      if (programmaticSeekRef.current) {
        programmaticSeekRef.current = false;
        return;
      }
      syncActiveSegmentWithPlayback(media.currentTime);
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("ended", handleStop);
    media.addEventListener("pause", handleStop);
    media.addEventListener("seeking", handleSeeking);
    media.addEventListener("seeked", handleSeeked);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("ended", handleStop);
      media.removeEventListener("pause", handleStop);
      media.removeEventListener("seeking", handleSeeking);
      media.removeEventListener("seeked", handleSeeked);
    };
  }, [audioUrl, videoUrl, syncActiveSegmentWithPlayback]);

  if (transcription === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!transcription) {
    return (
      <Box sx={{ py: 6 }}>
        <Alert severity="warning">{t("noTranscriptionRecordsFound")}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <MediaPlaybackSection
        transcription={transcription}
        audioUrl={audioUrl}
        videoUrl={videoUrl}
        mediaRef={mediaElementRef}
        audioLoading={audioLoading}
        videoLoading={videoLoading}
        audioError={audioError}
        videoError={videoError}
        audioDownloadable={Boolean(audioUrl || audioBlobRef.current)}
        videoDownloadable={Boolean(videoUrl || videoBlobRef.current)}
        onBack={handleNavigateBack}
        onDownloadJson={handleDownloadJson}
        onDownloadText={handleDownloadText}
        onDownloadAudio={handleDownloadAudio}
        onDownloadVideo={handleDownloadVideo}
        onDelete={handleDelete}
        onShare={handleShareDialogOpen}
        t={t}
      />

      <Dialog
        open={shareDialogOpen}
        onClose={handleShareDialogClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>{t("shareSectionTitle")}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={shareAudioAvailable && includeAudioInShare}
                    onChange={handleIncludeAudioChange}
                    disabled={!shareAudioAvailable || shareGenerating}
                  />
                }
                label={t("shareIncludeAudioLabel")}
              />
              <Typography variant="caption" color="text.secondary">
                {shareAudioAvailable ? t("shareIncludeAudioHelper") : t("shareIncludeAudioUnavailable")}
              </Typography>
            </FormGroup>
            <TextField
              label={t("sharePasswordLabel")}
              type="password"
              value={sharePassword}
              onChange={(event) => setSharePassword(event.target.value)}
              helperText={t("sharePasswordHelper")}
              fullWidth
              disabled={shareGenerating}
            />
            {audioTranscoding ? (
              <Typography variant="body2" color="text.secondary">
                {t("shareTranscoding")}
              </Typography>
            ) : null}
            <Stack spacing={1} alignItems="flex-start">
              <Button
                variant="contained"
                startIcon={
                  shareGenerating || audioTranscoding ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <ShareOutlinedIcon />
                  )
                }
                onClick={handleGenerateShareLink}
                disabled={shareGenerating || audioTranscoding || !transcription}
              >
                {shareGenerating ? t("shareGenerating") : t("shareCreateLinkButton")}
              </Button>
              {shareLink ? (
                <TextField
                  value={shareLink}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t("shareCopyLink")}>
                          <IconButton onClick={handleCopyShareLink} size="small">
                            <ContentCopyOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              ) : null}
            </Stack>
            {shareError ? <Alert severity="error">{shareError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleShareDialogClose}>{t("close")}</Button>
        </DialogActions>
      </Dialog>

      <SpeakerEditDialog
        open={speakerEditDialogOpen}
        name={speakerEditName}
        labels={{
          title: t("editSpeaker"),
          nameLabel: t("speakerName"),
          updateAll: t("changeAllSpeakers"),
          createNew: t("createNewSpeaker"),
          cancel: t("cancellation"),
        }}
        onChangeName={setSpeakerEditName}
        onUpdateAll={() => void handleSpeakerUpdateAll()}
        onUpdateSingle={() => void handleSpeakerUpdateSingle()}
        onClose={handleSpeakerEditClose}
      />

      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <FormControlLabel
            control={
              <Switch
                checked={noteMode}
                onChange={(event) => setNoteMode(event.target.checked)}
              />
            }
            label={t("noteMode")}
          />
          <Typography variant="caption" color="text.secondary">
            {t("noteModeHelper")}
          </Typography>
        </Stack>

        {noteMode ? (
          <TextField
            multiline
            minRows={8}
            fullWidth
            label={t("noteModeTextAreaLabel")}
            placeholder={t("noteModePlaceholder")}
            value={noteModeText}
            InputProps={{ readOnly: true }}
          />
        ) : (
          <TranscriptionView
            segments={segments}
            activeSegmentId={activeSegmentId}
            activeWordHighlight={activeWordHighlight}
            wordDetailsVisibility={wordDetailsVisibility}
            editingSegmentId={editingSegmentId}
            editingValue={editingValue}
            editingWordInputs={editingWordInputs}
            editingWordTimings={editingWordTimings}
            savingEdit={savingEdit}
            audioReady={audioReady}
            onSpeakerClick={handleSpeakerClick}
          onPlaySegment={handlePlaySegment}
          onStartEdit={handleStartEdit}
          onWordInputChange={handleWordInputChange}
          onEditValueChange={setEditingValue}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={() => void handleSaveEdit()}
          onWordDetailsToggle={(segmentId) => {
            setWordDetailsVisibility((prev) => {
                const nextVisible = !(prev[segmentId] ?? false);
                if (!nextVisible && activeWordHighlightRef.current?.segmentId === segmentId) {
                  setActiveWordHighlight(null);
                  activeWordHighlightRef.current = null;
                }
                return {
                  ...prev,
                  [segmentId]: nextVisible,
                };
              });
            }}
            onKeyDown={handleEditKeyDown}
            segmentCardRefs={segmentCardRefs}
            t={t}
          />
        )}
      </Stack>
    </Box >
  );
}
