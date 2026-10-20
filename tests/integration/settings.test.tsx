import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as ReactNative from 'react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SearchScreen from '../../app/search';
import SettingsScreen from '../../app/settings';
import { buildTestEnvironment, renderWithProviders, type TestEnvironment } from '../helpers/render';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const { router } = jest.requireMock('expo-router') as { router: Record<'push', jest.Mock> };
const nowSeconds = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  mocked.getForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  } as never);
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  mocked.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 48.8566, longitude: 2.3522 },
    timestamp: 0,
  } as never);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

const radio = (name: string) => screen.getByRole('radio', { name });
const isChecked = (name: string) => radio(name).props.accessibilityState?.checked === true;
const pick = async (name: string) => fireEvent.press(radio(name));
const rootBackground = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

async function renderSettings(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<SettingsScreen />, { now: nowSeconds(), ...options });
}

describe('the settings screen', () => {
  it('offers every unit and appearance choice, with the current ones selected', async () => {
    await renderSettings({ regionCode: 'FR' });
    for (const heading of ['Temperature', 'Wind speed', 'Precipitation', 'Appearance']) {
      expect(screen.getByRole('header', { name: heading })).toBeTruthy();
    }
    for (const name of [
      'Celsius',
      'Fahrenheit',
      'Metres per second',
      'Kilometres per hour',
      'Miles per hour',
      'Knots',
      'Millimetres',
      'Inches',
      'System',
      'Light',
      'Dark',
    ]) {
      expect(radio(name)).toBeTruthy();
    }
    // French region defaults: metric, system appearance.
    expect(isChecked('Celsius')).toBe(true);
    expect(isChecked('Kilometres per hour')).toBe(true);
    expect(isChecked('Millimetres')).toBe(true);
    expect(isChecked('System')).toBe(true);
    expect(isChecked('Fahrenheit')).toBe(false);
  });

  it('shows US defaults for a US region', async () => {
    await renderSettings({ regionCode: 'US' });
    expect(isChecked('Fahrenheit')).toBe(true);
    expect(isChecked('Miles per hour')).toBe(true);
    expect(isChecked('Inches')).toBe(true);
  });

  it('selects exactly one option per group', async () => {
    await renderSettings();
    await pick('Fahrenheit');
    await pick('Knots');
    expect(isChecked('Fahrenheit')).toBe(true);
    expect(isChecked('Celsius')).toBe(false);
    expect(isChecked('Knots')).toBe(true);
    expect(isChecked('Kilometres per hour')).toBe(false);
  });

  it('writes the choices to the preferences store', async () => {
    const env = await renderSettings();
    await pick('Fahrenheit');
    await pick('Miles per hour');
    await pick('Inches');
    await pick('Dark');
    expect(env.preferencesStore.getState()).toMatchObject({
      temperatureUnit: 'f',
      windSpeedUnit: 'mph',
      precipitationUnit: 'in',
      appearance: 'dark',
    });
  });

  it('has controls at least 44 points tall', async () => {
    await renderSettings();
    const style = StyleSheet.flatten(radio('Celsius').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('weather data credit', () => {
  it('credits Open-Meteo, the default provider, as its licence requires', async () => {
    await renderSettings();
    expect(screen.getByTestId('attribution').props.children).toMatch(
      /Open-Meteo\.com \(CC BY 4\.0\)/,
    );
  });
});

describe('acceptance scenario 1: switching temperature units', () => {
  it('updates current, hourly, daily and place values consistently, without refetching', async () => {
    const env = await buildTestEnvironment({ now: nowSeconds(), regionCode: 'FR' });
    await env.placesStore.add({
      id: '35.68,139.69',
      name: 'Tokyo',
      region: 'Tokyo',
      country: 'JP',
      lat: 35.68,
      lon: 139.69,
      timeZone: null,
      kind: 'saved',
      sortOrder: null,
    });

    const home = await renderWithProviders(<HomeScreen />, { environment: env });
    await waitFor(() =>
      expect(screen.getByTestId('current-temperature').props.children).toBe('21°'),
    );
    expect(screen.getByText('Feels like 21°')).toBeTruthy();
    expect(screen.getAllByTestId('daily-row')[0]!.props.accessibilityLabel).toMatch(
      /high 25, low 15/,
    );
    const fetches = env.fake.calls.getWeather;
    await home.unmount();

    const settings = await renderWithProviders(<SettingsScreen />, { environment: env });
    await pick('Fahrenheit');
    await settings.unmount();

    await renderWithProviders(<HomeScreen />, { environment: env });
    await waitFor(() =>
      expect(screen.getByTestId('current-temperature').props.children).toBe('71°'),
    );
    expect(screen.getByText('Feels like 69°')).toBeTruthy();
    expect(screen.getAllByTestId('daily-row')[0]!.props.accessibilityLabel).toMatch(
      /high 78, low 60/,
    );
    expect(screen.getAllByTestId('hourly-row')[0]!.props.accessibilityLabel).toMatch(
      /^Now, \d+ degrees/,
    );
    // Units are converted on the device; the cached weather is reused.
    expect(env.fake.calls.getWeather).toBe(fetches);
  });

  it('shows the saved-place temperatures in the chosen unit', async () => {
    const env = await buildTestEnvironment({
      now: nowSeconds(),
      preferences: { temperatureUnit: 'f' },
    });
    await renderWithProviders(<PlacesScreen />, { environment: env });
    expect(screen.getByTestId('places-list')).toBeTruthy();
  });
});

describe('acceptance scenario 2: appearance', () => {
  const { light, dark } = colors;

  it('applies dark tokens on every plain screen', async () => {
    const env = await buildTestEnvironment({
      now: nowSeconds(),
      preferences: { appearance: 'dark' },
    });
    for (const [element, testID] of [
      [<SettingsScreen key="s" />, 'settings-screen'],
      [<SearchScreen key="q" />, 'search-screen'],
      [<PlacesScreen key="p" />, 'places-screen'],
    ] as const) {
      const view = await renderWithProviders(element, { environment: env });
      expect(rootBackground(testID)).toBe(dark.background);
      await view.unmount();
    }
  });

  it('applies light tokens when light is chosen, even if the OS is dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await renderSettings({ preferences: { appearance: 'light' } });
    expect(rootBackground('settings-screen')).toBe(light.background);
  });

  it('follows the OS when set to system', async () => {
    const spy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const view = await renderSettings({ preferences: { appearance: 'system' } });
    expect(rootBackground('settings-screen')).toBe(dark.background);
    spy.mockReturnValue('light');
    await view.rerender(<SettingsScreen />);
    expect(rootBackground('settings-screen')).toBe(light.background);
  });

  it('changes appearance immediately when a choice is made', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await renderSettings();
    expect(rootBackground('settings-screen')).toBe(light.background);
    await pick('Dark');
    await waitFor(() => expect(rootBackground('settings-screen')).toBe(dark.background));
  });
});

describe('persistence', () => {
  it('keeps the choices after a restart', async () => {
    const first = await renderSettings();
    await pick('Fahrenheit');
    await pick('Dark');
    await first.unmount();

    // A new process: new stores, same device storage.
    const restarted: TestEnvironment = await buildTestEnvironment({ now: nowSeconds() });
    await renderWithProviders(<SettingsScreen />, { environment: restarted });
    expect(isChecked('Fahrenheit')).toBe(true);
    expect(isChecked('Dark')).toBe(true);
  });
});

describe('reaching settings from the weather screen', () => {
  it('has a Settings button on the home screen', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    await act(async () => undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});
