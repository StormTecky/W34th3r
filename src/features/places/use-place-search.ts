import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { Place } from '@/domain/types';
import { log } from '@/lib/logger';
import { useLocale } from '@/lib/use-locale';
import { useWeatherProvider } from '@/providers/provider-context';
import { isProviderError, type ProviderErrorKind } from '@/providers/weather-provider';

export const SEARCH_DEBOUNCE_MS = 300;

export interface PlaceSearch {
  /** The trimmed text actually being searched (lags the input by the debounce). */
  query: string;
  results: Place[];
  /** A request is in flight for the current query. */
  isSearching: boolean;
  /** The current query has finished, with results, none, or an error. */
  hasSearched: boolean;
  errorKind: ProviderErrorKind | null;
  retry: () => Promise<void>;
}

/** The trimmed input, delayed by `delayMs` while typing; empty input applies immediately. */
function useDebouncedQuery(input: string, delayMs: number): string {
  const trimmed = input.trim();
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    if (trimmed === '') return;
    const timer = setTimeout(() => setDebounced(trimmed), delayMs);
    return () => clearTimeout(timer);
  }, [trimmed, delayMs]);

  return trimmed === '' ? '' : debounced;
}

const kindOf = (error: unknown): ProviderErrorKind =>
  isProviderError(error) ? error.kind : 'server-error';

/**
 * Debounced place search. Results are cached for the session, a request is cancelled when the
 * query changes, and the search text is never logged.
 */
export function usePlaceSearch(
  input: string,
  debounceMs: number = SEARCH_DEBOUNCE_MS,
): PlaceSearch {
  const provider = useWeatherProvider();
  const { locale, language } = useLocale();
  const query = useDebouncedQuery(input, debounceMs);
  const active = query !== '';

  const search = useQuery({
    queryKey: ['search', query, language],
    queryFn: async ({ signal }) => {
      try {
        return await provider.searchPlaces(query, { signal, locale });
      } catch (error) {
        if (isProviderError(error)) log.warn('Place search failed', { kind: error.kind });
        throw error;
      }
    },
    enabled: active,
    staleTime: Infinity,
  });

  return {
    query,
    results: active ? (search.data ?? []) : [],
    isSearching: active && search.isFetching,
    hasSearched: active && (search.isSuccess || search.isError),
    errorKind: active && search.error ? kindOf(search.error) : null,
    retry: async () => {
      await search.refetch();
    },
  };
}
