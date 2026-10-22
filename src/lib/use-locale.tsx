import { useLocales } from 'expo-localization';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { DEFAULT_LOCALE, languageOf, resolveLocale, type Language } from '@/domain/locale';
import { messagesFor, type Messages } from '@/domain/messages';

export interface LocaleInfo {
  /** BCP 47 tag for number and date formats, e.g. "fr-FR". */
  locale: string;
  /** The interface language, e.g. "fr" for "fr-CA". */
  language: Language;
  /** The interface text in the locale's language. */
  messages: Messages;
}

function describe(locale: string): LocaleInfo {
  return { locale, language: languageOf(locale), messages: messagesFor(locale) };
}

/**
 * The locale the device asks for, among the languages the app translates; English (US) when it
 * asks for none of them. Follows the device if its language changes while the app is open.
 */
export function useDeviceLocale(): string {
  const locales = useLocales();
  return useMemo(() => resolveLocale(locales.map((entry) => entry.languageTag)), [locales]);
}

// English (US) outside a provider keeps components deterministic when rendered on their own.
const LocaleContext = createContext<LocaleInfo>(describe(DEFAULT_LOCALE));

/** Makes the locale available to every screen; the app passes the device locale. */
export function LocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const value = useMemo(() => describe(locale), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleInfo {
  return useContext(LocaleContext);
}
