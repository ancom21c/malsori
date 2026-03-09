import type { ReactNode } from "react";
import { useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { SnackbarProvider } from "notistack";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { appTheme } from "./theme";
import { ApiClientProvider } from "../services/api/ApiClientProvider";
import { I18nProvider } from "../i18n";

import { GoogleAuthProvider } from "../services/auth/GoogleAuthProvider";
import { SyncProvider } from "../services/cloud/SyncProvider";
import { useSettingsStore } from "../store/settingsStore";
import { initRuntimeErrorReporter } from "../services/observability/runtimeErrorReporter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

function SettingsRuntimeBootstrap() {
  const hydrated = useSettingsStore((state) => state.hydrated);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const adminApiBaseUrl = useSettingsStore((state) => state.adminApiBaseUrl);

  useEffect(() => {
    if (!hydrated) {
      void hydrateSettings();
    }
  }, [hydrateSettings, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    initRuntimeErrorReporter();
  }, [adminApiBaseUrl, hydrated]);

  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nProvider>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <SettingsRuntimeBootstrap />
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={4000}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider>
              <GoogleAuthProvider>
                <SyncProvider>{children}</SyncProvider>
              </GoogleAuthProvider>
            </ApiClientProvider>
          </QueryClientProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default AppProviders;
