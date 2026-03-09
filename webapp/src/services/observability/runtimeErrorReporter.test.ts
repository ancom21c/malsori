import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRuntimeErrorReporterForTest,
  initRuntimeErrorReporter,
} from "./runtimeErrorReporter";
import { useSettingsStore } from "../../store/settingsStore";

describe("runtimeErrorReporter", () => {
  const originalSendBeacon = navigator.sendBeacon;
  const originalFetch = globalThis.fetch;
  const originalRuntimeConfig = window.__MALSORI_CONFIG__;

  beforeEach(() => {
    window.__MALSORI_CONFIG__ = {
      ...(originalRuntimeConfig ?? {}),
      runtimeErrorReportingEnabled: true,
    };
    useSettingsStore.setState({ apiBaseUrl: "/", adminApiBaseUrl: "/internal" });
    __resetRuntimeErrorReporterForTest();
  });

  afterEach(() => {
    if (originalSendBeacon) {
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: originalSendBeacon,
      });
    } else {
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: undefined,
      });
    }
    globalThis.fetch = originalFetch;
    window.__MALSORI_CONFIG__ = originalRuntimeConfig;
    __resetRuntimeErrorReporterForTest();
  });

  it("sends window errors through sendBeacon", async () => {
    const sendBeacon = vi.fn<[string | URL, BodyInit | null | undefined], boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response())) as typeof fetch;

    initRuntimeErrorReporter();
    const error = new Error("boom");
    window.dispatchEvent(new ErrorEvent("error", { message: "boom", error }));
    await Promise.resolve();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const firstCall = sendBeacon.mock.calls.at(0);
    expect(firstCall).toBeDefined();
    const url = firstCall?.[0];
    const body = firstCall?.[1];
    expect(url).toBe("/internal/v1/observability/runtime-error");
    expect(body).toBeInstanceOf(Blob);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("deduplicates repeated runtime errors", async () => {
    const sendBeacon = vi.fn<[string | URL, BodyInit | null | undefined], boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });

    initRuntimeErrorReporter();
    const error = new Error("same-error");
    window.dispatchEvent(new ErrorEvent("error", { message: "same-error", error }));
    window.dispatchEvent(new ErrorEvent("error", { message: "same-error", error }));
    await Promise.resolve();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch for unhandled rejection when beacon is unavailable", async () => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    const fetchMock = vi.fn<[RequestInfo | URL, RequestInit | undefined], Promise<Response>>(() =>
      Promise.resolve(new Response())
    );
    globalThis.fetch = fetchMock as typeof fetch;

    initRuntimeErrorReporter();
    const rejection = new Event("unhandledrejection");
    Object.defineProperty(rejection, "reason", {
      configurable: true,
      value: new Error("reject-me"),
    });
    window.dispatchEvent(rejection);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls.at(0);
    expect(firstCall).toBeDefined();
    const url = firstCall?.[0];
    const init = firstCall?.[1];
    expect(url).toBe("/internal/v1/observability/runtime-error");
    expect(init?.method).toBe("POST");
  });

  it("does not initialize when runtime reporting is disabled", async () => {
    window.__MALSORI_CONFIG__ = {
      ...(window.__MALSORI_CONFIG__ ?? {}),
      runtimeErrorReportingEnabled: false,
    };
    const sendBeacon = vi.fn<[string | URL, BodyInit | null | undefined], boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response())) as typeof fetch;

    initRuntimeErrorReporter();
    const rejection = new Event("unhandledrejection");
    Object.defineProperty(rejection, "reason", {
      configurable: true,
      value: "disabled-case",
    });
    window.dispatchEvent(rejection);
    await Promise.resolve();

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not initialize when admin base url is not configured", async () => {
    useSettingsStore.setState({ apiBaseUrl: "/", adminApiBaseUrl: "" });
    const sendBeacon = vi.fn<[string | URL, BodyInit | null | undefined], boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response())) as typeof fetch;

    initRuntimeErrorReporter();
    await Promise.resolve();

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("can initialize after admin base becomes available later", async () => {
    useSettingsStore.setState({ apiBaseUrl: "/", adminApiBaseUrl: "" });
    const sendBeacon = vi.fn<[string | URL, BodyInit | null | undefined], boolean>(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response())) as typeof fetch;

    initRuntimeErrorReporter();
    useSettingsStore.setState({ apiBaseUrl: "/", adminApiBaseUrl: "/internal" });
    initRuntimeErrorReporter();

    const error = new Error("late-init");
    window.dispatchEvent(new ErrorEvent("error", { message: "late-init", error }));
    await Promise.resolve();

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
