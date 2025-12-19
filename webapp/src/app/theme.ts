import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f6f64",
    },
    secondary: {
      main: "#d9825b",
    },
    background: {
      default: "#f6f2ee",
      paper: "#ffffff",
    },
    text: {
      primary: "#1f2a2a",
      secondary: "#4b5b5a",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Noto Sans KR", "Noto Sans", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
});

export const darkTheme = appTheme; // Placeholder for future dark theme toggle.
