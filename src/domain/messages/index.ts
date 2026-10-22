import { DEFAULT_LOCALE, languageOf, type Language } from '../locale';
import { en } from './en';
import { fr } from './fr';
import type { Messages } from './types';

export type { LocationPromptVariant, Messages, UnitText } from './types';

/** One catalog per supported language; the compiler requires an entry for each. */
export const MESSAGES: Record<Language, Messages> = { en, fr };

/** The catalog for a locale tag such as "fr-CA"; English when the language is not translated. */
export function messagesFor(locale: string = DEFAULT_LOCALE): Messages {
  return MESSAGES[languageOf(locale)];
}
