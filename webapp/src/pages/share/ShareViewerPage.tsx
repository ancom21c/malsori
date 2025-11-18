import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { inflate } from "pako";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DownloadIcon from "@mui/icons-material/Download";
import type { ShareDocument, ShareSegment } from "../../share/payload";
import {
  inspectSharePackage,
  parseSharePayload,
} from "../../share/payload";
import { base64ToUint8Array } from "../../utils/base64";
import { useI18n } from "../../i18n";

declare global {
  interface Window {
    __SHARE_EMBED__?: string;
  }
}

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function buildDownloadFileName(title: string | undefined, fallback: string) {
  const base = (title?.trim().length ? title.trim() : fallback)
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\s+/g, "_");
  const normalized = base || "transcription";
  return {
    fileName: `${normalized}.html`,
    displayTitle: title?.trim().length ? title.trim() : normalized,
  };
}

function formatSegmentTiming(segment: ShareSegment, localeFallback: string) {
  const startLabel =
    typeof segment.startMs === "number" && Number.isFinite(segment.startMs)
      ? `${(segment.startMs / 1000).toFixed(2)}s`
      : null;
  const endLabel =
    typeof segment.endMs === "number" && Number.isFinite(segment.endMs)
      ? `${(segment.endMs / 1000).toFixed(2)}s`
      : null;
  if (startLabel && endLabel) {
    return `${startLabel} ~ ${endLabel}`;
  }
  if (startLabel) {
    return startLabel;
  }
  if (endLabel) {
    return endLabel;
  }
  return localeFallback;
}

function resolveSegmentText(segment: ShareSegment) {
  if (segment.correctedText && segment.correctedText.trim().length > 0) {
    return segment.correctedText.trim();
  }
  if (segment.text && segment.text.trim().length > 0) {
    return segment.text.trim();
  }
  return "";
}

function hasTiming(segment: ShareSegment) {
  if (
    typeof segment.startMs === "number" ||
    typeof segment.endMs === "number"
  ) {
    return true;
  }
  if (segment.words && segment.words.length > 0) {
    return true;
  }
  return false;
}

function getSegmentStartMs(segment: ShareSegment): number | null {
  if (typeof segment.startMs === "number" && Number.isFinite(segment.startMs)) {
    return segment.startMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[0].startMs;
  }
  return null;
}

function getSegmentEndMs(segment: ShareSegment): number | null {
  if (typeof segment.endMs === "number" && Number.isFinite(segment.endMs)) {
    return segment.endMs;
  }
  if (segment.words && segment.words.length > 0) {
    return segment.words[segment.words.length - 1].endMs;
  }
  return null;
}

const WORD_TIMING_RELATIVE_TOLERANCE_MS = 250;

function resolveWordTimingMs(
  segment: ShareSegment,
  word: NonNullable<ShareSegment["words"]>[number]
) {
  const segmentStart = getSegmentStartMs(segment) ?? 0;
  const segmentEnd = getSegmentEndMs(segment);
  const hasSegmentDuration = segmentEnd !== null && typeof segmentEnd === "number" && segmentEnd >= segmentStart;
  const segmentDuration = hasSegmentDuration ? segmentEnd - segmentStart : null;
  const normalize = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const rawStart = normalize(word.startMs);
  const rawEnd = normalize(word.endMs);
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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const segmentEndRef = useRef<number | null>(null);
  const programmaticSeekRef = useRef(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [activeWordHighlight, setActiveWordHighlight] = useState<{ segmentId: string; index: number } | null>(
    null
  );
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
  const segments = shareDocument?.segments ?? [];
  const aggregatedText =
    shareDocument?.correctedAggregatedText ??
    shareDocument?.aggregatedText ??
    shareDocument?.transcriptText;

  const downloadShareHtml = useCallback(() => {
    if (!shareDocument || !payloadParam) return;
    const { fileName, displayTitle } = buildDownloadFileName(shareDocument.title, shareDocument.id);
    const moduleScripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"]'))
      .map((script) => script.getAttribute("src"))
      .filter((src): src is string => Boolean(src))
      .map((src) => new URL(src!, window.location.href).href);
    const styleLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
      .map((href) => new URL(href!, window.location.href).href);
    const htmlContent = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${styleLinks.map((href) => `<link rel="stylesheet" href="${href}" />`).join("\n")}
    <title>${displayTitle}</title>
  </head>
  <body>
    <div id="share-root"></div>
    <script>
      window.__SHARE_EMBED__ = "${payloadParam}";
    </script>
    ${moduleScripts
      .map((src) => `<script type="module" src="${src}" crossorigin="anonymous"></script>`)
      .join("\n")}
  </body>
</html>`;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [shareDocument, payloadParam]);

  const findSegmentForPlaybackTime = useCallback(
    (currentSeconds: number): ShareSegment | null => {
      if (!segments.length) {
        return null;
      }
      const currentMs = currentSeconds * 1000;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const startMs = getSegmentStartMs(segment);
        if (startMs === null) {
          continue;
        }
        const nextStartMs = index + 1 < segments.length ? getSegmentStartMs(segments[index + 1]) : null;
        let endMs = getSegmentEndMs(segment);
        if (endMs === null && nextStartMs !== null) {
          endMs = nextStartMs;
        }
        if (endMs === null) {
          endMs = Number.POSITIVE_INFINITY;
        }
        if (currentMs >= startMs - 200 && currentMs <= endMs + 200) {
          return segment;
        }
        if (currentMs < startMs) {
          break;
        }
      }
      return null;
    },
    [segments]
  );

  const updateActiveWordHighlight = useCallback(
    (segmentId: string, currentSeconds: number) => {
      const segment = segments.find((entry) => entry.id === segmentId);
      if (!segment || !segment.words || segment.words.length === 0) {
        if (activeWordHighlight !== null) {
          setActiveWordHighlight(null);
        }
        return;
      }
      const currentMs = currentSeconds * 1000;
      const toleranceMs = 60;
      const nextIndex = segment.words.findIndex((word) => {
        const timing = resolveWordTimingMs(segment, word);
        return currentMs >= timing.startMs - toleranceMs && currentMs < timing.endMs + toleranceMs;
      });
      const nextHighlight = nextIndex >= 0 ? { segmentId, index: nextIndex } : null;
      const prev = activeWordHighlight;
      if (
        (prev?.segmentId ?? null) !== (nextHighlight?.segmentId ?? null) ||
        (prev?.index ?? null) !== (nextHighlight?.index ?? null)
      ) {
        setActiveWordHighlight(nextHighlight);
      }
    },
    [segments, activeWordHighlight]
  );

  const handlePlaySegment = useCallback(
    (segment: ShareSegment) => {
      if (!playbackUrl) {
        return;
      }
      const audio = audioElementRef.current;
      if (!audio) {
        return;
      }
      if (!hasTiming(segment)) {
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
      if (!audio.paused) {
        audio.pause();
      }
      programmaticSeekRef.current = false;
      if (Math.abs(audio.currentTime - startSeconds) > 0.05) {
        programmaticSeekRef.current = true;
        audio.currentTime = startSeconds;
      }
      segmentEndRef.current = endSeconds;
      setActiveSegmentId(segment.id);
      updateActiveWordHighlight(segment.id, startSeconds);
      const cardRef = segmentCardRefs.current.get(segment.id);
      if (cardRef) {
        cardRef.scrollIntoView({ behavior: "smooth", block: "center" });
        cardRef.focus({ preventScroll: true });
      }
      void audio.play().catch(() => {
        segmentEndRef.current = null;
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
      });
    },
    [playbackUrl, updateActiveWordHighlight]
  );

  useEffect(() => {
    if (!activeSegmentId) {
      return;
    }
    const ref = segmentCardRefs.current.get(activeSegmentId);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.focus({ preventScroll: true });
    }
  }, [activeSegmentId]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }
    const handleTimeUpdate = () => {
      const endBoundary = segmentEndRef.current;
      if (endBoundary !== null && Number.isFinite(endBoundary)) {
        if (audio.currentTime >= endBoundary - 0.05) {
          audio.pause();
          audio.currentTime = endBoundary;
          segmentEndRef.current = null;
          setActiveSegmentId(null);
          setActiveWordHighlight(null);
          return;
        }
      }
      const match = findSegmentForPlaybackTime(audio.currentTime);
      if (match) {
        if (activeSegmentId !== match.id) {
          setActiveSegmentId(match.id);
        }
        updateActiveWordHighlight(match.id, audio.currentTime);
      } else if (activeSegmentId) {
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
      }
    };
    const handleStop = () => {
      segmentEndRef.current = null;
      setActiveSegmentId(null);
      setActiveWordHighlight(null);
    };
    const handleSeeking = () => {
      if (programmaticSeekRef.current) {
        return;
      }
      handleStop();
    };
    const handleSeeked = () => {
      if (programmaticSeekRef.current) {
        programmaticSeekRef.current = false;
        return;
      }
      const match = findSegmentForPlaybackTime(audio.currentTime);
      if (match) {
        setActiveSegmentId(match.id);
        updateActiveWordHighlight(match.id, audio.currentTime);
      } else {
        setActiveSegmentId(null);
        setActiveWordHighlight(null);
      }
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleStop);
    audio.addEventListener("pause", handleStop);
    audio.addEventListener("seeking", handleSeeking);
    audio.addEventListener("seeked", handleSeeked);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleStop);
      audio.removeEventListener("pause", handleStop);
      audio.removeEventListener("seeking", handleSeeking);
      audio.removeEventListener("seeked", handleSeeked);
    };
  }, [activeSegmentId, findSegmentForPlaybackTime, updateActiveWordHighlight]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 4,
        px: 2,
        background:
          "linear-gradient(180deg, rgba(229, 89, 89, 0.06), rgba(0,0,0,0))",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1">
              {t("sharePageTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("sharePageSubtitle")}
            </Typography>
          </Box>

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
            <Stack spacing={2}>
              <Card>
                <CardHeader
                  title={shareDocument.title || t("untitledTranscription")}
                  subheader={`${t("creationTime")}: ${dayjs(
                    shareDocument.createdAt
                  ).format("YYYY-MM-DD HH:mm:ss")}`}
                />
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={
                          shareDocument.kind === "file"
                            ? t("fileTranscription")
                            : t("realTimeTranscription")
                        }
                      />
                      <Chip label={`${t("status")}: ${shareDocument.status}`} />
                      {shareDocument.modelName ? (
                        <Chip label={shareDocument.modelName} />
                      ) : null}
                      {shareDocument.backendEndpointName ? (
                        <Chip label={shareDocument.backendEndpointName} />
                      ) : null}
                    </Stack>
                    {playbackUrl ? (
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          {t("shareAudioIncluded")}
                        </Typography>
                        <audio
                          controls
                          src={playbackUrl}
                          style={{ width: "100%" }}
                          aria-label={t("recordingPlayback")}
                          ref={audioElementRef}
                        >
                          {t("yourBrowserDoesNotSupportTheAudioTag")}
                        </audio>
                        {embeddedAudioError ? (
                          <Alert severity="warning">{embeddedAudioError}</Alert>
                        ) : null}
                      </Stack>
                    ) : shareDocument.remoteAudioUrl ? (
                      <Alert severity="info">
                        {t("shareRemoteAudioAvailable")}{" "}
                        <Button
                          component="a"
                          href={shareDocument.remoteAudioUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          size="small"
                        >
                          {t("sharePlayRemoteAudio")}
                        </Button>
                      </Alert>
                    ) : (
                      <Alert severity="info">{t("shareAudioUnavailable")}</Alert>
                    )}
                    <Stack alignItems="flex-end">
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={downloadShareHtml}
                      >
                        {t("shareDownloadHtml")}
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {t("updatedAt")}:{" "}
                      {dayjs(shareDocument.updatedAt ?? shareDocument.createdAt).format(
                        "YYYY-MM-DD HH:mm:ss"
                      )}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              {aggregatedText ? (
                <Card>
                  <CardHeader title={t("shareAggregatedText")} />
                  <CardContent>
                    <Typography
                      component="pre"
                      sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    >
                      {aggregatedText}
                    </Typography>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader
                  title={t("shareSegmentsTitle")}
                  subheader={t("shareSegmentsSubTitle", {
                    values: { count: shareDocument.segments.length },
                  })}
                />
                <CardContent>
                    {segments.length === 0 ? (
                      <Alert severity="info">{t("shareNoSegments")}</Alert>
                    ) : (
                      <Stack spacing={2}>
                        {segments.map((segment) => {
                          const isActive = activeSegmentId === segment.id;
                          const hasTimingInfo = hasTiming(segment);
                          const startMs = getSegmentStartMs(segment);
                          const timingLabel = hasTimingInfo
                            ? formatSegmentTiming(segment, t("noTimeInformation"))
                            : t("noTimeInformation");
                          const highlightWordIndex =
                            activeWordHighlight?.segmentId === segment.id ? activeWordHighlight.index : null;
                          return (
                            <Card
                              key={segment.id}
                              variant={isActive ? "outlined" : undefined}
                              ref={(node) => {
                                if (node) {
                                  segmentCardRefs.current.set(segment.id, node);
                                } else {
                                  segmentCardRefs.current.delete(segment.id);
                                }
                              }}
                              tabIndex={-1}
                              sx={{
                                borderColor: isActive ? "primary.main" : undefined,
                              }}
                            >
                              <CardContent>
                                <Stack spacing={1}>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                    <Chip
                                      size="small"
                                      label={
                                        segment.speaker
                                          ? t("speaker", { values: { speaker: segment.speaker } })
                                          : t("speakerNotSpecified")
                                      }
                                    />
                                    <Chip size="small" label={timingLabel} />
                                    <Tooltip title={t("sharePlaySegment")}>
                                      <span>
                                        <IconButton
                                          color="primary"
                                          size="small"
                                          disabled={!playbackUrl || !hasTimingInfo || startMs === null}
                                          onClick={() => handlePlaySegment(segment)}
                                        >
                                          <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Stack>
                                  {segment.words && segment.words.length > 0 ? (
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                      {segment.words.map((word, index) => {
                                        const isActiveWord = highlightWordIndex === index;
                                        return (
                                          <Box
                                            key={`${segment.id}-word-${index}`}
                                            component="span"
                                            sx={{
                                              px: 0.75,
                                              py: 0.25,
                                              borderRadius: 1,
                                              border: "1px solid",
                                              borderColor: isActiveWord ? "primary.main" : "divider",
                                              bgcolor: isActiveWord ? "primary.main" : "transparent",
                                              color: isActiveWord ? "primary.contrastText" : "text.primary",
                                              fontWeight: isActiveWord ? 600 : 400,
                                            }}
                                          >
                                            {word.text}
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  ) : (
                                    <Typography variant="body1">
                                      {resolveSegmentText(segment) || t("shareSegmentTextEmpty")}
                                    </Typography>
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
