import { alpha, createTheme } from "@mui/material/styles";

// V3 Studio Console Design Tokens
const CONSOLE_RADIUS_LG = 18;
const CONSOLE_RADIUS_PILL = 999;
const CONSOLE_ELEV_SOFT = "0 12px 28px rgba(0,0,0,0.32)";
const CONSOLE_BORDER_GLASS = "1px solid rgba(255, 255, 255, 0.06)";
const CONSOLE_BORDER_BEVEL = "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)";
const FROSTED_GLASS_OPACITY = 0.78;

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
      default: "#101415",
      paper: "#171d1d",
    },
    text: {
      primary: "rgba(255, 255, 255, 0.9)",
      secondary: "rgba(255, 255, 255, 0.64)",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  shape: {
    borderRadius: CONSOLE_RADIUS_LG,
  },
  typography: {
    fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", "Noto Sans", sans-serif',
    h4: {
      fontWeight: 820,
      letterSpacing: -0.8,
      textWrap: "balance",
    },
    h5: {
      fontWeight: 820,
      letterSpacing: -0.6,
      textWrap: "balance",
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
          backdropFilter: "blur(18px)",
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
          boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: CONSOLE_RADIUS_LG,
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(14px)",
          border: CONSOLE_BORDER_GLASS,
          boxShadow: `${CONSOLE_ELEV_SOFT}, ${CONSOLE_BORDER_BEVEL}`,
          transition: "box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
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
          transition: "box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease",
        }),
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: "#0a1917", // inverted for readability on bright button
          boxShadow: `0 10px 22px ${alpha(theme.palette.primary.main, 0.18)}`,
          "&:hover": {
            backgroundColor: theme.palette.primary.light,
            boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.24)}`,
          },
        }),
        containedSecondary: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.main,
          color: "#1a0b06",
          boxShadow: `0 10px 22px ${alpha(theme.palette.secondary.main, 0.18)}`,
          "&:hover": {
            backgroundColor: theme.palette.secondary.light,
            boxShadow: `0 12px 28px ${alpha(theme.palette.secondary.main, 0.24)}`,
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
          transition: "box-shadow 0.2s ease, background-color 0.2s ease",
          "&.MuiFab-primary": {
            backgroundColor: theme.palette.primary.main,
            color: "#0a1917",
            boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.24)}`,
            "&:hover": {
              backgroundColor: theme.palette.primary.light,
              boxShadow: `0 14px 30px ${alpha(theme.palette.primary.main, 0.28)}`,
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
          backgroundColor: alpha(theme.palette.background.default, 0.78),
          backdropFilter: "blur(8px)",
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
          backgroundColor: alpha(theme.palette.background.default, 0.56),
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
            backgroundColor: alpha(theme.palette.background.paper, 0.88),
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.18)}`,
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
