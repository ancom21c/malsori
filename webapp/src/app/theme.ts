import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0050b3",
    },
    secondary: {
      main: "#f06418",
    },
    background: {
      default: "#f5f5f7",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export const darkTheme = appTheme; // Placeholder for future dark theme toggle.
