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
        height: 24,
        display: "flex",
        alignItems: "flex-end",
        gap: 0.5,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        const height = 8 + (index / (barCount - 1)) * 14;
        const enabled = index < activeBars;
        // smooth color gradient based on index instead of hard thresholds
        const ratio = index / (barCount - 1);
        const color =
          ratio > 0.8
            ? theme.palette.error.main
            : ratio > 0.5
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
                ? alpha(color, 0.9)
                : alpha(theme.palette.common.white, 0.06),
              boxShadow: enabled
                ? `0 0 10px ${alpha(color, 0.4)}, 0 0 20px ${alpha(color, 0.2)}`
                : "none",
              transition: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        );
      })}
    </Box>
  );
}
