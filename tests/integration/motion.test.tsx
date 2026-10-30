import { screen, waitFor, within } from '@testing-library/react-native';
import * as Location from 'expo-location';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SettingsScreen from '../../app/settings';
import { animatedStyle } from '../helpers/motion';
import { renderWithProviders } from '../helpers/render';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const { useLocalSearchParams } = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock;
};
const nowSeconds = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
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
  useLocalSearchParams.mockReturnValue({ placeId: 'current' });
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

/** Whether an element carries Reanimated styles that fade it, which is how entrances show up. */
const fades = (element: Parameters<typeof animatedStyle>[0]) =>
  typeof animatedStyle(element).opacity === 'number';
/** Whether an element carries a Reanimated scale, which is how presses and bounces show up. */
const scales = (element: Parameters<typeof animatedStyle>[0]) =>
  animatedStyle(element).transform?.some((item) => 'scale' in item) === true;

describe('Home', () => {
  it('brings the conditions and each forecast card in with a spring', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    await waitFor(() => expect(screen.getByTestId('current-temperature')).toBeTruthy());
    expect(fades(screen.getByTestId('enter-current'))).toBe(true);
    const cards = screen.getAllByTestId('forecast-card');
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(fades(card)).toBe(true);
  });

  it('lets the hero temperature bounce when it changes', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    await waitFor(() => expect(screen.getByTestId('current-temperature')).toBeTruthy());
    expect(scales(screen.getByTestId('current-temperature'))).toBe(true);
  });

  it('lets the hero temperature be grabbed, turned and thrown around', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    await waitFor(() => expect(screen.getByTestId('current-temperature')).toBeTruthy());
    const grab = screen.getByTestId('temperature-grab');
    expect(within(grab).getByTestId('current-temperature')).toBeTruthy();
    expect(animatedStyle(grab).transform?.some((item) => 'rotate' in item)).toBe(true);
    expect(grab.props.onStartShouldSetResponder()).toBe(true);
  });

  it('gives the navigation buttons a pressed spring', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    for (const name of ['Saved places', 'Weather details', 'Search', 'Settings']) {
      expect(scales(screen.getByRole('button', { name }))).toBe(true);
    }
  });
});

describe('Details', () => {
  it('brings every tile in with a spring and lets its numbers bounce', async () => {
    await renderWithProviders(<DetailsScreen />, { now: nowSeconds() });
    await waitFor(() => expect(screen.getAllByTestId('detail-tile').length).toBeGreaterThan(0));
    for (const tile of screen.getAllByTestId('detail-tile')) expect(fades(tile)).toBe(true);
    const values = screen.getAllByTestId('detail-value');
    expect(values).toHaveLength(3);
    for (const value of values) expect(scales(value)).toBe(true);
  });
});

describe('Settings', () => {
  it('brings each section in and gives every option a pressed spring', async () => {
    await renderWithProviders(<SettingsScreen />, { now: nowSeconds() });
    const sections = screen.getAllByTestId('settings-section');
    expect(sections).toHaveLength(4);
    for (const section of sections) expect(fades(section)).toBe(true);
    for (const option of screen.getAllByRole('radio')) expect(scales(option)).toBe(true);
  });
});

describe('Saved places', () => {
  it('gives each row and the search button a pressed spring', async () => {
    await renderWithProviders(<PlacesScreen />, { now: nowSeconds() });
    expect(scales(screen.getByTestId('place-row'))).toBe(true);
    expect(scales(screen.getByRole('button', { name: 'Search for a place' }))).toBe(true);
  });
});
