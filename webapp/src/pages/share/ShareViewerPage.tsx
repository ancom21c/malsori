import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { inflate } from "pako";
import type { ShareDocument, ShareSegment } from "../../share/payload";
import {
  inspectSharePackage,
  parseSharePayload,
} from "../../share/payload";
import { base64ToUint8Array } from "../../utils/base64";
import {
  aggregateSegmentText,
  getSegmentStartMs,
  getSegmentEndMs,
  resolveWordTimingMs,
  segmentHasTiming,
} from "../../utils/segments";
import { useI18n } from "../../i18n";
import { MediaPlaybackSection } from "../../components/MediaPlaybackSection";
import { TranscriptionView } from "../../components/TranscriptionView";

declare global {
  interface Window {
    __SHARE_EMBED__?: string;
  }
}

const SEGMENT_MATCH_TOLERANCE_MS = 200;

export default function ShareViewerPage() {
  const { t } = useI18n();
  const [payloadParam, setPayloadParam] = useState<string | null>(
    typeof window !== "undefined" && window.__SHARE_EMBED__ ? window.__SHARE_EMBED__ : null
  );
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [shareDocument, setShareDocument] = useState<ShareDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddedAudioUrl, setEmbeddedAudioUrl] = useState<string | null>(null);
  const [embeddedAudioError, setEmbeddedAudioError] = useState<string | null>(null);
  const mediaElementRef = useRef<HTMLMediaElement | null>(null);
  const segmentEndRef = useRef<number | null>(null);
  const programmaticSeekRef = useRef(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeSegmentIdRef = useRef<string | null>(null);
  const [activeWordHighlight, setActiveWordHighlight] = useState<{ segmentId: string; index: number } | null>(
    null
  );
  const activeWordHighlightRef = useRef<{ segmentId: string; index: number } | null>(null);
  const [wordDetailsVisibility, setWordDetailsVisibility] = useState<Record<string, boolean>>({});
  const [noteMode, setNoteMode] = useState(false);
  const segmentsRef = useRef<ShareSegment[]>([]);
  const segmentCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadDocument = useCallback(
    async (payload: string, passwordOverride?: string) => {
      setLoading(true);
      setError(null);
      try {
        const doc = await parseSharePayload(payload, passwordOverride);
        setShareDocument(doc);
        setRequiresPassword(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("sharePayloadInvalid");
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    let payload = window.__SHARE_EMBED__ ?? null;
    if (!payload) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      payload = hashParams.get("payload") ?? queryParams.get("payload");
    }
    if (!payload) {
      setError(t("sharePayloadMissing"));
      return;
    }
    setPayloadParam(payload);
    const metadata = inspectSharePackage(payload);
    if (!metadata) {
      setError(t("sharePayloadInvalid"));
      return;
    }
    if (metadata.encrypted) {
      setRequiresPassword(true);
      return;
    }
    setRequiresPassword(false);
    void loadDocument(payload);
  }, [loadDocument, t]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (!shareDocument?.audio) {
      setEmbeddedAudioUrl(null);
      setEmbeddedAudioError(null);
      return;
    }
    try {
      const encodedBytes = base64ToUint8Array(shareDocument.audio.base64Data);
      const rawBytes =
        shareDocument.audio.compression === "gzip" ? inflate(encodedBytes) : encodedBytes;
      const blob = new Blob([rawBytes], { type: shareDocument.audio.mimeType });
      objectUrl = URL.createObjectURL(blob);
      setEmbeddedAudioUrl(objectUrl);
      setEmbeddedAudioError(null);
    } catch (err) {
      console.error("Failed to decode shared audio", err);
      setEmbeddedAudioUrl(null);
      setEmbeddedAudioError(t("shareAudioDecodingFailed"));
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [shareDocument?.audio, t]);

  const playbackUrl = embeddedAudioUrl ?? shareDocument?.remoteAudioUrl ?? null;
  const audioReady = Boolean(playbackUrl);
  const segments = useMemo(() => {
    if (!shareDocument?.segments) {
      return [];
    }
    return [...shareDocument.segments].sort((a, b) => {
      const aStart = getSegmentStartMs(a);
      const bStart = getSegmentStartMs(b);
      if (aStart === null && bStart === null) {
        return 0;
      }
      if (aStart === null) {
        return 1;
      }
      if (bStart === null) {
        return -1;
      }
      if (aStart !== bStart) {
        return aStart - bStart;
      }
      const aEnd = getSegmentEndMs(a);
      const bEnd = getSegmentEndMs(b);
      if (aEnd === null && bEnd === null) {
        return 0;
      }
      if (aEnd === null) {
        return 1;
      }
      if (bEnd === null) {
        return -1;
      }
      return aEnd - bEnd;
    });
  }, [shareDocument]);
  const noteModeText = useMemo(() => {
    const aggregated = aggregateSegmentText(segments, true);
    if (aggregated && aggregated.trim().length > 0) {
      return aggregated;
    }
    return (
      shareDocument?.correctedAggregatedText ??
      shareDocument?.aggregatedText ??
      shareDocument?.transcriptText ??
      ""
    );
  }, [segments, shareDocument]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

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
    setNoteMode(false);
    setWordDetailsVisibility({});
    setActiveSegmentId(null);
    setActiveWordHighlight(null);
    activeSegmentIdRef.current = null;
    activeWordHighlightRef.current = null;
  }, [shareDocument?.id]);

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

  const findSegmentForPlaybackTime = useCallback((currentSeconds: number): ShareSegment | null => {
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
        const timing = resolveWordTimingMs(segment, word);
        const endMs = timing.startMs + timing.durationMs;
        return currentMs >= timing.startMs - toleranceMs && currentMs < endMs + toleranceMs;
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

  const focusSegmentCard = useCallback((segmentId: string) => {
    const cardRef = segmentCardRefs.current.get(segmentId);
    if (cardRef) {
      cardRef.scrollIntoView({ behavior: "smooth", block: "center" });
      cardRef.focus({ preventScroll: true });
    }
  }, []);

  const handlePlaySegment = useCallback(
    (segment: ShareSegment) => {
      if (!audioReady) return;
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
        return;
      }
      const startMs = getSegmentStartMs(segment);
      if (startMs === null) {
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
      focusSegmentCard(segment.id);
      try {
        const playResult = media.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult.catch(() => {
            segmentEndRef.current = null;
            setActiveSegmentId(null);
            setActiveWordHighlight(null);
            activeWordHighlightRef.current = null;
          });
        }
      } catch {
        segmentEndRef.current = null;
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
        activeWordHighlightRef.current = null;
      }
    },
    [audioReady, focusSegmentCard, updateActiveWordHighlight]
  );

  useEffect(() => {
    if (!activeSegmentId) {
      return;
    }
    focusSegmentCard(activeSegmentId);
  }, [activeSegmentId, focusSegmentCard]);

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
  }, [playbackUrl, syncActiveSegmentWithPlayback]);

  const noop = useCallback(() => {}, []);
  const handleWordDetailsToggle = useCallback((segmentId: string) => {
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
  }, [setActiveWordHighlight, setWordDetailsVisibility]);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {requiresPassword && !shareDocument ? (
            <Card>
              <CardHeader title={t("sharePasswordPrompt")} />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label={t("sharePasswordPlaceholder")}
                    type="password"
                    variant="outlined"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && payloadParam) {
                        void loadDocument(payloadParam, password);
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    variant="contained"
                    disabled={loading || !payloadParam}
                    onClick={() => {
                      if (!payloadParam) return;
                      void loadDocument(payloadParam, password);
                    }}
                  >
                    {t("shareUnlock")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {loading && !shareDocument ? (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : null}

          {shareDocument ? (
            <Stack spacing={3}>
              <MediaPlaybackSection
                transcription={shareDocument}
                audioUrl={playbackUrl}
                videoUrl={null}
                mediaRef={mediaElementRef}
                audioLoading={false}
                videoLoading={false}
                audioError={embeddedAudioError}
                videoError={null}
                audioDownloadable={false}
                videoDownloadable={false}
                sticky
                compactOnScroll
                showEditingHint={false}
                t={t}
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
                    editingSegmentId={null}
                    editingValue=""
                    editingWordInputs={null}
                    editingWordTimings={null}
                    savingEdit={false}
                    audioReady={audioReady}
                    readOnly
                    onSpeakerClick={noop}
                    onPlaySegment={handlePlaySegment}
                    onStartEdit={noop}
                    onWordInputChange={noop}
                    onEditValueChange={noop}
                    onCancelEdit={noop}
                    onSaveEdit={noop}
                    onWordDetailsToggle={handleWordDetailsToggle}
                    onKeyDown={noop}
                    segmentCardRefs={segmentCardRefs}
                    t={t}
                  />
                )}
              </Stack>
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
