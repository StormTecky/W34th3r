import { log } from '@/lib/logger';

import { ProviderError, type RequestOptions } from './weather-provider';

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  /** Delay before the single automatic retry. */
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  /** Sent with every request, e.g. an API key. Never logged. */
  defaultParams?: QueryParams;
}

export type QueryParams = Record<string, string | number>;

export interface HttpClient {
  getJson(path: string, params: QueryParams, options?: RequestOptions): Promise<unknown>;
}

const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 2;

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function classifyStatus(status: number): ProviderError {
  if (status === 401 || status === 403) return new ProviderError('unauthorized');
  if (status === 404) return new ProviderError('not-found');
  if (status === 429) return new ProviderError('rate-limited');
  // 5xx, and any other unexpected 4xx, are treated as the provider misbehaving.
  return new ProviderError('server-error', `HTTP ${status}`);
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof ProviderError && (error.kind === 'timeout' || error.kind === 'server-error')
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface AttemptContext {
  fetchImpl: typeof fetch;
  timeoutMs: number;
  callerSignal?: AbortSignal;
}

/** One request with its own timeout. Throws ProviderError, or an AbortError if the caller aborted. */
async function attempt(url: string, { fetchImpl, timeoutMs, callerSignal }: AttemptContext) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  // Decides what a failed fetch or body read means, in priority order.
  const failure = (fallback: ProviderError): Error => {
    if (callerSignal?.aborted) return abortError();
    if (timedOut) return new ProviderError('timeout');
    return fallback;
  };

  try {
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: controller.signal });
    } catch {
      throw failure(new ProviderError('offline'));
    }
    if (!response.ok) throw classifyStatus(response.status);
    try {
      return (await response.json()) as unknown;
    } catch {
      throw failure(new ProviderError('malformed-response'));
    }
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

/** Runs `attempt`, retrying once for timeouts and server errors. */
async function attemptWithRetry(url: string, context: AttemptContext, retryDelayMs: number) {
  let lastError: unknown;
  for (let attemptNumber = 1; attemptNumber <= MAX_ATTEMPTS; attemptNumber++) {
    try {
      return await attempt(url, context);
    } catch (error) {
      lastError = error;
      const giveUp = !isRetryable(error) || context.callerSignal?.aborted;
      if (giveUp || attemptNumber === MAX_ATTEMPTS) break;
      await sleep(retryDelayMs);
    }
  }
  throw lastError;
}

/** A JSON-over-HTTP client with a timeout, one retry, and failures classified as ProviderErrors. */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { baseUrl, timeoutMs, defaultParams = {} } = options;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  return {
    async getJson(path, params, { signal } = {}) {
      if (signal?.aborted) throw abortError();

      const url = new URL(path, baseUrl);
      for (const [name, value] of Object.entries({ ...params, ...defaultParams })) {
        url.searchParams.set(name, String(value));
      }

      try {
        return await attemptWithRetry(
          url.toString(),
          { fetchImpl, timeoutMs, callerSignal: signal },
          retryDelayMs,
        );
      } catch (error) {
        if (error instanceof ProviderError) {
          // Path only: the query string holds the API key and coordinates.
          log.warn('Weather request failed', { path, kind: error.kind });
        }
        throw error;
      }
    },
  };
}
