export const DEFAULT_PUBLIC_API_BASE_URL = "/";

export function normalizePublicApiBaseUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_PUBLIC_API_BASE_URL;
}

export function normalizeAdminApiBaseUrl(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveAdminApiBaseUrl(
  adminBaseUrl: string | null | undefined,
  publicBaseUrl: string | null | undefined
): string {
  const normalizedAdmin = normalizeAdminApiBaseUrl(adminBaseUrl);
  if (normalizedAdmin.length > 0) {
    return normalizedAdmin;
  }
  return normalizePublicApiBaseUrl(publicBaseUrl);
}

export function joinBaseUrl(baseUrl: string | null | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const trimmedBase = baseUrl?.trim() ?? "";
  if (!trimmedBase || trimmedBase === "/") {
    return normalizedPath;
  }
  return `${trimmedBase.replace(/\/+$/, "")}${normalizedPath}`;
}
