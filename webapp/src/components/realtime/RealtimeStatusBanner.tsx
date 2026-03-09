import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MicIcon from "@mui/icons-material/Mic";
import RefreshIcon from "@mui/icons-material/Refresh";
import StorageIcon from "@mui/icons-material/Storage";
import { alpha } from "@mui/material/styles";
import { useI18n } from "../../i18n";
import type { RealtimeConnectionUxState } from "../../pages/realtimeConnectionUx";
import type { StreamingBufferMetrics } from "../../services/api/rtzrStreamingClient";
import type { BrowserPermissionState } from "../../services/permissions";
import { StatusChipSet, type StatusChipItem } from "../studio";

interface RealtimeStatusBannerProps {
  sessionState: string;
  sessionStateLabel: string;
  connectionUxState: RealtimeConnectionUxState;
  streamingBufferMetrics: StreamingBufferMetrics;
  latencyLevelLabel: string;
  latencyValueLabel: string;
  latencyChipColor: "default" | "success" | "warning" | "error";
  countdown: number;
  connectionBannerMessage: string | null;
  microphonePermissionState?: BrowserPermissionState;
  storagePermissionState?: BrowserPermissionState;
  storagePermissionSupported?: boolean;
  retryingMicrophonePermission?: boolean;
  retryingStoragePermission?: boolean;
  onRetryMicrophonePermission?: () => void;
  onRetryStoragePermission?: () => void;
  onManualRetryConnection?: () => void;
}

export default function RealtimeStatusBanner({
  sessionState,
  sessionStateLabel,
  connectionUxState,
  streamingBufferMetrics,
  latencyLevelLabel,
  latencyValueLabel,
  latencyChipColor,
  countdown,
  connectionBannerMessage,
  microphonePermissionState,
  storagePermissionState,
  storagePermissionSupported,
  retryingMicrophonePermission = false,
  retryingStoragePermission = false,
  onRetryMicrophonePermission,
  onRetryStoragePermission,
  onManualRetryConnection,
}: RealtimeStatusBannerProps) {
  const { t } = useI18n();

  const showConnectionBanner =
    sessionState !== "idle" && connectionUxState.phase !== "normal";
  const bufferedSeconds = Math.max(1, Math.ceil(streamingBufferMetrics.bufferedAudioMs / 1000));
  const statusChipItems: StatusChipItem[] = [];

  if (sessionState === "countdown") {
    statusChipItems.push({
      key: "session-countdown",
      label: t("readyToStartS", {
        values: { seconds: Math.max(countdown, 0) },
      }),
      color: "secondary" as const,
    });
  }

  if (streamingBufferMetrics.bufferedAudioMs > 0) {
    statusChipItems.push({
      key: "streaming-buffering",
      label: t("bufferingAudioS", {
        values: { seconds: bufferedSeconds },
      }),
      color: "warning" as const,
    });
  }

  if (streamingBufferMetrics.degraded) {
    statusChipItems.push({
      key: "streaming-degraded",
      label: t("sessionQualityDegraded"),
      color: "error" as const,
    });
  }

  return (
    <Stack spacing={2}>
      {sessionState !== "idle" &&
        (sessionState === "connecting" ||
          sessionState === "stopping" ||
          sessionState === "saving") && (
          <LinearProgress sx={{ borderRadius: 1, height: 2 }} />
        )}
      <Card
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderColor:
            connectionUxState.phase === "failed"
              ? "error.main"
              : connectionUxState.phase === "reconnecting"
                ? "warning.main"
                : streamingBufferMetrics.degraded
                  ? "warning.main"
                : "divider",
          backgroundImage: (theme) =>
            connectionUxState.phase === "failed"
              ? `linear-gradient(145deg, ${alpha(theme.palette.error.main, 0.16)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 62%)`
              : connectionUxState.phase === "reconnecting"
                ? `linear-gradient(145deg, ${alpha(theme.palette.warning.main, 0.17)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 62%)`
                : streamingBufferMetrics.degraded
                  ? `linear-gradient(145deg, ${alpha(theme.palette.warning.main, 0.14)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 64%)`
                : `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 64%)`,
          transition: "border-color 200ms ease, background-color 200ms ease",
        }}
      >
        <CardContent sx={{ position: "relative", "&:last-child": { pb: 2 } }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Stack spacing={0.25}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: 0.75, lineHeight: 1 }}
                  >
                    {t("realTimeTranscription")}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        bgcolor:
                          connectionUxState.phase === "failed"
                            ? "error.main"
                            : connectionUxState.phase === "reconnecting"
                              ? "warning.main"
                              : sessionState === "recording"
                                ? "success.main"
                                : "text.disabled",
                        boxShadow: (theme) =>
                          sessionState === "recording" ||
                          connectionUxState.phase !== "normal"
                            ? `0 0 12px ${
                                connectionUxState.phase === "failed"
                                  ? alpha(theme.palette.error.main, 0.4)
                                  : connectionUxState.phase === "reconnecting"
                                    ? alpha(theme.palette.warning.main, 0.4)
                                    : alpha(theme.palette.success.main, 0.4)
                              }`
                            : "none",
                      }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {sessionStateLabel}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Stack alignItems="flex-end">
                  <Typography
                    variant="subtitle2"
                    color={
                      latencyChipColor === "default"
                        ? "text.secondary"
                        : `${latencyChipColor}.main`
                    }
                  >
                    {latencyLevelLabel}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ opacity: 0.6, fontSize: "0.7rem", mt: -0.5 }}
                  >
                    {latencyValueLabel}
                  </Typography>
                </Stack>

                <StatusChipSet
                  items={statusChipItems}
                />
              </Stack>
            </Stack>

            {(microphonePermissionState === "denied" ||
              (storagePermissionSupported && storagePermissionState === "denied") ||
              connectionUxState.phase === "failed") && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha("#000", 0.4),
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {microphonePermissionState === "denied" && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<MicIcon />}
                      onClick={onRetryMicrophonePermission}
                      disabled={retryingMicrophonePermission}
                      sx={{ borderRadius: 2 }}
                    >
                      {t("reRequestPermission")}
                    </Button>
                  )}
                  {storagePermissionSupported && storagePermissionState === "denied" && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<StorageIcon />}
                      onClick={onRetryStoragePermission}
                      disabled={retryingStoragePermission}
                      sx={{ borderRadius: 2 }}
                    >
                      {t("storagePermissions")}
                    </Button>
                  )}
                  {connectionUxState.phase === "failed" && (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<RefreshIcon />}
                      onClick={onManualRetryConnection}
                      sx={{ borderRadius: 2 }}
                    >
                      {t("retryConnection")}
                    </Button>
                  )}
                </Stack>
                {connectionBannerMessage && (
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <ErrorOutlineIcon fontSize="inherit" />
                    {connectionBannerMessage}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {showConnectionBanner && connectionUxState.phase !== "failed" && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.warning.main, 0.2),
          }}
        >
          {connectionBannerMessage}
        </Alert>
      )}

      {streamingBufferMetrics.bufferedAudioMs > 0 && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.info.main, 0.2),
          }}
        >
          {t("bufferedAudioWillReplayWhenConnectionReturns", {
            values: { seconds: bufferedSeconds },
          })}
        </Alert>
      )}

      {streamingBufferMetrics.degraded && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.warning.main, 0.2),
          }}
        >
          {t("someBufferedAudioCouldNotBeReplayedResultsMayBeIncomplete")}
        </Alert>
      )}
    </Stack>
  );
}
