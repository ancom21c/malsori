import { forwardRef, useCallback } from "react";
import type { ForwardedRef } from "react";
import { Fab, Tooltip } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import { brandColors } from "../styles/brandColors";
import { useI18n } from "../i18n";

type UploadFabProps = {
  onClick?: () => void;
};

export const UploadFab = forwardRef(function UploadFab(
  { onClick }: UploadFabProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const { t } = useI18n();
  const handleClick = useCallback(() => {
    if (typeof onClick === "function") {
      onClick();
    } else {
      console.warn("Upload FAB clicked - dialog not yet implemented.");
    }
  }, [onClick]);

  return (
    <Tooltip title={t("fileTranscriptionRequest")}>
      <Fab
        onClick={handleClick}
        ref={ref}
        sx={{
          position: "fixed",
          right: 32,
          bottom: 32,
          bgcolor: brandColors.base,
          color: "#fff",
          "&:hover": { bgcolor: brandColors.dark },
        }}
        aria-label={t("fileTranscriptionRequest")}
      >
        <UploadIcon />
      </Fab>
    </Tooltip>
  );
});

export default UploadFab;
