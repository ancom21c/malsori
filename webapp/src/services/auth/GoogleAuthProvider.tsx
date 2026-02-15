import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSettingsStore } from "../../store/settingsStore";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type TokenClient = {
  requestAccessToken: () => void;
};

type OAuth2Client = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
};

type GoogleIdentity = {
  accounts?: {
    oauth2?: OAuth2Client;
  };
};

interface GoogleAuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  signIn: () => void;
  signOut: () => void;
  userEmail: string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

// Client ID should be provided via environment variable
const CLIENT_ID =
  (typeof window !== "undefined" && window.__MALSORI_CONFIG__?.googleClientId) ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 60_000;

type DriveAuthMode = "auto" | "gis" | "broker";

function resolveAuthMode(clientId: string): DriveAuthMode {
  const configured =
    (typeof window !== "undefined" && window.__MALSORI_CONFIG__?.driveAuthMode) ||
    (import.meta.env.VITE_DRIVE_AUTH_MODE as DriveAuthMode | undefined) ||
    "auto";

  if (configured === "gis" || configured === "broker") {
    return configured;
  }
  return clientId.trim().length > 0 ? "gis" : "broker";
}

function joinUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const mode = useMemo(() => resolveAuthMode(CLIENT_ID), []);
  const refreshTimerRef = useRef<number | null>(null);
  const pendingBrokerRefreshRef = useRef(false);

  useEffect(() => {
    if (mode !== "gis") {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2 && CLIENT_ID) {
        const client = oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: TokenResponse) => {
            if (response.access_token) {
              setToken(response.access_token);
              // Optionally fetch user info here if needed, or just store token
              // For email, we might need to decode ID token or fetch userinfo endpoint if we used a different flow,
              // but with implicit flow we just get access token.
              // To get email we'd need 'email' scope and call userinfo.
              // For now, let's just assume authenticated.
            }
          },
        });
        setTokenClient(client);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [mode]);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const refreshBrokerToken = useCallback(async () => {
    if (pendingBrokerRefreshRef.current) {
      return;
    }
    pendingBrokerRefreshRef.current = true;
    try {
      const response = await fetch(joinUrl(apiBaseUrl, "/v1/cloud/google/access-token"), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        setToken(null);
        setUserEmail(null);
        return;
      }
      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };
      if (!data.access_token) {
        setToken(null);
        return;
      }
      setToken(data.access_token);

      const expiresInSeconds =
        typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
          ? Math.max(1, Math.floor(data.expires_in))
          : null;
      if (expiresInSeconds !== null) {
        const delayMs = Math.max(
          10_000,
          expiresInSeconds * 1000 - DEFAULT_REFRESH_BEFORE_EXPIRY_MS
        );
        clearRefreshTimer();
        refreshTimerRef.current = window.setTimeout(() => {
          void refreshBrokerToken();
        }, delayMs);
      }
    } catch {
      // Ignore transient failures; next sync attempt will surface issues.
    } finally {
      pendingBrokerRefreshRef.current = false;
    }
  }, [apiBaseUrl, clearRefreshTimer]);

  useEffect(() => {
    if (mode !== "broker") {
      return;
    }

    clearRefreshTimer();
    setToken(null);
    setUserEmail(null);

    const controller = new AbortController();

    const init = async () => {
      try {
        const response = await fetch(joinUrl(apiBaseUrl, "/v1/cloud/google/status"), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          enabled?: boolean;
          connected?: boolean;
          email?: string | null;
        };
        if (!data.enabled || !data.connected) {
          return;
        }
        setUserEmail(data.email ?? null);
        await refreshBrokerToken();
      } catch {
        // Ignore; broker might not be available depending on deployment.
      }
    };

    void init();

    return () => {
      controller.abort();
      clearRefreshTimer();
    };
  }, [apiBaseUrl, clearRefreshTimer, mode, refreshBrokerToken]);

  const signIn = useCallback(() => {
    if (mode === "broker") {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const url = joinUrl(
        apiBaseUrl,
        `/v1/cloud/google/oauth/start?return_to=${encodeURIComponent(returnTo)}`
      );
      window.location.assign(url);
      return;
    }

    if (!tokenClient) {
      console.warn("Google Identity Services SDK not loaded yet.");
      return;
    }
    tokenClient.requestAccessToken();
  }, [apiBaseUrl, mode, tokenClient]);

  const signOut = useCallback(() => {
    clearRefreshTimer();

    if (mode === "broker") {
      void fetch(joinUrl(apiBaseUrl, "/v1/cloud/google/disconnect"), { method: "POST" })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          setToken(null);
          setUserEmail(null);
        });
      return;
    }

    const oauth2 = window.google?.accounts?.oauth2;
    if (oauth2 && token) {
      oauth2.revoke(token, () => {
        setToken(null);
        setUserEmail(null);
      });
    } else {
      setToken(null);
      setUserEmail(null);
    }
  }, [apiBaseUrl, clearRefreshTimer, mode, token]);

  return (
    <GoogleAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        signIn,
        signOut,
        userEmail,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
  }
  return context;
}
