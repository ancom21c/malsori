export const SETTINGS_SECTION_IDS = ["transcription", "permissions", "backend"] as const;

export type SettingsSection = (typeof SETTINGS_SECTION_IDS)[number];

const SETTINGS_SECTION_ID_SET = new Set<string>(SETTINGS_SECTION_IDS);

export function parseSettingsSectionQuery(value: string | null | undefined): SettingsSection {
  if (value && SETTINGS_SECTION_ID_SET.has(value)) {
    return value as SettingsSection;
  }
  return "transcription";
}

export function normalizeSettingsSectionSearchParams(
  searchParams: URLSearchParams,
  activeSection: SettingsSection
): URLSearchParams | null {
  const current = searchParams.get("section");
  if (current === null || current === activeSection) {
    return null;
  }
  const next = new URLSearchParams(searchParams);
  next.set("section", activeSection);
  return next;
}
