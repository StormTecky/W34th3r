import { ScenarioSwitchScreen } from '@/features/dev/ScenarioSwitchScreen';
import type { WeatherProvider } from '@/providers/weather-provider';

import { renderWithProviders } from '../../../helpers/render';
import { screenText } from '../../../helpers/tree';

const { router, useLocalSearchParams } = jest.requireMock('expo-router') as {
  router: Record<'replace', jest.Mock>;
  useLocalSearchParams: jest.Mock;
};

describe('ScenarioSwitchScreen (test builds only)', () => {
  it('switches the fake provider to the requested scenario and returns home', async () => {
    useLocalSearchParams.mockReturnValue({ name: 'offline' });
    const view = await renderWithProviders(<ScenarioSwitchScreen />);
    expect(view.fake.getScenario()).toBe('offline');
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(screenText()).toBe('');
  });

  it('ignores a scenario name it does not know', async () => {
    useLocalSearchParams.mockReturnValue({ name: 'volcano' });
    const view = await renderWithProviders(<ScenarioSwitchScreen />);
    expect(view.fake.getScenario()).toBe('clear-day');
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('does nothing to a real provider', async () => {
    useLocalSearchParams.mockReturnValue({ name: 'offline' });
    const real: WeatherProvider = {
      getWeather: jest.fn(),
      searchPlaces: jest.fn(),
      reverseGeocode: jest.fn(),
    };
    await renderWithProviders(<ScenarioSwitchScreen />, { provider: real });
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(real.getWeather).not.toHaveBeenCalled();
  });
});
