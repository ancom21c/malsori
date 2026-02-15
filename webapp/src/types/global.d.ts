export {};

declare global {
  interface Window {
    __MALSORI_CONFIG__?: {
      apiBaseUrl?: string;
      googleClientId?: string;
      driveAuthMode?: "auto" | "gis" | "broker";
    };
  }
}
