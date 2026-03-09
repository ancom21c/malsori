import { alpha, createTheme } from "@mui/material/styles";

// V3 Studio Console Design Tokens
const CONSOLE_RADIUS_LG = 20;
const CONSOLE_RADIUS_PILL = 999;
const CONSOLE_ELEV_SOFT = "0 16px 40px rgba(0,0,0,0.4)";
const CONSOLE_BORDER_GLASS = "1px solid rgba(255, 255, 255, 0.08)";
const CONSOLE_BORDER_BEVEL = "inset 0 1px 0 0 rgba(255, 255, 255, 0.07)";
const FROSTED_GLASS_OPACITY = 0.72;

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00E5FF", // vibrant cyan for premium tech feel
      light: "#66FFFF",
      dark: "#00B3CC",
    },
    secondary: {
      main: "#FF6B6B", // vibrant coral/peach
      light: "#FF9999",
      dark: "#CC5555",
    },
    background: {
      default: "#0A0D0E", // deeper rich dark
      paper: "#121617", // distinct modern paper
    },
    text: {
      primary: "rgba(255, 255, 255, 0.92)",
      secondary: "rgba(255, 255, 255, 0.6)",
    },
    divider: "rgba(255, 255, 255, 0.08)",
  },
  shape: {
    borderRadius: CONSOLE_RADIUS_LG,
  },
  typography: {
    fontFamily: '"IBM Plex Sans KR", "Noto Sans KR", "Noto Sans", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
      textWrap: "balance",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.015em",
      textWrap: "balance",
    },
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    subtitle1: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    // Used for metrics, latency, timecodes
    subtitle2: {
      fontFamily: '"JetBrains Mono", "Roboto Mono", "IBM Plex Mono", monospace',
      fontWeight: 500,
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
          backdropFilter: "blur(24px) saturate(180%)",
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.24)",
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: CONSOLE_RADIUS_LG,
          backgroundColor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: "blur(20px) saturate(150%)",
          border: CONSOLE_BORDER_GLASS,
          boxShadow: `${CONSOLE_ELEV_SOFT}, ${CONSOLE_BORDER_BEVEL}`,
          transition: "box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease",
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
          borderRadius: 14, // slightly rounder premium internal buttons
          fontWeight: 600,
          letterSpacing: "-0.01em",
          paddingInline: theme.spacing(2.5),
          transition:
            "background-color .2s ease, box-shadow .2s ease, border-color .2s ease, transform .2s ease",
        }),
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: "#051A1D", // custom dark for primary button text
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
          "&:hover": {
            backgroundColor: theme.palette.primary.light,
            boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(1px)",
          }
        }),
        containedSecondary: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.main,
          color: "#1A0505",
          boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.25)}`,
          "&:hover": {
            backgroundColor: theme.palette.secondary.light,
            boxShadow: `0 12px 32px ${alpha(theme.palette.secondary.main, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(1px)",
          }
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
          transition:
            "background-color .2s ease, box-shadow .2s ease, transform .2s ease",
          "&.MuiFab-primary": {
            backgroundColor: theme.palette.primary.main,
            color: "#051A1D",
            boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
            "&:hover": {
              backgroundColor: theme.palette.primary.light,
              boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.5)}, inset 0 1px 0 rgba(255,255,255,0.4)`,
              transform: "translateY(-2px)",
            },
            "&:active": {
              transform: "translateY(1px)",
            }
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: CONSOLE_RADIUS_PILL,
          fontWeight: 600,
          borderColor: alpha(theme.palette.text.primary, 0.15),
          backgroundColor: alpha(theme.palette.background.paper, 0.5),
          backdropFilter: "blur(12px) saturate(180%)",
          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
          transition: "background-color .2s ease, border-color .2s ease, box-shadow .2s ease",
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
          backgroundColor: alpha(theme.palette.background.default, 0.4),
          borderRadius: 12,
          transition: theme.transitions.create(["box-shadow", "border-color", "background-color"], {
            duration: theme.transitions.duration.shorter,
          }),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.15),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.3),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            borderWidth: 1.5,
          },
          "&.Mui-focused": {
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          borderRadius: 10,
          padding: theme.spacing(1, 1.5),
          fontSize: 13,
          lineHeight: 1.4,
          backgroundColor: alpha(theme.palette.common.white, 0.95),
          color: theme.palette.common.black,
          fontWeight: 600,
          boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
        }),
      },
    },
  },
});

export const darkTheme = appTheme;
