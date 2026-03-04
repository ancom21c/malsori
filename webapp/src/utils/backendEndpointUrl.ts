export type BackendApiBaseValidationCode =
  | "BACKEND_API_BASE_REQUIRED"
  | "BACKEND_API_BASE_INVALID";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class BackendApiBaseValidationError extends Error {
  readonly code: BackendApiBaseValidationCode;

  constructor(code: BackendApiBaseValidationCode) {
    super(code);
    this.name = "BackendApiBaseValidationError";
    this.code = code;
  }
}

function createValidationError(code: BackendApiBaseValidationCode): BackendApiBaseValidationError {
  return new BackendApiBaseValidationError(code);
}

export function normalizeBackendApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw createValidationError("BACKEND_API_BASE_REQUIRED");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw createValidationError("BACKEND_API_BASE_INVALID");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    throw createValidationError("BACKEND_API_BASE_INVALID");
  }

  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw createValidationError("BACKEND_API_BASE_INVALID");
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function asBackendApiBaseValidationCode(
  error: unknown
): BackendApiBaseValidationCode | null {
  if (error instanceof BackendApiBaseValidationError) {
    return error.code;
  }
  if (error instanceof Error) {
    if (
      error.message === "BACKEND_API_BASE_REQUIRED" ||
      error.message === "BACKEND_API_BASE_INVALID"
    ) {
      return error.message;
    }
  }
  return null;
}

