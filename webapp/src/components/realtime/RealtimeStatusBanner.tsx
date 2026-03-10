import {
  Box,
  Button,
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
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          border: 1,
          borderColor: bannerBorderColor,
          borderRadius: 3,
          bgcolor: (theme) =>
            alpha(theme.palette[bannerTone].main, bannerTone === "primary" ? 0.08 : 0.12),
          px: compactLayout ? 1.5 : 2,
          py: compactLayout ? 1.25 : 1.5,
        }}
      >
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={compactLayout ? 1 : 1.5}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
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
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {sessionStateLabel}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={compactLayout ? 1 : 1.25}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography
                variant="caption"
                color={
                  latencyChipColor === "default"
                    ? "text.secondary"
                    : `${latencyChipColor}.main`
                }
              >
                {latencyLevelLabel} · {latencyValueLabel}
              </Typography>
              <StatusChipSet items={statusChipItems} />
            </Stack>
          </Stack>

          {compactSupplementaryMessage && (
            <Typography variant="caption" color="text.secondary">
              {compactSupplementaryMessage}
            </Typography>
          )}

          {(microphonePermissionState === "denied" ||
            (storagePermissionSupported && storagePermissionState === "denied") ||
            connectionUxState.phase === "failed") && (
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
            )}

          {connectionBannerMessage && connectionUxState.phase === "failed" && (
            <Typography
              variant="caption"
              color="error.main"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <ErrorOutlineIcon fontSize="inherit" />
              {connectionBannerMessage}
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
