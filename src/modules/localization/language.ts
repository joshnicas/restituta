export type SupportedLanguage = "EN" | "SW";

export const DEFAULT_LANGUAGE: SupportedLanguage = "EN";

export function normalizeLanguage(value: unknown): SupportedLanguage {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "SW") {
    return "SW";
  }
  return "EN";
}

export function resolveLocalizedText<T extends Record<string, string | null | undefined>>(
  requestedLanguage: unknown,
  translations: T,
  legacyFallback: string | null | undefined,
): string | null {
  const language = normalizeLanguage(requestedLanguage);

  const chosen =
    translations[language] ??
    translations.EN ??
    legacyFallback ??
    null;

  return chosen ?? null;
}

export function mapTranslationsByLanguage<T extends { language: string }>(items: T[] | undefined): Record<SupportedLanguage, T | undefined> {
  const map: Record<SupportedLanguage, T | undefined> = { EN: undefined, SW: undefined };

  for (const item of items ?? []) {
    const language = normalizeLanguage(item.language);
    map[language] = item;
  }

  return map;
}
