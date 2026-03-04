import { useSettingsStore } from "../../store/settingsStore";

const RUNTIME_ERROR_PATH = "/v1/observability/runtime-error";
const MAX_SIGNATURES = 120;
const MAX_MESSAGE_LENGTH = 1800;
const MAX_STACK_LENGTH = 7000;

type RuntimeErrorKind = "error" | "unhandledrejection";

type RuntimeErrorPayload = {
  kind: RuntimeErrorKind;
  message: string;
  stack?: string;
  page_url?: string;
  route?: string;
  user_agent?: string;
  locale?: string;
  app_version?: string;
};

let initialized = false;
const recentSignatures = new Set<string>();

function isRuntimeErrorReportingEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.__MALSORI_CONFIG__?.runtimeErrorReportingEnabled !== false;
}

function toSafeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...(truncated)`;
}

function normalizeReason(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return {
      message: reason.message || reason.name || "Unhandled rejection",
      stack: toSafeText(reason.stack, MAX_STACK_LENGTH),
    };
  }
  if (typeof reason === "string") {
    return { message: reason };
  }
  try {
    return { message: JSON.stringify(reason) };
  } catch {
    return { message: String(reason) };
  }
}

function resolveBaseUrl(): string {
  const configured = useSettingsStore.getState().apiBaseUrl?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }
  return "/api";
}

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return `${baseUrl.replace(/\/+$/, "")}${path}`;
  }
  const normalizedBase = baseUrl.startsWith("/")
    ? baseUrl
    : `/${baseUrl}`;
  return `${normalizedBase.replace(/\/+$/, "")}${path}`;
}

function dedupeSignature(signature: string): boolean {
  if (recentSignatures.has(signature)) {
    return false;
  }
  recentSignatures.add(signature);
  if (recentSignatures.size > MAX_SIGNATURES) {
    const oldest = recentSignatures.values().next().value;
    if (oldest) {
      recentSignatures.delete(oldest);
    }
  }
  return true;
}

function sendPayload(payload: RuntimeErrorPayload): void {
  const endpoint = joinUrl(resolveBaseUrl(), RUNTIME_ERROR_PATH);
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) {
        return;
      }
    }
  } catch {
    // Ignore and fallback to fetch.
  }

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function buildPayload(kind: RuntimeErrorKind, message: string, stack?: string): RuntimeErrorPayload {
  const safeMessage = toSafeText(message, MAX_MESSAGE_LENGTH) ?? "Unknown runtime error";
  const safeStack = toSafeText(stack, MAX_STACK_LENGTH);
  const currentPath = typeof window !== "undefined" ? window.location.pathname : undefined;
  return {
    kind,
    message: safeMessage,
    stack: safeStack,
    page_url:
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : undefined,
    route: currentPath,
    user_agent: typeof navigator !== "undefined" ? toSafeText(navigator.userAgent, 900) : undefined,
    locale:
      typeof document !== "undefined"
        ? toSafeText(document.documentElement.lang, 48)
        : undefined,
    app_version: toSafeText(import.meta.env.VITE_APP_VERSION ?? "webapp", 120),
  };
}

function reportRuntimeError(kind: RuntimeErrorKind, message: string, stack?: string): void {
  const payload = buildPayload(kind, message, stack);
  const signature = `${payload.kind}:${payload.route ?? ""}:${payload.message}:${payload.stack ?? ""}`;
  if (!dedupeSignature(signature)) {
    return;
  }
  sendPayload(payload);
}

function onWindowError(event: ErrorEvent): void {
  const errorMessage = event.message || event.error?.message || "Unhandled window error";
  const stack = event.error instanceof Error ? event.error.stack : undefined;
  reportRuntimeError("error", errorMessage, stack);
}

function onUnhandledRejection(event: PromiseRejectionEvent): void {
  const normalized = normalizeReason(event.reason);
  reportRuntimeError("unhandledrejection", normalized.message, normalized.stack);
}

export function initRuntimeErrorReporter(): void {
  if (initialized || typeof window === "undefined" || !isRuntimeErrorReportingEnabled()) {
    return;
  }
  initialized = true;
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
}

export function __resetRuntimeErrorReporterForTest(): void {
  if (typeof window !== "undefined") {
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }
  initialized = false;
  recentSignatures.clear();
}
