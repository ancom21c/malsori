export {};

declare global {
  interface Window {
    __MALSORI_CONFIG__?: {
      apiBaseUrl?: string;
      googleClientId?: string;
      driveAuthMode?: "disabled" | "auto" | "gis" | "broker";
      runtimeErrorReportingEnabled?: boolean;
    };
  }
}
