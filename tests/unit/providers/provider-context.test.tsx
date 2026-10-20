import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import { OpenMeteoProvider } from '@/providers/openmeteo';
import { OpenWeatherProvider } from '@/providers/openweather';
import {
  createDefaultProvider,
  useWeatherProvider,
  WeatherProviderProvider,
} from '@/providers/provider-context';

const base = { baseUrl: 'https://example.test', requestTimeoutMs: 1000 };

describe('createDefaultProvider', () => {
  it('returns the fake provider when requested, without needing a key', () => {
    const provider = createDefaultProvider({ ...base, provider: 'fake', apiKey: null });
    expect(provider).toBeInstanceOf(FakeWeatherProvider);
  });

  it('returns the OpenWeather provider when it is chosen and a key is configured', () => {
    const provider = createDefaultProvider({ ...base, provider: 'openweather', apiKey: 'k' });
    expect(provider).toBeInstanceOf(OpenWeatherProvider);
  });

  it('returns the Open-Meteo provider, which needs no key', () => {
    const provider = createDefaultProvider({ ...base, provider: 'open-meteo', apiKey: null });
    expect(provider).toBeInstanceOf(OpenMeteoProvider);
  });
});

describe('useWeatherProvider', () => {
  it('returns the injected provider', async () => {
    const provider = new FakeWeatherProvider();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WeatherProviderProvider provider={provider}>{children}</WeatherProviderProvider>
    );
    const { result } = await renderHook(() => useWeatherProvider(), { wrapper });
    expect(result.current).toBe(provider);
  });

  it('throws a clear error outside a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useWeatherProvider())).rejects.toThrow(/WeatherProviderProvider/);
  });
});
