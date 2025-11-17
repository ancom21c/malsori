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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { useRequestFileTranscription } from "../hooks/useRequestFileTranscription";
import { usePresets } from "../hooks/usePresets";
import { DEFAULT_FILE_PRESETS } from "../data/defaultPresets";
import { useSettingsStore } from "../store/settingsStore";
import TranscriptionConfigQuickOptions from "./TranscriptionConfigQuickOptions";
import BackendEndpointPresetSelector from "./BackendEndpointPresetSelector";
import { useAppPortalContainer } from "../hooks/useAppPortalContainer";
import { useI18n } from "../i18n";

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const filePresets = usePresets("file");
  const defaultPreset = useMemo(
    () => filePresets.find((preset) => preset.isDefault) ?? filePresets[0],
    [filePresets]
  );
  const fallbackConfigJson = useMemo(
    () => DEFAULT_FILE_PRESETS[0]?.configJson ?? "{}",
    []
  );
  const [configJson, setConfigJson] = useState<string>(fallbackConfigJson);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const portalContainer = useAppPortalContainer();

  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const requestMutation = useRequestFileTranscription();
  const navigate = useNavigate();

  const activePreset = useMemo(() => {
    if (!selectedPresetId) {
      return null;
    }
    return filePresets.find((preset) => preset.id === selectedPresetId) ?? null;
  }, [selectedPresetId, filePresets]);

  const uploadable = useMemo(
    () => Boolean(file && configJson.trim().length > 0),
    [file, configJson]
  );

  const previousOpenRef = useRef(open);

  const resetForm = useCallback(() => {
    const preset = defaultPreset;
    setTitle("");
    setFile(null);
    setSelectedPresetId(preset?.id ?? null);
    setConfigJson(preset?.configJson ?? fallbackConfigJson);
    setAdvancedOpen(false);
    setJsonEditorOpen(false);
    requestMutation.reset();
  }, [defaultPreset, fallbackConfigJson, requestMutation]);

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
    if (!selectedPresetId) {
      if (defaultPreset) {
        setSelectedPresetId(defaultPreset.id);
        setConfigJson(defaultPreset.configJson);
      } else {
        setConfigJson(fallbackConfigJson);
      }
    }
  }, [open, defaultPreset, fallbackConfigJson, selectedPresetId]);

  const handleDialogClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleDialogRequestClose = useCallback(() => {
    handleDialogClose();
  }, [handleDialogClose]);

  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    const presetId = event.target.value;
    setSelectedPresetId(presetId);
    const preset = filePresets.find((item) => item.id === presetId);
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
    if (!file || !uploadable || requestMutation.isPending) {
      return;
    }
    try {
      const result = await requestMutation.mutateAsync({
        title,
        configJson,
        file,
        presetId: activePreset?.id ?? null,
        presetName: activePreset?.name ?? null,
      });
      resetForm();
      onClose();
      navigate(`/transcriptions/${result.localId}`);
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
                  accept="audio/*,video/mp4"
                  hidden
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
            />
            <FormControl fullWidth>
              <InputLabel id="transcribe-preset-label">{t("settingsPresets")}</InputLabel>
              <Select
                labelId="transcribe-preset-label"
                label={t("settingsPresets")}
                value={selectedPresetId ?? ""}
                onChange={handlePresetChange}
                disabled={requestMutation.isPending || filePresets.length === 0}
              >
                {filePresets.length === 0 ? (
                  <MenuItem value="" disabled>
                    {t("thereAreNoPresets")}
                  </MenuItem>
                ) : (
                  filePresets.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TranscriptionConfigQuickOptions
              type="file"
              configJson={configJson}
              onChange={setConfigJson}
              collapsible
            />
            <Box>
              <Button
                size="small"
                variant="text"
                onClick={() => setJsonEditorOpen((prev) => !prev)}
              >
                {jsonEditorOpen ? t("hideJson") : t("editJsonDirectly")}
              </Button>
              <Collapse in={jsonEditorOpen} sx={{ mt: 1 }}>
                <TextField
                  label="RequestConfig (JSON)"
                  fullWidth
                  multiline
                  minRows={8}
                  value={configJson}
                  onChange={(event) => setConfigJson(event.target.value)}
                  placeholder={`{
  "model_name": "sommers"
}`}
                  InputProps={{ sx: { fontFamily: "Menlo, Consolas, monospace" } }}
                />
              </Collapse>
            </Box>
            <Box>
                  <Typography variant="subtitle2" gutterBottom>
                {t("apiEndpointPresets")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("immediatelySwitchesTheSttServerEndpointThatThePythonApiWillConnectTo")}
              </Typography>
              <BackendEndpointPresetSelector />
            </Box>
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
                    label="Python API Base URL"
                    value={apiBaseUrl}
                    onChange={(event) => void updateSetting("apiBaseUrl", event.target.value)}
                    placeholder="http://localhost:8000"
                  />
                </Stack>
              </Collapse>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={requestMutation.isPending}>
            {t("cancellation")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!uploadable || requestMutation.isPending}
          >
            {requestMutation.isPending ? t("sending") : t("forwarding")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default UploadDialog;
