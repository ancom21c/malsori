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
  compactLayout?: boolean;
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
  compactLayout = false,
}: RealtimeStatusBannerProps) {
  const { t } = useI18n();

  const showConnectionBanner =
    sessionState !== "idle" && connectionUxState.phase !== "normal";
  const bufferedSeconds = Math.max(1, Math.ceil(streamingBufferMetrics.bufferedAudioMs / 1000));
  const bannerTone =
    connectionUxState.phase === "failed"
      ? "error"
      : connectionUxState.phase === "reconnecting" || streamingBufferMetrics.degraded
        ? "warning"
        : "primary";
  const bannerBorderColor =
    connectionUxState.phase === "failed"
      ? "error.main"
      : connectionUxState.phase === "reconnecting" || streamingBufferMetrics.degraded
        ? "warning.main"
        : "transparent";
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

  const compactSupplementaryMessage =
    connectionUxState.phase !== "failed" && showConnectionBanner && connectionBannerMessage
      ? connectionBannerMessage
      : streamingBufferMetrics.degraded
        ? t("someBufferedAudioCouldNotBeReplayedResultsMayBeIncomplete")
        : streamingBufferMetrics.bufferedAudioMs > 0
          ? t("bufferedAudioWillReplayWhenConnectionReturns", {
            values: { seconds: bufferedSeconds },
          })
          : null;

  return (
    <Stack spacing={compactLayout ? 1.25 : 2}>
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
          borderColor: bannerBorderColor,
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette[bannerTone].main, bannerTone === "primary" ? 0.15 : 0.2)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
          transition: "border-color .3s ease, box-shadow .3s ease",
        }}
      >
        <CardContent
          sx={{
            position: "relative",
            p: compactLayout ? 1.5 : 2,
            "&:last-child": { pb: compactLayout ? 1.5 : 2 },
          }}
        >
          <Stack spacing={compactLayout ? 1.25 : 2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={compactLayout ? 1.25 : 2}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Stack spacing={0.25}>
                  {!compactLayout && (
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ letterSpacing: 0.75, lineHeight: 1 }}
                    >
                      {t("realTimeTranscription")}
                    </Typography>
                  )}
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
                            ? `0 0 12px ${connectionUxState.phase === "failed"
                              ? alpha(theme.palette.error.main, 0.4)
                              : connectionUxState.phase === "reconnecting"
                                ? alpha(theme.palette.warning.main, 0.4)
                                : alpha(theme.palette.success.main, 0.4)
                            }`
                            : "none",
                      }}
                    />
                    <Typography variant={compactLayout ? "subtitle1" : "h6"} sx={{ fontWeight: 700 }}>
                      {sessionStateLabel}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Stack
                direction="row"
                spacing={compactLayout ? 1 : 1.5}
                alignItems="center"
                justifyContent={compactLayout ? "space-between" : "flex-end"}
                flexWrap="wrap"
                useFlexGap
              >
                <Stack alignItems={compactLayout ? "flex-start" : "flex-end"}>
                  <Typography
                    variant={compactLayout ? "caption" : "subtitle2"}
                    color={
                      latencyChipColor === "default"
                        ? "text.secondary"
                        : `${latencyChipColor}.main`
                    }
                  >
                    {latencyLevelLabel}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.6, fontSize: "0.7rem", mt: compactLayout ? 0 : -0.5 }}
                  >
                    {latencyValueLabel}
                  </Typography>
                </Stack>

                <StatusChipSet
                  items={statusChipItems}
                />
              </Stack>
            </Stack>

            {compactLayout && compactSupplementaryMessage && (
              <Box
                sx={{
                  px: 1.25,
                  py: 0.875,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.common.black, 0.24),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {compactSupplementaryMessage}
                </Typography>
              </Box>
            )}

            {(microphonePermissionState === "denied" ||
              (storagePermissionSupported && storagePermissionState === "denied") ||
              connectionUxState.phase === "failed") && (
                <Box
                  sx={{
                    p: compactLayout ? 1.25 : 1.5,
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

      {!compactLayout && showConnectionBanner && connectionUxState.phase !== "failed" && (
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

      {!compactLayout && streamingBufferMetrics.bufferedAudioMs > 0 && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.info.main, 0.2),
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.05),
          }}
        >
          {t("bufferedAudioWillReplayWhenConnectionReturns", {
            values: { seconds: bufferedSeconds },
          })}
        </Alert>
      )}

      {!compactLayout && streamingBufferMetrics.degraded && (
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
