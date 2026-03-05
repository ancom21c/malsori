import type { ReactNode } from "react";
import { Box, Stack } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type ActionStripProps = {
  children: ReactNode;
  ariaLabel: string;
  stickyMobile?: boolean;
  stickyRightOffset?: number;
  maxWidth?: number;
  sx?: SxProps<Theme>;
};

export function ActionStrip({
  children,
  ariaLabel,
  stickyMobile = false,
  stickyRightOffset = 92,
  maxWidth = 560,
  sx,
}: ActionStripProps) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{
        ...(stickyMobile
          ? {
              display: { xs: "block", sm: "none" },
              position: "sticky",
              bottom: "calc(12px + env(safe-area-inset-bottom))",
              width: `calc(100% - ${stickyRightOffset}px)`,
              maxWidth,
              mr: "auto",
              borderRadius: 999,
              p: 0.75,
              backgroundColor: (theme) => theme.palette.background.paper,
              boxShadow: (theme) => theme.shadows[3],
              zIndex: 2,
            }
          : {
              display: "flex",
              width: "100%",
            }),
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        sx={{
          width: "100%",
          alignItems: "stretch",
          justifyContent: "center",
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}

