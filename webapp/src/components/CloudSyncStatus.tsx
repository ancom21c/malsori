import React from "react";
import { useGoogleAuth } from "../services/auth/GoogleAuthProvider";

export const CloudSyncStatus: React.FC = () => {
    const { isAuthenticated, signIn, signOut, userEmail } = useGoogleAuth();

    if (isAuthenticated) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 font-medium">
                    Cloud Synced {userEmail ? `(${userEmail})` : ""}
                </span>
                <button
                    onClick={signOut}
                    className="text-gray-500 hover:text-gray-700 underline text-xs"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={signIn}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Connect Drive
        </button>
    );
};
