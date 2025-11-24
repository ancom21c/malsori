import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

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
        google: any;
    }
}

// Client ID should be provided via environment variable
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && CLIENT_ID) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (response: any) => {
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
    }, []);

    const signIn = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            console.warn("Google Identity Services SDK not loaded yet.");
        }
    }, [tokenClient]);

    const signOut = useCallback(() => {
        if (window.google && token) {
            window.google.accounts.oauth2.revoke(token, () => {
                setToken(null);
                setUserEmail(null);
            });
        } else {
            setToken(null);
            setUserEmail(null);
        }
    }, [token]);

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

export function useGoogleAuth() {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error("useGoogleAuth must be used within a GoogleAuthProvider");
    }
    return context;
}
