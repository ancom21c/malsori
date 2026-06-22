import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BackendProfile } from "../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../domain/featureBinding";
import type { BackendCapabilitiesState } from "../services/api/types";
import { StudioJsonEditor } from "./studio";
import { useI18n } from "../i18n";
import { formatLocalizedDateTime } from "../utils/time";
import {
  buildBindingInspectorState,
  getBackendHealthAlertSeverity,
  getBackendHealthTone,
  getBindingResolutionTone,
  resolveSelectedBackendProfile,
} from "./backendBindingOperatorModel";

const SETTINGS_OPERATOR_CARD_RADIUS = "12px";

type BackendBindingOperatorPanelProps = {
  locale: string;
  disabled: boolean;
  loading: boolean;
  revalidatingProfileId: string | null;
  error: string | null;
  lastSuccessAt: string | null;
  capabilitiesState: BackendCapabilitiesState | null;
  profiles: BackendProfile[];
  bindings: FeatureBinding[];
  selectedProfileId: string | null;
  selectedBindingKey: FeatureKey | null;
  profileEditorValue: string;
  profileEditorError: string | null;
  bindingEditorValue: string;
  bindingEditorError: string | null;
  onRefresh: () => void;
  onNewProfile: () => void;
  onSelectProfile: (profileId: string | null) => void;
  onRevalidateSelectedProfileHealth: () => void;
  onProfileEditorChange: (value: string) => void;
  onFormatProfileEditor: () => void;
  onCopyProfileEditor: () => void;
  onSaveProfile: () => void;
  onDeleteProfile: () => void;
  onNewBinding: () => void;
  onSelectBinding: (featureKey: FeatureKey | null) => void;
  onBindingEditorChange: (value: string) => void;
  onFormatBindingEditor: () => void;
  onCopyBindingEditor: () => void;
  onSaveBinding: () => void;
  onDeleteBinding: () => void;
};

function InspectorField({
  label,
  value,
  title,
}: {
  label: string;
  value: ReactNode;
  title?: string;
}) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }} title={title}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function BackendBindingOperatorPanel({
  locale,
  disabled,
  loading,
  revalidatingProfileId,
  error,
  lastSuccessAt,
  capabilitiesState,
  profiles,
  bindings,
  selectedProfileId,
  selectedBindingKey,
  profileEditorValue,
  profileEditorError,
  bindingEditorValue,
  bindingEditorError,
  onRefresh,
  onNewProfile,
  onSelectProfile,
  onRevalidateSelectedProfileHealth,
  onProfileEditorChange,
  onFormatProfileEditor,
  onCopyProfileEditor,
  onSaveProfile,
  onDeleteProfile,
  onNewBinding,
  onSelectBinding,
  onBindingEditorChange,
  onFormatBindingEditor,
  onCopyBindingEditor,
  onSaveBinding,
  onDeleteBinding,
}: BackendBindingOperatorPanelProps) {
  const { t } = useI18n();
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [bindingEditorOpen, setBindingEditorOpen] = useState(false);

  const selectedProfile = useMemo(
    () => resolveSelectedBackendProfile(profiles, selectedProfileId),
    [profiles, selectedProfileId]
  );
  const selectedBindingInspector = useMemo(
    () =>
      buildBindingInspectorState({
        bindings,
        selectedBindingKey,
        profiles,
      }),
    [bindings, profiles, selectedBindingKey]
  );
  const selectedResolvedProfile = useMemo(
    () =>
      resolveSelectedBackendProfile(
        profiles,
        selectedBindingInspector.resolution?.resolvedBackendProfileId ?? null
      ),
    [profiles, selectedBindingInspector.resolution?.resolvedBackendProfileId]
  );

  const capabilitySummary =
    capabilitiesState?.capabilityKeys.length
      ? capabilitiesState.capabilityKeys.join(", ")
      : t("notConfigured");
  const featureSummary =
    capabilitiesState?.featureKeys.length
      ? capabilitiesState.featureKeys.join(", ")
      : t("notConfigured");

  const renderProfileReference = (profileId: string | null | undefined) => {
    if (!profileId) {
      return t("notConfigured");
    }
    const profile = profiles.find((candidate) => candidate.id === profileId) ?? null;
    if (!profile) {
      return profileId;
    }
    return `${profile.label} · ${profile.id}`;
  };

  const renderInspectorNotice = (
    notice: (typeof selectedBindingInspector.notices)[number],
    index: number
  ) => {
    const keyMap = {
      binding_disabled: "bindingDisabledInspectorNotice",
      primary_profile_missing: "primaryProfileMissingInspectorNotice",
      primary_capability_mismatch: "primaryCapabilityMismatchInspectorNotice",
      primary_not_ready: "primaryProfileNotReadyInspectorNotice",
      fallback_profile_missing: "fallbackProfileMissingInspectorNotice",
      fallback_not_ready: "fallbackProfileNotReadyInspectorNotice",
      fallback_active: "fallbackActiveInspectorNotice",
    } as const;

    return (
      <Alert key={`${notice.code}-${index}`} severity={notice.severity} variant="outlined">
        {t(keyMap[notice.code])}
      </Alert>
    );
  };

  const renderHealthSnapshotCard = (
    label: string,
    profile: BackendProfile | null,
    fallbackValue: ReactNode = t("notConfigured")
  ) => {
    const checkedAt = profile?.health.checkedAt
      ? formatLocalizedDateTime(profile.health.checkedAt, locale)
      : null;

    return (
      <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
        <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            {profile ? (
              <>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={profile.label} />
                  <Chip
                    size="small"
                    color={getBackendHealthTone(profile.health.status)}
                    label={`${t("healthStatus")}: ${profile.health.status}`}
                  />
                </Stack>
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                  {profile.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("lastCheckedAt")}: {checkedAt ?? t("notConfigured")}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {fallbackValue}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="subtitle1">{t("additiveFeatureBackends")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("additiveFeatureBackendsHelper")}
          </Typography>
        </Stack>
        <Button variant="outlined" size="small" onClick={onRefresh} disabled={disabled || loading}>
          {loading ? t("checking") : t("refreshServerStatus")}
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("bindingCompatibility")}</Typography>
              <Chip
                size="small"
                color={
                  capabilitiesState?.compatibility.legacySource === "override"
                    ? "primary"
                    : "default"
                }
                label={`${t("legacyBackendSource")}: ${
                  capabilitiesState?.compatibility.legacySource === "override"
                    ? t("custom")
                    : t("serverDefault")
                }`}
              />
              <Typography variant="body2" color="text.secondary">
                {t("legacyCaptureBridgeHelper")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("backendProfiles")}: {capabilitiesState?.compatibility.legacyProfiles.length ?? 0} ·{" "}
                {t("featureBindings")}: {capabilitiesState?.compatibility.legacyBindings.length ?? 0}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("availableCapabilities")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {capabilitySummary}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("featureBindings")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {featureSummary}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("backendProfiles")}: {profiles.length} · {t("featureBindings")}: {bindings.length}
              </Typography>
              {lastSuccessAt ? (
                <Typography variant="caption" color="text.secondary">
                  {t("lastSuccessfulCheckAt", {
                    values: { time: formatLocalizedDateTime(lastSuccessAt, locale) },
                  })}
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">{t("backendProfiles")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("profileInspectorHelper")}
                </Typography>
              </Stack>
              <Button variant="text" size="small" onClick={onNewProfile} disabled={disabled}>
                {t("newProfile")}
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 320px) minmax(0, 1fr)" },
                gap: 2,
              }}
            >
              <Stack spacing={1}>
                {profiles.length > 0 ? (
                  profiles.map((profile) => (
                    <Button
                      key={profile.id}
                      variant={selectedProfileId === profile.id ? "contained" : "outlined"}
                      color={selectedProfileId === profile.id ? "primary" : "inherit"}
                      onClick={() => onSelectProfile(profile.id)}
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        minWidth: 0,
                        px: 1.25,
                        py: 1,
                      }}
                    >
                      <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }} alignItems="flex-start">
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, minWidth: 0, maxWidth: "100%" }}
                            title={profile.label}
                          >
                            {profile.label}
                          </Typography>
                          <Chip size="small" label={profile.kind} />
                          <Chip
                            size="small"
                            color={getBackendHealthTone(profile.health.status)}
                            label={`${t("healthStatus")}: ${profile.health.status}`}
                          />
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ maxWidth: "100%" }}
                          title={profile.baseUrl}
                        >
                          {profile.baseUrl}
                        </Typography>
                      </Stack>
                    </Button>
                  ))
                ) : (
                  <Alert severity="info">{t("thereAreNoRegisteredProfiles")}</Alert>
                )}
              </Stack>

              {selectedProfile ? (
                <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={selectedProfile.kind} />
                      <Chip
                        size="small"
                        color={selectedProfile.enabled ? "success" : "default"}
                        label={selectedProfile.enabled ? t("enabled") : t("disabled")}
                      />
                      <Chip
                        size="small"
                        color={getBackendHealthTone(selectedProfile.health.status)}
                        label={`${t("healthStatus")}: ${selectedProfile.health.status}`}
                      />
                    </Stack>
                    <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
                      {selectedProfile.label}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.5,
                    }}
                  >
                    <InspectorField
                      label={t("profileId")}
                      value={selectedProfile.id}
                      title={selectedProfile.id}
                    />
                    <InspectorField label={t("transport")} value={selectedProfile.transport} />
                    <InspectorField
                      label={t("authStrategy")}
                      value={selectedProfile.authStrategy.type}
                    />
                    <InspectorField
                      label={t("credentialReference")}
                      value={
                        selectedProfile.authStrategy.credentialRef
                          ? `${selectedProfile.authStrategy.credentialRef.kind}:${selectedProfile.authStrategy.credentialRef.id}`
                          : t("notConfigured")
                      }
                    />
                    <InspectorField
                      label={t("apiBaseUrl")}
                      value={selectedProfile.baseUrl}
                      title={selectedProfile.baseUrl}
                    />
                    <InspectorField
                      label={t("defaultModel")}
                      value={selectedProfile.defaultModel ?? t("notConfigured")}
                    />
                    <InspectorField
                      label={t("lastCheckedAt")}
                      value={
                        selectedProfile.health.checkedAt
                          ? formatLocalizedDateTime(selectedProfile.health.checkedAt, locale)
                          : t("notConfigured")
                      }
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={onRevalidateSelectedProfileHealth}
                    disabled={
                      disabled ||
                      !selectedProfile ||
                      revalidatingProfileId === selectedProfile.id
                    }
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {revalidatingProfileId === selectedProfile.id
                      ? t("checking")
                      : t("recheckProfileHealth")}
                  </Button>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {t("availableCapabilities")}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      {selectedProfile.capabilities.length > 0 ? (
                        selectedProfile.capabilities.map((capability) => (
                          <Chip key={capability} size="small" variant="outlined" label={capability} />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t("notConfigured")}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {t("operatorMetadata")}
                    </Typography>
                    {Object.keys(selectedProfile.metadata).length > 0 ? (
                      <Stack spacing={0.5}>
                        {Object.entries(selectedProfile.metadata).map(([key, value]) => (
                          <Typography
                            key={key}
                            variant="body2"
                            sx={{ wordBreak: "break-word" }}
                          >
                            {key}: {value}
                          </Typography>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t("noMetadataAvailable")}
                      </Typography>
                    )}
                  </Stack>
                  {selectedProfile.health.message ? (
                    <Alert
                      severity={getBackendHealthAlertSeverity(selectedProfile.health.status)}
                      variant="outlined"
                    >
                      {selectedProfile.health.message}
                    </Alert>
                  ) : null}
                </Stack>
              ) : (
                <Alert severity="info">{t("selectAProfileToInspect")}</Alert>
              )}
            </Box>

            <Divider />

            <Button
              variant="text"
              size="small"
              onClick={() => setProfileEditorOpen((current) => !current)}
              sx={{ alignSelf: "flex-start" }}
            >
              {profileEditorOpen ? t("hideAdvancedSettings") : t("viewAdvancedSettings")}
            </Button>
            <Collapse in={profileEditorOpen} timeout="auto" unmountOnExit>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {t("advancedProfileEditorHelper")}
                </Typography>
                <StudioJsonEditor
                  value={profileEditorValue}
                  onChange={onProfileEditorChange}
                  onFormat={onFormatProfileEditor}
                  onCopy={onCopyProfileEditor}
                  label={t("profileRecordJson")}
                  error={Boolean(profileEditorError)}
                  helperText={profileEditorError ?? t("profileRecordJsonHelper")}
                  minRows={16}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={onSaveProfile} disabled={disabled} fullWidth>
                    {t("saveProfile")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={onDeleteProfile}
                    disabled={disabled || !selectedProfileId}
                    fullWidth
                  >
                    {t("deleteProfile")}
                  </Button>
                </Stack>
              </Stack>
            </Collapse>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: SETTINGS_OPERATOR_CARD_RADIUS }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Stack spacing={0.5}>
                <Typography variant="subtitle1">{t("featureBindings")}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("bindingInspectorHelper")}
                </Typography>
              </Stack>
              <Button variant="text" size="small" onClick={onNewBinding} disabled={disabled}>
                {t("newBinding")}
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 320px) minmax(0, 1fr)" },
                gap: 2,
              }}
            >
              <Stack spacing={1}>
                {bindings.length > 0 ? (
                  bindings.map((binding) => {
                    const resolution = buildBindingInspectorState({
                      bindings,
                      selectedBindingKey: binding.featureKey,
                      profiles,
                    }).resolution;
                    return (
                      <Button
                        key={binding.featureKey}
                        variant={selectedBindingKey === binding.featureKey ? "contained" : "outlined"}
                        color={selectedBindingKey === binding.featureKey ? "primary" : "inherit"}
                        onClick={() => onSelectBinding(binding.featureKey)}
                        sx={{
                          justifyContent: "flex-start",
                          textTransform: "none",
                          minWidth: 0,
                          px: 1.25,
                          py: 1,
                        }}
                      >
                        <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }} alignItems="flex-start">
                          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, minWidth: 0, maxWidth: "100%" }}
                              title={binding.featureKey}
                            >
                              {binding.featureKey}
                            </Typography>
                            <Chip
                              size="small"
                              color={binding.enabled ? "success" : "default"}
                              label={binding.enabled ? t("enabled") : t("disabled")}
                            />
                            {resolution ? (
                              <Chip
                                size="small"
                                color={getBindingResolutionTone(resolution.status)}
                                label={`${t("resolutionStatus")}: ${resolution.status}`}
                              />
                            ) : null}
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: "100%" }}
                            title={binding.primaryBackendProfileId}
                          >
                            {binding.primaryBackendProfileId}
                          </Typography>
                        </Stack>
                      </Button>
                    );
                  })
                ) : (
                  <Alert severity="info">{t("thereAreNoFeatureBindings")}</Alert>
                )}
              </Stack>

              {selectedBindingInspector.binding && selectedBindingInspector.resolution ? (
                <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        color={
                          selectedBindingInspector.binding.enabled ? "success" : "default"
                        }
                        label={
                          selectedBindingInspector.binding.enabled
                            ? t("enabled")
                            : t("disabled")
                        }
                      />
                      <Chip
                        size="small"
                        color={getBindingResolutionTone(selectedBindingInspector.resolution.status)}
                        label={`${t("resolutionStatus")}: ${selectedBindingInspector.resolution.status}`}
                      />
                    </Stack>
                    <Typography variant="h6" sx={{ wordBreak: "break-word" }}>
                      {selectedBindingInspector.binding.featureKey}
                    </Typography>
                  </Stack>

                  <Stack spacing={1}>
                    {selectedBindingInspector.notices.map(renderInspectorNotice)}
                  </Stack>

                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      {t("healthReviewSnapshot")}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                        gap: 1,
                      }}
                    >
                      {renderHealthSnapshotCard(
                        t("primaryBackend"),
                        selectedBindingInspector.primaryProfile
                      )}
                      {renderHealthSnapshotCard(
                        t("resolvedBackend"),
                        selectedResolvedProfile
                      )}
                      {renderHealthSnapshotCard(
                        t("fallbackBackend"),
                        selectedBindingInspector.fallbackProfile
                      )}
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.5,
                    }}
                  >
                    <InspectorField
                      label={t("primaryBackend")}
                      value={renderProfileReference(
                        selectedBindingInspector.binding.primaryBackendProfileId
                      )}
                      title={selectedBindingInspector.binding.primaryBackendProfileId}
                    />
                    <InspectorField
                      label={t("fallbackBackend")}
                      value={renderProfileReference(
                        selectedBindingInspector.binding.fallbackBackendProfileId ?? null
                      )}
                      title={selectedBindingInspector.binding.fallbackBackendProfileId ?? undefined}
                    />
                    <InspectorField
                      label={t("resolvedBackend")}
                      value={renderProfileReference(
                        selectedBindingInspector.resolution.resolvedBackendProfileId
                      )}
                      title={selectedBindingInspector.resolution.resolvedBackendProfileId ?? undefined}
                    />
                    <InspectorField
                      label={t("resolvedModel")}
                      value={selectedBindingInspector.resolution.resolvedModel ?? t("notConfigured")}
                    />
                    <InspectorField
                      label={t("modelOverride")}
                      value={selectedBindingInspector.binding.modelOverride ?? t("notConfigured")}
                    />
                    <InspectorField
                      label={t("timeoutMs")}
                      value={
                        selectedBindingInspector.binding.timeoutMs
                          ? String(selectedBindingInspector.binding.timeoutMs)
                          : t("notConfigured")
                      }
                    />
                    <InspectorField
                      label={t("retryPolicy")}
                      value={
                        selectedBindingInspector.binding.retryPolicy
                          ? `${selectedBindingInspector.binding.retryPolicy.maxAttempts} / ${selectedBindingInspector.binding.retryPolicy.backoffMs}ms`
                          : t("notConfigured")
                      }
                    />
                    <InspectorField
                      label={t("degradedBehavior")}
                      value={selectedBindingInspector.binding.degradedBehavior ?? t("notConfigured")}
                    />
                  </Box>

                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {t("requiredCapabilities")}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      {selectedBindingInspector.resolution.requiredCapabilities.map((capability) => (
                        <Chip key={capability} size="small" variant="outlined" label={capability} />
                      ))}
                    </Stack>
                  </Stack>
                  {selectedBindingInspector.primaryProfile?.health.message ? (
                    <Alert
                      severity={getBackendHealthAlertSeverity(
                        selectedBindingInspector.primaryProfile.health.status
                      )}
                      variant="outlined"
                    >
                      {selectedBindingInspector.primaryProfile.label}:{" "}
                      {selectedBindingInspector.primaryProfile.health.message}
                    </Alert>
                  ) : null}
                  {selectedBindingInspector.fallbackProfile?.health.message ? (
                    <Alert
                      severity={getBackendHealthAlertSeverity(
                        selectedBindingInspector.fallbackProfile.health.status
                      )}
                      variant="outlined"
                    >
                      {selectedBindingInspector.fallbackProfile.label}:{" "}
                      {selectedBindingInspector.fallbackProfile.health.message}
                    </Alert>
                  ) : null}
                </Stack>
              ) : (
                <Alert severity="info">{t("selectABindingToInspect")}</Alert>
              )}
            </Box>

            <Divider />

            <Button
              variant="text"
              size="small"
              onClick={() => setBindingEditorOpen((current) => !current)}
              sx={{ alignSelf: "flex-start" }}
            >
              {bindingEditorOpen ? t("hideAdvancedSettings") : t("viewAdvancedSettings")}
            </Button>
            <Collapse in={bindingEditorOpen} timeout="auto" unmountOnExit>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {t("advancedBindingEditorHelper")}
                </Typography>
                <StudioJsonEditor
                  value={bindingEditorValue}
                  onChange={onBindingEditorChange}
                  onFormat={onFormatBindingEditor}
                  onCopy={onCopyBindingEditor}
                  label={t("bindingRecordJson")}
                  error={Boolean(bindingEditorError)}
                  helperText={bindingEditorError ?? t("bindingRecordJsonHelper")}
                  minRows={16}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={onSaveBinding} disabled={disabled} fullWidth>
                    {t("saveBinding")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={onDeleteBinding}
                    disabled={disabled || !selectedBindingKey}
                    fullWidth
                  >
                    {t("deleteBinding")}
                  </Button>
                </Stack>
              </Stack>
            </Collapse>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
