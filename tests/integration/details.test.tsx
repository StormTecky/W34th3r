import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import { buildTestEnvironment, renderWithProviders } from '../helpers/render';
import { makePlace } from '../helpers/places';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const { router, useLocalSearchParams } = jest.requireMock('expo-router') as {
  router: Record<'push', jest.Mock>;
  useLocalSearchParams: jest.Mock;
};

const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);
/** 14:20 in Paris (UTC+2); the fake sun rose 4 hours ago and sets in 8 hours. */
const NOW = utc('2026-10-20T12:20:00Z');

function permission(status: 'granted' | 'denied') {
  return {
    status,
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
    expires: 'never',
  } as never;
}

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  mocked.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 48.8566, longitude: 2.3522 },
    timestamp: 0,
  } as never);
  useLocalSearchParams.mockReturnValue({ placeId: 'current' });
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

async function renderDetails(options: Parameters<typeof renderWithProviders>[1] = {}) {
  const view = await renderWithProviders(<DetailsScreen />, { now: NOW, ...options });
  await screen.findByText('Humidity');
  return view;
}

describe('acceptance scenario 1: the details view', () => {
  it('shows wind, humidity, UV index, visibility, pressure and sunrise/sunset', async () => {
    await renderDetails({ scenario: 'clear-day' });
    expect(screen.getByRole('header', { name: 'Paris' })).toBeTruthy();
    for (const title of ['Wind', 'UV index', 'Humidity', 'Visibility', 'Pressure', 'Sun']) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    expect(screen.getByText('12 km/h')).toBeTruthy();
    expect(screen.getByText('Gusts 22 km/h')).toBeTruthy();
    expect(screen.getByText('WSW')).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
    expect(screen.getByText('10 km')).toBeTruthy();
    expect(screen.getByText('1018 hPa')).toBeTruthy();
  });

  it('shows sunrise and sunset in the place local time', async () => {
    await renderDetails({ scenario: 'clear-day' });
    expect(screen.getByText('10:20 AM')).toBeTruthy();
    expect(screen.getByText('10:20 PM')).toBeTruthy();
    expect(screen.getByLabelText('Sunrise 10:20 AM, sunset 10:20 PM')).toBeTruthy();
  });

  it('uses the preferred units', async () => {
    await renderDetails({
      scenario: 'clear-day',
      preferences: { windSpeedUnit: 'mph' },
    });
    expect(screen.getByText('7 mph')).toBeTruthy();
    expect(screen.getByText('6.2 mi')).toBeTruthy();
  });

  it('shows details for a saved or searched place, in that place local time', async () => {
    const springfield = makePlace({
      name: 'Springfield',
      region: 'Illinois',
      country: 'US',
      lat: 39.8,
      lon: -89.64,
    });
    useLocalSearchParams.mockReturnValue({ placeId: springfield.id });
    const env = await buildTestEnvironment({ now: NOW });
    await env.placesStore.add(springfield);
    await renderWithProviders(<DetailsScreen />, { environment: env });
    await screen.findByText('Humidity');
    expect(screen.getByRole('header', { name: 'Springfield' })).toBeTruthy();
    // 08:20 UTC is 3:20 AM in Illinois (CDT).
    expect(screen.getByText('3:20 AM')).toBeTruthy();
    expect(env.fake.calls.reverseGeocode).toBe(0);
  });

  it('copes with missing optional data without breaking the layout', async () => {
    await renderDetails({ scenario: 'missing-optionals' });
    expect(screen.getByLabelText('UV index unavailable')).toBeTruthy();
    // UV index (as a word) and visibility are both unavailable.
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
    expect(screen.queryByText(/Gusts/)).toBeNull();
    expect(screen.getByText('17 km/h')).toBeTruthy();
  });

  it('renders extreme values', async () => {
    await renderDetails({ scenario: 'extreme-values' });
    expect(screen.getByText('252 km/h')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('Extreme')).toBeTruthy();
    expect(screen.getByText('0 km')).toBeTruthy();
  });

  it('explains a failed load, with a retry', async () => {
    const env = await renderWithProviders(<DetailsScreen />, { now: NOW, scenario: 'offline' });
    expect(await screen.findByText("You're offline")).toBeTruthy();
    env.fake.setScenario('clear-day');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Humidity')).toBeTruthy();
  });

  it('asks for location when viewing the current location without permission', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    await renderWithProviders(<DetailsScreen />, { now: NOW });
    expect(await screen.findByText('Location is off')).toBeTruthy();
  });
});

describe('acceptance scenario 2: alerts', () => {
  it('flags the most severe alert on the weather screen, in words and not only colour', async () => {
    await renderWithProviders(<HomeScreen />, { now: NOW, scenario: 'alerts-active' });
    const banner = await screen.findByTestId('alert-banner');
    expect(banner.props.accessibilityLabel).toMatch(/^Severe: Flood Warning/);
    expect(screen.getByText('Severe')).toBeTruthy();
    expect(screen.getByText('Flood Warning')).toBeTruthy();
    expect(screen.getByText('+1 more')).toBeTruthy();
  });

  it('opens the full alert text on demand and closes again', async () => {
    await renderWithProviders(<HomeScreen />, { now: NOW, scenario: 'alerts-active' });
    await fireEvent.press(await screen.findByTestId('alert-banner'));
    expect(await screen.findByText(/Do not drive through flooded roadways/)).toBeTruthy();
    expect(screen.getAllByText('Issued by NWS Fake')).toHaveLength(2);
    expect(screen.getByText('Severe Thunderstorm Watch')).toBeTruthy();
    expect(screen.getAllByText(/^Today /).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText(/flooded roadways/)).toBeNull());
  });

  it('shows no banner when there are no alerts', async () => {
    await renderWithProviders(<HomeScreen />, { now: NOW, scenario: 'clear-day' });
    await screen.findByTestId('current-temperature');
    expect(screen.queryByTestId('alert-banner')).toBeNull();
  });

  it('also flags alerts on the details view', async () => {
    await renderDetails({ scenario: 'alerts-active' });
    expect(screen.getByTestId('alert-banner')).toBeTruthy();
  });
});

describe('reaching the details view', () => {
  it('has a details button on the weather screen that opens the current location details', async () => {
    await renderWithProviders(<HomeScreen />, { now: NOW });
    await screen.findByTestId('current-temperature');
    await fireEvent.press(screen.getByRole('button', { name: 'Weather details' }));
    expect(router.push).toHaveBeenCalledWith('/details/current');
  });

  it('opens the details of the place being viewed', async () => {
    const place = makePlace({ name: 'Tokyo', lat: 35.68, lon: 139.69 });
    const env = await buildTestEnvironment({
      now: NOW,
      preferences: { lastViewedPlaceId: place.id },
    });
    await env.placesStore.add(place);
    await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');
    await fireEvent.press(screen.getByRole('button', { name: 'Weather details' }));
    expect(router.push).toHaveBeenCalledWith(`/details/${place.id}`);
  });
});
