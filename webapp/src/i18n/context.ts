import { createContext } from "react";
import type { Locale } from "./translations";

export type TranslateValues = Record<string, string | number>;

export type TranslateOptions = {
  defaultValue?: string;
  values?: TranslateValues;
};

export type I18nContextValue = {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, options?: TranslateOptions) => string;
};

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
