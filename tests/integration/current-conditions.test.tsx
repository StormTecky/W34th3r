import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { weatherQueryKey } from '@/data/query-client';
import { buildSnapshot, type FakeScenario } from '@/providers/fake/scenarios';
import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import { PROVIDER_ERROR_KINDS, type WeatherProvider } from '@/providers/weather-provider';
import { describeError } from '@/ui/error-messages';

import HomeScreen from '../../app/index';
import { createTestQueryClient, renderWithProviders } from '../helpers/render';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const permission = (status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) =>
  ({ status, granted: status === 'granted', canAskAgain, expires: 'never' }) as never;
const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude }, timestamp: 0 }) as never;

/** The device is in Paris, so the fake provider names the place "Paris". */
function deviceInParis(status: 'granted' | 'denied' | 'undetermined' = 'granted') {
  mocked.getForegroundPermissionsAsync.mockResolvedValue(permission(status, status !== 'denied'));
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  mocked.getCurrentPositionAsync.mockResolvedValue(position(48.8566, 2.3522));
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** The hero temperature. Plain text queries are ambiguous because forecasts repeat the value. */
async function expectHero(text: string) {
  await waitFor(() => expect(screen.getByTestId('current-temperature').props.children).toBe(text));
}
const render = (options: Parameters<typeof renderWithProviders>[1] = {}) =>
  renderWithProviders(<HomeScreen />, { now: nowSeconds(), ...options });

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.requestForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  deviceInParis();
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

describe('acceptance scenario 1: current conditions are shown', () => {
  it('shows place, temperature, summary, feels-like and high/low in the preferred units', async () => {
    await render({ scenario: 'clear-day' });
    await expectHero('21°');
    expect(screen.getByText('Paris')).toBeTruthy();
    expect(screen.getByText('Clear sky')).toBeTruthy();
    expect(screen.getByText('Feels like 21°')).toBeTruthy();
    expect(screen.getByText('H:25°  L:15°')).toBeTruthy();
  });

  it('converts every value to Fahrenheit for US users', async () => {
    await render({ scenario: 'clear-day', regionCode: 'US' });
    await expectHero('71°');
    expect(screen.getByText('Feels like 69°')).toBeTruthy();
    expect(screen.getByText('H:78°  L:60°')).toBeTruthy();
  });

  it('shows a loading placeholder until the weather arrives', async () => {
    // Hold the provider behind a gate so the loading state is observable deterministically.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const inner = new FakeWeatherProvider({ now: () => nowSeconds() });
    const provider: WeatherProvider = {
      getWeather: async (place, options) => {
        await gate;
        return inner.getWeather(place, options);
      },
      searchPlaces: (query, options) => inner.searchPlaces(query, options),
      reverseGeocode: (lat, lon, options) => inner.reverseGeocode(lat, lon, options),
    };
    await render({ provider });
    expect(screen.getByLabelText('Loading weather')).toBeTruthy();
    expect(screen.queryByTestId('current-temperature')).toBeNull();

    await act(async () => release());
    await expectHero('21°');
    expect(screen.queryByLabelText('Loading weather')).toBeNull();
  });

  it('falls back to a generic label when the place cannot be named', async () => {
    mocked.getCurrentPositionAsync.mockResolvedValue(position(-60, 0));
    await render({ scenario: 'clear-day' });
    expect(await screen.findByText('Current location')).toBeTruthy();
    await expectHero('21°');
  });

  it('describes the conditions in one sentence for screen readers', async () => {
    await render({ scenario: 'clear-day' });
    await expectHero('21°');
    expect(
      screen.getByLabelText(
        'Paris. 21 degrees. Clear sky. Feels like 21 degrees. High 25, low 15.',
      ),
    ).toBeTruthy();
  });

  it('keeps the temperature on one line, shrinking to fit large text', async () => {
    await render({ scenario: 'extreme-values' });
    const temperature = await screen.findByTestId('current-temperature');
    expect(temperature.props.numberOfLines).toBe(1);
    expect(temperature.props.adjustsFontSizeToFit).toBe(true);
  });
});

describe('acceptance scenario 2: the theme follows the weather', () => {
  async function themeFor(scenario: FakeScenario) {
    const view = await render({ scenario });
    await screen.findByTestId('current-temperature');
    const key = screen.getByTestId('condition-background').props.nativeID;
    await view.unmount();
    return key;
  }

  it('looks different for rain by day, clear by day, and rain by night', async () => {
    const clearDay = await themeFor('clear-day');
    const rainDay = await themeFor('rain-day');
    const rainNight = await themeFor('rain-night');
    expect(rainDay).toBe('rain-day');
    expect(new Set([clearDay, rainDay, rainNight]).size).toBe(3);
  });

  it('uses the snow theme for snow', async () => {
    expect(await themeFor('snow')).toBe('snow-day');
  });
});

describe('acceptance scenario 3: data changes update the screen', () => {
  it('shows new conditions after a refresh', async () => {
    const view = await render({ scenario: 'clear-day' });
    await expectHero('21°');
    view.fake.setScenario('snow');
    await act(async () => {
      await view.queryClient.invalidateQueries({ queryKey: ['weather'] });
    });
    expect(await screen.findByText('Light snow')).toBeTruthy();
    await expectHero('-3°');
    expect(screen.getByTestId('condition-background').props.nativeID).toBe('snow-day');
  });

  it('refreshes when the user pulls down', async () => {
    const view = await render({ scenario: 'clear-day' });
    await expectHero('21°');
    expect(view.fake.calls.getWeather).toBe(1);
    const scroll = screen.getByTestId('home-scroll');
    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });
    expect(view.fake.calls.getWeather).toBe(2);
  });
});

describe('partial and extreme data', () => {
  it('renders when optional values such as UV index are missing', async () => {
    await render({ scenario: 'missing-optionals' });
    expect(await screen.findByText('Scattered clouds')).toBeTruthy();
    await expectHero('18°');
  });

  it('renders extreme values without layout-breaking output', async () => {
    await render({ scenario: 'extreme-values' });
    await expectHero('-40°');
    expect(screen.getByText('Feels like -52°')).toBeTruthy();
  });
});

describe('location permission', () => {
  it('explains why location is needed before asking, then shows the weather once allowed', async () => {
    deviceInParis('undetermined');
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    const view = await render({ scenario: 'clear-day' });
    expect(await screen.findByText('See the weather where you are')).toBeTruthy();
    expect(view.fake.calls.getWeather).toBe(0);

    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    await fireEvent.press(screen.getByRole('button', { name: 'Use my location' }));
    await expectHero('21°');
  });

  it('shows how to turn location on when it was denied, and requests no weather', async () => {
    deviceInParis('denied');
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const view = await render({ scenario: 'clear-day' });
    expect(await screen.findByText('Location is off')).toBeTruthy();
    expect(view.fake.calls.getWeather).toBe(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalled();
  });

  describe('in a browser, which has no Settings app to open', () => {
    beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));

    it('explains how to allow location for the site, without offering to open Settings', async () => {
      deviceInParis('denied');
      await render({ scenario: 'clear-day' });
      expect(await screen.findByText('Location is blocked')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Open Settings' })).toBeNull();
      expect(screen.queryByText(/Settings/)).toBeNull();
    });

    it('checks again when asked, and shows the weather once the site is allowed', async () => {
      deviceInParis('denied');
      await render({ scenario: 'clear-day' });
      await screen.findByText('Location is blocked');

      mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
      await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      await expectHero('21°');
    });

    it('still offers to search for a place', async () => {
      deviceInParis('denied');
      await render();
      await screen.findByText('Location is blocked');
      expect(screen.getByRole('button', { name: 'Search for a place' })).toBeTruthy();
    });
  });

  it('offers to search for a place when location is denied', async () => {
    deviceInParis('denied');
    await render();
    await screen.findByText('Location is off');
    expect(screen.getByRole('button', { name: 'Search for a place' })).toBeTruthy();
  });

  it('explains when the location cannot be read at all', async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('Location services are disabled'));
    await render();
    expect(await screen.findByText("We couldn't find your location")).toBeTruthy();
  });
});

describe('failures', () => {
  it.each(PROVIDER_ERROR_KINDS)('shows a friendly message for %s', async (kind) => {
    await render({ scenario: kind });
    expect(await screen.findByText(describeError(kind).title)).toBeTruthy();
    expect(screen.queryByTestId('current-temperature')).toBeNull();
  });

  it('retries from the error screen', async () => {
    const view = await render({ scenario: 'offline' });
    expect(await screen.findByText("You're offline")).toBeTruthy();
    view.fake.setScenario('clear-day');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await expectHero('21°');
    expect(screen.queryByText("You're offline")).toBeNull();
  });

  it('shows last-known weather with its age when a refresh fails', async () => {
    const queryClient = createTestQueryClient();
    const agoSeconds = 20 * 60;
    const at = nowSeconds() - agoSeconds;
    queryClient.setQueryData(
      weatherQueryKey('current'),
      {
        ...buildSnapshot('clear-day', { placeId: 'current', timeZone: 'Europe/Paris', now: at }),
        fetchedAt: at,
      },
      { updatedAt: Date.now() - agoSeconds * 1000 },
    );
    await render({ scenario: 'offline', queryClient });
    await expectHero('21°');
    expect(await screen.findByText('Updated 20 min ago')).toBeTruthy();
    await waitFor(() => expect(screen.getByText("You're offline")).toBeTruthy());
  });

  it('does not show an age label for fresh data', async () => {
    await render({ scenario: 'clear-day' });
    await expectHero('21°');
    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});
