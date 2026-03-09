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
          borderColor: (theme) => alpha(theme.palette.common.white, 0.08),
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(
              theme.palette.background.paper,
              0.98
            )} 38%, ${alpha(theme.palette.background.paper, 0.94)} 100%)`,
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
                  fontSize: { xs: "1.6rem", sm: "2rem" },
                  fontWeight: 780,
                  letterSpacing: -0.5,
                  lineHeight: 1.15,
                  maxWidth: { xs: "12ch", md: "none" },
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
