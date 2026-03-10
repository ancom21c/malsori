import type { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type StudioPageShellProps = {
  title: string;
  description?: string;
  headingId?: string;
  headingComponent?: "h1" | "h2";
  statusSlot?: ReactNode;
  actionSlot?: ReactNode;
  children: ReactNode;
};

export function StudioPageShell({
  title,
  description,
  headingId,
  headingComponent = "h1",
  statusSlot,
  actionSlot,
  children,
}: StudioPageShellProps) {
  return (
    <Stack spacing={2.5}>
      <Card
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderColor: "var(--malsori-workspace-border)",
          backgroundColor: "var(--malsori-workspace-shell)",
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
              theme.palette.secondary.main,
              0.05
            )} 18%, ${alpha(
              theme.palette.background.paper,
              0.98
            )} 42%, ${alpha(theme.palette.background.paper, 0.94)} 100%)`,
          boxShadow: (theme) => `0 22px 44px ${alpha(theme.palette.common.black, 0.24)}`,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "0 0 auto 0",
            height: 2,
            background: (theme) =>
              `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.68)} 0%, ${alpha(
                theme.palette.secondary.main,
                0.18
              )} 100%)`,
          },
        }}
      >
        <CardContent sx={{ display: "grid", gap: 1.25 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography
                id={headingId}
                component={headingComponent}
                variant="h4"
                sx={{
                  fontSize: { xs: "1.55rem", sm: "2rem" },
                  fontWeight: 780,
                  letterSpacing: -0.65,
                  lineHeight: 1.08,
                  maxWidth: { xs: "13ch", md: "none" },
                }}
              >
                {title}
              </Typography>
              {description ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.75, maxWidth: 720 }}
                >
                  {description}
                </Typography>
              ) : null}
            </Box>
            {actionSlot ? <Box sx={{ width: { xs: "100%", md: "auto" } }}>{actionSlot}</Box> : null}
          </Stack>
          {statusSlot ? <Box>{statusSlot}</Box> : null}
        </CardContent>
      </Card>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>{children}</Box>
    </Stack>
  );
}
