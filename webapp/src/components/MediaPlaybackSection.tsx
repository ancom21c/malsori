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

type MediaPlaybackSectionProps = {
  transcription: LocalTranscription;
  audioUrl: string | null;
  videoUrl: string | null;
  mediaRef: MutableRefObject<HTMLMediaElement | null>;
  audioLoading: boolean;
  videoLoading: boolean;
  audioError: string | null;
  videoError: string | null;
  audioDownloadable: boolean;
  videoDownloadable: boolean;
  onBack: () => void;
  onDownloadJson: () => void;
  onDownloadText: () => void;
  onDownloadAudio: () => void;
  onDownloadVideo: () => void;
  onDelete: () => void;
  onShare: () => void;
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
  t,
}: MediaPlaybackSectionProps) {
  return (
    <Card>
      <CardHeader
        title={transcription.title}
        subheader={`${t("creationTime")}: ${dayjs(transcription.createdAt).format("YYYY-MM-DD HH:mm:ss")}`}
        action={
          <Button variant="outlined" size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={onBack}>
            {t("toTranscriptionList")}
          </Button>
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
            {(audioLoading || videoLoading) && <LinearProgress color="secondary" />}
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={onDownloadJson} fullWidth sx={{ maxWidth: { sm: 200 } }}>
              {t("json")}
            </Button>
            <Button variant="outlined" startIcon={<ArticleIcon />} onClick={onDownloadText} fullWidth sx={{ maxWidth: { sm: 200 } }}>
              {t("text2")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AudiotrackIcon />}
              disabled={!audioDownloadable}
              onClick={onDownloadAudio}
              fullWidth
              sx={{ maxWidth: { sm: 200 } }}
            >
              {t("audio")}
            </Button>
            {videoDownloadable ? (
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
            <Button
              variant="outlined"
              startIcon={<ShareOutlinedIcon />}
              onClick={onShare}
              fullWidth
              sx={{ maxWidth: { sm: 200 } }}
            >
              {t("shareButtonLabel")}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t("발화나 단어를 더블클릭하여 교정할 수 있습니다. h/j/k/l 또는 방향키로 구간을 이동할 수 있습니다.")}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
