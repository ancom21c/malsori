import type { ReactNode } from "react";
import { Box, Stack, alpha } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type ActionStripVariant = "header" | "content" | "sticky-mobile";

type ActionStripProps = {
  children: ReactNode;
  ariaLabel: string;
  variant?: ActionStripVariant;
  stickyMobile?: boolean; // legacy support if needed
  stickyRightOffset?: number;
  maxWidth?: number;
  sx?: SxProps<Theme>;
};

export function ActionStrip({
  children,
  ariaLabel,
  variant = "content",
  stickyMobile = false,
  stickyRightOffset = 92,
  maxWidth = 560,
  sx,
}: ActionStripProps) {
  const effectiveVariant = stickyMobile ? "sticky-mobile" : variant;

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{
        ...(effectiveVariant === "sticky-mobile"
          ? {
            display: { xs: "block", sm: "none" },
            position: "sticky",
            bottom: "calc(12px + var(--malsori-bottom-inset))",
            width: `calc(100% - ${stickyRightOffset}px)`,
            maxWidth,
            mr: "auto",
            borderRadius: 999,
            p: 0.625,
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.96),
            backdropFilter: "blur(8px)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.28)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            zIndex: 10,
          }
          : effectiveVariant === "header"
            ? {
              display: "flex",
              width: "auto",
            }
            : {
              display: "flex",
              width: "100%",
            }),
        ...sx,
      }}
    >
      <Stack
        direction={effectiveVariant === "header" ? "row" : { xs: "column", sm: "row" }}
        spacing={1.25}
        sx={{
          width: "100%",
          alignItems: effectiveVariant === "header" ? "center" : "stretch",
          justifyContent: effectiveVariant === "header" ? "flex-end" : "center",
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}
