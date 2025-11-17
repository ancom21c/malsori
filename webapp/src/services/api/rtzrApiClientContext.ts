import { createContext, useContext } from "react";
import { RtzrApiClient } from "./rtzrApiClient";

export const RtzrApiClientContext = createContext<RtzrApiClient | null>(null);

export function useRtzrApiClient(): RtzrApiClient {
  const client = useContext(RtzrApiClientContext);
  if (!client) {
    throw new Error("useRtzrApiClient must be used within ApiClientProvider");
  }
  return client;
}
