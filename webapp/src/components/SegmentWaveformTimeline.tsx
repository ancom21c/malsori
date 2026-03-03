import { useEffect, useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { Box, Button, FormControlLabel, Slider, Stack, Switch, Typography } from "@mui/material";
import type { LocalSegment } from "../data/app-db";
import { getSegmentEndMs, getSegmentStartMs } from "../utils/segments";

type SegmentWaveformTimelineProps = {
  audioSourceUrl: string | null;
  segments: LocalSegment[];
  activeSegmentId: string | null;
  currentTimeSeconds: number;
  durationSeconds: number;
  loopEnabled: boolean;
  loopStartSeconds: number | null;
  loopEndSeconds: number | null;
  onSeek: (seconds: number) => void;
  onSelectSegment: (segment: LocalSegment) => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onSetLoopFromActiveSegment: () => void;
  onClearLoop: () => void;
  onToggleLoop: (next: boolean) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

type SegmentRange = {
  segment: LocalSegment;
  index: number;
  startSeconds: number;
  endSeconds: number;
};

const PEAK_BUCKET_COUNT = 220;
const MIN_LOOP_GAP_SECONDS = 0.2;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTimelineTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  const centiseconds = Math.floor((safe % 1) * 100);
  if (safe < 60) {
    return `${String(remainder).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}s`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function resolveDurationSeconds(segments: LocalSegment[], durationSeconds: number) {
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return durationSeconds;
  }
  let maxEndSeconds = 0;
  segments.forEach((segment) => {
    const endMs = getSegmentEndMs(segment);
    if (endMs === null) {
      return;
    }
    maxEndSeconds = Math.max(maxEndSeconds, endMs / 1000);
  });
  return maxEndSeconds;
}

function resolveSegmentRanges(segments: LocalSegment[], durationSeconds: number): SegmentRange[] {
  if (!segments.length || durationSeconds <= 0) {
    return [];
  }
  return segments
    .map((segment, index) => {
      const startMs = getSegmentStartMs(segment);
      if (startMs === null) {
        return null;
      }
      const endMsRaw = getSegmentEndMs(segment);
      const endMs = endMsRaw !== null && endMsRaw >= startMs ? endMsRaw : startMs + 400;
      const startSeconds = clamp(startMs / 1000, 0, durationSeconds);
      const endSeconds = clamp(endMs / 1000, startSeconds, durationSeconds);
      return {
        segment,
        index,
        startSeconds,
        endSeconds,
      };
    })
    .filter((entry): entry is SegmentRange => entry !== null);
}

function buildFallbackPeaks(ranges: SegmentRange[], durationSeconds: number, bucketCount: number) {
  const peaks = new Array(bucketCount).fill(0.08);
  if (!ranges.length || durationSeconds <= 0) {
    return peaks;
  }
  ranges.forEach((range) => {
    const from = Math.floor((range.startSeconds / durationSeconds) * bucketCount);
    const to = Math.max(from + 1, Math.ceil((range.endSeconds / durationSeconds) * bucketCount));
    const textLength = range.segment.text?.trim().length ?? 0;
    const wordCount = range.segment.words?.length ?? 0;
    const energy = clamp(0.22 + textLength / 180 + wordCount / 70, 0.18, 0.95);
    for (let index = from; index < to && index < bucketCount; index += 1) {
      peaks[index] = Math.max(peaks[index], energy);
    }
  });
  return peaks;
}

function buildAudioPeaks(audioBuffer: AudioBuffer, bucketCount: number) {
  const channelData = audioBuffer.getChannelData(0);
  if (!channelData.length) {
    return new Array(bucketCount).fill(0.08);
  }
  const windowSize = Math.max(1, Math.floor(channelData.length / bucketCount));
  const peaks: number[] = [];
  for (let offset = 0; offset < channelData.length; offset += windowSize) {
    let max = 0;
    const windowEnd = Math.min(channelData.length, offset + windowSize);
    for (let index = offset; index < windowEnd; index += 1) {
      const value = Math.abs(channelData[index] ?? 0);
      if (value > max) {
        max = value;
      }
    }
    peaks.push(clamp(max, 0.05, 1));
    if (peaks.length >= bucketCount) {
      break;
    }
  }
  while (peaks.length < bucketCount) {
    peaks.push(0.08);
  }
  return peaks;
}

export function SegmentWaveformTimeline({
  audioSourceUrl,
  segments,
  activeSegmentId,
  currentTimeSeconds,
  durationSeconds,
  loopEnabled,
  loopStartSeconds,
  loopEndSeconds,
  onSeek,
  onSelectSegment,
  onSetLoopStart,
  onSetLoopEnd,
  onSetLoopFromActiveSegment,
  onClearLoop,
  onToggleLoop,
  t,
}: SegmentWaveformTimelineProps) {
  const theme = useTheme();
  const [audioPeaks, setAudioPeaks] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);

  const resolvedDurationSeconds = useMemo(
    () => resolveDurationSeconds(segments, durationSeconds),
    [durationSeconds, segments]
  );

  const segmentRanges = useMemo(
    () => resolveSegmentRanges(segments, resolvedDurationSeconds),
    [resolvedDurationSeconds, segments]
  );

  const activeSegmentRange = useMemo(
    () => segmentRanges.find((entry) => entry.segment.id === activeSegmentId) ?? null,
    [activeSegmentId, segmentRanges]
  );

  useEffect(() => {
    setAudioPeaks(null);
    setWaveformLoading(false);
    if (!audioSourceUrl) {
      return;
    }
    const audioContextClass = window.AudioContext;
    if (!audioContextClass) {
      return;
    }

    let cancelled = false;
    const audioContext = new audioContextClass();
    setWaveformLoading(true);

    (async () => {
      try {
        const response = await fetch(audioSourceUrl);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          setAudioPeaks(buildAudioPeaks(decoded, PEAK_BUCKET_COUNT));
        }
      } catch (error) {
        console.warn("Waveform decode failed; falling back to segment peaks.", error);
      } finally {
        if (!cancelled) {
          setWaveformLoading(false);
        }
        void audioContext.close();
      }
    })();

    return () => {
      cancelled = true;
      void audioContext.close();
    };
  }, [audioSourceUrl]);

  const peaks = useMemo(() => {
    if (audioPeaks && audioPeaks.length > 0) {
      return audioPeaks;
    }
    return buildFallbackPeaks(segmentRanges, resolvedDurationSeconds, PEAK_BUCKET_COUNT);
  }, [audioPeaks, resolvedDurationSeconds, segmentRanges]);

  const loopRange = useMemo(() => {
    if (loopStartSeconds === null || loopEndSeconds === null) {
      return null;
    }
    if (resolvedDurationSeconds <= 0) {
      return null;
    }
    const start = Math.min(loopStartSeconds, loopEndSeconds);
    const end = Math.max(loopStartSeconds, loopEndSeconds);
    if (end - start < MIN_LOOP_GAP_SECONDS) {
      return null;
    }
    return {
      start: clamp(start, 0, resolvedDurationSeconds),
      end: clamp(end, 0, resolvedDurationSeconds),
    };
  }, [loopEndSeconds, loopStartSeconds, resolvedDurationSeconds]);

  const currentPosition = useMemo(() => {
    if (resolvedDurationSeconds <= 0) {
      return 0;
    }
    return clamp(currentTimeSeconds, 0, resolvedDurationSeconds);
  }, [currentTimeSeconds, resolvedDurationSeconds]);

  const seekByRatio = (ratio: number) => {
    if (resolvedDurationSeconds <= 0) {
      return;
    }
    const next = clamp(ratio, 0, 1) * resolvedDurationSeconds;
    onSeek(next);
  };

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={0.75}
      >
        <Typography variant="subtitle2">{t("waveformTimeline")}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("playbackPosition")}: {formatTimelineTime(currentPosition)} /{" "}
          {formatTimelineTime(resolvedDurationSeconds)}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t("waveformTimelineHelper")}
      </Typography>
      <Box
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          seekByRatio(ratio);
        }}
        tabIndex={resolvedDurationSeconds > 0 ? 0 : -1}
        onKeyDown={(event) => {
          if (resolvedDurationSeconds <= 0) {
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            onSeek(0);
            return;
          }
          if (event.key === "End") {
            event.preventDefault();
            onSeek(resolvedDurationSeconds);
            return;
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onSeek(Math.max(0, currentPosition - 1));
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onSeek(Math.min(resolvedDurationSeconds, currentPosition + 1));
          }
        }}
        aria-label={t("waveformTimeline")}
        sx={{
          position: "relative",
          height: { xs: 94, sm: 108 },
          borderRadius: 1.5,
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(
            theme.palette.background.paper,
            0.92
          )} 100%)`,
          cursor: resolvedDurationSeconds > 0 ? "pointer" : "not-allowed",
        }}
      >
        {loopEnabled && loopRange ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              left: `${(loopRange.start / resolvedDurationSeconds) * 100}%`,
              width: `${Math.max(0.4, ((loopRange.end - loopRange.start) / resolvedDurationSeconds) * 100)}%`,
              backgroundColor: alpha(theme.palette.secondary.main, 0.12),
              borderLeft: `1px solid ${alpha(theme.palette.secondary.main, 0.8)}`,
              borderRight: `1px solid ${alpha(theme.palette.secondary.main, 0.8)}`,
              pointerEvents: "none",
            }}
          />
        ) : null}

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            px: 0.5,
            gap: "1px",
            pointerEvents: "none",
          }}
        >
          {peaks.map((peak, index) => {
            const height = `${Math.max(8, peak * 74)}%`;
            const isCurrentBucket =
              resolvedDurationSeconds > 0 &&
              currentPosition / resolvedDurationSeconds >= index / peaks.length;
            return (
              <Box
                key={`peak-${index}`}
                sx={{
                  flex: 1,
                  alignSelf: "center",
                  height,
                  borderRadius: 0.4,
                  backgroundColor: isCurrentBucket
                    ? alpha(theme.palette.primary.main, 0.88)
                    : alpha(theme.palette.text.secondary, 0.25),
                }}
              />
            );
          })}
        </Box>

        <Box
          sx={{
            position: "absolute",
            left: `${resolvedDurationSeconds > 0 ? (currentPosition / resolvedDurationSeconds) * 100 : 0}%`,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: theme.palette.error.main,
            boxShadow: `0 0 0 1px ${alpha(theme.palette.background.paper, 0.6)}`,
            pointerEvents: "none",
          }}
        />

        {segmentRanges.map((range) => {
          const isActive = range.segment.id === activeSegmentId;
          const startRatio = resolvedDurationSeconds > 0 ? range.startSeconds / resolvedDurationSeconds : 0;
          const widthRatio =
            resolvedDurationSeconds > 0
              ? Math.max(0.003, (range.endSeconds - range.startSeconds) / resolvedDurationSeconds)
              : 0;
          return (
            <Box
              key={range.segment.id}
              component="button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectSegment(range.segment);
              }}
              title={`${range.index + 1}. ${formatTimelineTime(range.startSeconds)} - ${formatTimelineTime(
                range.endSeconds
              )}`}
              aria-label={`${range.index + 1}. ${formatTimelineTime(range.startSeconds)} - ${formatTimelineTime(
                range.endSeconds
              )}`}
              aria-pressed={isActive}
              sx={{
                appearance: "none",
                p: 0,
                position: "absolute",
                left: `${startRatio * 100}%`,
                width: `${widthRatio * 100}%`,
                minWidth: 3,
                bottom: 0,
                height: 16,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: isActive
                  ? alpha(theme.palette.secondary.main, 0.95)
                  : alpha(theme.palette.secondary.main, 0.35),
                border: isActive
                  ? `1px solid ${alpha(theme.palette.secondary.dark, 0.85)}`
                  : `1px solid ${alpha(theme.palette.secondary.main, 0.55)}`,
                cursor: "pointer",
                "&:focus-visible": {
                  outline: `2px solid ${alpha(theme.palette.primary.main, 0.9)}`,
                  outlineOffset: 1,
                },
              }}
            />
          );
        })}
      </Box>

      <Slider
        size="small"
        min={0}
        max={Math.max(resolvedDurationSeconds, 0.001)}
        value={currentPosition}
        step={0.01}
        disabled={resolvedDurationSeconds <= 0}
        onChange={(_, value) => {
          if (typeof value === "number") {
            onSeek(value);
          }
        }}
        aria-label={t("timelineScrub")}
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={loopEnabled}
              onChange={(event) => onToggleLoop(event.target.checked)}
              disabled={!loopRange}
            />
          }
          label={t("loopPlayback")}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={onSetLoopStart}>
            {t("setLoopStart")}
          </Button>
          <Button size="small" variant="outlined" onClick={onSetLoopEnd}>
            {t("setLoopEnd")}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={onSetLoopFromActiveSegment}
            disabled={!activeSegmentRange}
          >
            {t("loopActiveSegment")}
          </Button>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={onClearLoop}
            disabled={!loopRange}
          >
            {t("clearLoop")}
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {loopRange
          ? t("loopRangeLabel", {
            values: {
              start: formatTimelineTime(loopRange.start),
              end: formatTimelineTime(loopRange.end),
            },
          })
          : t("loopRangeNotSet")}
      </Typography>
      {waveformLoading ? (
        <Typography variant="caption" color="text.secondary">
          {t("waveformLoading")}
        </Typography>
      ) : null}
    </Stack>
  );
}
