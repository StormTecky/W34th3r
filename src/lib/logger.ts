/**
 * Structured logging that cannot leak secrets or personal data.
 *
 * Constitution Principle V: errors are logged with enough context to diagnose (operation, place
 * id, provider status) but never API keys, coordinates, or search text.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogSink = Record<LogLevel, (...args: unknown[]) => void>;
export type LogContext = Record<string, unknown>;

const REDACTED = '[redacted]';

const SENSITIVE_KEY =
  /^(appid|api[_-]?key|apikey|key|token|authorization|lat|lon|lng|latitude|longitude|coords?|coordinates|query|q|search|searchtext|text)$/i;

export function redactText(text: string): string {
  return text
    .replace(/\b(appid|api[_-]?key|apikey|token)=[^&\s]+/gi, `$1=${REDACTED}`)
    .replace(/\b(lat|lon|lng|latitude|longitude)=-?[\d.]+/gi, `$1=${REDACTED}`)
    .replace(/\bq=[^&\s]+/gi, `q=${REDACTED}`)
    .replace(/-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+/g, '[coords]');
}

export function redactContext(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactText(value.message) };
  }
  if (Array.isArray(value)) return value.map((item) => redactContext(item, seen));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactContext(inner, seen);
  }
  return out;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function createLogger(sink: LogSink, options: { debug: boolean }): Logger {
  const write = (level: LogLevel, message: string, context?: LogContext) => {
    if (level === 'debug' && !options.debug) return;
    const safeMessage = redactText(message);
    if (context === undefined) sink[level](safeMessage);
    else sink[level](safeMessage, redactContext(context));
  };
  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}

export const log: Logger = createLogger(console, {
  debug: process.env.NODE_ENV !== 'production',
});
