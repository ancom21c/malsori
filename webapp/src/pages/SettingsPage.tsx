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
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { ChipProps } from "@mui/material/Chip";
import { useBeforeUnload, useSearchParams } from "react-router-dom";
import { useBlocker } from "react-router";
import type { BlockerFunction } from "react-router";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
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
import type {
  BackendCapabilitiesState,
  BackendEndpointState,
} from "../services/api/types";
import { alpha, useTheme } from "@mui/material/styles";
import { useI18n } from "../i18n";
import BackendRuntimeChangeDialog from "../components/BackendRuntimeChangeDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatLocalizedDateTime } from "../utils/time";
import {
  asBackendApiBaseValidationCode,
  normalizeBackendApiBaseUrl,
} from "../utils/backendEndpointUrl";
import { ContextCard, StatusChipSet, StudioPageShell, StudioJsonEditor } from "../components/studio";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { normalizeAdminApiBaseUrl } from "../utils/baseUrl";
import {
  areConnectionSettingsDraftEqual,
  buildConnectionSettingsUpdatePlan,
  hasConnectionSettingsDraftChanges,
  normalizeConnectionSettingsDraft,
  shouldBlockOperatorActions,
  syncConnectionSettingsDraftFromPersisted,
  type ConnectionSettingsDraft,
} from "./settingsConnectionModel";
import {
  normalizeSettingsSectionSearchParams,
  parseSettingsSectionQuery,
  SETTINGS_SECTION_IDS,
  type SettingsSection,
} from "./settingsSectionModel";
import {
  ADDITIVE_FEATURE_KEYS,
  buildEmptyBackendProfileEditorValue,
  buildEmptyFeatureBindingEditorValue,
  formatBackendProfileEditorValue,
  formatFeatureBindingEditorValue,
  parseBackendProfileEditorValue,
  parseFeatureBindingEditorValue,
} from "./settingsBackendBindingModel";
import type { BackendProfile } from "../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../domain/featureBinding";
import {
  buildBackendRuntimeSnapshotFromPreset,
  buildBackendRuntimeSnapshotFromState,
  buildServerDefaultRuntimeSnapshot,
  resolveBackendRuntimeActionAvailability,
  type BackendRuntimeAction,
} from "./settingsBackendRuntimeModel";

const operatorBackendBindingsEnabled = ["1", "true", "yes", "on"].includes(
  (import.meta.env.VITE_FEATURE_OPERATOR_BACKEND_BINDINGS ?? "").toLowerCase()
);

const BackendBindingOperatorPanel = operatorBackendBindingsEnabled
  ? (lazy(() => import("../components/BackendBindingOperatorPanel")) as typeof import("../components/BackendBindingOperatorPanel").default)
  : null;

type SettingsTab = "file" | "streaming";

type PresetFormState = {
  id?: string;
  name: string;
  description: string;
  configJson: string;
  isDefault: boolean;
};

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

const SETTINGS_SECTIONS: { id: SettingsSection; labelKey: string }[] = SETTINGS_SECTION_IDS.map(
  (id) => ({
    id,
    labelKey:
      id === "transcription"
        ? "manageTranscriptionSettings"
        : id === "permissions"
          ? "browserPermissions"
          : "backendSettings",
  })
);

function isPresetFormEqual(a: PresetFormState, b: PresetFormState) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.description === b.description &&
    a.configJson === b.configJson &&
    a.isDefault === b.isDefault
  );
}

function resolveBackendApiBaseValidationMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string
): string {
  const code = asBackendApiBaseValidationCode(error);
  if (code === "BACKEND_API_BASE_REQUIRED") {
    return t("pleaseEnterTheApiBaseUrl");
  }
  if (code === "BACKEND_API_BASE_INVALID") {
    return t("pleaseEnterAValidApiBaseUrl");
  }
  return error instanceof Error ? error.message : t(fallbackKey);
}

export default function SettingsPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const navOffset = (isSmallScreen ? 56 : 64) + 8;
  const { t, locale } = useI18n();
  const storagePermissionSupported =
    typeof navigator !== "undefined" && Boolean(navigator.storage?.persist);
  const [activeTab, setActiveTab] = useState<SettingsTab>("file");
  const { enqueueSnackbar } = useSnackbar();
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const adminApiBaseUrl = useSettingsStore((state) => state.adminApiBaseUrl);
  const realtimeAutoSaveSeconds = useSettingsStore((state) => state.realtimeAutoSaveSeconds);
  const activeBackendPresetId = useSettingsStore((state) => state.activeBackendPresetId);
  const defaultSpeakerName = useSettingsStore((state) => state.defaultSpeakerName);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const updateConnectionSettings = useSettingsStore((state) => state.updateConnectionSettings);
  const initialConnectionSettings = normalizeConnectionSettingsDraft({
    apiBaseUrl,
    adminApiBaseUrl,
  });
  const [connectionCommitted, setConnectionCommitted] = useState<ConnectionSettingsDraft>(
    initialConnectionSettings
  );
  const [connectionDraft, setConnectionDraft] = useState<ConnectionSettingsDraft>(
    initialConnectionSettings
  );
  const [savingConnectionSettings, setSavingConnectionSettings] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [backendDeleteOpen, setBackendDeleteOpen] = useState(false);
  const [presetDeleteOpen, setPresetDeleteOpen] = useState(false);
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
  const transcriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const permissionsSectionRef = useRef<HTMLDivElement | null>(null);
  const backendSectionRef = useRef<HTMLDivElement | null>(null);
  const sectionScrollReadyRef = useRef(false);
  const [backendState, setBackendState] = useState<BackendEndpointState | null>(null);
  const [backendStateLoading, setBackendStateLoading] = useState(false);
  const [backendStateError, setBackendStateError] = useState<string | null>(null);
  const [backendStateLastSuccessAt, setBackendStateLastSuccessAt] = useState<string | null>(null);
  const [backendMutationDialogAction, setBackendMutationDialogAction] =
    useState<BackendRuntimeAction | null>(null);
  const [backendAdminEnabled, setBackendAdminEnabled] = useState(false);
  const [backendAdminToken, setBackendAdminToken] = useState("");
  const [backendBindingState, setBackendBindingState] = useState<BackendCapabilitiesState | null>(
    null
  );
  const [backendBindingStateLoading, setBackendBindingStateLoading] = useState(false);
  const [backendBindingStateError, setBackendBindingStateError] = useState<string | null>(null);
  const [backendBindingStateLastSuccessAt, setBackendBindingStateLastSuccessAt] =
    useState<string | null>(null);
  const [backendProfiles, setBackendProfiles] = useState<BackendProfile[]>([]);
  const [featureBindings, setFeatureBindings] = useState<FeatureBinding[]>([]);
  const [selectedBackendProfileId, setSelectedBackendProfileId] = useState<string | null>(null);
  const [selectedFeatureBindingKey, setSelectedFeatureBindingKey] = useState<FeatureKey | null>(
    null
  );
  const [backendProfileEditorValue, setBackendProfileEditorValue] = useState(
    buildEmptyBackendProfileEditorValue()
  );
  const [backendProfileEditorError, setBackendProfileEditorError] = useState<string | null>(null);
  const [featureBindingEditorValue, setFeatureBindingEditorValue] = useState(
    buildEmptyFeatureBindingEditorValue()
  );
  const [featureBindingEditorError, setFeatureBindingEditorError] = useState<string | null>(null);
  const backendImportInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptionImportInputRef = useRef<HTMLInputElement | null>(null);
  const visibleSections = SETTINGS_SECTIONS;
  const activeSection = useMemo(
    () => parseSettingsSectionQuery(searchParams.get("section")),
    [searchParams]
  );
  const getSectionTarget = useCallback(
    (section: SettingsSection) => {
      switch (section) {
        case "permissions":
          return permissionsSectionRef.current;
        case "backend":
          return backendSectionRef.current;
        case "transcription":
        default:
          return transcriptionSectionRef.current;
      }
    },
    []
  );
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

  useEffect(() => {
    const nextConnectionState = syncConnectionSettingsDraftFromPersisted({
      persisted: { apiBaseUrl, adminApiBaseUrl },
      committed: connectionCommitted,
      draft: connectionDraft,
      savingConnectionSettings,
    });
    if (!areConnectionSettingsDraftEqual(nextConnectionState.committed, connectionCommitted)) {
      setConnectionCommitted(nextConnectionState.committed);
    }
    if (!areConnectionSettingsDraftEqual(nextConnectionState.draft, connectionDraft)) {
      setConnectionDraft(nextConnectionState.draft);
    }
  }, [
    adminApiBaseUrl,
    apiBaseUrl,
    connectionCommitted,
    connectionDraft,
    savingConnectionSettings,
  ]);

  const connectionSettingsDirty =
    hasConnectionSettingsDraftChanges(
      connectionCommitted,
      connectionDraft
    );
  const shouldWarnOnUnsavedDraft = connectionSettingsDirty && !savingConnectionSettings;
  const draftApiBaseUrl = connectionDraft.apiBaseUrl;
  const draftAdminApiBaseUrl = connectionDraft.adminApiBaseUrl;

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldWarnOnUnsavedDraft) {
          return;
        }
        event.preventDefault();
        event.returnValue = "";
      },
      [shouldWarnOnUnsavedDraft]
    )
  );

  const shouldBlockNavigation = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      shouldWarnOnUnsavedDraft && currentLocation.pathname !== nextLocation.pathname,
    [shouldWarnOnUnsavedDraft]
  );

  const navigationBlocker = useBlocker(shouldBlockNavigation);

  useEffect(() => {
    if (navigationBlocker.state !== "blocked") {
      return;
    }
    const shouldProceed = window.confirm(t("discardUnsavedConnectionSettingsChanges"));
    if (shouldProceed) {
      navigationBlocker.proceed();
      return;
    }
    navigationBlocker.reset();
  }, [navigationBlocker, t]);

  const handleConnectionDraftChange = useCallback(
    (key: keyof ConnectionSettingsDraft, value: string) => {
      setConnectionDraft((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const handleResetConnectionDraft = useCallback(() => {
    const nextCommitted = normalizeConnectionSettingsDraft({
      apiBaseUrl,
      adminApiBaseUrl,
    });
    setConnectionCommitted(nextCommitted);
    setConnectionDraft(nextCommitted);
  }, [adminApiBaseUrl, apiBaseUrl]);

  const handleSaveConnectionSettings = useCallback(async () => {
    const nextCommitted = normalizeConnectionSettingsDraft({
      apiBaseUrl: draftApiBaseUrl,
      adminApiBaseUrl: draftAdminApiBaseUrl,
    });
    const updates = buildConnectionSettingsUpdatePlan(
      connectionCommitted,
      nextCommitted
    );
    if (updates.length === 0) {
      handleResetConnectionDraft();
      return;
    }

    setSavingConnectionSettings(true);
    try {
      await updateConnectionSettings({
        apiBaseUrl: updates.find(({ key }) => key === "apiBaseUrl")?.value ?? connectionCommitted.apiBaseUrl,
        adminApiBaseUrl:
          updates.find(({ key }) => key === "adminApiBaseUrl")?.value ??
          connectionCommitted.adminApiBaseUrl,
      });
      setConnectionCommitted(nextCommitted);
      setConnectionDraft(nextCommitted);
      enqueueSnackbar(t("connectionSettingsSaved"), { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToSaveConnectionSettings"),
        { variant: "error" }
      );
    } finally {
      setSavingConnectionSettings(false);
    }
  }, [
    connectionCommitted,
    draftAdminApiBaseUrl,
    draftApiBaseUrl,
    enqueueSnackbar,
    handleResetConnectionDraft,
    t,
    updateConnectionSettings,
  ]);

  const handleRefreshBackendAvailability = useCallback(async () => {
    if (!apiBaseUrl.trim()) {
      setBackendState(null);
      setBackendStateError(null);
      setBackendStateLastSuccessAt(null);
      setBackendAdminEnabled(false);
      return false;
    }
    const normalizedAdminApiBaseUrl = normalizeAdminApiBaseUrl(adminApiBaseUrl);
    if (!normalizedAdminApiBaseUrl) {
      setBackendState(null);
      setBackendStateError(null);
      setBackendStateLastSuccessAt(null);
      setBackendAdminEnabled(false);
      return false;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const health = await apiClient.getHealthStatus();
      const adminEnabled = health.backendAdminEnabled ?? false;
      setBackendAdminEnabled(adminEnabled);
      if (!adminEnabled) {
        setBackendState(null);
        setBackendStateLastSuccessAt(null);
        return false;
      }
      return true;
    } catch (error) {
      setBackendStateError(
        error instanceof Error ? error.message : t("failedToLoadBackendState")
      );
      setBackendState(null);
      setBackendStateLastSuccessAt(null);
      setBackendAdminEnabled(false);
      return false;
    } finally {
      setBackendStateLoading(false);
    }
  }, [adminApiBaseUrl, apiBaseUrl, apiClient, t]);

  useEffect(() => {
    void handleRefreshBackendAvailability();
  }, [handleRefreshBackendAvailability]);

  const handleRefreshBackendState = useCallback(async () => {
    if (!apiBaseUrl.trim()) {
      setBackendState(null);
      setBackendStateLastSuccessAt(null);
      setBackendAdminEnabled(false);
      setBackendStateError(t("pleaseCheckPythonApiBaseUrlAndRetryServerStatus"));
      return;
    }
    const normalizedAdminApiBaseUrl = normalizeAdminApiBaseUrl(adminApiBaseUrl);
    if (!normalizedAdminApiBaseUrl) {
      setBackendState(null);
      setBackendStateLastSuccessAt(null);
      setBackendAdminEnabled(false);
      setBackendStateError(t("internalAdminApiBaseUrlRequired"));
      return;
    }
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      setBackendState(null);
      setBackendStateLastSuccessAt(null);
      setBackendStateError(t("enterAdminTokenBeforeCheckingServerSettings"));
      return;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const health = await apiClient.getHealthStatus();
      const adminEnabled = health.backendAdminEnabled ?? false;
      setBackendAdminEnabled(adminEnabled);
      if (!adminEnabled) {
        setBackendState(null);
        setBackendStateLastSuccessAt(null);
        setBackendStateError(t("operatorSettingsUnavailableFromServer"));
        return;
      }
      const state = await apiClient.getBackendEndpointState({ adminToken });
      setBackendState(state);
      setBackendStateLastSuccessAt(new Date().toISOString());
    } catch (error) {
      setBackendStateError(
        error instanceof Error ? error.message : t("failedToLoadBackendState")
      );
    } finally {
      setBackendStateLoading(false);
    }
  }, [adminApiBaseUrl, apiBaseUrl, apiClient, backendAdminToken, t]);

  const handleRefreshBackendBindingState = useCallback(async () => {
    if (!apiBaseUrl.trim()) {
      setBackendBindingState(null);
      setBackendBindingStateError(t("pleaseCheckPythonApiBaseUrlAndRetryServerStatus"));
      return;
    }
    const normalizedAdminApiBaseUrl = normalizeAdminApiBaseUrl(adminApiBaseUrl);
    if (!normalizedAdminApiBaseUrl) {
      setBackendBindingState(null);
      setBackendBindingStateError(t("internalAdminApiBaseUrlRequired"));
      return;
    }
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      setBackendBindingState(null);
      setBackendBindingStateError(t("enterAdminTokenBeforeCheckingServerSettings"));
      return;
    }

    setBackendBindingStateLoading(true);
    setBackendBindingStateError(null);
    try {
      const [capabilities, profiles, bindings] = await Promise.all([
        apiClient.getBackendCapabilities({ adminToken }),
        apiClient.getBackendProfiles({ adminToken }),
        apiClient.getFeatureBindings({ adminToken }),
      ]);
      setBackendBindingState(capabilities);
      setBackendProfiles(profiles);
      setFeatureBindings(bindings);
      setBackendBindingStateLastSuccessAt(new Date().toISOString());
      setBackendProfileEditorError(null);
      setFeatureBindingEditorError(null);

      const nextSelectedProfileId =
        (selectedBackendProfileId && profiles.some((profile) => profile.id === selectedBackendProfileId)
          ? selectedBackendProfileId
          : profiles[0]?.id) ?? null;
      setSelectedBackendProfileId(nextSelectedProfileId);
      setBackendProfileEditorValue(
        nextSelectedProfileId
          ? formatBackendProfileEditorValue(
              profiles.find((profile) => profile.id === nextSelectedProfileId) ?? profiles[0]
            )
          : buildEmptyBackendProfileEditorValue()
      );

      const nextSelectedBindingKey =
        (selectedFeatureBindingKey &&
        bindings.some((binding) => binding.featureKey === selectedFeatureBindingKey)
          ? selectedFeatureBindingKey
          : bindings[0]?.featureKey ?? ADDITIVE_FEATURE_KEYS[0]) ?? null;
      setSelectedFeatureBindingKey(nextSelectedBindingKey);
      setFeatureBindingEditorValue(
        nextSelectedBindingKey
          ? formatFeatureBindingEditorValue(
              bindings.find((binding) => binding.featureKey === nextSelectedBindingKey) ??
                ({
                  featureKey: nextSelectedBindingKey,
                  primaryBackendProfileId: "profile-id",
                  fallbackBackendProfileId: null,
                  enabled: true,
                  modelOverride: null,
                  timeoutMs: undefined,
                  retryPolicy: undefined,
                  degradedBehavior: "disable",
                } as FeatureBinding)
            )
          : buildEmptyFeatureBindingEditorValue()
      );
    } catch (error) {
      setBackendBindingStateError(
        error instanceof Error ? error.message : t("failedToLoadBackendState")
      );
    } finally {
      setBackendBindingStateLoading(false);
    }
  }, [
    adminApiBaseUrl,
    apiBaseUrl,
    apiClient,
    backendAdminToken,
    t,
    selectedBackendProfileId,
    selectedFeatureBindingKey,
  ]);

  const handleSelectBackendProfile = useCallback(
    (profileId: string | null) => {
      setSelectedBackendProfileId(profileId);
      setBackendProfileEditorError(null);
      if (!profileId) {
        setBackendProfileEditorValue(buildEmptyBackendProfileEditorValue());
        return;
      }
      const profile = backendProfiles.find((entry) => entry.id === profileId);
      setBackendProfileEditorValue(
        profile ? formatBackendProfileEditorValue(profile) : buildEmptyBackendProfileEditorValue()
      );
    },
    [backendProfiles]
  );

  const handleSelectFeatureBinding = useCallback(
    (featureKey: FeatureKey | null) => {
      setSelectedFeatureBindingKey(featureKey);
      setFeatureBindingEditorError(null);
      if (!featureKey) {
        setFeatureBindingEditorValue(buildEmptyFeatureBindingEditorValue());
        return;
      }
      const binding = featureBindings.find((entry) => entry.featureKey === featureKey);
      setFeatureBindingEditorValue(
        binding
          ? formatFeatureBindingEditorValue(binding)
          : buildEmptyFeatureBindingEditorValue(featureKey)
      );
    },
    [featureBindings]
  );

  const formatJsonEditorValue = useCallback((value: string) => {
    const parsed = JSON.parse(value);
    return `${JSON.stringify(parsed, null, 2)}\n`;
  }, []);

  const handleFormatBackendProfileEditor = useCallback(() => {
    try {
      setBackendProfileEditorValue((current) => formatJsonEditorValue(current));
      setBackendProfileEditorError(null);
    } catch (error) {
      setBackendProfileEditorError(
        error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson")
      );
    }
  }, [formatJsonEditorValue, t]);

  const handleFormatFeatureBindingEditor = useCallback(() => {
    try {
      setFeatureBindingEditorValue((current) => formatJsonEditorValue(current));
      setFeatureBindingEditorError(null);
    } catch (error) {
      setFeatureBindingEditorError(
        error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson")
      );
    }
  }, [formatJsonEditorValue, t]);

  const handleCopyJsonText = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        enqueueSnackbar(t("copiedToClipboard"), { variant: "success" });
      } catch (error) {
        enqueueSnackbar(
          error instanceof Error ? error.message : t("failedToCopyJson"),
          { variant: "error" }
        );
      }
    },
    [enqueueSnackbar, t]
  );

  const handleSaveBackendProfileRecord = useCallback(async () => {
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      setBackendBindingStateError(t("enterAdminTokenBeforeCheckingServerSettings"));
      return;
    }
    try {
      const profile = parseBackendProfileEditorValue(backendProfileEditorValue);
      await apiClient.upsertBackendProfile(profile, { adminToken });
      setBackendProfileEditorError(null);
      enqueueSnackbar(t("backendProfileSaved"), { variant: "success" });
      setSelectedBackendProfileId(profile.id);
      await handleRefreshBackendBindingState();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson");
      setBackendProfileEditorError(message);
      enqueueSnackbar(message, { variant: "error" });
    }
  }, [
    apiClient,
    backendAdminToken,
    backendProfileEditorValue,
    enqueueSnackbar,
    handleRefreshBackendBindingState,
    t,
  ]);

  const handleDeleteBackendProfileRecord = useCallback(async () => {
    const adminToken = backendAdminToken.trim();
    if (!adminToken || !selectedBackendProfileId) {
      return;
    }
    try {
      await apiClient.deleteBackendProfile(selectedBackendProfileId, { adminToken });
      enqueueSnackbar(t("backendProfileDeleted"), { variant: "success" });
      setSelectedBackendProfileId(null);
      setBackendProfileEditorValue(buildEmptyBackendProfileEditorValue());
      await handleRefreshBackendBindingState();
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToDeleteBackendProfile"),
        { variant: "error" }
      );
    }
  }, [
    apiClient,
    backendAdminToken,
    enqueueSnackbar,
    handleRefreshBackendBindingState,
    selectedBackendProfileId,
    t,
  ]);

  const handleSaveFeatureBindingRecord = useCallback(async () => {
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      setBackendBindingStateError(t("enterAdminTokenBeforeCheckingServerSettings"));
      return;
    }
    try {
      const binding = parseFeatureBindingEditorValue(featureBindingEditorValue);
      await apiClient.upsertFeatureBinding(binding, { adminToken });
      setFeatureBindingEditorError(null);
      enqueueSnackbar(t("featureBindingSaved"), { variant: "success" });
      setSelectedFeatureBindingKey(binding.featureKey);
      await handleRefreshBackendBindingState();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("pleaseCheckTheSettingsJson");
      setFeatureBindingEditorError(message);
      enqueueSnackbar(message, { variant: "error" });
    }
  }, [
    apiClient,
    backendAdminToken,
    enqueueSnackbar,
    featureBindingEditorValue,
    handleRefreshBackendBindingState,
    t,
  ]);

  const handleDeleteFeatureBindingRecord = useCallback(async () => {
    const adminToken = backendAdminToken.trim();
    if (!adminToken || !selectedFeatureBindingKey) {
      return;
    }
    try {
      await apiClient.deleteFeatureBinding(selectedFeatureBindingKey, { adminToken });
      enqueueSnackbar(t("featureBindingDeleted"), { variant: "success" });
      setSelectedFeatureBindingKey(null);
      setFeatureBindingEditorValue(buildEmptyFeatureBindingEditorValue());
      await handleRefreshBackendBindingState();
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : t("failedToDeleteFeatureBinding"),
        { variant: "error" }
      );
    }
  }, [
    apiClient,
    backendAdminToken,
    enqueueSnackbar,
    handleRefreshBackendBindingState,
    selectedFeatureBindingKey,
    t,
  ]);

  useEffect(() => {
    const nextSearchParams = normalizeSettingsSectionSearchParams(searchParams, activeSection);
    if (nextSearchParams) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [activeSection, searchParams, setSearchParams]);

  useEffect(() => {
    const shouldScroll =
      sectionScrollReadyRef.current ||
      searchParams.has("section") ||
      activeSection !== "transcription";
    if (!shouldScroll) {
      sectionScrollReadyRef.current = true;
      return;
    }
    const target = getSectionTarget(activeSection);
    if (target) {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
    sectionScrollReadyRef.current = true;
  }, [activeSection, getSectionTarget, prefersReducedMotion, searchParams]);

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
  const apiConfigured = Boolean(apiBaseUrl.trim());
  const adminApiConfigured = Boolean(adminApiBaseUrl.trim());
  const backendDeploymentMode = backendState?.deployment ?? "cloud";
  const backendAdminTokenPresent = backendAdminToken.trim().length > 0;
  const operatorActionsBlockedByDraft = shouldBlockOperatorActions(
    connectionSettingsDirty,
    savingConnectionSettings
  );
  const backendOperatorAvailable = adminApiConfigured && backendAdminEnabled;
  const backendOperatorBlockedMessage = !apiConfigured
    ? t("pleaseCheckPythonApiBaseUrlAndRetryServerStatus")
    : !adminApiConfigured
      ? t("internalAdminApiBaseUrlRequired")
      : operatorActionsBlockedByDraft
        ? t("saveConnectionSettingsToUseDraftValues")
      : !backendAdminEnabled
        ? t("operatorSettingsUnavailableFromServer")
        : !backendAdminTokenPresent
          ? t("enterAdminTokenBeforeCheckingServerSettings")
          : null;
  const selectedPresetName = useMemo(() => {
    if (!selectedPresetId) {
      return presets.find((preset) => preset.isDefault)?.name;
    }
    return presets.find((preset) => preset.id === selectedPresetId)?.name;
  }, [presets, selectedPresetId]);
  const permissionReadyCount = useMemo(() => {
    const microphoneReady = permissionStatus.microphone === "granted" ? 1 : 0;
    const storageReady =
      storagePermissionSupported && permissionStatus.storage === "granted" ? 1 : 0;
    return microphoneReady + storageReady;
  }, [permissionStatus.microphone, permissionStatus.storage, storagePermissionSupported]);
  const permissionTotalCount = storagePermissionSupported ? 2 : 1;
  const backendSummary = useMemo(() => {
    if (!adminApiConfigured) {
      return t("internalAdminApiBaseUrlNotConfigured");
    }
    if (!backendAdminEnabled) {
      return `${t("internalOnly")} · ${t("requestRequired")}`;
    }
    if (!backendState) {
      return t("pendingStatus");
    }
    return `${backendState.deployment === "cloud" ? t("rtzrApi") : t("onPrem")} · ${backendState.source === "override" ? t("custom") : t("serverDefault")
      }`;
  }, [adminApiConfigured, backendAdminEnabled, backendState, t]);
  const backendRuntimeActionAvailability = useMemo(
    () =>
      resolveBackendRuntimeActionAvailability({
        selectedBackendPreset,
        adminApiConfigured,
        backendAdminTokenPresent,
        operatorActionsBlockedByDraft,
        backendState,
        activeBackendPresetId,
      }),
    [
      activeBackendPresetId,
      adminApiConfigured,
      backendAdminTokenPresent,
      backendState,
      operatorActionsBlockedByDraft,
      selectedBackendPreset,
    ]
  );
  const currentBackendRuntimeSnapshot = useMemo(
    () => (backendState ? buildBackendRuntimeSnapshotFromState(backendState) : null),
    [backendState]
  );
  const nextAppliedBackendRuntimeSnapshot = useMemo(
    () =>
      selectedBackendPreset ? buildBackendRuntimeSnapshotFromPreset(selectedBackendPreset) : null,
    [selectedBackendPreset]
  );
  const nextServerDefaultRuntimeSnapshot = useMemo(
    () => buildServerDefaultRuntimeSnapshot(),
    []
  );

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

  const presetJsonInvalid = useMemo(() => {
    const trimmed = presetForm.configJson.trim();
    if (!trimmed) {
      return true;
    }
    try {
      JSON.parse(trimmed);
      return false;
    } catch {
      return true;
    }
  }, [presetForm.configJson]);

  const handleFormatPresetJson = () => {
    const trimmed = presetForm.configJson.trim();
    if (!trimmed) {
      handlePresetFieldChange("configJson", "{}");
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      handlePresetFieldChange("configJson", JSON.stringify(parsed, null, 2));
    } catch {
      enqueueSnackbar(t("pleaseCheckTheSettingsJson"), { variant: "warning" });
    }
  };

  const handleCopyPresetJson = async () => {
    const text = presetForm.configJson;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        enqueueSnackbar(t("copiedToClipboard"), { variant: "success" });
        return;
      } catch {
        /* fall through */
      }
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      enqueueSnackbar(t("copiedToClipboard"), { variant: "success" });
    } catch {
      enqueueSnackbar(t("automaticCopyFailedPleaseCopyManually"), { variant: "error" });
    }
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
    let normalizedBaseUrl: string;
    try {
      normalizedBaseUrl = normalizeBackendApiBaseUrl(backendPresetForm.apiBaseUrl);
    } catch (error) {
      enqueueSnackbar(resolveBackendApiBaseValidationMessage(error, t, "failedToSaveBackendPreset"), {
        variant: "warning",
      });
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
          apiBaseUrl: normalizedBaseUrl,
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
          apiBaseUrl: normalizedBaseUrl,
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
          apiBaseUrl: normalizedBaseUrl,
          verifySsl: backendPresetForm.verifySsl,
          clientId: resolvedClientId,
          clientSecret: resolvedClientSecret,
          isDefault: backendPresetForm.isDefault,
        });
        handleBackendPresetSelect(created);
        enqueueSnackbar(t("addedBackendPresets"), { variant: "success" });
      }
    } catch (error) {
      enqueueSnackbar(resolveBackendApiBaseValidationMessage(error, t, "failedToSaveBackendPreset"), {
        variant: "error",
      });
    }
  };

  const handleBackendPresetDelete = async () => {
    if (!backendPresetForm.id) {
      enqueueSnackbar(t("pleaseSelectTheBackendPresetYouWantToDelete"), { variant: "warning" });
      return;
    }
    setBackendDeleteOpen(true);
  };

  const handleBackendPresetDeleteCancel = () => {
    setBackendDeleteOpen(false);
  };

  const handleBackendPresetDeleteConfirm = async () => {
    if (!backendPresetForm.id) {
      setBackendDeleteOpen(false);
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
    } finally {
      setBackendDeleteOpen(false);
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
      if (!name) {
        throw new Error(t("youWillNeedAPresetNameAndApiBaseUrl"));
      }
      const normalizedApiBaseUrl = normalizeBackendApiBaseUrl(apiBaseRaw);
      const created = await createBackendEndpointPreset({
        name,
        description:
          typeof preset.description === "string" ? preset.description : undefined,
        deployment,
        apiBaseUrl: normalizedApiBaseUrl,
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
      const message = resolveBackendApiBaseValidationMessage(error, t, "failedToLoadBackendPreset");
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      event.target.value = "";
    }
  };

  const handleApplyBackendPreset = async (): Promise<boolean> => {
    if (!selectedBackendPreset) {
      enqueueSnackbar(t("pleaseSelectTheBackendPresetToApply"), { variant: "warning" });
      return false;
    }
    if (!adminApiBaseUrl.trim()) {
      enqueueSnackbar(t("internalAdminApiBaseUrlRequired"), { variant: "warning" });
      return false;
    }
    let normalizedPresetApiBaseUrl: string;
    try {
      normalizedPresetApiBaseUrl = normalizeBackendApiBaseUrl(selectedBackendPreset.apiBaseUrl);
    } catch (error) {
      const message = resolveBackendApiBaseValidationMessage(
        error,
        t,
        "applyingBackendEndpointFailed"
      );
      setBackendStateError(message);
      enqueueSnackbar(message, { variant: "warning" });
      return false;
    }
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      enqueueSnackbar(t("enterAdminTokenBeforeApplyingServerSettings"), {
        variant: "warning",
      });
      return false;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const state = await apiClient.updateBackendEndpoint({
        deployment: selectedBackendPreset.deployment,
        apiBaseUrl: normalizedPresetApiBaseUrl,
        clientId: selectedBackendPreset.clientId ?? null,
        clientSecret: selectedBackendPreset.clientSecret ?? null,
        verifySsl: selectedBackendPreset.verifySsl ?? true,
      }, { adminToken });
      setBackendState(state);
      setBackendStateLastSuccessAt(new Date().toISOString());
      setBackendStateError(null);
      await updateSetting("activeBackendPresetId", selectedBackendPreset.id);
      enqueueSnackbar(
        t("backendEndpointAppliedWithName", {
          values: { name: selectedBackendPreset.name },
        }),
        { variant: "success" }
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("applyingBackendEndpointFailed");
      setBackendStateError(message);
      enqueueSnackbar(
        message,
        { variant: "error" }
      );
      return false;
    } finally {
      setBackendStateLoading(false);
    }
  };

  const handleResetBackendEndpoint = async (): Promise<boolean> => {
    if (!adminApiBaseUrl.trim()) {
      enqueueSnackbar(t("internalAdminApiBaseUrlRequired"), { variant: "warning" });
      return false;
    }
    const adminToken = backendAdminToken.trim();
    if (!adminToken) {
      enqueueSnackbar(t("enterAdminTokenBeforeApplyingServerSettings"), {
        variant: "warning",
      });
      return false;
    }
    setBackendStateLoading(true);
    setBackendStateError(null);
    try {
      const state = await apiClient.resetBackendEndpoint({ adminToken });
      setBackendState(state);
      setBackendStateLastSuccessAt(new Date().toISOString());
      setBackendStateError(null);
      await updateSetting("activeBackendPresetId", null);
      enqueueSnackbar(t("revertedToServerDefaultsWithRollbackHint"), { variant: "info" });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("restoringServerDefaultsFailed");
      setBackendStateError(message);
      enqueueSnackbar(
        message,
        { variant: "error" }
      );
      return false;
    } finally {
      setBackendStateLoading(false);
    }
  };

  const handleOpenBackendMutationDialog = useCallback(
    (action: BackendRuntimeAction) => {
      const blockedReasonKey =
        action === "apply"
          ? backendRuntimeActionAvailability.applyBlockedReasonKey
          : backendRuntimeActionAvailability.resetBlockedReasonKey;
      if (blockedReasonKey) {
        enqueueSnackbar(t(blockedReasonKey), { variant: "warning" });
        return;
      }
      setBackendStateError(null);
      setBackendMutationDialogAction(action);
    },
    [backendRuntimeActionAvailability, enqueueSnackbar, t]
  );

  const handleCloseBackendMutationDialog = useCallback(() => {
    if (backendStateLoading) {
      return;
    }
    setBackendMutationDialogAction(null);
  }, [backendStateLoading]);

  const handleConfirmBackendMutation = async () => {
    if (!backendMutationDialogAction) {
      return;
    }
    const success =
      backendMutationDialogAction === "apply"
        ? await handleApplyBackendPreset()
        : await handleResetBackendEndpoint();
    if (success) {
      setBackendMutationDialogAction(null);
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
        granted ? t("storagePermissionsGranted") : t("storagePermissionBrowserManaged"),
        { variant: granted ? "success" : "info" }
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
    setPresetDeleteOpen(true);
  };

  const handlePresetDeleteCancel = () => {
    setPresetDeleteOpen(false);
  };

  const handlePresetDeleteConfirm = async () => {
    if (!presetForm.id) {
      setPresetDeleteOpen(false);
      return;
    }
    await deletePreset(presetForm.id);
    enqueueSnackbar(t("thePresetHasBeenDeleted"), { variant: "info" });
    setSelectedPresetId(null);
    setPresetDeleteOpen(false);
  };

  const handleTabChange = (_: SyntheticEvent, value: SettingsTab) => {
    setActiveTab(value);
  };

  const handleSectionTabChange = (_: SyntheticEvent, value: SettingsSection) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("section", value);
    setSearchParams(nextSearchParams, { replace: false });
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
      <StudioPageShell
        title={t("setting")}
        description={t("settingsConsoleOverview")}
        headingId="settings-page-title"
        statusSlot={
          <StatusChipSet
            items={[
              {
                key: "permissions-ready",
                label: t("permissionsReadyCount", {
                  values: { ready: permissionReadyCount, total: permissionTotalCount },
                }),
                color: permissionReadyCount === permissionTotalCount ? "success" : "warning",
              },
            ]}
          />
        }
      >
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
              {visibleSections.map((section) => (
                <Tab key={section.id} value={section.id} label={t(section.labelKey)} />
              ))}
            </Tabs>
          </Box>

          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Typography variant="subtitle1">{t("settingsConsoleOverview")}</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={permissionReadyCount === permissionTotalCount ? "success" : "warning"}
                    label={t("permissionsReadyCount", {
                      values: { ready: permissionReadyCount, total: permissionTotalCount },
                    })}
                  />
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                  <ContextCard
                    tone="primary"
                    title={t("pythonApiBaseUrl")}
                    value={apiConfigured ? apiBaseUrl : t("notConfigured")}
                  />
                  <ContextCard
                    tone="secondary"
                    title={t("manageTranscriptionSettings")}
                    value={`${selectedPresetName ?? t("defaultSettings")} · ${activeTab === "file" ? t("generalStt") : t("streamingStt")}`}
                  />
                  <ContextCard
                    tone="warning"
                    title={t("operatorTools")}
                    value={
                      adminApiConfigured
                        ? backendSummary
                        : t("internalAdminApiBaseUrlNotConfigured")
                    }
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              p: { xs: 0, md: 1.5 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: (currentTheme) => alpha(currentTheme.palette.primary.main, 0.2),
              bgcolor: (currentTheme) => alpha(currentTheme.palette.primary.main, 0.04),
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" color="primary" variant="outlined" label={t("publicSetup")} />
                <Chip
                  size="small"
                  variant="outlined"
                  color={permissionReadyCount === permissionTotalCount ? "success" : "warning"}
                  label={t("permissionsReadyCount", {
                    values: { ready: permissionReadyCount, total: permissionTotalCount },
                  })}
                />
              </Stack>
              <Typography variant="h6">{t("publicSetup")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("publicSetupHelper")}
              </Typography>
            </Stack>
            <Card
              ref={transcriptionSectionRef}
              sx={{
                scrollMarginTop: (currentTheme) => currentTheme.spacing(11),
                borderColor: (currentTheme) => alpha(currentTheme.palette.primary.main, 0.18),
                bgcolor: (currentTheme) => alpha(currentTheme.palette.background.paper, 0.9),
              }}
            >
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
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Chip size="small" variant="outlined" label={activeTab === "file" ? t("generalStt") : t("streamingStt")} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t("presetsCount", { values: { count: presets.length } })}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {presetHint}
                    </Typography>
                  </Stack>
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t("defaultSettings")}
                </Typography>
                <TextField
                  label={t("defaultSpeakerName")}
                  value={defaultSpeakerName}
                  onChange={(e) => updateSetting("defaultSpeakerName", e.target.value)}
                  helperText={t("defaultSpeakerNameHelper")}
                  fullWidth
                  margin="normal"
                />
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label={t("pythonApiBaseUrl")}
                    value={connectionDraft.apiBaseUrl}
                    onChange={(event) => handleConnectionDraftChange("apiBaseUrl", event.target.value)}
                    type="text"
                    inputProps={{
                      inputMode: "url",
                      autoCapitalize: "off",
                      autoCorrect: "off",
                      spellCheck: "false",
                    }}
                    name="python-api-base-url"
                    autoComplete="off"
                    placeholder="/"
                    helperText={t("fileTranscriptionAndLiveStreamingRequestsAreDirectedToThisAddress")}
                  />
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(theme.palette.warning.main, 0.28),
                      bgcolor: alpha(theme.palette.warning.main, 0.06),
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" color="warning" variant="outlined" label={t("operatorTools")} />
                        <Chip size="small" color="warning" variant="outlined" label={t("internalOnly")} />
                      </Stack>
                      <TextField
                        label={t("internalAdminApiBaseUrl")}
                        value={connectionDraft.adminApiBaseUrl}
                        onChange={(event) =>
                          handleConnectionDraftChange("adminApiBaseUrl", event.target.value)
                        }
                        type="text"
                        inputProps={{
                          inputMode: "url",
                          autoCapitalize: "off",
                          autoCorrect: "off",
                          spellCheck: "false",
                        }}
                        name="internal-admin-api-base-url"
                        autoComplete="off"
                        placeholder="https://malsori-internal.example.local"
                        helperText={t("internalAdminApiBaseUrlHelper")}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t("operatorSettingsBoundaryHelper")}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {connectionSettingsDirty ? (
                        <Chip size="small" color="warning" label={t("unsavedChanges")} />
                      ) : (
                        <Chip size="small" color="success" variant="outlined" label={t("saved")} />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {connectionSettingsDirty
                          ? t("saveConnectionSettingsToUseDraftValues")
                          : t("savedConnectionSettingsAreActive")}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={handleResetConnectionDraft}
                        disabled={!connectionSettingsDirty || savingConnectionSettings}
                      >
                        {t("restoreSavedValues")}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => void handleSaveConnectionSettings()}
                        disabled={!connectionSettingsDirty || savingConnectionSettings}
                      >
                        {t("saveConnectionSettings")}
                      </Button>
                    </Stack>
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
                    helperText={t(
                      "localTemporaryStorageCycleDuringRealTimeSessionsDefaultIs10Seconds"
                    )}
                  />
                </Stack>
              </Box>
              <Divider sx={{ mb: 3 }} />
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

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t("settingsJson")}
                    </Typography>
                    <StudioJsonEditor
                      value={presetForm.configJson}
                      onChange={(nextJson) => handlePresetFieldChange("configJson", nextJson)}
                      onFormat={() => {
                        try {
                          const parsed = JSON.parse(presetForm.configJson);
                          handlePresetFieldChange("configJson", JSON.stringify(parsed, null, 2));
                        } catch {
                          enqueueSnackbar(t("pleaseCheckTheSettingsJson"), { variant: "error" });
                        }
                      }}
                      onCopy={() => {
                        navigator.clipboard.writeText(presetForm.configJson);
                        enqueueSnackbar(t("copiedToClipboard"), { variant: "success" });
                      }}
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
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">{t("sourceSettingsJson")}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoFixHighIcon fontSize="small" />}
                        onClick={handleFormatPresetJson}
                      >
                        {t("formatJson")}
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
                        onClick={() => void handleCopyPresetJson()}
                      >
                        {t("copyJson")}
                      </Button>
                    </Stack>
                  </Stack>
                  <TextField
                    label={t("settingsJson")}
                    fullWidth
                    multiline
                    minRows={16}
                    value={presetForm.configJson}
                    onChange={(event) => handlePresetFieldChange("configJson", event.target.value)}
                    error={presetJsonInvalid}
                    helperText={presetJsonInvalid ? t("pleaseCheckTheSettingsJson") : undefined}
                    sx={{
                      "& textarea": {
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 13,
                        lineHeight: 1.6,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

            <Card
              ref={permissionsSectionRef}
              sx={{
                scrollMarginTop: (currentTheme) => currentTheme.spacing(11),
                borderColor: (currentTheme) => alpha(currentTheme.palette.primary.main, 0.18),
                bgcolor: (currentTheme) => alpha(currentTheme.palette.background.paper, 0.88),
              }}
            >
            <CardHeader
              title={t("browserPermissions")}
              subheader={t("youCanCheckTheStatusOfMicrophoneAndStoragePermissionsAndReRequestThem")}
            />
            <CardContent>
              <Stack spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Chip size="small" label={`${t("microphonePermission")}: ${t(PERMISSION_LABEL_KEY_MAP[permissionStatus.microphone])}`} />
                    {storagePermissionSupported ? (
                      <Chip size="small" label={`${t("storagePermissions")}: ${t(PERMISSION_LABEL_KEY_MAP[permissionStatus.storage])}`} />
                    ) : (
                      <Chip size="small" label={t("storagePermissionBrowserManaged")} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {t("thisPermissionIsRequiredForRealTimeSessionRecording")}
                    </Typography>
                  </Stack>
                </Box>
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
                    {storagePermissionSupported ? (
                      <>
                        {renderPermissionChip(permissionStatus.storage)}
                        <Button
                          variant="outlined"
                          onClick={() => void handleRequestStoragePermission()}
                          disabled={requestingStorage || permissionLoading}
                        >
                          {requestingStorage ? t("requesting") : t("reRequestPermission")}
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t("storagePermissionBrowserManaged")}
                      </Typography>
                    )}
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
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              p: { xs: 0, md: 1.5 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: (currentTheme) => alpha(currentTheme.palette.warning.main, 0.24),
              bgcolor: (currentTheme) => alpha(currentTheme.palette.warning.main, 0.05),
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip size="small" color="warning" variant="outlined" label={t("operatorTools")} />
                <Chip size="small" color="warning" variant="outlined" label={t("internalOnly")} />
              </Stack>
              <Typography variant="h6">{t("operatorTools")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t("operatorToolsHelper")}
              </Typography>
            </Stack>

            <Card
              ref={backendSectionRef}
              sx={{
                scrollMarginTop: (currentTheme) => currentTheme.spacing(11),
                borderColor: (currentTheme) => alpha(currentTheme.palette.warning.main, 0.24),
                bgcolor: (currentTheme) => alpha(currentTheme.palette.background.paper, 0.88),
              }}
            >
            <CardHeader
              title={t("backendSettings")}
              subheader={t("managesTheLocalPythonApiAndSttEndpointsThatTheServerWillLookAt")}
            />
            <CardContent>
              <Stack spacing={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: (theme) =>
                      alpha(
                        backendOperatorAvailable
                          ? theme.palette.success.main
                          : theme.palette.warning.main,
                        0.35
                      ),
                    bgcolor: (theme) =>
                      alpha(
                        backendOperatorAvailable
                          ? theme.palette.success.main
                          : theme.palette.warning.main,
                        0.08
                      ),
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <StatusChipSet
                        items={[
                          {
                            key: "operator-boundary",
                            label: t("internalOnly"),
                            color: "warning",
                          },
                          {
                            key: "operator-availability",
                            label: backendAdminEnabled ? t("enabled") : t("disabled"),
                            color: backendAdminEnabled ? "success" : "default",
                          },
                          {
                            key: "operator-token",
                            label: backendAdminTokenPresent ? t("enabled") : t("requestRequired"),
                            color: backendAdminTokenPresent ? "success" : "warning",
                          },
                        ]}
                      />
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => void handleRefreshBackendAvailability()}
                        disabled={
                          backendStateLoading ||
                          !apiConfigured ||
                          !adminApiConfigured ||
                          operatorActionsBlockedByDraft
                        }
                      >
                        {backendStateLoading ? t("checking") : t("refreshOperatorAccess")}
                      </Button>
                    </Stack>
                    <Stack spacing={0.35}>
                      <Typography variant="body2" color="text.secondary">
                        {t("internalAdminApiBaseUrl")}: {adminApiConfigured ? adminApiBaseUrl : t("notConfigured")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("backendSettings")}: {backendAdminEnabled ? t("enabled") : t("disabled")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t("backendAdminToken")}: {backendAdminTokenPresent ? t("enabled") : t("requestRequired")}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {operatorActionsBlockedByDraft
                        ? t("saveConnectionSettingsToUseDraftValues")
                        : t("operatorSettingsBoundaryHelper")}
                    </Typography>
                  </Stack>
                </Box>

                <TextField
                  label={t("backendAdminToken")}
                  type="password"
                  value={backendAdminToken}
                  onChange={(event) => setBackendAdminToken(event.target.value)}
                  placeholder="X-Malsori-Admin-Token"
                  helperText={t("backendAdminTokenHelperDetailed")}
                />

                {!backendOperatorAvailable && (
                  <Alert
                    severity={backendStateError ? "error" : "warning"}
                    action={(
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => void handleRefreshBackendAvailability()}
                        disabled={
                          backendStateLoading ||
                          !apiConfigured ||
                          !adminApiConfigured ||
                          operatorActionsBlockedByDraft
                        }
                      >
                        {backendStateLoading ? t("checking") : t("refreshOperatorAccess")}
                      </Button>
                    )}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {t("backendSettings")}
                      </Typography>
                      <Typography variant="body2">
                        {backendStateError ?? backendOperatorBlockedMessage ?? t("operatorSettingsUnavailableFromServer")}
                      </Typography>
                    </Stack>
                  </Alert>
                )}

                {backendOperatorAvailable ? (
                  <>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Button
                          variant="outlined"
                          onClick={() => void handleRefreshBackendState()}
                          disabled={
                            backendStateLoading ||
                            !adminApiConfigured ||
                            !backendAdminTokenPresent ||
                            operatorActionsBlockedByDraft
                          }
                        >
                          {backendStateLoading ? t("checking") : t("refreshServerStatus")}
                        </Button>
                        <Button
                          variant="text"
                          color="secondary"
                          onClick={() => handleOpenBackendMutationDialog("reset")}
                          disabled={
                            backendStateLoading ||
                            Boolean(backendRuntimeActionAvailability.resetBlockedReasonKey)
                          }
                        >
                          {t("returnToServerDefault")}
                        </Button>
                      </Stack>
                      <Alert
                        severity={
                          backendRuntimeActionAvailability.resetBlockedReasonKey ? "warning" : "info"
                        }
                        variant="outlined"
                      >
                        {backendRuntimeActionAvailability.resetBlockedReasonKey
                          ? t(backendRuntimeActionAvailability.resetBlockedReasonKey)
                          : t("backendResetRequiresConfirmationHelper")}
                      </Alert>
                      {backendStateError && (
                        <Alert
                          severity="error"
                          action={(
                            <Button
                              size="small"
                              color="inherit"
                              onClick={() => void handleRefreshBackendState()}
                              disabled={
                                backendStateLoading ||
                                !adminApiConfigured ||
                                !backendAdminTokenPresent ||
                                operatorActionsBlockedByDraft
                              }
                            >
                              {backendStateLoading ? t("checking") : t("refreshServerStatus")}
                            </Button>
                          )}
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {t("failedToLoadBackendState")}
                            </Typography>
                            <Typography variant="body2">{backendStateError}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {backendState
                                ? t("showingLastKnownServerSettings")
                                : t("pleaseCheckInternalAdminApiBaseUrlAndRetryServerStatus")}
                            </Typography>
                            {backendStateLastSuccessAt ? (
                              <Typography variant="caption" color="text.secondary">
                                {t("lastSuccessfulCheckAt", {
                                  values: {
                                    time: formatLocalizedDateTime(
                                      backendStateLastSuccessAt,
                                      locale
                                    ),
                                  },
                                })}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Alert>
                      )}
                      {backendState && (
                        <Alert severity="info" variant="outlined">
                          <Stack spacing={1}>
                            <Typography variant="subtitle2">{t("currentServerApplicationSettings")}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip
                                label={
                                  backendState.deployment === "cloud" ? t("rtzrApi") : t("onPrem")
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
                            <Typography variant="body2">
                              {t("apiBaseUrl")}: {backendState.apiBaseUrl}
                            </Typography>
                            {backendStateLastSuccessAt ? (
                              <Typography variant="caption" color="text.secondary">
                                {t("lastSuccessfulCheckAt", {
                                  values: {
                                    time: formatLocalizedDateTime(
                                      backendStateLastSuccessAt,
                                      locale
                                    ),
                                  },
                                })}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Alert>
                      )}
                    </Stack>
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
                                          label={preset.deployment === "cloud" ? t("rtzrApi") : t("onPrem")}
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
                                    secondaryTypographyProps={{ component: "div" }}
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
                                onClick={() => handleOpenBackendMutationDialog("apply")}
                                fullWidth
                                disabled={
                                  backendStateLoading ||
                                  Boolean(backendRuntimeActionAvailability.applyBlockedReasonKey)
                                }
                              >
                                {t("applyToServer")}
                              </Button>
                            </Stack>
                            <Alert
                              severity={
                                backendRuntimeActionAvailability.applyBlockedReasonKey
                                  ? "warning"
                                  : "info"
                              }
                              variant="outlined"
                            >
                              {backendRuntimeActionAvailability.applyBlockedReasonKey
                                ? t(backendRuntimeActionAvailability.applyBlockedReasonKey)
                                : t("backendApplyRequiresConfirmationHelper")}
                            </Alert>
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
                                {t("rtzrApi")}
                              </ToggleButton>
                              <ToggleButton value="onprem" sx={{ textTransform: "none" }}>
                                {t("onPrem")}
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </FormControl>
                          <TextField
                            label={t("apiBaseUrl")}
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
                                  label={t("clientId")}
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
                                  label={t("clientSecret")}
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

                    {operatorBackendBindingsEnabled && BackendBindingOperatorPanel ? (
                      <>
                        <Divider />
                        <Suspense fallback={null}>
                          <BackendBindingOperatorPanel
                            locale={locale}
                            disabled={
                              backendBindingStateLoading ||
                              !adminApiConfigured ||
                              !backendAdminTokenPresent ||
                              operatorActionsBlockedByDraft
                            }
                            loading={backendBindingStateLoading}
                            error={backendBindingStateError}
                            lastSuccessAt={backendBindingStateLastSuccessAt}
                            capabilitiesState={backendBindingState}
                            profiles={backendProfiles}
                            bindings={featureBindings}
                            selectedProfileId={selectedBackendProfileId}
                            selectedBindingKey={selectedFeatureBindingKey}
                            profileEditorValue={backendProfileEditorValue}
                            profileEditorError={backendProfileEditorError}
                            bindingEditorValue={featureBindingEditorValue}
                            bindingEditorError={featureBindingEditorError}
                            onRefresh={() => void handleRefreshBackendBindingState()}
                            onNewProfile={() => handleSelectBackendProfile(null)}
                            onSelectProfile={handleSelectBackendProfile}
                            onProfileEditorChange={(value) => {
                              setBackendProfileEditorValue(value);
                              setBackendProfileEditorError(null);
                            }}
                            onFormatProfileEditor={handleFormatBackendProfileEditor}
                            onCopyProfileEditor={() => void handleCopyJsonText(backendProfileEditorValue)}
                            onSaveProfile={() => void handleSaveBackendProfileRecord()}
                            onDeleteProfile={() => void handleDeleteBackendProfileRecord()}
                            onNewBinding={() => {
                              setSelectedFeatureBindingKey(null);
                              setFeatureBindingEditorError(null);
                              setFeatureBindingEditorValue(buildEmptyFeatureBindingEditorValue());
                            }}
                            onSelectBinding={handleSelectFeatureBinding}
                            onBindingEditorChange={(value) => {
                              setFeatureBindingEditorValue(value);
                              setFeatureBindingEditorError(null);
                            }}
                            onFormatBindingEditor={handleFormatFeatureBindingEditor}
                            onCopyBindingEditor={() => void handleCopyJsonText(featureBindingEditorValue)}
                            onSaveBinding={() => void handleSaveFeatureBindingRecord()}
                            onDeleteBinding={() => void handleDeleteFeatureBindingRecord()}
                          />
                        </Suspense>
                      </>
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </CardContent>
            </Card>
          </Box>
        </Box>
      </StudioPageShell>
      <BackendRuntimeChangeDialog
        open={backendMutationDialogAction !== null}
        action={backendMutationDialogAction ?? "apply"}
        pending={backendStateLoading}
        presetName={selectedBackendPreset?.name ?? null}
        currentSnapshot={currentBackendRuntimeSnapshot}
        nextSnapshot={
          backendMutationDialogAction === "reset"
            ? nextServerDefaultRuntimeSnapshot
            : nextAppliedBackendRuntimeSnapshot ?? nextServerDefaultRuntimeSnapshot
        }
        errorText={backendStateError}
        onCancel={handleCloseBackendMutationDialog}
        onConfirm={() => void handleConfirmBackendMutation()}
      />
      <ConfirmDialog
        open={backendDeleteOpen}
        title={t("delete")}
        description={t("areYouSureYouWantToDeleteTheSelectedBackendPreset")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancellation")}
        onConfirm={() => void handleBackendPresetDeleteConfirm()}
        onCancel={handleBackendPresetDeleteCancel}
      />
      <ConfirmDialog
        open={presetDeleteOpen}
        title={t("delete")}
        description={t("areYouSureYouWantToDeleteTheSelectedPreset")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancellation")}
        onConfirm={() => void handlePresetDeleteConfirm()}
        onCancel={handlePresetDeleteCancel}
      />
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
