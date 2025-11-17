import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Locale } from "./translations";
import {
  I18nContext,
  type I18nContextValue,
  type TranslateOptions,
  type TranslateValues,
} from "./context";

const STORAGE_KEY = "malsori.language";

const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) {
    return null;
  }
  const lower = value.toLowerCase();
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  return null;
};

const detectPreferredLocale = (): Locale => {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const normalized = normalizeLocale(stored);
      if (normalized) {
        return normalized;
      }
    } catch {
      /* noop */
    }
  }

  if (typeof navigator !== "undefined") {
    const candidates = Array.isArray(navigator.languages)
      ? navigator.languages
      : navigator.language
      ? [navigator.language]
      : [];
    for (const candidate of candidates) {
      const normalized = normalizeLocale(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return "en";
};

const formatTemplate = (template: string, values?: TranslateValues) => {
  if (!values) {
    return template;
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const replacement = values[token];
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectPreferredLocale());

  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      } catch {
        /* noop */
      }
    }
  }, []);

  const translate = useCallback(
    (key: string, options?: TranslateOptions) => {
      const defaultValue = options?.defaultValue ?? key;
      const localeMap = translations[locale];
      const template =
        localeMap[key] ??
        (locale !== "en" ? translations.en[key] : undefined) ??
        defaultValue;
      return formatTemplate(template, options?.values);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: translate,
    }),
    [locale, setLocale, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
