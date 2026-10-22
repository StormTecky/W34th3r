/**
 * Which language the interface speaks and which locale drives number and date formats. Both come
 * from the device: the first preferred locale whose language the app translates, otherwise English
 * with US formats. Adding a language means extending SUPPORTED_LANGUAGES; the compiler then points
 * at every table that needs the new entry.
 */

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
export const DEFAULT_LOCALE = 'en-US';

/** A BCP 47 tag as the device reports it: "fr", "fr-FR", "fr-CA". */
const WELL_FORMED_TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function supportedLanguage(tag: string): Language | null {
  if (!WELL_FORMED_TAG.test(tag)) return null;
  const language = tag.split('-')[0]!.toLowerCase();
  return SUPPORTED_LANGUAGES.find((supported) => supported === language) ?? null;
}

/** The interface language for a locale tag; English when unsupported, malformed or absent. */
export function languageOf(locale: string = DEFAULT_LOCALE): Language {
  return supportedLanguage(locale) ?? DEFAULT_LANGUAGE;
}

/**
 * The locale to use, given the device's preferred locales in order. The full tag is kept (not just
 * the language) so formats follow the region: "fr-CA" tells time differently from "fr-FR", and
 * "en-GB" uses a 24-hour clock.
 */
export function resolveLocale(preferred: readonly string[]): string {
  return preferred.find((tag) => supportedLanguage(tag) !== null) ?? DEFAULT_LOCALE;
}
