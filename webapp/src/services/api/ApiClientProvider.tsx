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

  const client = useMemo(
    () => new RtzrApiClient(() => apiBaseUrl),
    [apiBaseUrl]
  );

  return (
    <RtzrApiClientContext.Provider value={client}>
      {children}
    </RtzrApiClientContext.Provider>
  );
}
