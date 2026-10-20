import { ConfigurationError, readConfig } from '@/config/env';

describe('readConfig: choosing a provider', () => {
  it('uses Open-Meteo, which needs no key, when nothing is configured', () => {
    const config = readConfig({});
    expect(config.provider).toBe('open-meteo');
    expect(config.apiKey).toBeNull();
    expect(config.requestTimeoutMs).toBe(10_000);
  });

  it('uses OpenWeather when a key is present', () => {
    const config = readConfig({ EXPO_PUBLIC_OPENWEATHER_API_KEY: 'k-123' });
    expect(config.provider).toBe('openweather');
    expect(config.apiKey).toBe('k-123');
    expect(config.baseUrl).toBe('https://api.openweathermap.org');
  });

  it('ignores a blank key', () => {
    expect(readConfig({ EXPO_PUBLIC_OPENWEATHER_API_KEY: '   ' }).provider).toBe('open-meteo');
  });

  it.each(['open-meteo', 'openweather', 'fake'] as const)(
    'lets EXPO_PUBLIC_WEATHER_PROVIDER pick %s',
    (provider) => {
      const config = readConfig({
        EXPO_PUBLIC_WEATHER_PROVIDER: provider,
        EXPO_PUBLIC_OPENWEATHER_API_KEY: 'k',
      });
      expect(config.provider).toBe(provider);
    },
  );

  it('is case-insensitive and ignores unknown provider names', () => {
    expect(readConfig({ EXPO_PUBLIC_WEATHER_PROVIDER: ' Open-Meteo ' }).provider).toBe(
      'open-meteo',
    );
    expect(readConfig({ EXPO_PUBLIC_WEATHER_PROVIDER: 'nope' }).provider).toBe('open-meteo');
    expect(
      readConfig({ EXPO_PUBLIC_WEATHER_PROVIDER: 'nope', EXPO_PUBLIC_OPENWEATHER_API_KEY: 'k' })
        .provider,
    ).toBe('openweather');
  });

  it('keeps supporting the older fake-provider flag', () => {
    expect(readConfig({ EXPO_PUBLIC_USE_FAKE_PROVIDER: '1' }).provider).toBe('fake');
    expect(readConfig({ EXPO_PUBLIC_USE_FAKE_PROVIDER: 'true' }).provider).toBe('fake');
    expect(
      readConfig({ EXPO_PUBLIC_USE_FAKE_PROVIDER: '1', EXPO_PUBLIC_OPENWEATHER_API_KEY: 'k' })
        .provider,
    ).toBe('fake');
  });

  it.each(['', '0', 'false', undefined])('does not treat %p as the fake flag', (flag) => {
    expect(readConfig({ EXPO_PUBLIC_USE_FAKE_PROVIDER: flag }).provider).toBe('open-meteo');
  });

  it('does not pass the key on for providers that do not use it', () => {
    const config = readConfig({
      EXPO_PUBLIC_WEATHER_PROVIDER: 'open-meteo',
      EXPO_PUBLIC_OPENWEATHER_API_KEY: 'k',
    });
    expect(config.apiKey).toBeNull();
  });
});

describe('readConfig: OpenWeather without a key', () => {
  it('throws an explicit configuration error that never echoes values', () => {
    let error: unknown;
    try {
      readConfig({ EXPO_PUBLIC_WEATHER_PROVIDER: 'openweather' });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConfigurationError);
    expect((error as Error).message).toMatch(/EXPO_PUBLIC_OPENWEATHER_API_KEY/);
  });
});
