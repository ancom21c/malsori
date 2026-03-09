import { translations, type Locale } from "./translations";
import type { TranslateOptions, TranslateValues } from "./context";

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

export const tStatic = (key: string, options?: TranslateOptions): string => {
  const locale = detectPreferredLocale();
  const defaultValue = options?.defaultValue ?? key;
  const localeMap = translations[locale];
  const template =
    localeMap[key] ??
    (locale !== "en" ? translations.en[key] : undefined) ??
    defaultValue;
  return formatTemplate(template, options?.values);
};

