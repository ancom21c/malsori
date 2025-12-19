import type { ReactNode } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "../app/theme";
import { I18nProvider } from "../i18n";

type ShareProvidersProps = {
  children: ReactNode;
};

export function ShareProviders({ children }: ShareProvidersProps) {
  return (
    <I18nProvider>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </I18nProvider>
  );
}
