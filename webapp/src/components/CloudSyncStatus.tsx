import { Box, Button, Chip, IconButton, Stack, Tooltip } from "@mui/material";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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

type CloudSyncStatusProps = {
  variant?: "header" | "menu";
};

export const CloudSyncStatus: React.FC<CloudSyncStatusProps> = ({ variant = "header" }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  const { isAvailable, isAuthenticated, signIn, signOut, userEmail } = useGoogleAuth();
  const { t } = useI18n();
  const menuVariant = variant === "menu";

  const tooltip = t("googleDriveSyncTooltip");

  if (!isAvailable) {
    return null;
  }

  if (isAuthenticated) {
    const label = menuVariant
      ? userEmail
        ? t("googleDriveConnectedWithEmail", { values: { email: userEmail } })
        : t("googleDriveConnected")
      : compact
      ? t("googleDriveConnected")
      : userEmail
        ? t("googleDriveConnectedWithEmail", { values: { email: userEmail } })
        : t("googleDriveConnected");

    if (menuVariant) {
      return (
        <Stack spacing={1} sx={{ width: "100%" }}>
          <Box>
            <Chip
              size="small"
              variant="outlined"
              icon={<CloudDoneIcon sx={{ fontSize: 18 }} />}
              label={label}
              sx={{
                maxWidth: "100%",
                justifyContent: "flex-start",
                borderColor: "rgba(21,74,67,0.22)",
                bgcolor: "rgba(31,111,100,0.08)",
                "& .MuiChip-label": {
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          </Box>
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<CloudOffIcon fontSize="small" />}
            onClick={signOut}
            sx={{ justifyContent: "flex-start", textTransform: "none", px: 0 }}
          >
            {t("disconnectGoogleDrive")}
          </Button>
        </Stack>
      );
    }

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
        {compact ? (
          <Tooltip title={t("disconnectGoogleDrive")}>
            <IconButton
              size="small"
              color="inherit"
              onClick={signOut}
              aria-label={t("disconnectGoogleDrive")}
              sx={{ color: "rgba(255,255,255,0.85)" }}
            >
              <CloudOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            color="inherit"
            size="small"
            onClick={signOut}
            sx={{ textTransform: "none", color: "rgba(255,255,255,0.85)", minWidth: 0 }}
          >
            {t("disconnectGoogleDrive")}
          </Button>
        )}
      </Stack>
    );
  }

  if (menuVariant) {
    return (
      <Button
        fullWidth
        color="inherit"
        variant="outlined"
        size="small"
        startIcon={<CloudOffIcon fontSize="small" />}
        onClick={signIn}
        sx={{
          justifyContent: "flex-start",
          textTransform: "none",
          borderColor: "rgba(21,74,67,0.22)",
          "&:hover": {
            borderColor: "rgba(21,74,67,0.36)",
            bgcolor: "rgba(31,111,100,0.08)",
          },
        }}
      >
        {t("connectGoogleDrive")}
      </Button>
    );
  }

  return compact ? (
    <Tooltip title={tooltip}>
      <IconButton
        size="small"
        color="inherit"
        onClick={signIn}
        aria-label={t("connectGoogleDrive")}
        sx={{
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: 999,
          p: 0.75,
          "&:hover": {
            borderColor: "#fff",
            backgroundColor: "rgba(255,255,255,0.15)",
          },
        }}
      >
        <CloudOffIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  ) : (
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
