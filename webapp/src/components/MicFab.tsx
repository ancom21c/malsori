import { useCallback } from "react";
import { Fab, Tooltip } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import { useI18n } from "../i18n";

type MicFabProps = {
  onClick?: () => void;
};

export function MicFab({ onClick }: MicFabProps) {
  const { t } = useI18n();
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  return (
    <Tooltip title={t("startRealTimeTranscription", { defaultValue: "실시간 전사 시작" })}>
      <Fab
        color="secondary"
        onClick={handleClick}
        sx={{ position: "fixed", right: 32, bottom: 96 }}
        aria-label={t("realTimeTranscription")}
      >
        <MicIcon />
      </Fab>
    </Tooltip>
  );
}

export default MicFab;
