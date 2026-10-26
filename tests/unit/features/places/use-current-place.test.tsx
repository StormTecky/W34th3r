import { waitFor } from '@testing-library/react-native';

import { useCurrentPlace } from '@/features/places/use-current-place';
import type { WeatherProvider } from '@/providers/weather-provider';

import { renderHookWithProviders } from '../../../helpers/render';

const coords = { lat: 48.86, lon: 2.35 };

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('useCurrentPlace language', () => {
  it('asks for the name of the location in the language of the device locale', async () => {
    const reverseGeocode = jest.fn(async () => null);
    const provider = { reverseGeocode } as unknown as WeatherProvider;
    const { result } = await renderHookWithProviders(() => useCurrentPlace(coords), {
      provider,
      locale: 'fr-FR',
    });
    await waitFor(() => expect(reverseGeocode).toHaveBeenCalledTimes(1));
    expect(reverseGeocode).toHaveBeenCalledWith(
      coords.lat,
      coords.lon,
      expect.objectContaining({ locale: 'fr-FR' }),
    );
    expect(result.current?.id).toBe('current');
  });

  it('calls the place "Position actuelle" until a name arrives, in French', async () => {
    const provider = {
      reverseGeocode: jest.fn(() => new Promise(() => undefined)),
    } as unknown as WeatherProvider;
    const { result } = await renderHookWithProviders(() => useCurrentPlace(coords), {
      provider,
      locale: 'fr-FR',
    });
    expect(result.current?.name).toBe('Position actuelle');
  });

  it('calls the place "Current location" in English', async () => {
    const provider = {
      reverseGeocode: jest.fn(() => new Promise(() => undefined)),
    } as unknown as WeatherProvider;
    const { result } = await renderHookWithProviders(() => useCurrentPlace(coords), { provider });
    expect(result.current?.name).toBe('Current location');
  });

  it('keeps a name per language', async () => {
    const reverseGeocode = jest.fn(
      async (_lat: number, _lon: number, options?: { locale?: string }) => ({
        id: 'current',
        name: options?.locale?.startsWith('fr') ? 'Lyon (fr)' : 'Lyon (en)',
        region: null,
        country: 'FR',
        lat: 48.86,
        lon: 2.35,
        timeZone: null,
        kind: 'current-location' as const,
        sortOrder: null,
      }),
    );
    const provider = { reverseGeocode } as unknown as WeatherProvider;
    const { result } = await renderHookWithProviders(() => useCurrentPlace(coords), {
      provider,
      locale: 'fr-FR',
    });
    await waitFor(() => expect(result.current?.name).toBe('Lyon (fr)'));
  });
});
