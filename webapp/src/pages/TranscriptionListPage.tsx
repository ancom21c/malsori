import { useCallback, useEffect, useMemo, useState, useId } from "react";
import dayjs from "dayjs";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { updateLocalTranscription } from "../services/data/transcriptionRepository";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Link as RouterLink } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useTranscriptions } from "../hooks/useTranscriptions";
import { useTranscriptionSearchIndexes } from "../hooks/useTranscriptionSearchIndexes";
import { deleteTranscription } from "../services/data/transcriptionRepository";
import type { LocalTranscription, LocalTranscriptionKind } from "../data/app-db";
import type { SelectChangeEvent } from "@mui/material/Select";
import { matchesSearchQueryWithIndex, parseSearchQuery } from "../utils/textSearch";
import { useI18n, type TranslateOptions } from "../i18n";
import { useSync } from "../services/cloud/SyncProvider";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useUiStore } from "../store/uiStore";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { formatLocalizedDateTime } from "../utils/time";
import { ActionStrip, StudioPageShell } from "../components/studio";

type Translator = (key: string, options?: TranslateOptions) => string;

function getStatusChip(transcription: LocalTranscription, t: Translator) {
  if (transcription.status === "processing" && transcription.kind === "realtime") {
    if (transcription.processingStage === "finalizing") {
      return (
        <Chip
          label={t("finalizing")}
          color="warning"
          size="small"
          icon={<HourglassTopIcon />}
        />
      );
    }
    if (transcription.processingStage === "recording") {
      return (
        <Chip
          label={t("sessionStateRecording")}
          color="secondary"
          size="small"
          icon={<GraphicEqIcon />}
        />
      );
    }
  }

  switch (transcription.status) {
    case "completed":
      return (
        <Chip label={t("complete")} color="success" size="small" icon={<TaskAltIcon />} />
      );
    case "failed":
      return (
        <Chip label={t("failure")} color="error" size="small" icon={<ErrorOutlineIcon />} />
      );
    case "processing":
      return (
        <Chip
          label={t("inProgress")}
          color="warning"
          size="small"
          icon={<HourglassTopIcon />}
        />
      );
    default:
      return <Chip label={t("waiting")} size="small" icon={<HourglassTopIcon />} />;
  }
}

function getKindAvatar(kind: LocalTranscription["kind"]) {
  if (kind === "realtime") {
    return (
      <Avatar sx={{ bgcolor: "secondary.main" }}>
        <GraphicEqIcon />
      </Avatar>
    );
  }
  return (
    <Avatar sx={{ bgcolor: "primary.main" }}>
      <CloudUploadIcon />
    </Avatar>
  );
}

const KIND_LABEL: Record<LocalTranscriptionKind, string> = {
  file: "fileTranscription",
  realtime: "realTimeTranscription",
};

const ALL_KINDS: LocalTranscriptionKind[] = ["file", "realtime"];

function getEndpointLabel(transcription: LocalTranscription, t: Translator): string {
  if (transcription.backendEndpointName) {
    const suffix = transcription.backendApiBaseUrl ? ` · ${transcription.backendApiBaseUrl}` : "";
    return `${transcription.backendEndpointName}${suffix}`;
  }
  if (transcription.backendEndpointSource === "server-default") {
    return t("serverDefaultEndpoint");
  }
  if (transcription.backendEndpointSource === "preset") {
    return t("presetEndpoints");
  }
  return t("noEndpointInformation");
}

function getEndpointKey(transcription: LocalTranscription): string {
  if (transcription.backendEndpointId) {
    return `id:${transcription.backendEndpointId}`;
  }
  if (transcription.backendEndpointSource) {
    return `source:${transcription.backendEndpointSource}`;
  }
  if (transcription.backendEndpointName) {
    return `name:${transcription.backendEndpointName.toLowerCase()}`;
  }
  return "unknown";
}

function getDownloadStatusLabel(
  status: LocalTranscription["downloadStatus"],
  t: Translator
): string {
  if (status === "downloading") {
    return t("downloading");
  }
  if (status === "downloaded") {
    return t("downloaded");
  }
  return t("notDownloaded");
}

export default function TranscriptionListPage() {
  const theme = useTheme();
  const showTopActions = useMediaQuery(theme.breakpoints.up("sm"));
  const transcriptions = useTranscriptions();
  const searchIndexMap = useTranscriptionSearchIndexes();
  const { enqueueSnackbar } = useSnackbar();
  const { t, locale } = useI18n();
  const { syncManager } = useSync();
  const openUploadDialog = useUiStore((state) => state.openUploadDialog);

  const isLoadingTranscriptions = transcriptions === undefined;

  const sortedTranscriptions = useMemo(
    () => transcriptions?.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) ?? [],
    [transcriptions]
  );

  const [titleQuery, setTitleQuery] = useState("");
  const [contentQuery, setContentQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedKinds, setSelectedKinds] = useState<LocalTranscriptionKind[]>(() => [...ALL_KINDS]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<LocalTranscription | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const modelSelectId = useId();
  const endpointSelectId = useId();

  const parsedContentQuery = useMemo(() => parseSearchQuery(contentQuery), [contentQuery]);

  const modelOptions = useMemo(() => {
    const map = new Map<string, string>();
    sortedTranscriptions.forEach((item) => {
      const name = item.modelName?.trim();
      if (!name) {
        return;
      }
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, name);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [sortedTranscriptions]);

  const endpointOptions = useMemo(() => {
    const map = new Map<string, string>();
    sortedTranscriptions.forEach((item) => {
      const key = getEndpointKey(item);
      if (map.has(key)) {
        return;
      }
      map.set(key, getEndpointLabel(item, t));
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [sortedTranscriptions, t]);

  const formatDateTimeLabel = useCallback(
    (value: string | Date | null | undefined) => formatLocalizedDateTime(value, locale),
    [locale]
  );

  const filteredTranscriptions = useMemo(() => {
    const start = startDate ? dayjs(startDate).startOf("day") : null;
    const end = endDate ? dayjs(endDate).endOf("day") : null;
    const normalizedTitle = titleQuery.trim().toLowerCase();
    const hasTitleFilter = normalizedTitle.length > 0;
    const hasContentFilter = contentQuery.trim().length > 0;
    const kindSet = new Set(selectedKinds);
    const modelSet = new Set(selectedModels);
    const endpointSet = new Set(selectedEndpoints);

    return sortedTranscriptions.filter((item) => {
      if (kindSet.size > 0 && !kindSet.has(item.kind)) {
        return false;
      }
      const createdAt = dayjs(item.createdAt);
      if (start && createdAt.isBefore(start)) {
        return false;
      }
      if (end && createdAt.isAfter(end)) {
        return false;
      }
      if (hasTitleFilter) {
        const titleValue = item.searchTitle ?? (item.title ?? "").toLowerCase();
        if (!titleValue.includes(normalizedTitle)) {
          return false;
        }
      }
      if (modelSet.size > 0) {
        const modelKey = item.modelName?.trim().toLowerCase();
        if (!modelKey || !modelSet.has(modelKey)) {
          return false;
        }
      }
      if (endpointSet.size > 0) {
        const endpointKey = getEndpointKey(item);
        if (!endpointSet.has(endpointKey)) {
          return false;
        }
      }
      if (hasContentFilter) {
        const searchIndex = searchIndexMap[item.id];
        if (!matchesSearchQueryWithIndex(parsedContentQuery, searchIndex, item.transcriptText)) {
          return false;
        }
      }
      return true;
    });
  }, [contentQuery, endDate, parsedContentQuery, searchIndexMap, selectedEndpoints, selectedKinds, selectedModels, sortedTranscriptions, startDate, titleQuery]);

  const anyFilterActive =
    titleQuery.trim().length > 0 ||
    contentQuery.trim().length > 0 ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    selectedModels.length > 0 ||
    selectedEndpoints.length > 0 ||
    selectedKinds.length !== ALL_KINDS.length;

  const advancedFiltersActive =
    Boolean(startDate) ||
    Boolean(endDate) ||
    selectedModels.length > 0 ||
    selectedEndpoints.length > 0;

  useEffect(() => {
    if (advancedFiltersActive && !advancedFiltersOpen) {
      setAdvancedFiltersOpen(true);
    }
  }, [advancedFiltersActive, advancedFiltersOpen]);

  const advancedFiltersVisible = advancedFiltersOpen;

  const handleResetFilters = useCallback(() => {
    setTitleQuery("");
    setContentQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedKinds([...ALL_KINDS]);
    setSelectedModels([]);
    setSelectedEndpoints([]);
    setAdvancedFiltersOpen(false);
  }, []);

  const handleToggleSync = async (transcription: LocalTranscription) => {
    const newValue = !transcription.isCloudSynced;
    await updateLocalTranscription(transcription.id, {
      isCloudSynced: newValue,
      syncRetryCount: undefined,
      nextSyncAttemptAt: undefined,
      syncErrorMessage: undefined,
    });
    enqueueSnackbar(
      newValue ? t("cloudSyncEnabled") : t("cloudSyncDisabled"),
      { variant: "info" }
    );
  };

  const handleDownload = async (transcription: LocalTranscription) => {
    if (!syncManager) {
      enqueueSnackbar(t("googleDriveNotConnected"), { variant: "warning" });
      return;
    }
    enqueueSnackbar(t("downloadStarted"), { variant: "info" });
    await updateLocalTranscription(transcription.id, { downloadStatus: "downloading" });
    try {
      await syncManager.downloadFullRecord(transcription.id);
      enqueueSnackbar(t("downloadCompleted"), { variant: "success" });
    } catch (error) {
      console.error("Cloud download failed", error);
      await updateLocalTranscription(transcription.id, { downloadStatus: "not_downloaded" });
      enqueueSnackbar(
        t("downloadFailed"),
        { variant: "error" }
      );
    }
  };

  const handleKindToggle = (kind: LocalTranscriptionKind) => {
    setSelectedKinds((prev) => {
      if (prev.includes(kind)) {
        return prev.filter((value) => value !== kind);
      }
      return [...prev, kind];
    });
  };

  const handleModelFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedModels(typeof value === "string" ? value.split(",") : value);
  };

  const handleEndpointFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedEndpoints(typeof value === "string" ? value.split(",") : value);
  };

  const handleDeleteRequest = (transcription: LocalTranscription) => {
    setDeleteTarget(transcription);
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }
    await deleteTranscription(deleteTarget.id);
    enqueueSnackbar(t("theTranscriptionRecordHasBeenDeleted"), { variant: "success" });
    setDeleteTarget(null);
  };

  const hasAnyTranscriptions = !isLoadingTranscriptions && sortedTranscriptions.length > 0;
  const showNoMatches = hasAnyTranscriptions && filteredTranscriptions.length === 0;
  const quickActionSlot = showTopActions ? (
    <ActionStrip ariaLabel={t("quickActions")} sx={{ width: "auto" }}>
      <Tooltip title={t("fileTranscriptionRequest")}>
        <IconButton
          onClick={openUploadDialog}
          color="primary"
          size="small"
          aria-label={t("fileTranscriptionRequest")}
          sx={{
            bgcolor: "action.hover",
            "&:hover": { bgcolor: "action.selected" },
          }}
        >
          <CloudUploadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t("startRealTimeTranscription")}>
        <IconButton
          component={RouterLink}
          to="/realtime"
          color="secondary"
          size="small"
          aria-label={t("startRealTimeTranscription")}
          sx={{
            bgcolor: "action.hover",
            "&:hover": { bgcolor: "action.selected" },
          }}
        >
          <GraphicEqIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </ActionStrip>
  ) : null;

  return (
    <StudioPageShell
      title={t("transcriptionList")}
      description={t("checkFileTranscriptionAndRealTimeTranscriptionResultsInChronologicalOrder")}
      headingId="transcription-list-title"
      actionSlot={quickActionSlot}
    >
      <Card>
        <CardContent sx={{ px: 0 }}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label={t("titleSearch")}
                  value={titleQuery}
                  onChange={(event) => setTitleQuery(event.target.value)}
                  fullWidth
                  placeholder={t("exampleMarchMeeting")}
                />
                <TextField
                  label={t("searchForUtteranceContent")}
                  value={contentQuery}
                  onChange={(event) => setContentQuery(event.target.value)}
                  fullWidth
                  placeholder={t('exampleMeetingMinutesFilter')}
                  helperText={t('youCanUseQuotationMarksExcludeOrOperator')}
                />
              </Stack>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <FormGroup
                  row
                  sx={{
                    flexWrap: "wrap",
                    gap: 0.5,
                    "& .MuiFormControlLabel-root": { mr: 1.5, my: 0.5 },
                  }}
                >
                  {ALL_KINDS.map((kind) => (
                    <FormControlLabel
                      key={kind}
                      control={
                        <Checkbox
                          checked={selectedKinds.includes(kind)}
                          onChange={() => handleKindToggle(kind)}
                        />
                      }
                      label={t(KIND_LABEL[kind])}
                    />
                  ))}
                </FormGroup>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent={{ xs: "space-between", sm: "flex-end" }}
                >
                  {advancedFiltersActive && !advancedFiltersVisible ? (
                    <Chip size="small" label={t("advancedFiltersApplied")} variant="outlined" />
                  ) : null}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                    startIcon={<TuneRoundedIcon fontSize="small" />}
                    endIcon={
                      advancedFiltersVisible ? (
                        <ExpandLessRoundedIcon fontSize="small" />
                      ) : (
                        <ExpandMoreRoundedIcon fontSize="small" />
                      )
                    }
                  >
                    {advancedFiltersVisible ? t("hideAdvancedSettings") : t("viewAdvancedSettings")}
                  </Button>
                  <Button
                    onClick={handleResetFilters}
                    disabled={!anyFilterActive}
                    size="small"
                  >
                    {t("filterReset")}
                  </Button>
                </Stack>
              </Stack>
              <Collapse in={advancedFiltersVisible} timeout="auto" unmountOnExit>
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label={t("startDate")}
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                    <TextField
                      label={t("endDate")}
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id={`${modelSelectId}-label`}>{t("model")}</InputLabel>
                      <Select
                        labelId={`${modelSelectId}-label`}
                        multiple
                        value={selectedModels}
                        label={t("model")}
                        onChange={handleModelFilterChange}
                        renderValue={(selected) =>
                          Array.isArray(selected) && selected.length > 0
                            ? selected
                              .map(
                                (value) =>
                                  modelOptions.find((option) => option.value === value)?.label ?? value
                              )
                              .join(", ")
                            : t("entire")
                        }
                        disabled={modelOptions.length === 0}
                      >
                        {modelOptions.length === 0 ? (
                          <MenuItem value="" disabled>
                            {t("noModelInformationRecorded")}
                          </MenuItem>
                        ) : (
                          modelOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              <Checkbox checked={selectedModels.includes(option.value)} />
                              <ListItemText primary={option.label} />
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel id={`${endpointSelectId}-label`}>
                        {t("endpoint")}
                      </InputLabel>
                      <Select
                        labelId={`${endpointSelectId}-label`}
                        multiple
                        value={selectedEndpoints}
                        label={t("endpoint")}
                        onChange={handleEndpointFilterChange}
                        renderValue={(selected) =>
                          Array.isArray(selected) && selected.length > 0
                            ? selected
                              .map(
                                (value) =>
                                  endpointOptions.find((option) => option.value === value)?.label ?? value
                              )
                              .join(", ")
                            : t("entire")
                        }
                        disabled={endpointOptions.length === 0}
                      >
                        {endpointOptions.length === 0 ? (
                          <MenuItem value="" disabled>
                            {t("noEndpointInformationRecorded")}
                          </MenuItem>
                        ) : (
                          endpointOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              <Checkbox checked={selectedEndpoints.includes(option.value)} />
                              <ListItemText primary={option.label} />
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              </Collapse>
            </Stack>
          </Box>
          <Divider />
          {isLoadingTranscriptions ? (
            <Box
              sx={{
                py: 6,
                px: 3,
                display: "flex",
                justifyContent: "center",
              }}
              role="status"
              aria-label={t("loading")}
            >
              <CircularProgress />
            </Box>
          ) : !hasAnyTranscriptions ? (
            <Box
              sx={{
                py: 6,
                px: 3,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Box>
                  <Typography variant="body1" gutterBottom>
                    {t("thereAreNoTranscriptionRecordsYet")}
                  </Typography>
                  <Typography variant="body2">
                    {t(
                      "clickTheButtonInTheBottomRightToRequestFileTranscriptionOrStartRealTimeTranscription"
                    )}
                  </Typography>
                </Box>
                <ActionStrip
                  ariaLabel={t("quickActions")}
                  sx={{
                    maxWidth: 560,
                    pt: 0.5,
                    display: { xs: "none", sm: "flex" },
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={openUploadDialog}
                    sx={{
                      minWidth: { sm: 240 },
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {t("fileTranscriptionRequest")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<GraphicEqIcon />}
                    component={RouterLink}
                    to="/realtime"
                    sx={{
                      minWidth: { sm: 240 },
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {t("startRealTimeTranscription")}
                  </Button>
                </ActionStrip>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<TuneRoundedIcon />}
                  component={RouterLink}
                  to="/settings"
                >
                  {t("manageTranscriptionSettings")}
                </Button>
                <ActionStrip ariaLabel={t("quickActions")} stickyMobile>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                    onClick={openUploadDialog}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {t("fileTranscriptionRequest")}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    startIcon={<GraphicEqIcon />}
                    component={RouterLink}
                    to="/realtime"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {t("realTimeTranscription")}
                  </Button>
                </ActionStrip>
              </Stack>
            </Box>
          ) : showNoMatches ? (
            <Box
              sx={{
                py: 6,
                px: 3,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1" gutterBottom>
                {t("thereAreNoTranscriptionRecordsMatchingTheCriteria")}
              </Typography>
              <Typography variant="body2">
                {t("pleaseAdjustOrResetTheFilter")}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredTranscriptions.map((item, index) => {
                const endpointLabel = getEndpointLabel(item, t);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      "@media (prefers-reduced-motion: no-preference)": {
                        animation: "malsori-fade-up 280ms ease-out both",
                        animationDelay: `${Math.min(index, 12) * 25}ms`,
                        willChange: "transform, opacity",
                      },
                    }}
                  >
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={1}>
                          {item.downloadStatus === "not_downloaded" || item.downloadStatus === "downloading" ? (
                            <IconButton
                              edge="end"
                              onClick={() => void handleDownload(item)}
                              disabled={!syncManager || item.downloadStatus === "downloading"}
                              aria-label={t("download")}
                            >
                              {item.downloadStatus === "downloading" ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CloudDownloadIcon color="primary" />
                              )}
                            </IconButton>
                          ) : (
                            <IconButton
                              edge="end"
                              onClick={() => void handleToggleSync(item)}
                              color={item.isCloudSynced ? "primary" : "default"}
                              aria-label={
                                item.isCloudSynced ? t("disableCloudSync") : t("enableCloudSync")
                              }
                            >
                              {item.isCloudSynced ? <CloudIcon /> : <CloudOffIcon />}
                            </IconButton>
                          )}
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteRequest(item)}
                            aria-label={t("delete")}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        component={RouterLink}
                        to={`/transcriptions/${item.id}`}
                        state={{ fromList: true }}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemAvatar>{getKindAvatar(item.kind)}</ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="subtitle1" fontWeight={600}>
                                {item.title}
                              </Typography>
                              {getStatusChip(item, t)}
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.5} mt={1}>
                              <Typography variant="body2" color="text.secondary">
                                {t("type")}: {t(KIND_LABEL[item.kind])}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {t("creationTime")}: {formatDateTimeLabel(item.createdAt)}
                              </Typography>
                              {item.modelName ? (
                                <Typography variant="body2" color="text.secondary">
                                  {t("model")}: {item.modelName}
                                </Typography>
                              ) : null}
                              {endpointLabel ? (
                                <Typography variant="body2" color="text.secondary">
                                  {t("endpoint")}: {endpointLabel}
                                </Typography>
                              ) : null}
                              {item.isCloudSynced || item.downloadStatus ? (
                                <Typography variant="body2" color="text.secondary">
                                  {t("cloudSync")}:{" "}
                                  {item.isCloudSynced
                                    ? t("enabled")
                                    : t("disabled")}
                                  {item.downloadStatus
                                    ? ` · ${getDownloadStatusLabel(item.downloadStatus, t)}`
                                    : ""}
                                </Typography>
                              ) : null}
                              {item.lastSyncedAt ? (
                                <Typography variant="body2" color="text.secondary">
                                  {t("lastSyncedAt")}:{" "}
                                  {formatDateTimeLabel(item.lastSyncedAt)}
                                </Typography>
                              ) : null}
                              {item.nextSyncAttemptAt ? (
                                <Typography variant="body2" color="text.secondary">
                                  {t("syncRetryAt")}:{" "}
                                  {formatDateTimeLabel(item.nextSyncAttemptAt)}
                                </Typography>
                              ) : null}
                              {item.syncErrorMessage ? (
                                <Typography variant="body2" sx={{ color: "warning.main" }}>
                                  {t("syncError")}: {item.syncErrorMessage}
                                </Typography>
                              ) : null}
                              {item.errorMessage ? (
                                <Typography variant="body2" color="error">
                                  {t("error")}: {item.errorMessage}
                                </Typography>
                              ) : null}
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index !== filteredTranscriptions.length - 1 && <Divider component="li" />}
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("delete")}
        description={
          deleteTarget?.kind === "realtime"
            ? `${t("wouldYouLikeToDeleteYourTranscriptionHistory")} ${t(
              "forRealTimeTranscriptionLocallyStoredAudioChunksWillAlsoBeDeleted"
            )}`
            : t("wouldYouLikeToDeleteYourTranscriptionHistory")
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancellation")}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={handleDeleteCancel}
      />
    </StudioPageShell>
  );
}
