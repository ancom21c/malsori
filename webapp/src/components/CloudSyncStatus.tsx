import { Button, Chip, Stack, Tooltip } from "@mui/material";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useGoogleAuth } from "../services/auth/GoogleAuthProvider";
import { useI18n } from "../i18n";

const buttonSx = {
  textTransform: "none",
  borderColor: "rgba(255,255,255,0.7)",
  "&:hover": {
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
};

export const CloudSyncStatus: React.FC = () => {
  const { isAvailable, isAuthenticated, signIn, signOut, userEmail } = useGoogleAuth();
  const { t } = useI18n();

  const tooltip = t("googleDriveSyncTooltip");

  if (!isAvailable) {
    return null;
  }

  if (isAuthenticated) {
    const label = userEmail
      ? t("googleDriveConnectedWithEmail", { values: { email: userEmail } })
      : t("googleDriveConnected");

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title={tooltip}>
          <Chip
            size="small"
            variant="outlined"
            icon={<CloudDoneIcon sx={{ fontSize: 18 }} />}
            label={label}
            sx={{
              color: "inherit",
              borderColor: "rgba(255,255,255,0.7)",
              backgroundColor: "rgba(255,255,255,0.1)",
              "& .MuiChip-icon": {
                color: "inherit",
              },
            }}
          />
        </Tooltip>
        <Button
          color="inherit"
          size="small"
          onClick={signOut}
          sx={{ textTransform: "none", color: "rgba(255,255,255,0.85)", minWidth: 0 }}
        >
          {t("disconnectGoogleDrive")}
        </Button>
      </Stack>
    );
  }

  return (
    <Tooltip title={tooltip}>
      <Button
        color="inherit"
        variant="outlined"
        size="small"
        startIcon={<CloudOffIcon fontSize="small" />}
        onClick={signIn}
        sx={buttonSx}
      >
        {t("connectGoogleDrive")}
      </Button>
    </Tooltip>
  );
};
