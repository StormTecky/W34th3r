import { screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import HomeScreen from '../../app/index';
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
const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);

/** 23:30 on 20 October in Tokyo (14:30 UTC): the forecast crosses local midnight. */
const TOKYO_LATE_EVENING = utc('2026-10-20T14:30:00Z');

function deviceIn(latitude: number, longitude: number) {
  mocked.getForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  } as never);
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  mocked.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude, longitude },
    timestamp: 0,
  } as never);
}

async function renderHome(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<HomeScreen />, { now: TOKYO_LATE_EVENING, ...options });
}

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  deviceIn(35.6762, 139.6503);
  jest.spyOn(Date, 'now').mockReturnValue(TOKYO_LATE_EVENING * 1000);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

describe('acceptance scenario 1: hourly forecast', () => {
  it('shows the next 24 hours in chronological order with time, temperature, condition and precipitation', async () => {
    await renderHome({ scenario: 'rain-night' });
    await screen.findByTestId('current-temperature');
    const rows = screen.getAllByTestId('hourly-row');
    expect(rows).toHaveLength(24);
    expect(screen.getByRole('header', { name: 'Hourly forecast' })).toBeTruthy();

    const labels = rows.map((row) => row.props.accessibilityLabel as string);
    expect(labels[0]).toMatch(
      /^Now, 8 degrees, Moderate rain, \d+ percent chance of precipitation\.$/,
    );
    // Rain scenarios carry a high chance of precipitation, so it is visible on screen too.
    expect(screen.getAllByText(/^\d+%$/).length).toBeGreaterThan(10);
  });

  it('uses the preferred temperature unit', async () => {
    await renderHome({ scenario: 'rain-night', regionCode: 'US' });
    await screen.findByTestId('current-temperature');
    const first = screen.getAllByTestId('hourly-row')[0]!;
    expect(first.props.accessibilityLabel).toMatch(/^Now, 47 degrees/);
  });
});

describe('acceptance scenario 2: daily forecast', () => {
  it('shows the next 7 days with day name, high/low, condition and precipitation', async () => {
    await renderHome({ scenario: 'rain-night' });
    await screen.findByTestId('current-temperature');
    const rows = screen.getAllByTestId('daily-row');
    expect(rows).toHaveLength(7);
    expect(screen.getByRole('header', { name: '7-day forecast' })).toBeTruthy();
    const labels = rows.map((row) => row.props.accessibilityLabel as string);
    expect(labels[0]).toMatch(
      /^Today, high \d+, low \d+, Moderate rain, \d+ percent chance of precipitation\.$/,
    );
    expect(labels[1]).toMatch(/^Tomorrow, high/);
    expect(labels[2]).toMatch(/^Thursday, high/);
  });

  it('shows temperature ranges in the user units', async () => {
    await renderHome({ scenario: 'clear-day', regionCode: 'US' });
    await screen.findByTestId('current-temperature');
    const first = screen.getAllByTestId('daily-row')[0]!;
    expect(first.props.accessibilityLabel).toMatch(/^Today, high 78, low 60,/);
  });
});

describe('acceptance scenario 3: place-local time across midnight', () => {
  it('labels hours and days for Tokyo, not for the device zone', async () => {
    await renderHome({ scenario: 'clear-day' });
    await screen.findByTestId('current-temperature');
    const hourLabels = screen
      .getAllByTestId('hourly-row')
      .slice(0, 4)
      .map((row) => (row.props.accessibilityLabel as string).split(',')[0]);
    expect(hourLabels).toEqual(['Now', '12 AM', '1 AM', '2 AM']);

    const dayLabels = screen
      .getAllByTestId('daily-row')
      .slice(0, 3)
      .map((row) => (row.props.accessibilityLabel as string).split(',')[0]);
    expect(dayLabels).toEqual(['Today', 'Tomorrow', 'Thursday']);
  });
});

describe('robustness', () => {
  it('renders forecasts for extreme values', async () => {
    await renderHome({ scenario: 'extreme-values' });
    await screen.findByTestId('current-temperature');
    expect(screen.getAllByTestId('hourly-row')).toHaveLength(24);
    expect(screen.getAllByTestId('daily-row')[0]!.props.accessibilityLabel).toMatch(
      /high -3\d, low -4\d/,
    );
  });

  it('shows no forecast sections while there is no weather', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    } as never);
    await renderHome();
    await screen.findByText('Location is off');
    expect(screen.queryByTestId('hourly-row')).toBeNull();
    expect(screen.queryByTestId('daily-row')).toBeNull();
  });
});
