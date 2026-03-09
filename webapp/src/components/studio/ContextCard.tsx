import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type ContextTone = "primary" | "secondary" | "warning" | "neutral";

type ContextCardProps = {
  title: string;
  value: string;
  tone?: ContextTone;
};

export function ContextCard({ title, value, tone = "neutral" }: ContextCardProps) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.5,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.common.white, 0.08),
        bgcolor: (theme) => {
          if (tone === "primary") {
            return alpha(theme.palette.primary.main, 0.08);
          }
          if (tone === "secondary") {
            return alpha(theme.palette.secondary.main, 0.08);
          }
          if (tone === "warning") {
            return alpha(theme.palette.warning.main, 0.1);
          }
          return alpha(theme.palette.background.default, 0.54);
        },
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}
