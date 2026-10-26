import { DEFAULT_LOCALE, languageOf, type Language } from '@/domain/locale';
import type { ProviderErrorKind } from '@/providers/weather-provider';

export interface ErrorDescription {
  title: string;
  message: string;
  /** Whether trying again could plausibly help. */
  retryable: boolean;
}

type ErrorText = Pick<ErrorDescription, 'title' | 'message'>;

/**
 * Friendly, non-technical copy for each failure in the closed set (Principle V), per language.
 * It lives here, not in the domain message catalogs, because the keys are provider error kinds.
 */
const TEXT: Record<Language, Record<ProviderErrorKind, ErrorText>> = {
  en: {
    offline: {
      title: "You're offline",
      message:
        'Check your connection and try again. Fresh weather will appear once you are back online.',
    },
    timeout: {
      title: 'Taking too long',
      message: "The weather service didn't answer in time. Please try again.",
    },
    'rate-limited': {
      title: 'Too many requests',
      message: "We've asked for weather a little too often. Wait a moment, then try again.",
    },
    unauthorized: {
      title: 'Weather is unavailable',
      message: "We can't reach the weather service right now. Please check back later.",
    },
    'not-found': {
      title: 'Place not found',
      message: "We couldn't find weather for this place. Try searching for another one.",
    },
    'malformed-response': {
      title: 'Something went wrong',
      message: "The weather came back in a form we couldn't read. Please try again.",
    },
    'server-error': {
      title: 'Weather service problem',
      message: 'The weather service is having trouble. Please try again in a moment.',
    },
  },
  fr: {
    offline: {
      title: 'Vous êtes hors ligne',
      message:
        "Vérifiez votre connexion et réessayez. La météo à jour s'affichera dès que vous serez de nouveau en ligne.",
    },
    timeout: {
      title: 'Ça prend trop de temps',
      message: "Le service météo n'a pas répondu à temps. Veuillez réessayer.",
    },
    'rate-limited': {
      title: 'Trop de requêtes',
      message:
        'Nous avons demandé la météo un peu trop souvent. Patientez un instant, puis réessayez.',
    },
    unauthorized: {
      title: 'Météo indisponible',
      message: 'Impossible de joindre le service météo pour le moment. Revenez plus tard.',
    },
    'not-found': {
      title: 'Lieu introuvable',
      message: "Nous n'avons pas trouvé la météo de ce lieu. Essayez d'en chercher un autre.",
    },
    'malformed-response': {
      title: 'Un problème est survenu',
      message: 'La météo nous est parvenue sous une forme illisible. Veuillez réessayer.',
    },
    'server-error': {
      title: 'Problème du service météo',
      message: 'Le service météo rencontre des difficultés. Veuillez réessayer dans un instant.',
    },
  },
};

const RETRYABLE: Record<ProviderErrorKind, boolean> = {
  offline: true,
  timeout: true,
  'rate-limited': true,
  unauthorized: false,
  'not-found': false,
  'malformed-response': true,
  'server-error': true,
};

export function describeError(
  kind: ProviderErrorKind,
  locale: string = DEFAULT_LOCALE,
): ErrorDescription {
  return { ...TEXT[languageOf(locale)][kind], retryable: RETRYABLE[kind] };
}
