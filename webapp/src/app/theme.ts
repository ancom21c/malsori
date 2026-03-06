import { alpha, createTheme } from "@mui/material/styles";

// V3 Studio Console Design Tokens
const CONSOLE_RADIUS_LG = 16;
const CONSOLE_RADIUS_PILL = 999;
const CONSOLE_ELEV_SOFT = "0 4px 12px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.6)"; // deepened multi-layer shadow
const CONSOLE_BORDER_GLASS = "1px solid rgba(255, 255, 255, 0.08)";
const CONSOLE_BORDER_BEVEL = "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.2)";
const FROSTED_GLASS_OPACITY = 0.5;

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2ac9b5", // brighter teal for dark bg readability
    },
    secondary: {
      main: "#f5a37f", // punchy peach
    },
    background: {
      default: "#121616",
      paper: "#1a1f1e", // slate gray for panels
    },
    text: {
      primary: "rgba(255, 255, 255, 0.9)",
      secondary: "rgba(255, 255, 255, 0.6)",
    },
    divider: "rgba(255, 255, 255, 0.1)",
  },
  shape: {
    borderRadius: CONSOLE_RADIUS_LG,
  },
  typography: {
    fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", "Noto Sans", sans-serif',
    h4: {
      fontWeight: 900,
      letterSpacing: -0.8,
    },
    h5: {
      fontWeight: 900,
      letterSpacing: -0.6,
    },
    h6: {
      fontWeight: 850,
      letterSpacing: -0.4,
    },
    subtitle1: {
      fontWeight: 750,
      letterSpacing: -0.2,
    },
    // Used for metrics, latency, timecodes
    subtitle2: {
      fontFamily: '"Roboto Mono", "IBM Plex Mono", monospace',
      fontWeight: 600,
      letterSpacing: "0.02em",
      fontSize: "0.8125rem",
      textTransform: "uppercase",
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.default, FROSTED_GLASS_OPACITY),
          backdropFilter: "blur(24px)",
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: "inset 0 -1px 0 0 rgba(255, 255, 255, 0.05)",
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: CONSOLE_RADIUS_LG,
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: "blur(24px)",
          border: CONSOLE_BORDER_GLASS,
          boxShadow: `${CONSOLE_ELEV_SOFT}, ${CONSOLE_BORDER_BEVEL}`,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3, 3, 2.25),
        }),
        title: ({ theme }) => ({
          fontWeight: 800,
          color: theme.palette.text.primary,
        }),
        subheader: ({ theme }) => ({
          color: theme.palette.text.secondary,
          marginTop: theme.spacing(0.5),
        }),
        action: {
          alignSelf: "center",
          marginTop: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12, // internal buttons
          fontWeight: 700,
          letterSpacing: 0,
          paddingInline: theme.spacing(2),
          transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease",
          "&:active": {
            transform: "scale(0.96)",
          },
        }),
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: "#0a1917", // inverted for readability on bright button
          boxShadow: `0 0 16px ${alpha(theme.palette.primary.main, 0.4)}, inset 0 1px 0 0 rgba(255,255,255,0.4)`,
          "&:hover": {
            backgroundColor: theme.palette.primary.light,
            boxShadow: `0 0 32px ${alpha(theme.palette.primary.main, 0.8)}, inset 0 1px 0 0 rgba(255,255,255,0.5)`,
            transform: "translateY(-1px)",
          },
        }),
        containedSecondary: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.main,
          color: "#1a0b06",
          boxShadow: `0 0 16px ${alpha(theme.palette.secondary.main, 0.4)}, inset 0 1px 0 0 rgba(255,255,255,0.4)`,
          "&:hover": {
            backgroundColor: theme.palette.secondary.light,
            boxShadow: `0 0 32px ${alpha(theme.palette.secondary.main, 0.8)}, inset 0 1px 0 0 rgba(255,255,255,0.5)`,
            transform: "translateY(-1px)",
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: alpha(theme.palette.text.primary, 0.2),
          backgroundColor: "transparent",
          "&:hover": {
            borderColor: alpha(theme.palette.text.primary, 0.4),
            backgroundColor: alpha(theme.palette.text.primary, 0.05),
          },
        }),
      },
    },
    MuiFab: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease",
          "&:active": {
            transform: "scale(0.92)",
          },
          "&.MuiFab-primary": {
            backgroundColor: theme.palette.primary.main,
            color: "#0a1917",
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.5)}, inset 0 1px 0 0 rgba(255,255,255,0.4)`,
            "&:hover": {
              backgroundColor: theme.palette.primary.light,
              boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.8)}, inset 0 1px 0 0 rgba(255,255,255,0.5)`,
              transform: "translateY(-2px) scale(1.02)",
            },
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: CONSOLE_RADIUS_PILL,
          fontWeight: 650,
          borderColor: alpha(theme.palette.text.primary, 0.2),
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: "blur(12px)",
          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        }),
        outlined: () => ({
          backgroundColor: "transparent",
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: CONSOLE_RADIUS_PILL,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontWeight: 650,
          minHeight: 44,
          paddingInline: theme.spacing(1.5),
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          transition: theme.transitions.create(["box-shadow", "border-color", "background-color"], {
            duration: theme.transitions.duration.shorter,
          }),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.2),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.4),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
          "&.Mui-focused": {
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          borderRadius: 8,
          padding: theme.spacing(1, 1.25),
          fontSize: 12,
          lineHeight: 1.2,
          backgroundColor: alpha(theme.palette.common.white, 0.9),
          color: theme.palette.common.black,
          fontWeight: 600,
        }),
      },
    },
  },
});

export const darkTheme = appTheme;
