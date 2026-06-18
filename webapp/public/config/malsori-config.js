window.__MALSORI_CONFIG__ = window.__MALSORI_CONFIG__ || {};
// Example static-profile override for Cloudflare Pages or another separate frontend origin:
// Object.assign(window.__MALSORI_CONFIG__, {
//   apiBaseUrl: "https://api.example.com",
//   adminApiBaseUrl: "",
//   driveAuthMode: "disabled",
//   runtimeErrorReportingEnabled: false,
// });
//
// If not provided, the app falls back to build-time values or the same-origin default.
window.__MALSORI_CONFIG__.apiBaseUrl = window.__MALSORI_CONFIG__.apiBaseUrl || undefined;
