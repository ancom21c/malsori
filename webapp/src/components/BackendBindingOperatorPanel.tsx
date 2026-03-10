import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import type { BackendProfile } from "../domain/backendProfile";
import type { FeatureBinding, FeatureKey } from "../domain/featureBinding";
import type { BackendCapabilitiesState } from "../services/api/types";
import { StudioJsonEditor } from "./studio";
import { useI18n } from "../i18n";
import { formatLocalizedDateTime } from "../utils/time";

type BackendBindingOperatorPanelProps = {
  locale: string;
  disabled: boolean;
  loading: boolean;
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

export default function BackendBindingOperatorPanel({
  locale,
  disabled,
  loading,
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

  const capabilitySummary =
    capabilitiesState?.capabilityKeys.join(", ") ?? t("notConfigured");
  const featureSummary = capabilitiesState?.featureKeys.join(", ") ?? t("notConfigured");

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
        <Card variant="outlined">
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

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("availableCapabilities")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {capabilitySummary}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("featureBindings")}</Typography>
              <Typography variant="body2" color="text.secondary">
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Typography variant="subtitle1">{t("backendProfiles")}</Typography>
                <Button variant="text" size="small" onClick={onNewProfile} disabled={disabled}>
                  {t("newProfile")}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t("profileRecordJsonHelper")}
              </Typography>
              {profiles.length > 0 ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {profiles.map((profile) => (
                    <Chip
                      key={profile.id}
                      clickable
                      color={selectedProfileId === profile.id ? "primary" : "default"}
                      variant={selectedProfileId === profile.id ? "filled" : "outlined"}
                      label={`${profile.label} · ${profile.kind}`}
                      onClick={() => onSelectProfile(profile.id)}
                    />
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">{t("thereAreNoRegisteredProfiles")}</Alert>
              )}
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
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Typography variant="subtitle1">{t("featureBindings")}</Typography>
                <Button variant="text" size="small" onClick={onNewBinding} disabled={disabled}>
                  {t("newBinding")}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t("bindingRecordJsonHelper")}
              </Typography>
              {bindings.length > 0 ? (
                <Stack divider={<Divider flexItem />} spacing={1}>
                  {bindings.map((binding) => (
                    <Button
                      key={binding.featureKey}
                      variant={selectedBindingKey === binding.featureKey ? "contained" : "text"}
                      color={selectedBindingKey === binding.featureKey ? "primary" : "inherit"}
                      onClick={() => onSelectBinding(binding.featureKey)}
                      sx={{ justifyContent: "space-between", textTransform: "none" }}
                    >
                      <span>{binding.featureKey}</span>
                      <span>{binding.primaryBackendProfileId}</span>
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">{t("thereAreNoFeatureBindings")}</Alert>
              )}
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
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
