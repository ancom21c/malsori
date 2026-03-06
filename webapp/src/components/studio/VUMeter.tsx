import { Box, Typography, alpha } from "@mui/material";

type VUMeterProps = {
  level: number;
  label?: string;
  active?: boolean;
  color?: string;
};

export function VUMeter({ level, label, active = true, color = "#2ac9b5" }: VUMeterProps) {
  const barCount = 12;
  const activeBars = Math.round(level * barCount);

  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      {label && (
        <Typography
          variant="subtitle2"
          sx={{
            fontSize: 10,
            opacity: 0.6,
            mb: -0.25,
            textAlign: "center",
          }}
        >
          {label}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          alignItems: "center",
          height: 14,
          px: 1,
          borderRadius: 4,
          backgroundColor: alpha("#000", 0.3),
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        {Array.from({ length: barCount }).map((_, index) => {
          const isActive = index < activeBars && active;
          const tone = index > barCount * 0.8 ? "#f5a37f" : color;
          return (
            <Box
              key={index}
              sx={{
                width: 3,
                height: 8,
                borderRadius: 0.5,
                backgroundColor: isActive ? tone : "rgba(255, 255, 255, 0.05)",
                boxShadow: isActive ? `0 0 8px ${alpha(tone, 0.5)}` : "none",
                transition: "background-color 120ms linear, box-shadow 120ms linear",
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
