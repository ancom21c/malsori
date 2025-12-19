import dayjs from "dayjs";
import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Fab,
  LinearProgress,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import VideocamIcon from "@mui/icons-material/Videocam";
import DeleteIcon from "@mui/icons-material/Delete";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
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
  onTitleUpdate?: (nextTitle: string) => Promise<void> | void;
  sticky?: boolean;
  compactOnScroll?: boolean;
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
  onTitleUpdate,
  sticky,
  compactOnScroll,
  showEditingHint,
  t,
}: MediaPlaybackSectionProps) {
  const rawTitle = transcription.title?.trim() ?? "";
  const resolvedTitle = rawTitle.length > 0 ? rawTitle : t("untitledTranscription");
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
  const canEditTitle = Boolean(onTitleUpdate);
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
  const actionsOpen = Boolean(actionsAnchor);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(rawTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const actionsId = actionsOpen ? "media-actions-popover" : undefined;

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(rawTitle);
    }
  }, [isEditingTitle, rawTitle]);

  useEffect(() => {
    if (!compactOnScroll) {
      return;
    }
    const handleScroll = () => {
      setIsCompact(window.scrollY > 120);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [compactOnScroll]);

  const handleActionsToggle = (event: MouseEvent<HTMLElement>) => {
    if (actionsOpen) {
      setActionsAnchor(null);
      return;
    }
    setActionsAnchor(event.currentTarget);
  };

  const handleActionsClose = () => {
    setActionsAnchor(null);
  };

  const handleTitleSubmit = async () => {
    if (!onTitleUpdate) {
      setIsEditingTitle(false);
      return;
    }
    const nextTitle = titleDraft.trim();
    if (nextTitle === rawTitle) {
      setIsEditingTitle(false);
      return;
    }
    setIsSavingTitle(true);
    try {
      await onTitleUpdate(nextTitle);
    } finally {
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  const renderActionFab = (
    label: string,
    icon: ReactNode,
    onClick: (() => void) | undefined,
    options?: { disabled?: boolean; color?: "primary" | "secondary" | "error" }
  ) => {
    if (!onClick) {
      return null;
    }
    const disabled = options?.disabled ?? false;
    const color = options?.color ?? "primary";
    return (
      <Tooltip title={label} placement="left">
        <span>
          <Fab
            size="small"
            color={color}
            onClick={() => {
              if (disabled) return;
              onClick();
              handleActionsClose();
            }}
            disabled={disabled}
            aria-label={label}
            sx={{ boxShadow: "none" }}
          >
            {icon}
          </Fab>
        </span>
      </Tooltip>
    );
  };

  return (
    <Card
      sx={(theme) => ({
        position: sticky ? "sticky" : "relative",
        top: sticky ? { xs: "calc(56px + 8px)", sm: "calc(64px + 8px)" } : "auto",
        zIndex: sticky ? theme.zIndex.appBar - 1 : "auto",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        boxShadow: isCompact ? theme.shadows[3] : theme.shadows[1],
      })}
    >
      <CardHeader
        sx={{ py: isCompact ? 1 : 2 }}
        title={
          <Stack spacing={0.4}>
            {isEditingTitle ? (
              <TextField
                size="small"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => {
                  if (!isSavingTitle) {
                    void handleTitleSubmit();
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleTitleSubmit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsEditingTitle(false);
                    setTitleDraft(rawTitle);
                  }
                }}
                placeholder={t("untitledTranscription")}
                disabled={isSavingTitle}
                fullWidth
              />
            ) : (
              <Typography
                variant={isCompact ? "subtitle1" : "h6"}
                sx={{ cursor: canEditTitle ? "text" : "default" }}
                onDoubleClick={() => {
                  if (!canEditTitle) return;
                  setIsEditingTitle(true);
                  setTitleDraft(rawTitle);
                }}
              >
                {resolvedTitle}
              </Typography>
            )}
            {!isCompact ? (
              <Typography variant="body2" color="text.secondary">
                {t("creationTime")}: {dayjs(transcription.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              </Typography>
            ) : null}
          </Stack>
        }
        action={
          onBack || hasActions ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {hasActions ? (
                <Fab
                  size="small"
                  color="primary"
                  onClick={handleActionsToggle}
                  aria-label={actionsOpen ? t("collapseOptions") : t("expandOptions")}
                  aria-describedby={actionsId}
                  sx={{ boxShadow: "none" }}
                >
                  {actionsOpen ? <CloseIcon fontSize="small" /> : <MoreHorizIcon fontSize="small" />}
                </Fab>
              ) : null}
              {onBack ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon fontSize="small" />}
                  onClick={onBack}
                >
                  {t("toTranscriptionList")}
                </Button>
              ) : null}
            </Stack>
          ) : null
        }
      />
      <CardContent sx={{ pt: isCompact ? 1.5 : 2, pb: isCompact ? 1.5 : 2 }}>
        <Stack spacing={isCompact ? 1.25 : 2}>
          <Stack spacing={isCompact ? 0.5 : 1}>
            {!isCompact ? (
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  {t("type")}: {transcription.kind === "file" ? t("fileTranscription") : t("realTimeTranscription")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("status")}: {transcription.status}
                </Typography>
              </Stack>
            ) : null}
            {transcription.errorMessage ? <Alert severity="error">{transcription.errorMessage}</Alert> : null}
            {(isAudioLoading || isVideoLoading) && <LinearProgress color="secondary" />}
            {audioError ? <Alert severity="warning">{audioError}</Alert> : null}
            {videoError ? <Alert severity="warning">{videoError}</Alert> : null}
            {videoUrl ? (
              <Box sx={{ mt: isCompact ? 0.5 : 1 }}>
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
              <Box sx={{ mt: isCompact ? 0.5 : 1 }}>
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
            <Popover
              id={actionsId}
              open={actionsOpen}
              anchorEl={actionsAnchor}
              onClose={handleActionsClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ sx: { p: 1, borderRadius: 3 } }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                sx={{ maxWidth: { xs: 240, sm: 320 } }}
              >
                {renderActionFab(t("json"), <DescriptionIcon fontSize="small" />, onDownloadJson)}
                {renderActionFab(t("text2"), <ArticleIcon fontSize="small" />, onDownloadText)}
                {renderActionFab(t("audio"), <AudiotrackIcon fontSize="small" />, onDownloadAudio, {
                  disabled: !canDownloadAudio,
                })}
                {onDownloadVideo && canDownloadVideo
                  ? renderActionFab(t("downloadVideo"), <VideocamIcon fontSize="small" />, onDownloadVideo)
                  : null}
                {renderActionFab(t("delete"), <DeleteIcon fontSize="small" />, onDelete, { color: "error" })}
                {renderActionFab(t("shareButtonLabel"), <ShareOutlinedIcon fontSize="small" />, onShare, {
                  color: "secondary",
                })}
              </Stack>
            </Popover>
          ) : null}
          {showHint && !isCompact ? (
            <Typography variant="caption" color="text.secondary">
              {t("발화나 단어를 더블클릭하여 교정할 수 있습니다. h/j/k/l 또는 방향키로 구간을 이동할 수 있습니다.")}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
