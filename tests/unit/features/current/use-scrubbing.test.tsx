import { act } from '@testing-library/react-native';

import type { WeatherSnapshot } from '@/domain/types';
import { useScrubbing } from '@/features/current/use-scrubbing';
import { buildSnapshot } from '@/providers/fake/scenarios';

import { renderHookWithProviders } from '../../../helpers/render';

const NOW = Math.floor(Date.parse('2026-10-20T12:20:00Z') / 1000);
const snapshot = (scenario: Parameters<typeof buildSnapshot>[0] = 'clear-day'): WeatherSnapshot =>
  buildSnapshot(scenario, { placeId: 'p', timeZone: 'Europe/Paris', now: NOW });

async function setup(initial: WeatherSnapshot | undefined) {
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  return renderHookWithProviders(
    ({ data }: { data: WeatherSnapshot | undefined }) => useScrubbing(data),
    { now: NOW },
    {
      data: initial,
    },
  );
}

afterEach(() => jest.restoreAllMocks());

describe('useScrubbing', () => {
  it('starts at now, with no moment and not scrubbing', async () => {
    const { result } = await setup(snapshot());
    expect(result.current.index).toBe(0);
    expect(result.current.isScrubbing).toBe(false);
    expect(result.current.moment).toBeNull();
    expect(result.current.rows).toHaveLength(24);
  });

  it('describes the chosen hour once scrubbed away from now', async () => {
    const { result } = await setup(snapshot());
    await act(async () => result.current.setIndex(10));
    expect(result.current.index).toBe(10);
    expect(result.current.isScrubbing).toBe(true);
    // The fake sun sets 8 hours from now, so hour 10 is night.
    expect(result.current.moment).toMatchObject({ isDay: false, condition: 'clear' });
    expect(result.current.moment?.dayTimeLabel).toMatch(/^(Today|Tomorrow) /);
  });

  it('steps one hour at a time and never leaves the available hours', async () => {
    const { result } = await setup(snapshot());
    await act(async () => result.current.step(-1));
    expect(result.current.index).toBe(0);
    await act(async () => result.current.step(1));
    expect(result.current.index).toBe(1);
    await act(async () => result.current.setIndex(500));
    expect(result.current.index).toBe(23);
    await act(async () => result.current.step(1));
    expect(result.current.index).toBe(23);
  });

  it('goes back to now', async () => {
    const { result } = await setup(snapshot());
    await act(async () => result.current.setIndex(6));
    await act(async () => result.current.reset());
    expect(result.current.index).toBe(0);
    expect(result.current.moment).toBeNull();
  });

  it('has nothing to scrub without weather', async () => {
    const { result } = await setup(undefined);
    expect(result.current.rows).toEqual([]);
    await act(async () => result.current.setIndex(5));
    expect(result.current.index).toBe(0);
    expect(result.current.moment).toBeNull();
  });

  it('clamps the position when fewer hours arrive on a refresh', async () => {
    const full = snapshot();
    const { result, rerender } = await setup(full);
    await act(async () => result.current.setIndex(20));
    await rerender({ data: { ...full, hourly: full.hourly.slice(0, 5) } });
    expect(result.current.index).toBe(4);
    expect(result.current.rows).toHaveLength(5);
  });

  it('uses the preferred temperature unit for labels but keeps Celsius in the moment', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
    const { result } = await renderHookWithProviders(() => useScrubbing(snapshot()), {
      now: NOW,
      preferences: { temperatureUnit: 'f' },
    });
    expect(result.current.rows[0]!.temperatureLabel).toMatch(/^\d+°$/);
    await act(async () => result.current.setIndex(1));
    expect(result.current.moment!.temperature).toBe(snapshot().hourly[1]!.temperature);
  });
});
