import { alpha, createTheme } from "@mui/material/styles";

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
    divider: alpha("#1f2a2a", 0.14),
  },
  shape: {
    borderRadius: 12,
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
    subtitle2: {
      fontWeight: 750,
      letterSpacing: -0.1,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.06)",
          backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, rgba(255,255,255,0) 52%)`,
        }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3, 3, 2.25),
        }),
        title: ({ theme }) => ({
          fontWeight: 900,
          letterSpacing: -0.6,
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
          borderRadius: 12,
          fontWeight: 700,
          letterSpacing: 0,
          paddingInline: theme.spacing(2),
        }),
        containedPrimary: ({ theme }) => ({
          backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(
            theme.palette.primary.main,
            0.88
          )} 55%, ${theme.palette.secondary.main} 140%)`,
          boxShadow: `0 14px 30px ${alpha(theme.palette.primary.main, 0.26)}`,
          "&:hover": {
            boxShadow: `0 18px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
          },
        }),
        containedSecondary: ({ theme }) => ({
          backgroundImage: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${alpha(
            theme.palette.secondary.main,
            0.9
          )} 72%, ${theme.palette.primary.main} 150%)`,
          boxShadow: `0 14px 30px ${alpha(theme.palette.secondary.main, 0.22)}`,
          "&:hover": {
            boxShadow: `0 18px 40px ${alpha(theme.palette.secondary.main, 0.26)}`,
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: alpha(theme.palette.text.primary, 0.18),
          backgroundColor: alpha(theme.palette.text.primary, 0.02),
          "&:hover": {
            borderColor: alpha(theme.palette.text.primary, 0.26),
            backgroundColor: alpha(theme.palette.text.primary, 0.04),
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 999,
          fontWeight: 650,
          borderColor: alpha(theme.palette.text.primary, 0.16),
        }),
        outlined: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.text.primary, 0.03),
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 999,
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
          backgroundColor: theme.palette.common.white,
          transition: theme.transitions.create(["box-shadow", "border-color"], {
            duration: theme.transitions.duration.shorter,
          }),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.14),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.text.primary, 0.22),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          borderRadius: 10,
          padding: theme.spacing(1, 1.25),
          fontSize: 12,
          lineHeight: 1.2,
        }),
      },
    },
  },
});

export const darkTheme = appTheme; // Placeholder for future dark theme toggle.
