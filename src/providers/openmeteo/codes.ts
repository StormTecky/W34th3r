import { DEFAULT_LOCALE, languageOf, type Language } from '@/domain/locale';
import { messagesFor } from '@/domain/messages';
import type { ConditionCategory } from '@/domain/types';

type Names = Record<Language, string>;

/** WMO weather interpretation codes as used by Open-Meteo: category and the name in each language. */
const CODES: Readonly<Record<number, readonly [ConditionCategory, Names]>> = {
  0: ['clear', { en: 'Clear sky', fr: 'Ciel dégagé' }],
  1: ['clear', { en: 'Mainly clear', fr: 'Plutôt dégagé' }],
  2: ['partly-cloudy', { en: 'Partly cloudy', fr: 'Partiellement nuageux' }],
  3: ['cloudy', { en: 'Overcast', fr: 'Couvert' }],
  45: ['mist-fog', { en: 'Fog', fr: 'Brouillard' }],
  48: ['mist-fog', { en: 'Rime fog', fr: 'Brouillard givrant' }],
  51: ['drizzle', { en: 'Light drizzle', fr: 'Bruine légère' }],
  53: ['drizzle', { en: 'Drizzle', fr: 'Bruine' }],
  55: ['drizzle', { en: 'Heavy drizzle', fr: 'Forte bruine' }],
  56: ['sleet', { en: 'Freezing drizzle', fr: 'Bruine verglaçante' }],
  57: ['sleet', { en: 'Heavy freezing drizzle', fr: 'Forte bruine verglaçante' }],
  61: ['rain', { en: 'Light rain', fr: 'Pluie légère' }],
  63: ['rain', { en: 'Moderate rain', fr: 'Pluie modérée' }],
  65: ['rain', { en: 'Heavy rain', fr: 'Forte pluie' }],
  66: ['sleet', { en: 'Freezing rain', fr: 'Pluie verglaçante' }],
  67: ['sleet', { en: 'Heavy freezing rain', fr: 'Forte pluie verglaçante' }],
  71: ['snow', { en: 'Light snow', fr: 'Neige légère' }],
  73: ['snow', { en: 'Snow', fr: 'Neige' }],
  75: ['snow', { en: 'Heavy snow', fr: 'Forte neige' }],
  77: ['snow', { en: 'Snow grains', fr: 'Grains de neige' }],
  80: ['rain', { en: 'Light showers', fr: 'Averses légères' }],
  81: ['rain', { en: 'Showers', fr: 'Averses' }],
  82: ['rain', { en: 'Violent showers', fr: 'Averses violentes' }],
  85: ['snow', { en: 'Light snow showers', fr: 'Averses de neige légères' }],
  86: ['snow', { en: 'Snow showers', fr: 'Averses de neige' }],
  95: ['thunderstorm', { en: 'Thunderstorm', fr: 'Orage' }],
  96: ['thunderstorm', { en: 'Thunderstorm with hail', fr: 'Orage avec grêle' }],
  99: ['thunderstorm', { en: 'Severe thunderstorm with hail', fr: 'Violent orage avec grêle' }],
};

export function categoryFromWmo(code: number): ConditionCategory {
  return CODES[code]?.[0] ?? 'unknown';
}

/** The name of a weather code in the locale's language; English when it is not translated. */
export function describeWmo(code: number, locale: string = DEFAULT_LOCALE): string {
  return CODES[code]?.[1][languageOf(locale)] ?? messagesFor(locale).common.unknownConditions;
}
