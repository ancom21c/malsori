import { Button, Chip, Stack } from "@mui/material";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { useGoogleAuth } from "../services/auth/GoogleAuthProvider";

const buttonSx = {
  textTransform: "none",
  borderColor: "rgba(255,255,255,0.7)",
  "&:hover": {
    borderColor: "#fff",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
};

export const CloudSyncStatus: React.FC = () => {
  const { isAuthenticated, signIn, signOut, userEmail } = useGoogleAuth();

  if (isAuthenticated) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          size="small"
          variant="outlined"
          icon={<CloudDoneIcon sx={{ fontSize: 18 }} />}
          label={userEmail ? `Cloud synced (${userEmail})` : "Cloud synced"}
          sx={{
            color: "inherit",
            borderColor: "rgba(255,255,255,0.7)",
            backgroundColor: "rgba(255,255,255,0.1)",
            "& .MuiChip-icon": {
              color: "inherit",
            },
          }}
        />
        <Button
          color="inherit"
          size="small"
          onClick={signOut}
          sx={{ textTransform: "none", color: "rgba(255,255,255,0.85)", minWidth: 0 }}
        >
          Disconnect
        </Button>
      </Stack>
    );
  }

  return (
    <Button
      color="inherit"
      variant="outlined"
      size="small"
      startIcon={<CloudOffIcon fontSize="small" />}
      onClick={signIn}
      sx={buttonSx}
    >
      Connect Drive
    </Button>
  );
};
