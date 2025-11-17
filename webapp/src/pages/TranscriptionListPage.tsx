import { useCallback, useMemo, useState, useId } from "react";
import dayjs from "dayjs";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Checkbox,
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
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Link as RouterLink } from "react-router-dom";
import { useSnackbar } from "notistack";
import { useTranscriptions } from "../hooks/useTranscriptions";
import { useTranscriptionSearchIndexes } from "../hooks/useTranscriptionSearchIndexes";
import { deleteTranscription } from "../services/data/transcriptionRepository";
import type { LocalTranscription, LocalTranscriptionKind } from "../data/app-db";
import type { SelectChangeEvent } from "@mui/material/Select";
import { matchesSearchQueryWithIndex, parseSearchQuery } from "../utils/textSearch";
import { useI18n, type TranslateOptions } from "../i18n";

type Translator = (key: string, options?: TranslateOptions) => string;

function getStatusChip(transcription: LocalTranscription, t: Translator) {
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
  file: "파일 전사",
  realtime: "실시간 전사",
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

export default function TranscriptionListPage() {
  const transcriptions = useTranscriptions();
  const searchIndexMap = useTranscriptionSearchIndexes();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useI18n();

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

  const handleResetFilters = useCallback(() => {
    setTitleQuery("");
    setContentQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedKinds([...ALL_KINDS]);
    setSelectedModels([]);
    setSelectedEndpoints([]);
  }, []);

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

  const handleDelete = async (transcription: LocalTranscription) => {
    if (
      !window.confirm(
        t(
          "전사 기록을 삭제하시겠습니까? 실시간 전사인 경우 로컬에 저장된 오디오 청크도 삭제됩니다."
        )
      )
    ) {
      return;
    }
    await deleteTranscription(transcription.id);
    enqueueSnackbar(t("theTranscriptionRecordHasBeenDeleted"), { variant: "success" });
  };

  const hasAnyTranscriptions = sortedTranscriptions.length > 0;
  const showNoMatches = hasAnyTranscriptions && filteredTranscriptions.length === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader
          title={t("transcriptionList")}
          subheader={t("checkFileTranscriptionAndRealTimeTranscriptionResultsInChronologicalOrder")}
        />
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
              <FormGroup row>
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
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={handleResetFilters} disabled={!anyFilterActive} size="small">
                  {t("filterReset")}
                </Button>
              </Box>
            </Stack>
          </Box>
          <Divider />
          {!hasAnyTranscriptions ? (
            <Box
              sx={{
                py: 6,
                px: 3,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1" gutterBottom>
                {t("thereAreNoTranscriptionRecordsYet")}
              </Typography>
              <Typography variant="body2">
                {t("clickTheButtonInTheBottomRightToRequestFileTranscriptionOrStartRealTimeTranscription")}
              </Typography>
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
                  <Box key={item.id}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" onClick={() => void handleDelete(item)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton
                        component={RouterLink}
                        to={`/transcriptions/${item.id}`}
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
                                {t("creationTime")}: {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
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
    </Box>
  );
}
