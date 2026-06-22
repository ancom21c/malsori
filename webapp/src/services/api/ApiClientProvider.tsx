import { useMemo } from "react";
import type { ReactNode } from "react";
import { RtzrApiClient } from "./rtzrApiClient";
import { useSettingsStore } from "../../store/settingsStore";
import { RtzrApiClientContext } from "./rtzrApiClientContext";
import { resolveAdminApiBaseUrl } from "../../utils/baseUrl";

type ApiClientProviderProps = {
  children: ReactNode;
};

export function ApiClientProvider({ children }: ApiClientProviderProps) {
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const adminApiBaseUrl = useSettingsStore((state) => state.adminApiBaseUrl);
  const resolvedAdminApiBaseUrl = resolveAdminApiBaseUrl(adminApiBaseUrl, apiBaseUrl);

  const client = useMemo(
    () => new RtzrApiClient(() => apiBaseUrl, () => resolvedAdminApiBaseUrl),
    [apiBaseUrl, resolvedAdminApiBaseUrl]
  );

  return (
    <RtzrApiClientContext.Provider value={client}>
      {children}
    </RtzrApiClientContext.Provider>
  );
}
