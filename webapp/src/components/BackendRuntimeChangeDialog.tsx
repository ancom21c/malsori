import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useI18n } from "../i18n";
import type {
  BackendRuntimeAction,
  BackendRuntimeSnapshot,
} from "../pages/settingsBackendRuntimeModel";

type BackendRuntimeChangeDialogProps = {
  open: boolean;
  action: BackendRuntimeAction;
  pending: boolean;
  presetName?: string | null;
  currentSnapshot: BackendRuntimeSnapshot | null;
  nextSnapshot: BackendRuntimeSnapshot;
  errorText?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

type BackendRuntimeSnapshotField = {
  labelKey: string;
  value: string;
};

function SnapshotCard({
  title,
  fields,
}: {
  title: string;
  fields: BackendRuntimeSnapshotField[];
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        minWidth: 0,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2">{title}</Typography>
        {fields.map((field) => (
          <Stack key={field.labelKey} spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {field.labelKey}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
              {field.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function BackendRuntimeChangeDialog({
  open,
  action,
  pending,
  presetName,
  currentSnapshot,
  nextSnapshot,
  errorText,
  onCancel,
  onConfirm,
}: BackendRuntimeChangeDialogProps) {
  const { t } = useI18n();

  const formatDeployment = (deployment: BackendRuntimeSnapshot["deployment"]) => {
    if (deployment === "cloud") {
      return t("rtzrApi");
    }
    if (deployment === "onprem") {
      return t("onPrem");
    }
    return t("resolvedByServerDefault");
  };

  const formatSource = (source: BackendRuntimeSnapshot["source"]) =>
    source === "override" ? t("custom") : t("serverDefault");

  const formatSsl = (verifySsl: boolean | null) => {
    if (verifySsl === null) {
      return t("serverManaged");
    }
    return verifySsl ? t("sslVerification") : t("ignoreSsl");
  };

  const formatCredentials = (usesClientCredentials: boolean | null) => {
    if (usesClientCredentials === null) {
      return t("serverManaged");
    }
    return usesClientCredentials ? t("useClientCredentials") : t("credentialsNotUsed");
  };

  const buildSnapshotFields = (
    snapshot: BackendRuntimeSnapshot | null
  ): BackendRuntimeSnapshotField[] => {
    if (!snapshot) {
      return [
        {
          labelKey: t("currentServerApplicationSettings"),
          value: t("refreshServerStatusBeforeApplyingServerSettings"),
        },
      ];
    }
    return [
      { labelKey: t("settingSource"), value: formatSource(snapshot.source) },
      { labelKey: t("endpointType"), value: formatDeployment(snapshot.deployment) },
      {
        labelKey: t("apiBaseUrl"),
        value: snapshot.apiBaseUrl ?? t("resolvedByServerDefault"),
      },
      { labelKey: t("sslMode"), value: formatSsl(snapshot.verifySsl) },
      { labelKey: t("credentialUsage"), value: formatCredentials(snapshot.usesClientCredentials) },
    ];
  };

  const title =
    action === "apply"
      ? t("reviewBackendApplyChange")
      : t("reviewServerDefaultRestore");
  const description =
    action === "apply"
      ? t("reviewBackendApplyChangeHelper", {
          values: { name: presetName ?? t("selectedPreset") },
        })
      : t("reviewServerDefaultRestoreHelper");
  const impactCopy =
    action === "apply"
      ? t("backendApplyImpactHelper")
      : t("backendResetImpactHelper");
  const rollbackCopy =
    action === "apply"
      ? t("backendApplyRollbackHelper")
      : t("backendResetRollbackHelper");
  const confirmLabel =
    action === "apply"
      ? pending
        ? t("applyingToServer")
        : t("applyToServer")
      : pending
        ? t("restoringServerDefaults")
        : t("returnToServerDefault");

  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <SnapshotCard
              title={t("currentServerState")}
              fields={buildSnapshotFields(currentSnapshot)}
            />
            <SnapshotCard
              title={t("nextServerState")}
              fields={buildSnapshotFields(nextSnapshot)}
            />
          </Stack>
          <Alert severity={action === "apply" ? "info" : "warning"} variant="outlined">
            <Stack spacing={0.5}>
              <Typography variant="body2">{impactCopy}</Typography>
              <Typography variant="caption" color="text.secondary">
                {rollbackCopy}
              </Typography>
            </Stack>
          </Alert>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={pending}>
          {t("cancellation")}
        </Button>
        <Button
          variant="contained"
          color={action === "apply" ? "primary" : "error"}
          onClick={onConfirm}
          disabled={pending}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
