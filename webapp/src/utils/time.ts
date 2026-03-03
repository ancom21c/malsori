export function formatSecondsLabel(valueMs: number | null | undefined): string {
  if (valueMs === null || valueMs === undefined || Number.isNaN(valueMs)) {
    return "0";
  }
  return (valueMs / 1000).toFixed(2);
}

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function normalizeLocaleTag(locale: string): string {
  const normalized = (locale || "").trim().toLowerCase();
  if (normalized.startsWith("ko")) {
    return "ko-KR";
  }
  if (normalized.startsWith("ja")) {
    return "ja-JP";
  }
  return "en-US";
}

function getFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const localeTag = normalizeLocaleTag(locale);
  const cacheKey = `${localeTag}:${JSON.stringify(options)}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(localeTag, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatLocalizedDateTime(
  value: string | number | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value === null || value === undefined) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const formatter = getFormatter(locale, options ?? DEFAULT_DATE_TIME_OPTIONS);
  return formatter.format(date);
}
