import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useBackendEndpointPresets } from "../hooks/useBackendEndpointPresets";
import { useSettingsStore } from "../store/settingsStore";
import type { BackendEndpointPreset } from "../data/app-db";
import { useI18n } from "../i18n";

type BackendEndpointReadonlyCardProps = {
  sx?: SxProps<Theme>;
};

function deploymentLabel(
  deployment: BackendEndpointPreset["deployment"],
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (deployment === "cloud") {
    return t("rtzrApi");
  }
  if (deployment === "onprem") {
    return t("onPrem");
  }
  return deployment;
}

export function BackendEndpointReadonlyCard({
  sx,
}: BackendEndpointReadonlyCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const backendPresets = useBackendEndpointPresets();
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);

  const activePreset = useMemo(
    () =>
      activeBackendPresetId
        ? backendPresets.find((preset) => preset.id === activeBackendPresetId) ?? null
        : null,
    [activeBackendPresetId, backendPresets]
  );

  return (
    <Stack spacing={1} sx={sx}>
      <Typography variant="subtitle2">{t("apiEndpointPresets")}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t("managesTheLocalPythonApiAndSttEndpointsThatTheServerWillLookAt")}
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          p: 1.5,
          bgcolor: "action.hover",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
          <Chip
            size="small"
            label={activePreset ? deploymentLabel(activePreset.deployment, t) : t("serverDefault")}
            color={activePreset ? "primary" : "default"}
          />
          {activePreset ? <Chip size="small" label={t("custom")} variant="outlined" /> : null}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {activePreset?.name ?? t("serverDefaultEndpoint")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {activePreset?.apiBaseUrl ?? t("useDefaultEndpointStoredOnServer")}
        </Typography>
      </Box>
      <Stack direction="row" justifyContent="flex-end">
        <Button size="small" variant="text" onClick={() => navigate("/settings")}>
          {t("backendSettings")}
        </Button>
      </Stack>
    </Stack>
  );
}

export default BackendEndpointReadonlyCard;
