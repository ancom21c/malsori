import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { ChipProps } from "@mui/material/Chip";
import TranscriptionConfigQuickOptions from "../components/TranscriptionConfigQuickOptions";
import { useSettingsStore } from "../store/settingsStore";
import { useSnackbar } from "notistack";
import { usePresets } from "../hooks/usePresets";
import {
  createPreset,
  updatePreset,
  deletePreset,
  ensureDefaultPreset,
} from "../services/data/presetRepository";
import type {
  BackendEndpointDeployment,
  BackendEndpointPreset,
  PresetConfig,
} from "../data/app-db";
import { appDb } from "../data/app-db";
import {
  DEFAULT_FILE_PRESETS,
  DEFAULT_BACKEND_ENDPOINT_PRESETS,
  DEFAULT_STREAMING_PRESETS,
} from "../data/defaultPresets";
import {
  checkMicrophonePermission,
  checkPersistentStoragePermission,
  requestMicrophonePermission,
  requestPersistentStoragePermission,
  type BrowserPermissionState,
} from "../services/permissions";
import { useBackendEndpointPresets } from "../hooks/useBackendEndpointPresets";
import {
  createBackendEndpointPreset,
  updateBackendEndpointPreset,
  deleteBackendEndpointPreset,
  ensureDefaultBackendEndpointPresets,
} from "../services/data/backendEndpointRepository";
import { useRtzrApiClient } from "../services/api/rtzrApiClientContext";
import type { BackendEndpointState } from "../services/api/types";
import { useTheme } from "@mui/material/styles";
import { useI18n } from "../i18n";

type SettingsTab = "file" | "streaming";

type PresetFormState = {
  id?: string;
  name: string;
  description: string;
  configJson: string;
  isDefault: boolean;
};

type SettingsSection = "transcription" | "permissions" | "backend";

type BackendPresetFormState = {
  id?: string;
  name: string;
  description: string;
  deployment: BackendEndpointDeployment;
  apiBaseUrl: string;
  verifySsl: boolean;
  isDefault: boolean;
  clientIdInput: string;
  clientSecretInput: string;
  storedClientId?: string;
  storedClientSecret?: string;
};

function createEmptyBackendPresetForm(): BackendPresetFormState {
  return {
    id: undefined,
    name: "",
    description: "",
    deployment: "cloud",
    apiBaseUrl: "",
    verifySsl: true,
    isDefault: false,
    clientIdInput: "",
    clientSecretInput: "",
    storedClientId: undefined,
    storedClientSecret: undefined,
  };
}

function downloadJsonFile(payload: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildFileSafeNameSegment(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function buildTimestampedFileName(prefix: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${stamp}.json`;
}

function normalizeConfigJson(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "{}";
    }
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return trimmed;
    }
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return "{}";
}

const SETTINGS_SECTIONS: { id: SettingsSection; labelKey: string }[] = [
  { id: "transcription", labelKey: "manageTranscriptionSettings" },
  { id: "permissions", labelKey: "browserPermissions" },
  { id: "backend", labelKey: "backendSettings" },
];

function isPresetFormEqual(a: PresetFormState, b: PresetFormState) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.description === b.description &&
    a.configJson === b.configJson &&
    a.isDefault === b.isDefault
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navOffset = (isSmallScreen ? 56 : 64) + 8;
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>("file");
  const { enqueueSnackbar } = useSnackbar();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const realtimeAutoSaveSeconds = useSettingsStore((state) => state.realtimeAutoSaveSeconds);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const presetType: PresetConfig["type"] = activeTab === "file" ? "file" : "streaming";
  const presets = usePresets(presetType);
  const backendPresets = useBackendEndpointPresets();
  const apiClient = useRtzrApiClient();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetForm, setPresetForm] = useState<PresetFormState>({
    id: undefined,
    name: "",
    description: "",
    configJson: "{}",
    isDefault: false,
  });
  const [selectedBackendPresetId, setSelectedBackendPresetId] = useState<string | null>(null);
  const [backendPresetForm, setBackendPresetForm] = useState<BackendPresetFormState>(
    createEmptyBackendPresetForm()
  );
  const [permissionStatus, setPermissionStatus] = useState<{
    microphone: BrowserPermissionState;
    storage: BrowserPermissionState;
  }>({
    microphone: "unknown",
    storage: "unknown",
  });
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [requestingMicrophone, setRequestingMicrophone] = useState(false);
  const [requestingStorage, setRequestingStorage] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("transcription");
  const transcriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const permissionsSectionRef = useRef<HTMLDivElement | null>(null);
  const backendSectionRef = useRef<HTMLDivElement | null>(null);
  const [backendState, setBackendState] = useState<BackendEndpointState | null>(null);
  const [backendStateLoading, setBackendStateLoading] = useState(false);
  const [backendStateError, setBackendStateError] = useState<string | null>(null);
  const backendImportInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptionImportInputRef = useRef<HTMLInputElement | null>(null);
  const sectionRefs = {
    transcription: transcriptionSectionRef,
    permissions: permissionsSectionRef,
    backend: backendSectionRef,
  };
  const selectedBackendPreset = useMemo(() => {
    if (!selectedBackendPresetId) return null;
    return backendPresets.find((preset) => preset.id === selectedBackendPresetId) ?? null;
  }, [backendPresets, selectedBackendPresetId]);

  const handleBackendPresetSelect = useCallback(
    (preset: BackendEndpointPreset | null) => {
      if (!preset) {
        setSelectedBackendPresetId(null);
        setBackendPresetForm(createEmptyBackendPresetForm());
        return;
      }
      setSelectedBackendPresetId(preset.id);
      setBackendPresetForm({
        id: preset.id,
        name: preset.name,
        description: preset.description ?? "",
        deployment: preset.deployment,
        apiBaseUrl: preset.apiBaseUrl,
        verifySsl: preset.verifySsl ?? true,
        isDefault: preset.isDefault ?? false,
        clientIdInput: "",
        clientSecretInput: "",
        storedClientId: preset.clientId,
        storedClientSecret: preset.clientSecret,
      });
    },
    []
  );

  const refreshPermissionStatus = useCallback(async () => {
    if (typeof navigator === "undefined") {
      setPermissionStatus({ microphone: "unknown", storage: "unknown" });
      return;
    }
    setPermissionLoading(true);
    try {
      const [microphone, storage] = await Promise.all([
        checkMicrophonePermission(),
        checkPersistentStoragePermission(),
      ]);
      setPermissionStatus({ microphone, storage });
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  useEffect(() => {
    void ensureDefaultPreset("file", DEFAULT_FILE_PRESETS);
    void ensureDefaultPreset("streaming", DEFAULT_STREAMING_PRESETS);
    void ensureDefaultBackendEndpointPresets(DEFAULT_BACKEND_ENDPOINT_PRESETS);
  }, []);

  useEffect(() => {
    void refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const handleRefreshBackendState = useCallback(async () => {
    if (!apiBaseUrl.trim()) {
      setBackendState(null);
      setBackendStateError(null);
      return;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const state = await apiClient.getBackendEndpointState();
      setBackendState(state);
    } catch (error) {
      setBackendStateError(
        error instanceof Error ? error.message : t("failedToLoadBackendState")
      );
    } finally {
      setBackendStateLoading(false);
    }
  }, [apiBaseUrl, apiClient, t]);

  useEffect(() => {
    void handleRefreshBackendState();
  }, [handleRefreshBackendState]);

  useEffect(() => {
    if (!backendPresets.length) {
      setSelectedBackendPresetId(null);
      setBackendPresetForm(createEmptyBackendPresetForm());
      return;
    }
    if (
      selectedBackendPresetId &&
      backendPresets.some((preset) => preset.id === selectedBackendPresetId)
    ) {
      return;
    }
    const nextPreset =
      (activeBackendPresetId &&
        backendPresets.find((preset) => preset.id === activeBackendPresetId)) ??
      backendPresets.find((preset) => preset.isDefault) ??
      backendPresets[0];
    if (nextPreset) {
      handleBackendPresetSelect(nextPreset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    backendPresets,
    activeBackendPresetId,
    handleBackendPresetSelect,
  ]);

  const presetHint = useMemo(() => {
    if (activeTab === "file") {
      return t("managesTheRequestconfigJsonToBePassedToTheRegularSttApiV1Transcribe");
    }
    return t("managesDecoderconfigAndSessionSettingsForStreamingSttApiWebsocket");
  }, [activeTab, t]);
  const templateConfigJson = useMemo(() => {
    return presetType === "file"
      ? DEFAULT_FILE_PRESETS[0]?.configJson ?? "{}"
      : DEFAULT_STREAMING_PRESETS[0]?.configJson ?? "{}";
  }, [presetType]);
  const backendDeploymentMode = backendState?.deployment ?? "cloud";

  useEffect(() => {
    setSelectedPresetId(null);
    setPresetForm((prev) => ({
      ...prev,
      id: undefined,
      name: "",
      description: "",
      configJson: templateConfigJson,
      isDefault: presets.length === 0,
    }));
  }, [presetType, templateConfigJson, presets.length]);

  useEffect(() => {
    if (presets.length === 0) {
      setSelectedPresetId((prev) => (prev === null ? prev : null));
      setPresetForm((prev) => {
        const next: PresetFormState = {
          id: undefined,
          name: "",
          description: "",
          configJson: templateConfigJson,
          isDefault: true,
        };
        return isPresetFormEqual(prev, next) ? prev : next;
      });
      return;
    }

    const current = selectedPresetId
      ? presets.find((preset) => preset.id === selectedPresetId)
      : undefined;
    const target = current ?? presets.find((preset) => preset.isDefault) ?? presets[0];
    if (!target) return;

    setSelectedPresetId((prev) => (prev === target.id ? prev : target.id));
    setPresetForm((prev) => {
      const next: PresetFormState = {
        id: target.id,
        name: target.name,
        description: target.description ?? "",
        configJson: target.configJson,
        isDefault: Boolean(target.isDefault),
      };
      return isPresetFormEqual(prev, next) ? prev : next;
    });
  }, [presets, selectedPresetId, templateConfigJson]);

  const handlePresetSelect = (preset: PresetConfig) => {
    setSelectedPresetId(preset.id);
    setPresetForm((prev) => {
      const next: PresetFormState = {
        id: preset.id,
        name: preset.name,
        description: preset.description ?? "",
        configJson: preset.configJson,
        isDefault: Boolean(preset.isDefault),
      };
      return isPresetFormEqual(prev, next) ? prev : next;
    });
  };

  const handlePresetFieldChange = <K extends keyof Omit<PresetFormState, "isDefault">>(
    key: K,
    value: PresetFormState[K]
  ) => {
    setPresetForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePresetDefaultToggle = (checked: boolean) => {
    setPresetForm((prev) => ({
      ...prev,
      isDefault: checked,
    }));
  };

  const handleNewBackendPreset = () => {
    handleBackendPresetSelect(null);
  };

  const handleBackendCredentialClear = (field: "storedClientId" | "storedClientSecret") => {
    setBackendPresetForm((prev) => ({
      ...prev,
      [field]: undefined,
      clientIdInput: field === "storedClientId" ? "" : prev.clientIdInput,
      clientSecretInput: field === "storedClientSecret" ? "" : prev.clientSecretInput,
    }));
  };

  const handleBackendPresetSave = async () => {
    const trimmedName = backendPresetForm.name.trim();
    if (!trimmedName) {
      enqueueSnackbar(t("pleaseEnterTheBackendPresetName"), { variant: "warning" });
      return;
    }
    const trimmedBaseUrl = backendPresetForm.apiBaseUrl.trim();
    if (!trimmedBaseUrl) {
      enqueueSnackbar(t("pleaseEnterTheApiBaseUrl"), { variant: "warning" });
      return;
    }
    const trimmedDescription = backendPresetForm.description.trim();
    const resolvedClientId =
      backendPresetForm.clientIdInput.trim() ||
      backendPresetForm.storedClientId ||
      undefined;
    const resolvedClientSecret =
      backendPresetForm.clientSecretInput.trim() ||
      backendPresetForm.storedClientSecret ||
      undefined;
    try {
      if (backendPresetForm.id) {
        await updateBackendEndpointPreset(backendPresetForm.id, {
          name: trimmedName,
          description: trimmedDescription,
          deployment: backendPresetForm.deployment,
          apiBaseUrl: trimmedBaseUrl,
          verifySsl: backendPresetForm.verifySsl,
          clientId: resolvedClientId ?? null,
          clientSecret: resolvedClientSecret ?? null,
          isDefault: backendPresetForm.isDefault,
        });
        handleBackendPresetSelect({
          id: backendPresetForm.id,
          name: trimmedName,
          description: trimmedDescription || undefined,
          deployment: backendPresetForm.deployment,
          apiBaseUrl: trimmedBaseUrl,
          verifySsl: backendPresetForm.verifySsl,
          clientId: resolvedClientId,
          clientSecret: resolvedClientSecret,
          isDefault: backendPresetForm.isDefault,
          createdAt: selectedBackendPreset?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        enqueueSnackbar(t("youHaveSavedYourBackendPreset"), { variant: "success" });
      } else {
        const created = await createBackendEndpointPreset({
          name: trimmedName,
          description: trimmedDescription || undefined,
          deployment: backendPresetForm.deployment,
          apiBaseUrl: trimmedBaseUrl,
          verifySsl: backendPresetForm.verifySsl,
          clientId: resolvedClientId,
          clientSecret: resolvedClientSecret,
          isDefault: backendPresetForm.isDefault,
        });
        handleBackendPresetSelect(created);
        enqueueSnackbar(t("addedBackendPresets"), { variant: "success" });
      }
    } catch (error) {
        enqueueSnackbar(
          error instanceof Error ? error.message : t("failedToSaveBackendPreset"),
          { variant: "error" }
        );
    }
  };

  const handleBackendPresetDelete = async () => {
    if (!backendPresetForm.id) {
      enqueueSnackbar(t("pleaseSelectTheBackendPresetYouWantToDelete"), { variant: "warning" });
      return;
    }
    const shouldDelete =
      typeof window === "undefined"
        ? true
        : window.confirm(t("areYouSureYouWantToDeleteTheSelectedBackendPreset"));
    if (!shouldDelete) {
      return;
    }
    try {
      await deleteBackendEndpointPreset(backendPresetForm.id);
      handleBackendPresetSelect(null);
      enqueueSnackbar(t("removedBackendPresets"), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToDeleteBackendPreset"),
        { variant: "error" }
      );
    }
  };

  const handleBackendPresetExport = () => {
    if (!selectedBackendPreset) {
      enqueueSnackbar(t("pleaseSelectTheBackendPresetYouWantToExport"), { variant: "warning" });
      return;
    }
    const payload = {
      version: 1,
      type: "backend_preset",
      preset: {
        name: selectedBackendPreset.name,
        description: selectedBackendPreset.description ?? "",
        deployment: selectedBackendPreset.deployment,
        apiBaseUrl: selectedBackendPreset.apiBaseUrl,
        verifySsl: selectedBackendPreset.verifySsl ?? true,
        clientId: selectedBackendPreset.clientId ?? null,
        clientSecret: selectedBackendPreset.clientSecret ?? null,
        isDefault: selectedBackendPreset.isDefault ?? false,
      },
    };
    const slug = buildFileSafeNameSegment(selectedBackendPreset.name, "backend");
    downloadJsonFile(payload, `backend-preset-${slug}.json`);
    enqueueSnackbar(t("backendPresetsHaveBeenExported"), { variant: "success" });
  };

  const handleBackendPresetImportRequest = () => {
    if (backendImportInputRef.current) {
      backendImportInputRef.current.value = "";
      backendImportInputRef.current.click();
    }
  };

  const handleBackendPresetImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        type?: string;
        preset?: Record<string, unknown>;
      };
      if (parsed.type !== "backend_preset" || !parsed.preset) {
        throw new Error(t("thisIsNotAValidBackendPresetJson"));
      }
      const preset = parsed.preset;
      const name = typeof preset.name === "string" ? preset.name.trim() : "";
      const deployment =
        preset.deployment === "onprem" || preset.deployment === "cloud"
          ? (preset.deployment as BackendEndpointDeployment)
          : "cloud";
      const apiBaseRaw =
        typeof preset.apiBaseUrl === "string"
          ? preset.apiBaseUrl
          : typeof preset.api_base_url === "string"
          ? preset.api_base_url
          : "";
      const apiBaseUrl = apiBaseRaw.trim();
      if (!name || !apiBaseUrl) {
        throw new Error(t("youWillNeedAPresetNameAndApiBaseUrl"));
      }
      const created = await createBackendEndpointPreset({
        name,
        description:
          typeof preset.description === "string" ? preset.description : undefined,
        deployment,
        apiBaseUrl,
        verifySsl: typeof preset.verifySsl === "boolean" ? preset.verifySsl : true,
        clientId:
          typeof preset.clientId === "string"
            ? preset.clientId
            : typeof preset.client_id === "string"
            ? preset.client_id
            : undefined,
        clientSecret:
          typeof preset.clientSecret === "string"
            ? preset.clientSecret
            : typeof preset.client_secret === "string"
            ? preset.client_secret
            : undefined,
        isDefault:
          typeof preset.isDefault === "boolean"
            ? preset.isDefault
            : typeof preset.is_default === "boolean"
            ? preset.is_default
            : false,
      });
      handleBackendPresetSelect(created);
      enqueueSnackbar(t("backendPresetsHaveBeenLoaded"), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToLoadBackendPreset"),
        { variant: "error" }
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleApplyBackendPreset = async () => {
    if (!selectedBackendPreset) {
      enqueueSnackbar(t("pleaseSelectTheBackendPresetToApply"), { variant: "warning" });
      return;
    }
    if (!apiBaseUrl.trim()) {
      enqueueSnackbar(t("pleaseEnterThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const state = await apiClient.updateBackendEndpoint({
        deployment: selectedBackendPreset.deployment,
        apiBaseUrl: selectedBackendPreset.apiBaseUrl,
        clientId: selectedBackendPreset.clientId ?? null,
        clientSecret: selectedBackendPreset.clientSecret ?? null,
        verifySsl: selectedBackendPreset.verifySsl ?? true,
      });
      setBackendState(state);
      await updateSetting("activeBackendPresetId", selectedBackendPreset.id);
      enqueueSnackbar(t("backendEndpointApplied"), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("applyingBackendEndpointFailed"),
        { variant: "error" }
      );
    } finally {
      setBackendStateLoading(false);
    }
  };

  const handleResetBackendEndpoint = async () => {
    if (!apiBaseUrl.trim()) {
      enqueueSnackbar(t("pleaseEnterThePythonApiBaseUrlFirst"), { variant: "warning" });
      return;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const state = await apiClient.resetBackendEndpoint();
      setBackendState(state);
      await updateSetting("activeBackendPresetId", null);
      enqueueSnackbar(t("revertedToServerDefaults"), { variant: "info" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("restoringServerDefaultsFailed"),
        { variant: "error" }
      );
    } finally {
      setBackendStateLoading(false);
    }
  };

  const handleNewPreset = () => {
    setSelectedPresetId(null);
    setPresetForm({
      id: undefined,
      name: "",
      description: "",
      configJson: templateConfigJson,
      isDefault: presets.length === 0,
    });
  };

  const handleLoadTemplate = () => {
    setPresetForm((prev) => ({ ...prev, configJson: templateConfigJson }));
  };

  const handleRequestMicrophonePermission = async () => {
    setRequestingMicrophone(true);
    try {
      const granted = await requestMicrophonePermission();
      await refreshPermissionStatus();
      enqueueSnackbar(
        granted
          ? t("microphonePermissionHasBeenGranted")
          : t("unableToRequestMicrophonePermissionPleaseCheckYourBrowserSettings"),
        { variant: granted ? "success" : "error" }
      );
    } finally {
      setRequestingMicrophone(false);
    }
  };

  const handleRequestStoragePermission = async () => {
    setRequestingStorage(true);
    try {
      const granted = await requestPersistentStoragePermission();
      await refreshPermissionStatus();
      enqueueSnackbar(
        granted
          ? t("storagePermissionsGranted")
          : t("unableToRequestStoragePermissionPleaseCheckYourBrowserSettings"),
        { variant: granted ? "success" : "error" }
      );
    } finally {
      setRequestingStorage(false);
    }
  };

  const handleDownloadTranscriptionPresets = async () => {
    try {
      const [filePresets, streamingPresets] = await Promise.all([
        appDb.presets.where("type").equals("file").toArray(),
        appDb.presets.where("type").equals("streaming").toArray(),
      ]);
      const payload = {
        version: 1,
        type: "transcription_presets",
        filePresets: filePresets.map((preset) => ({
          name: preset.name,
          description: preset.description ?? "",
          configJson: preset.configJson,
          isDefault: preset.isDefault ?? false,
        })),
        streamingPresets: streamingPresets.map((preset) => ({
          name: preset.name,
          description: preset.description ?? "",
          configJson: preset.configJson,
          isDefault: preset.isDefault ?? false,
        })),
      };
      downloadJsonFile(payload, buildTimestampedFileName("transcription-presets"));
      enqueueSnackbar(t("theTranscriptionPresetHasBeenExported"), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToExportTranscriptionPreset"),
        { variant: "error" }
      );
    }
  };

  const handleImportTranscriptionPresetsRequest = () => {
    if (transcriptionImportInputRef.current) {
      transcriptionImportInputRef.current.value = "";
      transcriptionImportInputRef.current.click();
    }
  };

  const handleImportTranscriptionPresets = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        type?: string;
        filePresets?: Array<Record<string, unknown>>;
        streamingPresets?: Array<Record<string, unknown>>;
      };
      if (parsed.type !== "transcription_presets") {
        throw new Error(t("thisIsNotAValidTranscriptionSettingsJson"));
      }
      const importedFilePresets = Array.isArray(parsed.filePresets)
        ? parsed.filePresets
        : [];
      const importedStreamingPresets = Array.isArray(parsed.streamingPresets)
        ? parsed.streamingPresets
        : [];
      let importedCount = 0;
      for (const entry of importedFilePresets) {
        const name =
          typeof entry.name === "string"
            ? entry.name.trim()
            : typeof entry.title === "string"
            ? entry.title.trim()
            : "";
        const configSource =
          entry.configJson ?? entry.config_json ?? entry.config ?? "{}";
        if (!name) continue;
        await createPreset({
          type: "file",
          name,
          description: typeof entry.description === "string" ? entry.description : "",
          configJson: normalizeConfigJson(configSource),
          isDefault: Boolean(entry.isDefault ?? entry.is_default),
        });
        importedCount += 1;
      }
      for (const entry of importedStreamingPresets) {
        const name =
          typeof entry.name === "string"
            ? entry.name.trim()
            : typeof entry.title === "string"
            ? entry.title.trim()
            : "";
        const configSource =
          entry.configJson ?? entry.config_json ?? entry.config ?? "{}";
        if (!name) continue;
        await createPreset({
          type: "streaming",
          name,
          description: typeof entry.description === "string" ? entry.description : "",
          configJson: normalizeConfigJson(configSource),
          isDefault: Boolean(entry.isDefault ?? entry.is_default),
        });
        importedCount += 1;
      }
      if (!importedCount) {
        throw new Error(t("thereAreNoTranscriptionPresetsToImport"));
      }
      enqueueSnackbar(`${importedCount}${t("twoWarriorPresetsHaveBeenLoaded")}`, {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToLoadWarriorPreset"),
        { variant: "error" }
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSavePreset = async () => {
    const trimmedName = presetForm.name.trim();
    if (!trimmedName) {
      enqueueSnackbar(t("pleaseEnterAPresetName"), { variant: "warning" });
      return;
    }
    try {
      const parsed = JSON.parse(presetForm.configJson);
      const formatted = JSON.stringify(parsed, null, 2);
      if (presetForm.id) {
        await updatePreset(presetForm.id, {
          name: trimmedName,
          description: presetForm.description,
          configJson: formatted,
          isDefault: presetForm.isDefault,
        });
        enqueueSnackbar(t("thePresetHasBeenSaved"), { variant: "success" });
      } else {
        const created = await createPreset({
          type: presetType,
          name: trimmedName,
          description: presetForm.description,
          configJson: formatted,
          isDefault: presetForm.isDefault,
        });
        setSelectedPresetId(created.id);
        enqueueSnackbar(t("addedNewPresets"), { variant: "success" });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson");
      enqueueSnackbar(message, { variant: "error" });
    }
  };

  const handleDeletePreset = async () => {
    if (!presetForm.id) {
      handleNewPreset();
      return;
    }
    if (presets.length <= 1) {
      enqueueSnackbar(t("theLastPresetCannotBeDeleted"), { variant: "warning" });
      return;
    }
    if (!window.confirm(t("areYouSureYouWantToDeleteTheSelectedPreset"))) {
      return;
    }
    await deletePreset(presetForm.id);
    enqueueSnackbar(t("thePresetHasBeenDeleted"), { variant: "info" });
    setSelectedPresetId(null);
  };

  const handleTabChange = (_: SyntheticEvent, value: SettingsTab) => {
    setActiveTab(value);
  };

  const handleSectionTabChange = (_: SyntheticEvent, value: SettingsSection) => {
    setActiveSection(value);
    const target = sectionRefs[value].current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const renderPermissionChip = (state: BrowserPermissionState) => {
    if (permissionLoading) {
      return <Chip label={t("checking")} size="small" variant="outlined" />;
    }
    const color = PERMISSION_COLOR_MAP[state];
    const variant = color === "default" ? "outlined" : "filled";
    return (
      <Chip
        label={t(PERMISSION_LABEL_KEY_MAP[state])}
        color={color}
        size="small"
        variant={variant}
      />
    );
  };

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box
          sx={{
            border: 0,
            borderColor: "divider",
            borderRadius: 0,
            bgcolor: "background.default",
            px: { xs: 1, md: 2 },
            py: 1,
            mb: 2,
            boxShadow: "none",
            position: "sticky",
            top: `${navOffset}px`,
            zIndex: theme.zIndex.appBar,
            borderBottom: 1,
          }}
        >
          <Tabs
            value={activeSection}
            onChange={handleSectionTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
          >
            {SETTINGS_SECTIONS.map((section) => (
              <Tab key={section.id} value={section.id} label={t(section.labelKey)} />
            ))}
          </Tabs>
        </Box>

        <Card ref={transcriptionSectionRef} sx={{ scrollMarginTop: (theme) => theme.spacing(11) }}>
          <CardHeader
            title={t("manageTranscriptionSettings")}
            subheader={t("addEditPresetsToUseForApiCallsAndPreviewSamples")}
          />
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ px: 3 }}
        >
          <Tab label={t("generalStt")} value="file" />
          <Tab label={t("streamingStt")} value="streaming" />
        </Tabs>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Button variant="outlined" onClick={() => void handleDownloadTranscriptionPresets()}>
              {t("exportTranscriptionSettingsJson")}
            </Button>
            <Button variant="outlined" onClick={handleImportTranscriptionPresetsRequest}>
              {t("loadTranscriptionSettingsJson")}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {presetHint}
          </Typography>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={3}
            alignItems={{ xs: "stretch", lg: "flex-start" }}
          >
            <Stack spacing={3} sx={{ flexBasis: { lg: "50%" }, flexGrow: 1, width: "100%" }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("presetList")}
                </Typography>
                <List
                  dense
                  disablePadding
                  sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
                >
                  {presets.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t("thereAreNoRegisteredPresets")}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {t("pleaseAddANewPreset")}
                      </Typography>
                    </Box>
                  ) : (
                    presets.map((preset) => (
                      <ListItemButton
                        key={preset.id}
                        selected={preset.id === selectedPresetId}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <ListItemText
                          primary={preset.name}
                          secondary={preset.isDefault ? t("basic") : undefined}
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="outlined" onClick={handleNewPreset} fullWidth>
                    {t("newPreset")}
                  </Button>
                  <Button variant="outlined" onClick={handleLoadTemplate} fullWidth>
                    {t("defaultLoad")}
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label={t("presetName")}
                  fullWidth
                  value={presetForm.name}
                  onChange={(event) => handlePresetFieldChange("name", event.target.value)}
                  placeholder={t("exampleBasicKoreanSpeakerSeparation")}
                />
                <TextField
                  label={t("explanation")}
                  fullWidth
                  value={presetForm.description}
                  onChange={(event) => handlePresetFieldChange("description", event.target.value)}
                  placeholder={t("pleaseLeaveANoteAboutTranscriptionOptions")}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={presetForm.isDefault}
                      onChange={(event) => handlePresetDefaultToggle(event.target.checked)}
                      color="primary"
                    />
                  }
                  label={t("setAsDefaultPreset")}
                />
              </Stack>

              <TranscriptionConfigQuickOptions
                type={activeTab === "file" ? "file" : "streaming"}
                configJson={presetForm.configJson}
                onChange={(nextJson) => handlePresetFieldChange("configJson", nextJson)}
                backendDeploymentMode={backendDeploymentMode}
                collapsible
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="flex-end"
              >
                <Button variant="contained" color="primary" onClick={handleSavePreset}>
                  {t("savePreset")}
                </Button>
                <Button variant="outlined" color="error" onClick={handleDeletePreset}>
                  {t("deletePreset")}
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                flexBasis: { lg: "50%" },
                flexGrow: 1,
                width: "100%",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("sourceSettingsJson")}
              </Typography>
              <TextField
                label={t("settingsJson")}
                fullWidth
                multiline
                minRows={16}
                value={presetForm.configJson}
                onChange={(event) => handlePresetFieldChange("configJson", event.target.value)}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card ref={permissionsSectionRef} sx={{ scrollMarginTop: (theme) => theme.spacing(11) }}>
        <CardHeader
          title={t("browserPermissions")}
          subheader={t("youCanCheckTheStatusOfMicrophoneAndStoragePermissionsAndReRequestThem")}
        />
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{t("microphonePermission")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("thisPermissionIsRequiredForRealTimeSessionRecording")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {renderPermissionChip(permissionStatus.microphone)}
                <Button
                  variant="outlined"
                  onClick={() => void handleRequestMicrophonePermission()}
                  disabled={requestingMicrophone || permissionLoading}
                >
                  {requestingMicrophone ? t("requesting") : t("reRequestPermission")}
                </Button>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{t("storagePermissions")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("permissionToReliablyStoreSessionLogsAndTemporaryTranscriptionData")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {renderPermissionChip(permissionStatus.storage)}
                <Button
                  variant="outlined"
                  onClick={() => void handleRequestStoragePermission()}
                  disabled={requestingStorage || permissionLoading}
                >
                  {requestingStorage ? t("requesting") : t("reRequestPermission")}
                </Button>
              </Stack>
            </Stack>

            <Box>
              <Button
                variant="text"
                size="small"
                onClick={() => void refreshPermissionStatus()}
                disabled={permissionLoading}
              >
                {permissionLoading ? t("checking") : t("refreshStatus")}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card ref={backendSectionRef} sx={{ scrollMarginTop: (theme) => theme.spacing(11) }}>
        <CardHeader
          title={t("backendSettings")}
          subheader={t("managesTheLocalPythonApiAndSttEndpointsThatTheServerWillLookAt")}
        />
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <TextField
                label="Python API Base URL"
                value={apiBaseUrl}
                onChange={(event) => void updateSetting("apiBaseUrl", event.target.value)}
                placeholder="http://localhost:8000"
                helperText={t("fileTranscriptionAndLiveStreamingRequestsAreDirectedToThisAddress")}
              />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  onClick={() => void handleRefreshBackendState()}
                  disabled={backendStateLoading || !apiBaseUrl.trim()}
                >
                  {backendStateLoading ? t("checking") : t("refreshServerStatus")}
                </Button>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={() => void handleResetBackendEndpoint()}
                  disabled={backendStateLoading || !apiBaseUrl.trim()}
                >
                  {t("returnToServerDefault")}
                </Button>
              </Stack>
              {backendStateError && <Alert severity="error">{backendStateError}</Alert>}
              {backendState && (
                <Alert severity="info" variant="outlined">
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">{t("currentServerApplicationSettings")}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={
                          backendState.deployment === "cloud" ? "RTZR API" : "On-prem"
                        }
                        size="small"
                      />
                      <Chip
                        label={
                          backendState.source === "override" ? t("custom") : t("serverDefault")
                        }
                        size="small"
                        color={backendState.source === "override" ? "primary" : "default"}
                      />
                      <Chip
                        label={backendState.verifySsl ? t("sslVerification") : t("ignoreSsl")}
                        size="small"
                        color={backendState.verifySsl ? "success" : "warning"}
                      />
                      <Chip
                        label={
                          backendState.authEnabled
                            ? t("useClientCredentials")
                            : t("credentialsNotUsed")
                        }
                        size="small"
                        color={backendState.authEnabled ? "success" : "default"}
                      />
                    </Stack>
                    <Typography variant="body2">{`API Base: ${backendState.apiBaseUrl}`}</Typography>
                  </Stack>
                </Alert>
              )}
            </Stack>
            <TextField
              label={t("realTimeTranscriptionAutoSaveCycleSeconds")}
              type="number"
              value={realtimeAutoSaveSeconds}
              onChange={(event) => {
                const value = Number(event.target.value) || 0;
                if (value <= 0) {
                  enqueueSnackbar(t("theAutoSaveIntervalMustBeAtLeast1Second"), {
                    variant: "warning",
                  });
                  return;
                }
                void updateSetting("realtimeAutoSaveSeconds", value);
              }}
              helperText={t("localTemporaryStorageCycleDuringRealTimeSessionsDefaultIs10Seconds")}
            />
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle1">{t("backendApiEndpointPresets")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("theRtzrOnPremEndpointAndCredentialsThatThePythonApiWillInteractWithCanBeSavedAsPresetsAndAppliedWhenNeeded")}
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              alignItems="stretch"
            >
              <Box
                sx={{
                  flex: { xs: "1 1 auto", lg: "0 0 320px" },
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  minHeight: 0,
                }}
              >
                <Stack spacing={1}>
                  <List
                    dense
                    disablePadding
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      overflow: "hidden",
                      minHeight: 200,
                    }}
                  >
                    {backendPresets.length === 0 ? (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("thereAreNoRegisteredPresets")}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {t("pleaseAddANewPreset")}
                        </Typography>
                      </Box>
                    ) : (
                      backendPresets.map((preset) => (
                        <ListItemButton
                          key={preset.id}
                          selected={preset.id === selectedBackendPresetId}
                          onClick={() => handleBackendPresetSelect(preset)}
                        >
                          <ListItemText
                            primary={preset.name}
                            secondary={
                              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                <Chip
                                  label={preset.deployment === "cloud" ? "RTZR API" : "On-prem"}
                                  size="small"
                                />
                                {preset.isDefault && (
                                  <Chip label={t("basic")} size="small" color="default" />
                                )}
                                {activeBackendPresetId === preset.id && (
                                  <Chip label={t("applyingToServer2")} size="small" color="success" />
                                )}
                              </Stack>
                            }
                          />
                        </ListItemButton>
                      ))
                    )}
                  </List>
                  <Stack spacing={1}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button variant="outlined" onClick={handleNewBackendPreset} fullWidth>
                        {t("newPreset")}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleBackendPresetExport}
                        fullWidth
                        disabled={!selectedBackendPreset}
                      >
                        {t("jsonExport")}
                      </Button>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={handleBackendPresetImportRequest}
                        fullWidth
                      >
                        {t("loadJson")}
                      </Button>
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => void handleApplyBackendPreset()}
                        fullWidth
                        disabled={!selectedBackendPreset || backendStateLoading}
                      >
                        {t("applyToServer")}
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  <TextField
                    label={t("presetName")}
                    value={backendPresetForm.name}
                    onChange={(event) =>
                      setBackendPresetForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  <TextField
                    label={t("explanation")}
                    value={backendPresetForm.description}
                    onChange={(event) =>
                      setBackendPresetForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder={t("pleaseLeaveAnEndpointNote")}
                  />
                  <FormControl component="fieldset">
                    <FormLabel>{t("endpointType")}</FormLabel>
                    <ToggleButtonGroup
                      exclusive
                      value={backendPresetForm.deployment}
                      onChange={(_, value) => {
                        if (!value) return;
                        setBackendPresetForm((prev) => ({ ...prev, deployment: value }));
                      }}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      <ToggleButton value="cloud" sx={{ textTransform: "none" }}>
                        RTZR API
                      </ToggleButton>
                      <ToggleButton value="onprem" sx={{ textTransform: "none" }}>
                        On-prem
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </FormControl>
                  <TextField
                    label="API Base URL"
                    value={backendPresetForm.apiBaseUrl}
                    onChange={(event) =>
                      setBackendPresetForm((prev) => ({
                        ...prev,
                        apiBaseUrl: event.target.value,
                      }))
                    }
                    placeholder="https://openapi.vito.ai"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backendPresetForm.verifySsl}
                        onChange={(event) =>
                          setBackendPresetForm((prev) => ({
                            ...prev,
                            verifySsl: event.target.checked,
                          }))
                        }
                      />
                    }
                    label={t("sslCertificateVerification")}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backendPresetForm.isDefault}
                        onChange={(event) =>
                          setBackendPresetForm((prev) => ({
                            ...prev,
                            isDefault: event.target.checked,
                          }))
                        }
                      />
                    }
                    label={t("setAsDefaultPreset")}
                  />
                  {backendPresetForm.deployment === "cloud" && (
                    <Stack spacing={1.5}>
                      <Stack spacing={0.5}>
                        <TextField
                          label="Client ID"
                          type="password"
                          value={backendPresetForm.clientIdInput}
                          onChange={(event) =>
                            setBackendPresetForm((prev) => ({
                              ...prev,
                              clientIdInput: event.target.value,
                            }))
                          }
                          placeholder={t("requiredForCloudDeployment")}
                          helperText={
                            backendPresetForm.storedClientId
                              ? t("thereIsASavedClientIdEnteringANewValueWillOverwriteIt")
                              : t("requiredForRtzrCloudDeployments")
                          }
                        />
                        {backendPresetForm.storedClientId && (
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => handleBackendCredentialClear("storedClientId")}
                            sx={{ alignSelf: "flex-end" }}
                          >
                            {t("clearSavedClientId")}
                          </Button>
                        )}
                      </Stack>
                      <Stack spacing={0.5}>
                        <TextField
                          label="Client Secret"
                          type="password"
                          value={backendPresetForm.clientSecretInput}
                          onChange={(event) =>
                            setBackendPresetForm((prev) => ({
                              ...prev,
                              clientSecretInput: event.target.value,
                            }))
                          }
                          helperText={
                            backendPresetForm.storedClientSecret
                              ? t("thereIsASavedClientSecretEnteringANewValueWillOverwriteIt")
                              : t("requiredForRtzrCloudDeployments")
                          }
                        />
                        {backendPresetForm.storedClientSecret && (
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => handleBackendCredentialClear("storedClientSecret")}
                            sx={{ alignSelf: "flex-end" }}
                          >
                            {t("clearSavedClientSecret")}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  )}
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems="stretch"
                  >
                    <Button variant="contained" onClick={() => void handleBackendPresetSave()} fullWidth>
                      {t("savePreset")}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => void handleBackendPresetDelete()}
                      disabled={!backendPresetForm.id}
                      fullWidth
                    >
                      {t("deletePreset")}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      </Box>
      <input
        type="file"
        accept="application/json"
        hidden
        ref={backendImportInputRef}
        onChange={handleBackendPresetImportFile}
      />
      <input
        type="file"
        accept="application/json"
        hidden
        ref={transcriptionImportInputRef}
        onChange={handleImportTranscriptionPresets}
      />
    </>
  );
}

const PERMISSION_LABEL_KEY_MAP: Record<BrowserPermissionState, string> = {
  granted: "allowed",
  denied: "rejected",
  prompt: "requestRequired",
  unknown: "unableToConfirm",
};

const PERMISSION_COLOR_MAP: Record<BrowserPermissionState, ChipProps["color"]> = {
  granted: "success",
  denied: "error",
  prompt: "warning",
  unknown: "default",
};
