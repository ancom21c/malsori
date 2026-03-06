import { Box, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface AudioVisualizerProps {
  level: number;
  active: boolean;
}

export default function AudioVisualizer({ level, active }: AudioVisualizerProps) {
  const theme = useTheme();
  const barCount = 20;
  const clampedLevel = Math.min(Math.max(level, 0), 1);
  const activeBars = active ? Math.max(0, Math.round(clampedLevel * barCount)) : 0;

  return (
    <Box
      sx={{
        width: "100%",
        height: 32,
        display: "flex",
        alignItems: "flex-end",
        gap: 0.5,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        const height = 10 + (index / (barCount - 1)) * 18;
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
                ? alpha(color, 0.9)
                : alpha(theme.palette.divider, 0.24),
              boxShadow: enabled ? `0 0 10px ${alpha(color, 0.35)}` : "none",
              transition: "background-color 120ms linear, box-shadow 120ms linear",
            }}
          />
        );
      })}
    </Box>
  );
}
