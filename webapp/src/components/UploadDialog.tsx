import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { useRequestFileTranscription } from "../hooks/useRequestFileTranscription";
import { useRequestRealtimeFileTranscription } from "../hooks/useRequestRealtimeFileTranscription";
import { usePresets } from "../hooks/usePresets";
import { DEFAULT_FILE_PRESETS, DEFAULT_STREAMING_PRESETS } from "../data/defaultPresets";
import { useSettingsStore } from "../store/settingsStore";
import TranscriptionConfigQuickOptions from "./TranscriptionConfigQuickOptions";
import BackendEndpointReadonlyCard from "./BackendEndpointReadonlyCard";
import { useAppPortalContainer } from "../hooks/useAppPortalContainer";
import { useI18n } from "../i18n";
import { buildSessionDetailPath } from "../app/platformRoutes";

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
};

type UploadMode = "batch" | "realtime";

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const filePresets = usePresets("file");
  const streamingPresets = usePresets("streaming");
  const defaultFilePreset = useMemo(
    () => filePresets.find((preset) => preset.isDefault) ?? filePresets[0],
    [filePresets]
  );
  const defaultStreamingPreset = useMemo(
    () => streamingPresets.find((preset) => preset.isDefault) ?? streamingPresets[0],
    [streamingPresets]
  );
  const fallbackFileConfigJson = useMemo(
    () => DEFAULT_FILE_PRESETS[0]?.configJson ?? "{}",
    []
  );
  const fallbackStreamingConfigJson = useMemo(
    () => DEFAULT_STREAMING_PRESETS[0]?.configJson ?? "{}",
    []
  );
  const [uploadMode, setUploadMode] = useState<UploadMode>("batch");
  const [configJson, setConfigJson] = useState<string>(fallbackFileConfigJson);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const portalContainer = useAppPortalContainer();

  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const requestMutation = useRequestFileTranscription();
  const realtimeRequestMutation = useRequestRealtimeFileTranscription();
  const navigate = useNavigate();
  const activePresets = uploadMode === "batch" ? filePresets : streamingPresets;
  const defaultPreset = uploadMode === "batch" ? defaultFilePreset : defaultStreamingPreset;
  const fallbackConfigJson =
    uploadMode === "batch" ? fallbackFileConfigJson : fallbackStreamingConfigJson;
  const requestPending = requestMutation.isPending || realtimeRequestMutation.isPending;

  const activePreset = useMemo(() => {
    if (!selectedPresetId) {
      return null;
    }
    return activePresets.find((preset) => preset.id === selectedPresetId) ?? null;
  }, [selectedPresetId, activePresets]);

  const uploadable = useMemo(
    () => Boolean(file && configJson.trim().length > 0),
    [file, configJson]
  );

  const previousOpenRef = useRef(open);

  const getDefaultsForMode = useCallback(
    (mode: UploadMode) => {
      const preset = mode === "batch" ? defaultFilePreset : defaultStreamingPreset;
      const fallback = mode === "batch" ? fallbackFileConfigJson : fallbackStreamingConfigJson;
      return { preset, fallback };
    },
    [defaultFilePreset, defaultStreamingPreset, fallbackFileConfigJson, fallbackStreamingConfigJson]
  );

  const resetForm = useCallback(() => {
    const { preset, fallback } = getDefaultsForMode("batch");
    setUploadMode("batch");
    setTitle("");
    setFile(null);
    setSelectedPresetId(preset?.id ?? null);
    setConfigJson(preset?.configJson ?? fallback);
    setAdvancedOpen(false);
    setJsonEditorOpen(false);
    requestMutation.reset();
    realtimeRequestMutation.reset();
  }, [getDefaultsForMode, requestMutation, realtimeRequestMutation]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;
    if (wasOpen && !open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (open) {
      return;
    }
    const nextPresetId = defaultPreset?.id ?? null;
    if (selectedPresetId !== nextPresetId) {
      setSelectedPresetId(nextPresetId);
    }
    const nextConfigJson = defaultPreset?.configJson ?? fallbackConfigJson;
    if (configJson !== nextConfigJson) {
      setConfigJson(nextConfigJson);
    }
  }, [open, defaultPreset, fallbackConfigJson, selectedPresetId, configJson]);

  useEffect(() => {
    if (!open) return;
    if (!selectedPresetId || !activePresets.some((preset) => preset.id === selectedPresetId)) {
      if (defaultPreset) {
        setSelectedPresetId(defaultPreset.id);
        setConfigJson(defaultPreset.configJson);
      } else {
        setConfigJson(fallbackConfigJson);
      }
    }
  }, [open, activePresets, defaultPreset, fallbackConfigJson, selectedPresetId]);

  const handleDialogClose = useCallback(() => {
    if (realtimeRequestMutation.isPending) {
      realtimeRequestMutation.cancel();
    }
    resetForm();
    onClose();
  }, [onClose, realtimeRequestMutation, resetForm]);

  const handleDialogRequestClose = useCallback(() => {
    if (requestPending) {
      return;
    }
    handleDialogClose();
  }, [handleDialogClose, requestPending]);

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, nextMode: UploadMode | null) => {
    if (!nextMode || nextMode === uploadMode || requestPending) {
      return;
    }
    const { preset, fallback } = getDefaultsForMode(nextMode);
    setUploadMode(nextMode);
    setSelectedPresetId(preset?.id ?? null);
    setConfigJson(preset?.configJson ?? fallback);
    setJsonEditorOpen(nextMode === "realtime");
  };

  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    const presetId = event.target.value;
    setSelectedPresetId(presetId);
    const preset = activePresets.find((item) => item.id === presetId);
    setConfigJson(preset?.configJson ?? configJson);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = event.target.files?.[0];
    setFile(targetFile ?? null);
    if (targetFile && title.trim().length === 0) {
      const derivedTitle = targetFile.name.replace(/\.[^/.]+$/, "").trim() || targetFile.name;
      setTitle(derivedTitle);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !uploadable || requestPending) {
      return;
    }
    try {
      const result =
        uploadMode === "realtime"
          ? await realtimeRequestMutation.mutateAsync({
              title,
              configJson,
              file,
              presetId: activePreset?.id ?? null,
              presetName: activePreset?.name ?? null,
            })
          : await requestMutation.mutateAsync({
              title,
              configJson,
              file,
              presetId: activePreset?.id ?? null,
              presetName: activePreset?.name ?? null,
            });
      resetForm();
      onClose();
      navigate(buildSessionDetailPath(result.localId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogRequestClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        root: {
          container: portalContainer ?? undefined,
          disableRestoreFocus: true,
        },
      }}
    >
      <DialogTitle>{t("fileTranscriptionRequest")}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Button variant="outlined" component="label" disabled={requestMutation.isPending}>
                {t("selectAudioFile")}
                <input
                  type="file"
                  accept="audio/*,video/*"
                  hidden
                  disabled={requestPending}
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {file
                  ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : t("thereAreNoFilesSelected")}
              </Typography>
            </Stack>
            <TextField
              fullWidth
              label={t("title")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("meetingRecording")}
              disabled={requestPending}
            />
            <Stack spacing={1}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={uploadMode}
                onChange={handleModeChange}
                disabled={requestPending}
                aria-label={t("uploadProcessingMode")}
              >
                <ToggleButton value="batch">{t("batchFileTranscription")}</ToggleButton>
                <ToggleButton value="realtime">{t("realtimeApiFileUpload")}</ToggleButton>
              </ToggleButtonGroup>
              <FormHelperText>
                {uploadMode === "realtime"
                  ? t("realtimeApiFileUploadHelper")
                  : t("batchFileTranscriptionHelper")}
              </FormHelperText>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="transcribe-preset-label">{t("settingsPresets")}</InputLabel>
              <Select
                labelId="transcribe-preset-label"
                label={t("settingsPresets")}
                value={selectedPresetId ?? ""}
                onChange={handlePresetChange}
                disabled={requestPending || activePresets.length === 0}
              >
                {activePresets.length === 0 ? (
                  <MenuItem value="" disabled>
                    {t("thereAreNoPresets")}
                  </MenuItem>
                ) : (
                  activePresets.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {uploadMode === "batch" ? (
              <TranscriptionConfigQuickOptions
                type="file"
                configJson={configJson}
                onChange={setConfigJson}
                collapsible
              />
            ) : null}
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => setJsonEditorOpen((prev) => !prev)}
                disabled={requestPending}
              >
                {jsonEditorOpen ? t("hideJson") : t("editJsonDirectly")}
              </Button>
              <Collapse in={jsonEditorOpen} sx={{ mt: 1 }}>
                <TextField
                  label={t("requestConfigJson")}
                  fullWidth
                  multiline
                  minRows={8}
                  value={configJson}
                  onChange={(event) => setConfigJson(event.target.value)}
                  placeholder={
                    uploadMode === "realtime"
                      ? `{
  "sample_rate": 16000,
  "encoding": "LINEAR16"
}`
                      : `{
  "model_name": "sommers"
}`
                  }
                  disabled={requestPending}
                  InputProps={{ sx: { fontFamily: "Menlo, Consolas, monospace" } }}
                />
              </Collapse>
            </Box>
            {uploadMode === "realtime" && realtimeRequestMutation.isPending ? (
              <Box>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="subtitle2">{t("streamingUploadStatus")}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {realtimeRequestMutation.progress.stage === "finalizing"
                      ? t("finalizing")
                      : realtimeRequestMutation.progress.stage === "connecting"
                        ? t("connecting")
                        : realtimeRequestMutation.progress.stage === "streaming"
                          ? t("sending")
                          : t("preparingForSession")}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={realtimeRequestMutation.progress.percent}
                  sx={{ mt: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {t("streamingUploadProgress")}: {realtimeRequestMutation.progress.percent}%
                </Typography>
              </Box>
            ) : null}
            <BackendEndpointReadonlyCard />
            <Divider sx={{ my: 1 }} />
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => setAdvancedOpen((prev) => !prev)}
              >
                {advancedOpen ? t("hideAdvancedSettings") : t("viewAdvancedSettings")}
              </Button>
              <Collapse in={advancedOpen} sx={{ mt: 1 }}>
                <Stack spacing={2}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: (theme) => theme.palette.action.hover,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {t("apiSettingsModifiedHereWillBeSavedInTheOverallAppSettings")}
                  </Typography>
                  <TextField
                    label={t("pythonApiBaseUrl")}
                    value={apiBaseUrl}
                    onChange={(event) => void updateSetting("apiBaseUrl", event.target.value)}
                    placeholder="http://localhost:8000"
                    disabled={requestPending}
                  />
                </Stack>
              </Collapse>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={
              realtimeRequestMutation.isPending
                ? realtimeRequestMutation.cancel
                : handleDialogClose
            }
            disabled={requestMutation.isPending}
          >
            {realtimeRequestMutation.isPending ? t("stopRealtimeUpload") : t("cancellation")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!uploadable || requestPending}
          >
            {requestPending ? t("sending") : t("forwarding")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default UploadDialog;
