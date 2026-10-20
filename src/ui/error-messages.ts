import type { ProviderErrorKind } from '@/providers/weather-provider';

export interface ErrorDescription {
  title: string;
  message: string;
  /** Whether trying again could plausibly help. */
  retryable: boolean;
}

/** Friendly, non-technical copy for each failure in the closed set (Principle V). */
const DESCRIPTIONS: Record<ProviderErrorKind, ErrorDescription> = {
  offline: {
    title: "You're offline",
    message:
      'Check your connection and try again. Fresh weather will appear once you are back online.',
    retryable: true,
  },
  timeout: {
    title: 'Taking too long',
    message: "The weather service didn't answer in time. Please try again.",
    retryable: true,
  },
  'rate-limited': {
    title: 'Too many requests',
    message: "We've asked for weather a little too often. Wait a moment, then try again.",
    retryable: true,
  },
  unauthorized: {
    title: 'Weather is unavailable',
    message: "We can't reach the weather service right now. Please check back later.",
    retryable: false,
  },
  'not-found': {
    title: 'Place not found',
    message: "We couldn't find weather for this place. Try searching for another one.",
    retryable: false,
  },
  'malformed-response': {
    title: 'Something went wrong',
    message: "The weather came back in a form we couldn't read. Please try again.",
    retryable: true,
  },
  'server-error': {
    title: 'Weather service problem',
    message: 'The weather service is having trouble. Please try again in a moment.',
    retryable: true,
  },
};

export function describeError(kind: ProviderErrorKind): ErrorDescription {
  return DESCRIPTIONS[kind];
}
