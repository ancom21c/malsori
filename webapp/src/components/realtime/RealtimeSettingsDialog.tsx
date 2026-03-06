import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StudioJsonEditor } from "../studio";
import { useI18n } from "../../i18n";
import TranscriptionConfigQuickOptions from "../TranscriptionConfigQuickOptions";
import BackendEndpointReadonlyCard from "../BackendEndpointReadonlyCard";
import type { PresetConfig } from "../../data/app-db";

type RuntimeSettingKey =
  | "maxUtterDuration"
  | "noiseThreshold"
  | "epdTime"
  | "activeThreshold"
  | "acousticScale";

interface RealtimeSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  streamingPresets: PresetConfig[] | undefined;
  activeStreamingPreset: PresetConfig | undefined;
  onSelectPreset: (id: string) => void;
  streamingRequestJson: string;
  setStreamingRequestJson: (json: string) => void;
  jsonEditorOpen: boolean;
  setJsonEditorOpen: (open: boolean) => void;
  streamConfigOpen: boolean;
  setStreamConfigOpen: (open: boolean) => void;
  runtimeSettings: Record<RuntimeSettingKey, string>;
  onRuntimeSettingChange: (key: RuntimeSettingKey, value: string) => void;
  portalContainer: HTMLElement | null;
}

const RUNTIME_SETTING_FIELDS: Array<{
  key: RuntimeSettingKey;
  label: string;
  placeholder?: string;
  helperText: string;
  step?: string;
}> = [
  {
    key: "maxUtterDuration",
    label: "runtimeSettingMaxUtterDurationLabel",
    placeholder: "runtimeSettingMaxUtterDurationPlaceholder",
    helperText: "runtimeSettingMaxUtterDurationHelper",
    step: "1",
  },
  {
    key: "noiseThreshold",
    label: "runtimeSettingNoiseThresholdLabel",
    placeholder: "runtimeSettingNoiseThresholdPlaceholder",
    helperText: "runtimeSettingNoiseThresholdHelper",
    step: "0.01",
  },
  {
    key: "epdTime",
    label: "runtimeSettingEpdTimeLabel",
    placeholder: "runtimeSettingEpdTimePlaceholder",
    helperText: "runtimeSettingEpdTimeHelper",
    step: "0.1",
  },
  {
    key: "activeThreshold",
    label: "runtimeSettingActiveThresholdLabel",
    placeholder: "runtimeSettingActiveThresholdPlaceholder",
    helperText: "runtimeSettingActiveThresholdHelper",
    step: "0.01",
  },
  {
    key: "acousticScale",
    label: "runtimeSettingAcousticScaleLabel",
    placeholder: "runtimeSettingAcousticScalePlaceholder",
    helperText: "runtimeSettingAcousticScaleHelper",
    step: "0.01",
  },
];

export default function RealtimeSettingsDialog({
  open,
  onClose,
  streamingPresets,
  activeStreamingPreset,
  onSelectPreset,
  streamingRequestJson,
  setStreamingRequestJson,
  jsonEditorOpen,
  setJsonEditorOpen,
  streamConfigOpen,
  setStreamConfigOpen,
  runtimeSettings,
  onRuntimeSettingChange,
  portalContainer,
}: RealtimeSettingsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        root: {
          container: portalContainer ?? undefined,
          disableRestoreFocus: true,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{t("streamTranscriptionSettings")}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
              {t("streamingTranscriptionPresets")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("youCanInstantlySelectSettingsToUseInYourLiveSessionOrFineTuneThemInJson")}
            </Typography>
            {!streamingPresets?.length ? (
              <Alert severity="info" variant="outlined">
                {t("pleaseAddStreamingPresetsInSettingsManageTranscriptionSettings")}
              </Alert>
            ) : (
              <List
                dense
                disablePadding
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {streamingPresets.map((preset) => (
                  <ListItemButton
                    key={preset.id}
                    selected={activeStreamingPreset?.id === preset.id}
                    onClick={() => onSelectPreset(preset.id)}
                  >
                    <ListItemText
                      primary={preset.name}
                      secondary={preset.description || undefined}
                      primaryTypographyProps={{
                        fontWeight: activeStreamingPreset?.id === preset.id ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {t("youCanAddEditPresetsOnTheSettingsPage")}
            </Typography>
          </Box>

          <TranscriptionConfigQuickOptions
            type="streaming"
            configJson={streamingRequestJson}
            onChange={setStreamingRequestJson}
            collapsible
          />

          <Box>
            <Button size="small" variant="text" onClick={() => setJsonEditorOpen(!jsonEditorOpen)}>
              {jsonEditorOpen ? t("hideJson") : t("editJsonDirectly")}
            </Button>
            <Collapse in={jsonEditorOpen} sx={{ mt: 1 }}>
              <StudioJsonEditor
                label={t("runtimeRequestConfig")}
                value={streamingRequestJson}
                onChange={setStreamingRequestJson}
                onFormat={() => {
                  try {
                    const parsed = JSON.parse(streamingRequestJson);
                    setStreamingRequestJson(JSON.stringify(parsed, null, 2));
                  } catch {
                    // Silent error
                  }
                }}
                onCopy={() => {
                  navigator.clipboard.writeText(streamingRequestJson);
                }}
                helperText={t("editTheEntireJsonDirectlyToImmediatelyReflectTheOptionsYouNeed")}
              />
            </Collapse>
          </Box>

          <BackendEndpointReadonlyCard />

          <Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 0, fontWeight: 700 }}>
                  {t("runtimeStreamConfigWebsocketTitle")}
                </Typography>
                {!streamConfigOpen && (
                  <Typography variant="body2" color="text.secondary">
                    {t("youCanAlsoPassGrpcRuntimestreamconfigValuesToWebsocketSessions")}
                  </Typography>
                )}
              </Box>
              <Button size="small" variant="text" onClick={() => setStreamConfigOpen(!streamConfigOpen)}>
                {streamConfigOpen ? t("hideSettings") : t("viewSettings")}
              </Button>
            </Stack>
            <Collapse in={streamConfigOpen} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("runtimeStreamConfigWebsocketHelper")}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "repeat(auto-fit, minmax(160px, 1fr))",
                  },
                  gap: 2,
                }}
              >
                {RUNTIME_SETTING_FIELDS.map((field) => (
                  <TextField
                    key={field.key}
                    type="number"
                    label={t(field.label)}
                    fullWidth
                    value={runtimeSettings[field.key]}
                    onChange={(event) => onRuntimeSettingChange(field.key, event.target.value)}
                    placeholder={field.placeholder ? t(field.placeholder) : undefined}
                    helperText={field.helperText ? t(field.helperText) : undefined}
                    inputProps={{ step: field.step ?? "0.1" }}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, px: 4 }}>
          {t("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
