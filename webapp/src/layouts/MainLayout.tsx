import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useSettingsStore } from "../store/settingsStore";
import { useTranscriptionSync } from "../hooks/useTranscriptionSync";
import MalsoriIcon from "../components/icons/MalsoriIcon";
import { brandColors } from "../styles/brandColors";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import AddToHomeScreenIcon from "@mui/icons-material/AddToHomeScreen";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import UploadFab from "../components/UploadFab";
import UploadDialog from "../components/UploadDialog";
import MicFab from "../components/MicFab";
import { useUiStore } from "../store/uiStore";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useSnackbar } from "notistack";
import { useI18n, useLocaleOptions } from "../i18n";
import type { Locale } from "../i18n/translations";
import TranslateIcon from "@mui/icons-material/Translate";
import { CloudSyncStatus } from "../components/CloudSyncStatus";
import ScienceIcon from "@mui/icons-material/Science";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const floatingActionsVisible = useUiStore((state) => state.floatingActionsVisible);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState<null | HTMLElement>(null);
  const uploadFabRef = useRef<HTMLButtonElement | null>(null);
  const prevUploadDialogOpenRef = useRef(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { canInstall, requestInstall } = useInstallPrompt();
  const { locale, setLocale, t } = useI18n();
  const localeOptions = useLocaleOptions();
  const currentLocaleOption = localeOptions.find((option) => option.value === locale);
  const currentLocaleLabel =
    currentLocaleOption?.label ?? t("language", { defaultValue: "언어" });
  const currentLocaleFlag = currentLocaleOption?.flag ?? "🌐";
  const currentLocaleFlagLabel = currentLocaleOption?.flagAriaLabel ?? currentLocaleLabel;
  useTranscriptionSync();

  const menuItems = useMemo(
    () => [
      {
        key: "upload",
        label: t("fileUpload"),
        icon: <CloudUploadIcon fontSize="small" />,
        action: () => setUploadDialogOpen(true),
      },
      {
        key: "realtime",
        label: t("realTimeTranscription"),
        path: "/realtime",
        icon: <GraphicEqIcon fontSize="small" />,
      },
      {
        key: "lab",
        label: t("lab"),
        path: "/lab",
        icon: <ScienceIcon fontSize="small" />,
      },
      {
        key: "history",
        label: t("voiceRecordList"),
        path: "/",
        icon: <ListAltIcon fontSize="small" />,
      },
      {
        key: "settings",
        label: t("setting"),
        path: "/settings",
        icon: <SettingsIcon fontSize="small" />,
      },
      {
        key: "help",
        label: t("help"),
        path: "/help",
        icon: <HelpOutlineIcon fontSize="small" />,
      },
    ],
    [setUploadDialogOpen, t]
  );

  const activePath = useMemo(() => {
    const navigableItems = menuItems.filter((item) => item.path);
    const item = navigableItems.find(({ path }) => {
      if (!path) return false;
      return location.pathname === "/" ? path === "/" : location.pathname.startsWith(path);
    });
    return item?.path ?? "/";
  }, [location.pathname, menuItems]);
  const isRealtimeRoute = useMemo(() => {
    return location.pathname.startsWith("/realtime");
  }, [location.pathname]);

  useEffect(() => {
    if (!hydrated) {
      void hydrateSettings();
    }
  }, [hydrateSettings, hydrated]);

  useEffect(() => {
    if (prevUploadDialogOpenRef.current && !uploadDialogOpen) {
      requestAnimationFrame(() => {
        uploadFabRef.current?.focus();
      });
    }
    prevUploadDialogOpenRef.current = uploadDialogOpen;
  }, [uploadDialogOpen]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const handleUploadFabClick = () => {
    uploadFabRef.current?.blur();
    setUploadDialogOpen(true);
  };

  const handleInstallClick = async () => {
    const result = await requestInstall();
    if (result === null) {
      enqueueSnackbar(t("thisIsNotAnInstallableEnvironment"), { variant: "info" });
      return;
    }
    if (result) {
      enqueueSnackbar(
        t("aRequestToInstallAnAppHasBeenSentPleaseCheckYourBrowserInstructions"),
        {
          variant: "success",
        }
      );
    } else {
      enqueueSnackbar(t("appInstallationHasBeenCancelled"), { variant: "info" });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          backgroundColor: brandColors.base,
          color: "#fff",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            sx={{
              mr: 2,
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
            onClick={handleMenuOpen}
            aria-label={t("openMenu")}
          >
            <MalsoriIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              color: "inherit",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            MalSori
          </Typography>

          {canInstall ? (
            <Tooltip title={t("installMalsoriAsAnApp")}>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                startIcon={<AddToHomeScreenIcon fontSize="small" />}
                onClick={handleInstallClick}
                sx={{
                  ml: 1,
                  borderColor: "rgba(255,255,255,0.7)",
                  "&:hover": {
                    borderColor: "#fff",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                {t("installApp")}
              </Button>
            </Tooltip>
          ) : null}
          <Box sx={{ ml: 1 }}>
            <CloudSyncStatus />
          </Box>
          <Tooltip title={t("selectLanguage", { defaultValue: "언어 선택" })}>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              startIcon={<TranslateIcon fontSize="small" />}
              onClick={handleLanguageMenuOpen}
              sx={{
                ml: 1,
                borderColor: "rgba(255,255,255,0.7)",
                "&:hover": {
                  borderColor: "#fff",
                  backgroundColor: "rgba(255,255,255,0.15)",
                },
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
              >
                <Box
                  component="span"
                  role="img"
                  aria-label={currentLocaleFlagLabel}
                  sx={{ fontSize: 18, lineHeight: 1 }}
                >
                  {currentLocaleFlag}
                </Box>
                {currentLocaleLabel}
              </Box>
            </Button>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            keepMounted
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                backgroundColor: brandColors.soft,
                color: brandColors.dark,
                minWidth: 180,
              },
            }}
          >
            {menuItems.map((item) => (
              <MenuItem
                key={item.key}
                selected={item.path ? activePath === item.path : false}
                onClick={() => {
                  if (item.path) {
                    handleNavigate(item.path);
                  } else {
                    item.action?.();
                    handleMenuClose();
                  }
                }}
                sx={{
                  fontWeight: 600,
                  "&.Mui-selected": {
                    backgroundColor: "rgba(231,89,89,0.2)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(231,89,89,0.3)",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(231,89,89,0.15)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: "inherit",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
          <Menu
            anchorEl={languageMenuAnchor}
            open={Boolean(languageMenuAnchor)}
            onClose={handleLanguageMenuClose}
            keepMounted
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                minWidth: 180,
              },
            }}
          >
            {localeOptions.map((option) => (
              <MenuItem
                key={option.value}
                selected={locale === option.value}
                onClick={() => {
                  setLocale(option.value as Locale);
                  handleLanguageMenuClose();
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box
                    component="span"
                    role="img"
                    aria-label={option.flagAriaLabel}
                    sx={{ fontSize: 18, lineHeight: 1 }}
                  >
                    {option.flag}
                  </Box>
                </ListItemIcon>
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          py: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Container>
      {floatingActionsVisible && (
        <UploadFab onClick={handleUploadFabClick} ref={uploadFabRef} />
      )}
      {floatingActionsVisible && !isRealtimeRoute && (
        <MicFab onClick={() => navigate("/realtime")} />
      )}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
      />
    </Box>
  );
}
