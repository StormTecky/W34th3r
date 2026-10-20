import { createLogger, redactContext, redactText } from '@/lib/logger';

describe('redactText', () => {
  it('removes API keys from URLs and text', () => {
    expect(redactText('GET /data?lat=1&lon=2&appid=SECRET123&units=metric')).not.toContain(
      'SECRET123',
    );
    expect(redactText('api_key=abcd1234 failed')).not.toContain('abcd1234');
    expect(redactText('using key: apikey=zzz999')).not.toContain('zzz999');
  });

  it('removes coordinates in query strings and key=value form', () => {
    const out = redactText('fetch lat=48.8566 lon=2.3522 failed');
    expect(out).not.toContain('48.8566');
    expect(out).not.toContain('2.3522');
  });

  it('removes bare coordinate pairs', () => {
    expect(redactText('place 48.86,2.35 not found')).not.toContain('48.86');
  });

  it('removes search query text from URLs', () => {
    expect(redactText('GET /geo/1.0/direct?q=Springfield&limit=5')).not.toContain('Springfield');
  });

  it('leaves harmless text untouched', () => {
    expect(redactText('weather fetch failed with status 429')).toBe(
      'weather fetch failed with status 429',
    );
  });
});

describe('redactContext', () => {
  it('redacts sensitive keys at any depth and keeps safe ones', () => {
    const out = redactContext({
      operation: 'getWeather',
      status: 429,
      appid: 'SECRET',
      lat: 1.23,
      lon: 4.56,
      query: 'Paris',
      nested: { apiKey: 'SECRET2', placeId: 'current', coords: { latitude: 1, longitude: 2 } },
    }) as Record<string, unknown>;
    const json = JSON.stringify(out);
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain('Paris');
    expect(json).not.toContain('1.23');
    expect(out.operation).toBe('getWeather');
    expect(out.status).toBe(429);
    expect((out.nested as Record<string, unknown>).placeId).toBe('current');
  });

  it('redacts secrets inside string values', () => {
    const out = redactContext({ url: 'https://x/y?appid=SECRET' }) as Record<string, string>;
    expect(out.url).not.toContain('SECRET');
  });

  it('serialises errors without leaking sensitive text', () => {
    const out = redactContext({ error: new Error('bad request appid=SECRET') });
    expect(JSON.stringify(out)).not.toContain('SECRET');
  });

  it('tolerates circular structures', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => redactContext(a)).not.toThrow();
  });
});

describe('place ids, which are coordinates for saved places', () => {
  it('are redacted when they appear as context values', () => {
    const out = JSON.stringify(redactContext({ placeId: '-33.87,151.21', kind: 'offline' }));
    expect(out).not.toContain('33.87');
    expect(out).not.toContain('151.21');
    expect(out).toContain('offline');
  });

  it('keep the harmless id of the current location', () => {
    expect(redactContext({ placeId: 'current' })).toEqual({ placeId: 'current' });
  });
});

describe('createLogger', () => {
  const makeSink = () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() });

  it('writes redacted messages and context to the sink at the matching level', () => {
    const sink = makeSink();
    const log = createLogger(sink, { debug: true });
    log.warn('fetch failed appid=SECRET', { lat: 1, status: 500 });
    expect(sink.warn).toHaveBeenCalledTimes(1);
    const args = JSON.stringify(sink.warn.mock.calls[0]);
    expect(args).not.toContain('SECRET');
    expect(args).toContain('500');
    expect(args).not.toContain('"lat":1');
  });

  it('drops debug output unless debug is enabled', () => {
    const sink = makeSink();
    createLogger(sink, { debug: false }).debug('noisy');
    expect(sink.debug).not.toHaveBeenCalled();
    createLogger(sink, { debug: true }).debug('noisy');
    expect(sink.debug).toHaveBeenCalledTimes(1);
  });

  it('routes info and error to their levels', () => {
    const sink = makeSink();
    const log = createLogger(sink, { debug: true });
    log.info('i');
    log.error('e');
    expect(sink.info).toHaveBeenCalledTimes(1);
    expect(sink.error).toHaveBeenCalledTimes(1);
  });
});
