import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import VideocamIcon from "@mui/icons-material/Videocam";
import DeleteIcon from "@mui/icons-material/Delete";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import type { LocalTranscription } from "../data/app-db";
import type { MutableRefObject } from "react";

type PlaybackTranscription = Pick<
  LocalTranscription,
  "title" | "createdAt" | "kind" | "status" | "errorMessage"
>;

type MediaPlaybackSectionProps = {
  transcription: PlaybackTranscription;
  audioUrl: string | null;
  videoUrl: string | null;
  mediaRef: MutableRefObject<HTMLMediaElement | null>;
  audioLoading?: boolean;
  videoLoading?: boolean;
  audioError?: string | null;
  videoError?: string | null;
  audioDownloadable?: boolean;
  videoDownloadable?: boolean;
  onBack?: () => void;
  onDownloadJson?: () => void;
  onDownloadText?: () => void;
  onDownloadAudio?: () => void;
  onDownloadVideo?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  showEditingHint?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function MediaPlaybackSection({
  transcription,
  audioUrl,
  videoUrl,
  mediaRef,
  audioLoading,
  videoLoading,
  audioError,
  videoError,
  audioDownloadable,
  videoDownloadable,
  onBack,
  onDownloadJson,
  onDownloadText,
  onDownloadAudio,
  onDownloadVideo,
  onDelete,
  onShare,
  showEditingHint,
  t,
}: MediaPlaybackSectionProps) {
  const resolvedTitle =
    transcription.title && transcription.title.trim().length > 0
      ? transcription.title
      : t("untitledTranscription");
  const isAudioLoading = Boolean(audioLoading);
  const isVideoLoading = Boolean(videoLoading);
  const canDownloadAudio = Boolean(audioDownloadable);
  const canDownloadVideo = Boolean(videoDownloadable);
  const showHint = showEditingHint ?? true;
  const hasActions =
    Boolean(onDownloadJson) ||
    Boolean(onDownloadText) ||
    Boolean(onDownloadAudio) ||
    (Boolean(onDownloadVideo) && canDownloadVideo) ||
    Boolean(onDelete) ||
    Boolean(onShare);

  return (
    <Card>
      <CardHeader
        title={resolvedTitle}
        subheader={`${t("creationTime")}: ${dayjs(transcription.createdAt).format("YYYY-MM-DD HH:mm:ss")}`}
        action={
          onBack ? (
            <Button variant="outlined" size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={onBack}>
              {t("toTranscriptionList")}
            </Button>
          ) : null
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {t("type")}: {transcription.kind === "file" ? t("fileTranscription") : t("realTimeTranscription")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("status")}: {transcription.status}
            </Typography>
            {transcription.errorMessage ? <Alert severity="error">{transcription.errorMessage}</Alert> : null}
            {(isAudioLoading || isVideoLoading) && <LinearProgress color="secondary" />}
            {audioError ? <Alert severity="warning">{audioError}</Alert> : null}
            {videoError ? <Alert severity="warning">{videoError}</Alert> : null}
            {videoUrl ? (
              <Box sx={{ mt: 1 }}>
                <video
                  ref={mediaRef as MutableRefObject<HTMLVideoElement | null>}
                  controls
                  src={videoUrl}
                  style={{ width: "100%", maxHeight: "50vh", backgroundColor: "black" }}
                  aria-label={t("recordingPlayback")}
                >
                  {t("yourBrowserDoesNotSupportTheVideoTag")}
                </video>
              </Box>
            ) : audioUrl ? (
              <Box sx={{ mt: 1 }}>
                <audio
                  ref={mediaRef as MutableRefObject<HTMLAudioElement | null>}
                  controls
                  src={audioUrl}
                  style={{ width: "100%" }}
                  aria-label={t("recordingPlayback")}
                >
                  {t("yourBrowserDoesNotSupportTheAudioTag")}
                </audio>
              </Box>
            ) : null}
          </Stack>
          {hasActions ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
              {onDownloadJson ? (
                <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={onDownloadJson} fullWidth sx={{ maxWidth: { sm: 200 } }}>
                  {t("json")}
                </Button>
              ) : null}
              {onDownloadText ? (
                <Button variant="outlined" startIcon={<ArticleIcon />} onClick={onDownloadText} fullWidth sx={{ maxWidth: { sm: 200 } }}>
                  {t("text2")}
                </Button>
              ) : null}
              {onDownloadAudio ? (
                <Button
                  variant="outlined"
                  startIcon={<AudiotrackIcon />}
                  disabled={!canDownloadAudio}
                  onClick={onDownloadAudio}
                  fullWidth
                  sx={{ maxWidth: { sm: 200 } }}
                >
                  {t("audio")}
                </Button>
              ) : null}
              {onDownloadVideo && canDownloadVideo ? (
                <Button
                  variant="outlined"
                  startIcon={<VideocamIcon />}
                  onClick={onDownloadVideo}
                  fullWidth
                  sx={{ maxWidth: { sm: 200 } }}
                >
                  {t("downloadVideo")}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={onDelete}
                  fullWidth
                  sx={{ maxWidth: { sm: 200 } }}
                >
                  {t("delete")}
                </Button>
              ) : null}
              {onShare ? (
                <Button
                  variant="outlined"
                  startIcon={<ShareOutlinedIcon />}
                  onClick={onShare}
                  fullWidth
                  sx={{ maxWidth: { sm: 200 } }}
                >
                  {t("shareButtonLabel")}
                </Button>
              ) : null}
            </Stack>
          ) : null}
          {showHint ? (
            <Typography variant="caption" color="text.secondary">
              {t("발화나 단어를 더블클릭하여 교정할 수 있습니다. h/j/k/l 또는 방향키로 구간을 이동할 수 있습니다.")}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
