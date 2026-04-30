import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
import MicFab from "../components/MicFab";
import { useUiStore } from "../store/uiStore";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useSnackbar } from "notistack";
import { useI18n, useLocaleOptions } from "../i18n";
import type { Locale } from "../i18n/translations";
import TranslateIcon from "@mui/icons-material/Translate";
import { CloudSyncStatus } from "../components/CloudSyncStatus";
import ScienceIcon from "@mui/icons-material/Science";
import {
  platformFeatureFlags,
  resolveCaptureHubPath,
  resolveRealtimeCapturePath,
  resolveSessionsPath,
  resolveTranslatePath,
} from "../app/platformRoutes";
import {
  derivePlatformFeatureAvailability,
  platformCapabilities,
} from "../app/platformCapabilities";
import { platformBackendBindingRuntime } from "../app/backendBindingRuntime";
import { buildTranslateBindingPresentation } from "../pages/translateBindingModel";

type MainLayoutProps = {
  children: ReactNode;
};

const UploadDialog = lazy(() => import("../components/UploadDialog"));
const labNavigationEnabled = import.meta.env.MODE === "development";

type MobileActionOwner = "global-fallback" | "page-owned" | "realtime-dock";

type RouteChromePolicy = {
  mobileActionOwner: MobileActionOwner;
  defaultFloatingActionsVisible: boolean;
  contentPaddingBottom: {
    xs: string;
    sm: number;
  };
};

const translateRouteEnabled = buildTranslateBindingPresentation(
  platformFeatureFlags,
  platformCapabilities,
  derivePlatformFeatureAvailability(platformFeatureFlags, platformCapabilities),
  platformBackendBindingRuntime
).finalTranslation.ready;

function resolveRouteChromePolicy(pathname: string): RouteChromePolicy {
  if (pathname.startsWith("/realtime") || pathname.startsWith("/capture/realtime")) {
    return {
      mobileActionOwner: "realtime-dock",
      defaultFloatingActionsVisible: false,
      contentPaddingBottom: {
        xs: "0px",
        sm: 0,
      },
    };
  }

  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/transcriptions/") ||
    pathname.startsWith("/sessions/") ||
    pathname.startsWith("/translate")
  ) {
    return {
      mobileActionOwner: "page-owned",
      defaultFloatingActionsVisible: false,
      contentPaddingBottom: {
        xs: "calc(24px + var(--malsori-bottom-clearance))",
        sm: 4,
      },
    };
  }

  return {
    mobileActionOwner: "global-fallback",
    defaultFloatingActionsVisible: true,
    contentPaddingBottom: {
      xs: "calc(120px + var(--malsori-bottom-clearance))",
      sm: 4,
    },
  };
}

export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  const compactActions = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const floatingActionsVisibleOverride = useUiStore((state) => state.floatingActionsVisibleOverride);
  const uploadDialogOpen = useUiStore((state) => state.uploadDialogOpen);
  const openUploadDialog = useUiStore((state) => state.openUploadDialog);
  const closeUploadDialog = useUiStore((state) => state.closeUploadDialog);
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
  const currentLocaleLabel = currentLocaleOption?.label ?? t("language");
  const currentLocaleFlag = currentLocaleOption?.flag ?? "🌐";
  const currentLocaleFlagLabel = currentLocaleOption?.flagAriaLabel ?? currentLocaleLabel;
  const navigationMenuId = "main-navigation-menu";
  const navigationMenuButtonId = "main-navigation-menu-button";
  const languageMenuId = "main-language-menu";
  const languageMenuButtonId = "main-language-menu-button";
  useTranscriptionSync();

  const handleInstallClick = useCallback(async () => {
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
  }, [enqueueSnackbar, requestInstall, t]);

  const menuItems = useMemo(
    () => [
      ...(platformFeatureFlags.modeSplitNavigation
        ? [
            {
              key: "capture",
              label: t("capture"),
              path: resolveCaptureHubPath(),
              icon: <CloudUploadIcon fontSize="small" />,
            },
            {
              key: "sessions",
              label: t("sessions"),
              path: resolveSessionsPath(),
              icon: <ListAltIcon fontSize="small" />,
            },
            ...(platformFeatureFlags.realtimeTranslate && translateRouteEnabled
              ? [
                  {
                    key: "translate",
                    label: t("translate"),
                    path: resolveTranslatePath(),
                    icon: <TranslateIcon fontSize="small" />,
                  },
                ]
              : []),
          ]
        : [
            {
              key: "upload",
              label: t("fileUpload"),
              icon: <CloudUploadIcon fontSize="small" />,
              action: () => openUploadDialog(),
            },
            {
              key: "realtime",
              label: t("realTimeTranscription"),
              path: resolveRealtimeCapturePath(),
              icon: <GraphicEqIcon fontSize="small" />,
            },
            {
              key: "history",
              label: t("voiceRecordList"),
              path: resolveSessionsPath(),
              icon: <ListAltIcon fontSize="small" />,
            },
          ]),
      ...(labNavigationEnabled
        ? [
            {
              key: "lab",
              label: t("lab"),
              path: "/lab",
              icon: <ScienceIcon fontSize="small" />,
            },
          ]
        : []),
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
      ...(canInstall
        ? [
            {
              key: "install",
              label: t("installApp"),
              icon: <AddToHomeScreenIcon fontSize="small" />,
              action: () => void handleInstallClick(),
            },
          ]
        : []),
    ],
    [canInstall, handleInstallClick, openUploadDialog, t]
  );

  const normalizedNavPath = useMemo(() => {
    if (!platformFeatureFlags.modeSplitNavigation) {
      return location.pathname;
    }

    if (location.pathname === "/" || location.pathname.startsWith("/sessions/")) {
      return resolveSessionsPath();
    }

    if (
      location.pathname.startsWith("/transcriptions/") ||
      location.pathname === "/realtime" ||
      location.pathname.startsWith("/capture/")
    ) {
      return location.pathname.startsWith("/transcriptions/")
        ? resolveSessionsPath()
        : resolveCaptureHubPath();
    }

    if (location.pathname.startsWith("/translate")) {
      return resolveTranslatePath();
    }

    return location.pathname;
  }, [location.pathname]);

  const activePath = useMemo(() => {
    const navigableItems = menuItems.filter((item) => item.path);
    const item = navigableItems.find(({ path }) => {
      if (!path) return false;
      return normalizedNavPath === "/" ? path === "/" : normalizedNavPath.startsWith(path);
    });
    return item?.path ?? "/";
  }, [menuItems, normalizedNavPath]);
  const isRealtimeRoute = useMemo(() => {
    return (
      location.pathname.startsWith("/realtime") ||
      location.pathname.startsWith("/capture/realtime")
    );
  }, [location.pathname]);
  const routeChromePolicy = useMemo(
    () => resolveRouteChromePolicy(location.pathname),
    [location.pathname]
  );
  const floatingActionsVisible =
    floatingActionsVisibleOverride ?? routeChromePolicy.defaultFloatingActionsVisible;

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
    openUploadDialog();
  };

  return (
    <Box sx={{ minHeight: "var(--malsori-app-height)", display: "flex", flexDirection: "column" }}>
      <Box
        component="a"
        href="#main-content"
        className="malsori-skip-link"
      >
        {t("skipToMainContent")}
      </Box>
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
            id={navigationMenuButtonId}
            edge="start"
            color="inherit"
            sx={{
              mr: 2,
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
            onClick={handleMenuOpen}
            aria-label={t("openMenu")}
            aria-haspopup="menu"
            aria-expanded={menuAnchor ? "true" : undefined}
            aria-controls={menuAnchor ? navigationMenuId : undefined}
          >
            <MalsoriIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <Typography
            variant="h6"
            component={RouterLink}
            to={resolveSessionsPath()}
            sx={{
              flexGrow: 1,
              color: "inherit",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            MalSori
          </Typography>
          {!compactActions ? (
            <Box sx={{ ml: 1 }}>
              <CloudSyncStatus />
            </Box>
          ) : null}
          {compactActions ? (
            <Tooltip title={t("selectLanguage")}>
              <IconButton
                id={languageMenuButtonId}
                color="inherit"
                size="small"
                onClick={handleLanguageMenuOpen}
                aria-label={t("selectLanguage")}
                aria-haspopup="menu"
                aria-expanded={languageMenuAnchor ? "true" : undefined}
                aria-controls={languageMenuAnchor ? languageMenuId : undefined}
                sx={{
                  ml: 1,
                  border: "1px solid rgba(255,255,255,0.7)",
                  borderRadius: 999,
                  px: 1,
                  "&:hover": {
                    borderColor: "#fff",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                <Box
                  component="span"
                  role="img"
                  aria-label={currentLocaleFlagLabel}
                  sx={{ fontSize: 18, lineHeight: 1 }}
                >
                  {currentLocaleFlag}
                </Box>
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={t("selectLanguage")}>
              <Button
                id={languageMenuButtonId}
                color="inherit"
                variant="outlined"
                size="small"
                startIcon={<TranslateIcon fontSize="small" />}
                onClick={handleLanguageMenuOpen}
                aria-haspopup="menu"
                aria-expanded={languageMenuAnchor ? "true" : undefined}
                aria-controls={languageMenuAnchor ? languageMenuId : undefined}
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
          )}
          <Menu
            id={navigationMenuId}
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            keepMounted
            MenuListProps={{
              "aria-labelledby": navigationMenuButtonId,
            }}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                backgroundColor: brandColors.soft,
                color: brandColors.dark,
                minWidth: 180,
                border: "1px solid rgba(21,74,67,0.12)",
              },
            }}
          >
            {compactActions ? (
              <>
                <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
                  <CloudSyncStatus variant="menu" />
                </Box>
                <Divider sx={{ mx: 1.5, borderColor: "rgba(21,74,67,0.12)" }} />
              </>
            ) : null}
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
                    backgroundColor: "rgba(31,111,100,0.18)",
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: "rgba(31,111,100,0.24)",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(31,111,100,0.12)",
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
            id={languageMenuId}
            anchorEl={languageMenuAnchor}
            open={Boolean(languageMenuAnchor)}
            onClose={handleLanguageMenuClose}
            keepMounted
            MenuListProps={{
              "aria-labelledby": languageMenuButtonId,
            }}
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
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="lg"
        sx={{
          flex: 1,
          pt: 4,
          pb: routeChromePolicy.contentPaddingBottom,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          key={location.pathname}
          className="malsori-page"
          sx={{ flex: 1, display: "flex", flexDirection: "column", outline: "none" }}
        >
          {children}
        </Box>
      </Container>
      {floatingActionsVisible ? (
        compactActions ? (
          <Box
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: "var(--malsori-bottom-clearance)",
              p: 2,
              pb: 2,
              background: `linear-gradient(to top, ${theme.palette.background.paper} 60%, transparent)`,
              backdropFilter: "blur(12px)",
              display: "flex",
              gap: 2,
              zIndex: theme.zIndex.speedDial,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={<CloudUploadIcon />}
              onClick={openUploadDialog}
              sx={{ borderRadius: "16px", py: 1.5 }}
            >
              {t("fileUpload")}
            </Button>
            {routeChromePolicy.mobileActionOwner === "global-fallback" && !isRealtimeRoute && (
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                startIcon={<GraphicEqIcon />}
                onClick={() => navigate(resolveRealtimeCapturePath())}
                sx={{ borderRadius: "16px", py: 1.5 }}
              >
                {t("realTimeTranscription")}
              </Button>
            )}
          </Box>
        ) : (
          <>
            <UploadFab onClick={handleUploadFabClick} ref={uploadFabRef} />
            {routeChromePolicy.mobileActionOwner === "global-fallback" && !isRealtimeRoute ? (
              <MicFab onClick={() => navigate(resolveRealtimeCapturePath())} />
            ) : null}
          </>
        )
      ) : null}
      {uploadDialogOpen ? (
        <Suspense fallback={null}>
          <UploadDialog
            open={uploadDialogOpen}
            onClose={closeUploadDialog}
          />
        </Suspense>
      ) : null}
    </Box>
  );
}
