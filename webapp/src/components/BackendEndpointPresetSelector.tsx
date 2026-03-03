import { useEffect, useMemo, useState, useId } from "react";
import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { useBackendEndpointPresets } from "../hooks/useBackendEndpointPresets";
import { useSettingsStore } from "../store/settingsStore";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import type { BackendEndpointPreset } from "../data/app-db";
import { useI18n } from "../i18n";

const SERVER_DEFAULT_OPTION = "server-default";

type BackendEndpointPresetSelectorProps = {
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
  adminToken?: string;
};

export function BackendEndpointPresetSelector({
  size = "medium",
  sx,
  adminToken,
}: BackendEndpointPresetSelectorProps) {
  const { t } = useI18n();
  const backendPresets = useBackendEndpointPresets();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const apiClient = useRtzrApiClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedValue, setSelectedValue] = useState<string>(SERVER_DEFAULT_OPTION);
  const [applying, setApplying] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const labelId = useId();
  const apiReady = apiBaseUrl.trim().length > 0;
  const hasAdminToken = (adminToken ?? "").trim().length > 0;

  const getDeploymentLabel = (deployment: BackendEndpointPreset["deployment"]) => {
    if (deployment === "cloud") return t("rtzrApi");
    if (deployment === "onprem") return t("onPrem");
    return deployment;
  };

  const buildMenuLabel = (preset: BackendEndpointPreset) => {
    const deploymentLabel = getDeploymentLabel(preset.deployment);
    return `${deploymentLabel} · ${preset.apiBaseUrl}`;
  };

  const resolvedActiveValue = useMemo(() => {
    if (
      activeBackendPresetId &&
      backendPresets.some((preset) => preset.id === activeBackendPresetId)
    ) {
      return activeBackendPresetId;
    }
    return SERVER_DEFAULT_OPTION;
  }, [activeBackendPresetId, backendPresets]);

  useEffect(() => {
    setSelectedValue(resolvedActiveValue);
  }, [resolvedActiveValue]);

  const applySelection = async (value: string): Promise<boolean> => {
    if (!apiReady) {
      const warning = t("pleaseEnterThePythonApiBaseUrlFirst");
      enqueueSnackbar(warning, { variant: "warning" });
      setErrorText(warning);
      return false;
    }
    if (!hasAdminToken) {
      const warning = t("enterAdminTokenBeforeApplyingServerSettings");
      enqueueSnackbar(warning, { variant: "warning" });
      setErrorText(warning);
      return false;
    }
    setErrorText(null);
    setApplying(true);
    try {
      if (value === SERVER_DEFAULT_OPTION) {
        await apiClient.resetBackendEndpoint({ adminToken });
        await updateSetting("activeBackendPresetId", null);
        enqueueSnackbar(t("serverDefaultSettingsHaveBeenApplied"), { variant: "info" });
      } else {
        const preset = backendPresets.find((item) => item.id === value);
        if (!preset) {
          throw new Error(t("theSelectedPresetCannotBeFound"));
        }
        await apiClient.updateBackendEndpoint({
          deployment: preset.deployment,
          apiBaseUrl: preset.apiBaseUrl,
          clientId: preset.clientId ?? null,
          clientSecret: preset.clientSecret ?? null,
          verifySsl: preset.verifySsl ?? true,
        }, { adminToken });
        await updateSetting("activeBackendPresetId", preset.id);
        enqueueSnackbar(
          t("backendpresetselectorApplysuccess", { values: { name: preset.name } }),
          { variant: "success" }
        );
      }
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("applyingApiEndpointFailed");
      enqueueSnackbar(message, { variant: "error" });
      setErrorText(message);
      return false;
    } finally {
      setApplying(false);
    }
  };

  const handleSelectionChange = async (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;
    const prevValue = selectedValue;
    setSelectedValue(nextValue);
    const applied = await applySelection(nextValue);
    if (!applied) {
      setSelectedValue(prevValue);
    }
  };

  return (
    <Box sx={sx}>
      <FormControl fullWidth size={size} disabled={applying || !apiReady || !hasAdminToken}>
        <InputLabel id={`${labelId}-label`}>{t("apiEndpointPresets")}</InputLabel>
        <Select
          labelId={`${labelId}-label`}
          label={t("apiEndpointPresets")}
          value={selectedValue}
          onChange={handleSelectionChange}
        >
          <MenuItem value={SERVER_DEFAULT_OPTION}>
            <Stack spacing={0.25}>
              <Typography variant="body2">{t("serverPreferences")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("useDefaultEndpointStoredOnServer")}
              </Typography>
            </Stack>
          </MenuItem>
          {backendPresets.length === 0 ? (
            <MenuItem value="no-preset" disabled>
              {t("thereAreNoRegisteredPresets")}
            </MenuItem>
          ) : (
            backendPresets.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                <Stack spacing={0.25}>
                  <Typography variant="body2">{preset.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {buildMenuLabel(preset)}
                  </Typography>
                </Stack>
              </MenuItem>
            ))
          )}
        </Select>
        <FormHelperText error={Boolean(errorText)}>
          {errorText
            ? errorText
            : !apiReady
            ? t("enterThePythonApiBaseUrlToApplyItToYourServer")
            : !hasAdminToken
            ? t("enterAdminTokenBeforeApplyingServerSettings")
            : applying
            ? t("applyingToServer")
            : t("yourSelectionWillBeAppliedToTheServerImmediately")}
        </FormHelperText>
      </FormControl>
    </Box>
  );
}

export default BackendEndpointPresetSelector;
