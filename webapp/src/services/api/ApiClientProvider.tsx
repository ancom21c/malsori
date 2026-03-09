import { useMemo } from "react";
import type { ReactNode } from "react";
import { RtzrApiClient } from "./rtzrApiClient";
import { useSettingsStore } from "../../store/settingsStore";
import { RtzrApiClientContext } from "./rtzrApiClientContext";

type ApiClientProviderProps = {
  children: ReactNode;
};

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const adminApiBaseUrl = useSettingsStore((state) => state.adminApiBaseUrl);

  const client = useMemo(
    () => new RtzrApiClient(() => apiBaseUrl, () => adminApiBaseUrl),
    [adminApiBaseUrl, apiBaseUrl]
  );

  return (
    <RtzrApiClientContext.Provider value={client}>
      {children}
    </RtzrApiClientContext.Provider>
  );
}
