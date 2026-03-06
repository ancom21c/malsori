import {
  Box,
  CircularProgress,
  Fab,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import MicNoneRoundedIcon from "@mui/icons-material/MicNoneRounded";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VideocamOffRoundedIcon from "@mui/icons-material/VideocamOffRounded";
import { alpha, useTheme } from "@mui/material/styles";
import { useI18n } from "../../i18n";
import AudioVisualizer from "../audio/AudioVisualizer";

interface RealtimeToolbarProps {
  sessionState: string;
  retryingConnection: boolean;
  onMainAction: () => void;
  onStopAction: () => void;
  onRuntimeSettingsOpen: () => void;
  cameraSupported: boolean;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  audioLevel: number;
  mainButtonPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  clearPointerState?: () => void;
}

export default function RealtimeToolbar({
  sessionState,
  retryingConnection,
  onMainAction,
  onStopAction,
  onRuntimeSettingsOpen,
  cameraSupported,
  cameraEnabled,
  onToggleCamera,
  audioLevel,
  mainButtonPointerDown,
  clearPointerState,
}: RealtimeToolbarProps) {
  const { t } = useI18n();
  const theme = useTheme();

  const sessionActive = sessionState !== "idle";
  const isRecording = sessionState === "recording";
  const mainButtonDisabled =
    sessionState === "saving" ||
    sessionState === "stopping" ||
    retryingConnection;

  const mainButtonIcon = (() => {
    switch (sessionState) {
      case "idle":
        return <MicNoneRoundedIcon />;
      case "recording":
        return <PauseRoundedIcon />;
      case "paused":
        return retryingConnection ? (
          <CircularProgress size={24} color="inherit" thickness={5} />
        ) : (
          <PlayArrowRoundedIcon />
        );
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

  const mainButtonColor =
    sessionState === "recording" || sessionState === "paused"
      ? "secondary"
      : sessionState === "saving" || sessionState === "stopping"
        ? "success"
        : "primary";

  const mainButtonLabel =
    sessionState === "recording"
      ? t("pause")
      : sessionState === "connecting" || sessionState === "countdown"
        ? t("connecting")
        : t("realTimeTranscription");

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        px: 2,
        pt: 2,
        pb: "calc(24px + env(safe-area-inset-bottom))",
        background: `linear-gradient(to top, ${alpha(theme.palette.background.default, 0.94)} 18%, ${alpha(theme.palette.background.default, 0.72)} 54%, transparent 100%)`,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 4,
          px: 2,
          py: 1.5,
          backgroundColor: alpha(theme.palette.background.paper, 0.94),
          border: "1px solid",
          borderColor: alpha(theme.palette.common.white, 0.07),
          boxShadow: "0 18px 36px rgba(0,0,0,0.32)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box sx={{ width: "100%", px: 0.5, pb: 1.25, mb: 1.5, borderBottom: "1px solid", borderColor: alpha(theme.palette.common.white, 0.06) }}>
          <AudioVisualizer level={audioLevel} active={isRecording || sessionState === "paused"} />
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Tooltip title={t("streamTranscriptionSettings")}>
            <IconButton
              onClick={onRuntimeSettingsOpen}
              aria-label={t("streamTranscriptionSettings")}
              sx={{
                bgcolor: alpha(theme.palette.background.default, 0.84),
                border: "1px solid",
                borderColor: alpha(theme.palette.common.white, 0.08),
              }}
            >
              <SettingsRoundedIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ position: "relative" }}>
            <Fab
              color={mainButtonColor}
              size="large"
              disabled={mainButtonDisabled}
              onClick={onMainAction}
              onPointerDown={mainButtonPointerDown}
              onPointerUp={clearPointerState}
              onPointerLeave={clearPointerState}
              onPointerCancel={clearPointerState}
              aria-label={mainButtonLabel}
              sx={{
                width: 72,
                height: 72,
                boxShadow: (currentTheme) =>
                  `0 12px 24px ${alpha(currentTheme.palette[mainButtonColor].main, 0.22)}`,
              }}
            >
              {mainButtonIcon}
            </Fab>
            {isRecording && (
              <Box
                sx={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: alpha(theme.palette.secondary.main, 0.5),
                  animation: "pulse 2s infinite",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(1)", opacity: 0.6 },
                    "100%": { transform: "scale(1.12)", opacity: 0 },
                  },
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
                    opacity: 0.5,
                  },
                }}
              />
            )}
          </Box>

          {sessionActive && (
            <Tooltip title={t("sessionEnds")}>
              <Fab
                color="error"
                size="medium"
                onClick={onStopAction}
                aria-label={t("sessionEnds")}
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.82),
                  boxShadow: `0 10px 22px ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <StopCircleIcon />
              </Fab>
            </Tooltip>
          )}

          {cameraSupported && (
            <Tooltip title={cameraEnabled ? t("disableCamera") : t("enableCamera")}>
              <IconButton
                onClick={onToggleCamera}
                aria-label={cameraEnabled ? t("disableCamera") : t("enableCamera")}
                sx={{
                  color: cameraEnabled ? theme.palette.primary.main : theme.palette.text.secondary,
                  bgcolor: alpha(theme.palette.background.default, 0.84),
                  border: "1px solid",
                  borderColor: alpha(theme.palette.common.white, 0.08),
                }}
              >
                {cameraEnabled ? <VideocamRoundedIcon /> : <VideocamOffRoundedIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
