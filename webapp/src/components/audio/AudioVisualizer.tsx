import { Box, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface AudioVisualizerProps {
  level: number;
  active: boolean;
}

export default function AudioVisualizer({ level, active }: AudioVisualizerProps) {
  const theme = useTheme();
  const barCount = 18;
  const clampedLevel = Math.min(Math.max(level, 0), 1);
  const activeBars = active ? Math.max(0, Math.round(clampedLevel * barCount)) : 0;

  return (
    <Box
      sx={{
        width: "100%",
        height: 22,
        display: "flex",
        alignItems: "flex-end",
        gap: 0.375,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        const height = 8 + (index / (barCount - 1)) * 12;
        const enabled = index < activeBars;
        const color =
          index >= Math.floor(barCount * 0.8)
            ? theme.palette.error.main
            : index >= Math.floor(barCount * 0.6)
              ? theme.palette.secondary.main
              : theme.palette.primary.main;

        return (
          <Box
            key={index}
            sx={{
              flex: 1,
              height,
              borderRadius: 999,
              backgroundColor: enabled
                ? alpha(color, 0.78)
                : alpha(theme.palette.common.white, 0.09),
              boxShadow: enabled ? `0 0 6px ${alpha(color, 0.18)}` : "none",
              transition: "background-color 120ms linear, box-shadow 120ms linear",
            }}
          />
        );
      })}
    </Box>
  );
}
