import type { ReactNode } from "react";
import { Box, Stack, alpha } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

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
    <MotionBox
      role="group"
      aria-label={ariaLabel}
      sx={{
        ...(effectiveVariant === "sticky-mobile"
          ? {
            display: { xs: "block", sm: "none" },
            position: "sticky",
            bottom: "calc(12px + env(safe-area-inset-bottom))",
            width: `calc(100% - ${stickyRightOffset}px)`,
            maxWidth,
            mr: "auto",
            borderRadius: 999,
            p: 0.75,
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.1)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
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
    </MotionBox>
  );
}
