import { useCallback, useEffect, useState } from "react";
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
  Stack,
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
import { useI18n } from "../../i18n";

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

export default function ShareViewerPage() {
  const { t } = useI18n();
  const [payloadParam, setPayloadParam] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [shareDocument, setShareDocument] = useState<ShareDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddedAudioUrl, setEmbeddedAudioUrl] = useState<string | null>(null);
  const [embeddedAudioError, setEmbeddedAudioError] = useState<string | null>(null);

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
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const payload = hashParams.get("payload") ?? queryParams.get("payload");
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

  const aggregatedText =
    shareDocument?.correctedAggregatedText ??
    shareDocument?.aggregatedText ??
    shareDocument?.transcriptText;

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
                    {embeddedAudioUrl ? (
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          {t("shareAudioIncluded")}
                        </Typography>
                        <audio
                          controls
                          src={embeddedAudioUrl}
                          style={{ width: "100%" }}
                          aria-label={t("recordingPlayback")}
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
                  {shareDocument.segments.length === 0 ? (
                    <Alert severity="info">{t("shareNoSegments")}</Alert>
                  ) : (
                    <Stack spacing={2}>
                      {shareDocument.segments.map((segment) => (
                        <Card key={segment.id} variant="outlined">
                          <CardContent>
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                  size="small"
                                  label={
                                    segment.speaker
                                      ? t("speaker", {
                                          values: { speaker: segment.speaker },
                                        })
                                      : t("speakerNotSpecified")
                                  }
                                />
                                <Chip
                                  size="small"
                                  label={formatSegmentTiming(segment, t("noTimeInformation"))}
                                />
                                {!hasTiming(segment) ? (
                                  <Chip size="small" label={t("noTimeInformation")} />
                                ) : null}
                              </Stack>
                              <Typography variant="body1">
                                {resolveSegmentText(segment) || t("shareSegmentTextEmpty")}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
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
