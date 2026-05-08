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
import { useSnackbar } from "notistack";
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
import { buildSessionDetailPath, resolveSessionsPath } from "../app/platformRoutes";

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
};

type UploadMode = "batch" | "realtime";
type BulkFileUploadItemStatus = "queued" | "submitting" | "submitted" | "failed";

type BulkFileUploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: BulkFileUploadItemStatus;
  errorMessage?: string;
};

function formatFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getFileBaseTitle(file: File) {
  return file.name.replace(/\.[^/.]+$/, "").trim() || file.name;
}

function buildBulkQueueItems(files: File[]): BulkFileUploadItem[] {
  return files.map((file, index) => ({
    id: `${Date.now()}-${index}-${file.name}`,
    fileName: file.name,
    fileSize: file.size,
    status: "queued",
  }));
}

function resolveBulkFileTitle(baseTitle: string, file: File, totalCount: number) {
  const trimmedTitle = baseTitle.trim();
  if (!trimmedTitle) {
    return getFileBaseTitle(file);
  }
  if (totalCount <= 1) {
    return trimmedTitle;
  }
  return `${trimmedTitle} - ${getFileBaseTitle(file)}`;
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {
  const { t } = useI18n();
  const { enqueueSnackbar } = useSnackbar();
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
  const [files, setFiles] = useState<File[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkFileUploadItem[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
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
  const requestPending =
    requestMutation.isPending ||
    bulkSubmitting ||
    realtimeRequestMutation.isPending;
  const selectedFile = files[0] ?? null;

  const activePreset = useMemo(() => {
    if (!selectedPresetId) {
      return null;
    }
    return activePresets.find((preset) => preset.id === selectedPresetId) ?? null;
  }, [selectedPresetId, activePresets]);

  const uploadable = useMemo(
    () => files.length > 0 && configJson.trim().length > 0,
    [files.length, configJson]
  );

  const selectedFilesSummary = useMemo(() => {
    if (files.length === 0) {
      return t("thereAreNoFilesSelected");
    }
    if (files.length === 1 && selectedFile) {
      return `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`;
    }
    const totalSize = files.reduce((sum, item) => sum + item.size, 0);
    return t("selectedFilesSummary", {
      values: { count: files.length, size: formatFileSize(totalSize) },
    });
  }, [files, selectedFile, t]);

  const queueItems = bulkItems;
  const showQueue = uploadMode === "batch" && (files.length > 1 || queueItems.length > 1);
  const bulkSubmittedCount = queueItems.filter((item) => item.status === "submitted").length;
  const bulkFailedCount = queueItems.filter((item) => item.status === "failed").length;
  const bulkProgressPercent =
    queueItems.length > 0
      ? Math.round(((bulkSubmittedCount + bulkFailedCount) / queueItems.length) * 100)
      : 0;

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
    setFiles([]);
    setBulkItems([]);
    setBulkSubmitting(false);
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
    if (nextMode === "realtime" && files.length > 1) {
      setFiles((current) => current.slice(0, 1));
      setBulkItems([]);
    }
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
    const selectedFiles = Array.from(event.target.files ?? []);
    const nextFiles = uploadMode === "batch" ? selectedFiles : selectedFiles.slice(0, 1);
    setFiles(nextFiles);
    setBulkItems(
      uploadMode === "batch" && nextFiles.length > 1 ? buildBulkQueueItems(nextFiles) : []
    );
    const targetFile = nextFiles[0];
    if (targetFile && title.trim().length === 0) {
      const derivedTitle = getFileBaseTitle(targetFile);
      setTitle(derivedTitle);
    }
  };

  const getQueueStatusLabel = (status: BulkFileUploadItemStatus) => {
    switch (status) {
      case "submitted":
        return t("complete");
      case "submitting":
        return t("sending");
      case "failed":
        return t("failure");
      case "queued":
      default:
        return t("waiting");
    }
  };
  const queueText = queueItems
    .map((item) => {
      const detail = item.errorMessage ?? formatFileSize(item.fileSize);
      return `${getQueueStatusLabel(item.status)}  ${item.fileName}  ${detail}`;
    })
    .join("\n");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile || !uploadable || requestPending) {
      return;
    }
    try {
      if (uploadMode === "batch" && files.length > 1) {
        const initialQueue = buildBulkQueueItems(files);
        setBulkItems(initialQueue);
        setBulkSubmitting(true);
        let successCount = 0;
        let failureCount = 0;
        try {
          for (const [index, targetFile] of files.entries()) {
            const queueItem = initialQueue[index];
            setBulkItems((current) =>
              current.map((item) =>
                item.id === queueItem.id ? { ...item, status: "submitting" } : item
              )
            );
            try {
              await requestMutation.mutateAsync({
                title: resolveBulkFileTitle(title, targetFile, files.length),
                configJson,
                file: targetFile,
                presetId: activePreset?.id ?? null,
                presetName: activePreset?.name ?? null,
                suppressNotifications: true,
              });
              successCount += 1;
              setBulkItems((current) =>
                current.map((item) =>
                  item.id === queueItem.id
                    ? { ...item, status: "submitted" }
                    : item
                )
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : t("anErrorOccurredDuringTheTranscriptionRequest");
              failureCount += 1;
              setBulkItems((current) =>
                current.map((item) =>
                  item.id === queueItem.id
                    ? { ...item, status: "failed", errorMessage: message }
                    : item
                )
              );
            }
          }
        } finally {
          setBulkSubmitting(false);
        }
        if (successCount === 0) {
          enqueueSnackbar(t("bulkTranscriptionRequestsFailed"), { variant: "error" });
          return;
        }
        if (failureCount > 0) {
          enqueueSnackbar(
            t("bulkTranscriptionRequestsPartiallySent", {
              values: { success: successCount, total: files.length },
            }),
            { variant: "warning" }
          );
          return;
        }
        enqueueSnackbar(
          t("bulkTranscriptionRequestsSent", {
            values: { count: successCount },
          }),
          { variant: "success" }
        );
        resetForm();
        onClose();
        navigate(resolveSessionsPath());
        return;
      }

      const result =
        uploadMode === "realtime"
          ? await realtimeRequestMutation.mutateAsync({
              title,
              configJson,
              file: selectedFile,
              presetId: activePreset?.id ?? null,
              presetName: activePreset?.name ?? null,
            })
          : await requestMutation.mutateAsync({
              title,
              configJson,
              file: selectedFile,
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
              <Button
                variant="outlined"
                component="label"
                disabled={requestPending}
              >
                {uploadMode === "batch" ? t("selectAudioFiles") : t("selectAudioFile")}
                <input
                  type="file"
                  accept="audio/*,video/*"
                  multiple={uploadMode === "batch"}
                  hidden
                  disabled={requestPending}
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedFilesSummary}
              </Typography>
            </Stack>
            {showQueue ? (
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  sx={{ px: 2, py: 1.25 }}
                >
                  <Typography variant="subtitle2">{t("uploadQueue")}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bulkSubmittedCount + bulkFailedCount}/{queueItems.length}
                  </Typography>
                </Stack>
                {bulkSubmitting ? (
                  <LinearProgress
                    variant="determinate"
                    value={bulkProgressPercent}
                    sx={{ height: 4 }}
                  />
                ) : null}
                <Typography
                  component="pre"
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    m: 0,
                    px: 2,
                    py: 1.25,
                    maxHeight: 160,
                    overflow: "auto",
                    fontFamily: "Menlo, Consolas, monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {queueText}
                </Typography>
              </Box>
            ) : null}
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
