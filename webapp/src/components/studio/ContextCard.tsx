import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type ContextTone = "primary" | "secondary" | "neutral";

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
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => {
          if (tone === "primary") {
            return alpha(theme.palette.primary.main, 0.06);
          }
          if (tone === "secondary") {
            return alpha(theme.palette.secondary.main, 0.08);
          }
          return alpha(theme.palette.text.primary, 0.03);
        },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {value}
      </Typography>
    </Box>
  );
}

