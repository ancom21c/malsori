import { useContext, useMemo } from "react";
import { supportedLocales, type Locale } from "./translations";
import { I18nContext } from "./context";

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

type LocaleOption = {
  value: Locale;
  label: string;
  flag: string;
  flagAriaLabel: string;
};

const localeFlagMap: Record<Locale, { flag: string; ariaLabel: string }> = {
  ko: { flag: "🇰🇷", ariaLabel: "South Korean flag" },
  en: { flag: "🇺🇸", ariaLabel: "United States flag" },
  ja: { flag: "🇯🇵", ariaLabel: "Japanese flag" },
};

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export function useLocaleOptions(): LocaleOption[] {
  return useMemo(
    () =>
      supportedLocales.map((value) => ({
        value,
        label: LOCALE_LABELS[value],
        flag: localeFlagMap[value].flag,
        flagAriaLabel: localeFlagMap[value].ariaLabel,
      })),
    []
  );
}
