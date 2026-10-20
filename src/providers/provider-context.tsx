import { createContext, useContext, type ReactNode } from 'react';

import { getConfig, type AppConfig } from '@/config/env';

import { createOpenMeteoProvider } from './openmeteo';
import { createOpenWeatherClient } from './openweather/client';
import { OpenWeatherProvider } from './openweather';
import { FakeWeatherProvider } from './fake/fake-provider';
import type { WeatherProvider } from './weather-provider';

const WeatherProviderContext = createContext<WeatherProvider | null>(null);

/** Builds the provider the configuration asks for: Open-Meteo, OpenWeather, or the fake. */
export function createDefaultProvider(config: AppConfig = getConfig()): WeatherProvider {
  if (config.provider === 'fake') return new FakeWeatherProvider();
  if (config.provider === 'openweather' && config.apiKey !== null) {
    return new OpenWeatherProvider(
      createOpenWeatherClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeoutMs: config.requestTimeoutMs,
      }),
    );
  }
  return createOpenMeteoProvider({ timeoutMs: config.requestTimeoutMs });
}

export function WeatherProviderProvider({
  provider,
  children,
}: {
  provider: WeatherProvider;
  children: ReactNode;
}) {
  return (
    <WeatherProviderContext.Provider value={provider}>{children}</WeatherProviderContext.Provider>
  );
}

export function useWeatherProvider(): WeatherProvider {
  const provider = useContext(WeatherProviderContext);
  if (!provider) throw new Error('useWeatherProvider must be used inside WeatherProviderProvider');
  return provider;
}
