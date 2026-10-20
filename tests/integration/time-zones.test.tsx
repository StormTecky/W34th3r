import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { cityToPlace, FAKE_CITIES } from '@/providers/fake/cities';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import { buildTestEnvironment, renderWithProviders } from '../helpers/render';

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

const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);

interface ZoneCase {
  city: string;
  zone: string;
  /** The instant "now" for the case. */
  now: string;
  /** Selected hourly labels, by index; index 0 is always "Now". */
  hours: Record<number, string>;
  /** Day labels of the first three daily rows. */
  days: [string, string, string];
  /** Fake sun rose 4 hours before "now" and sets 8 hours after. */
  sunrise: string;
  sunset: string;
}

const CASES: ZoneCase[] = [
  {
    city: 'Paris',
    zone: 'Europe/Paris (UTC+2)',
    now: '2026-10-20T12:20:00Z',
    hours: { 1: '3 PM', 2: '4 PM' },
    days: ['Today', 'Tomorrow', 'Thursday'],
    sunrise: '10:20 AM',
    sunset: '10:20 PM',
  },
  {
    // Clocks go back at 06:00 UTC on 1 November: the 1 AM hour happens twice.
    city: 'New York',
    zone: 'America/New_York (DST ends inside the forecast)',
    now: '2026-10-31T20:00:00Z',
    hours: { 9: '1 AM', 10: '1 AM', 11: '2 AM' },
    days: ['Today', 'Tomorrow', 'Monday'],
    sunrise: '12:00 PM',
    sunset: '12:00 AM',
  },
  {
    city: 'Kolkata',
    zone: 'Asia/Kolkata (UTC+5:30, a half-hour offset)',
    now: '2026-10-20T12:20:00Z',
    // 13:00 UTC is 18:30 locally; hour labels show the hour only.
    hours: { 1: '6 PM' },
    days: ['Today', 'Tomorrow', 'Thursday'],
    sunrise: '1:50 PM',
    sunset: '1:50 AM',
  },
  {
    // Ahead of UTC by 14 hours: already the 21st locally.
    city: 'Kiritimati',
    zone: 'Pacific/Kiritimati (UTC+14, east of the date line)',
    now: '2026-10-20T12:20:00Z',
    hours: { 1: '3 AM' },
    days: ['Today', 'Tomorrow', 'Friday'],
    sunrise: '10:20 PM',
    sunset: '10:20 AM',
  },
  {
    // Behind UTC by 11 hours: still the 20th, in the early morning.
    city: 'Pago Pago',
    zone: 'Pacific/Pago_Pago (UTC-11, west of the date line)',
    now: '2026-10-20T12:20:00Z',
    hours: { 1: '2 AM' },
    days: ['Today', 'Tomorrow', 'Thursday'],
    sunrise: '9:20 PM',
    sunset: '9:20 AM',
  },
  {
    city: 'Tokyo',
    zone: 'Asia/Tokyo (UTC+9)',
    now: '2026-10-20T12:20:00Z',
    hours: { 1: '10 PM' },
    days: ['Today', 'Tomorrow', 'Thursday'],
    sunrise: '5:20 PM',
    sunset: '5:20 AM',
  },
];

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

async function envFor(testCase: ZoneCase, regionCode = 'FR') {
  // Start from empty device storage so earlier choices do not override the region defaults.
  await AsyncStorage.clear();
  const city = FAKE_CITIES.find((candidate) => candidate.name === testCase.city)!;
  const place = cityToPlace(city);
  const now = utc(testCase.now);
  jest.spyOn(Date, 'now').mockReturnValue(now * 1000);
  const env = await buildTestEnvironment({
    now,
    regionCode,
    scenario: 'clear-day',
    preferences: { lastViewedPlaceId: place.id },
  });
  await env.placesStore.add(place);
  useLocalSearchParams.mockReturnValue({ placeId: place.id });
  return env;
}

const labelOf = (testID: string, index: number) =>
  screen.getAllByTestId(testID)[index]!.props.accessibilityLabel as string;

describe.each(CASES)('$city: $zone', (testCase) => {
  it('labels forecast hours and days in the place time zone', async () => {
    const env = await envFor(testCase);
    await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');

    expect(labelOf('hourly-row', 0)).toMatch(/^Now,/);
    for (const [index, expected] of Object.entries(testCase.hours)) {
      expect(labelOf('hourly-row', Number(index)).split(',')[0]).toBe(expected);
    }
    testCase.days.forEach((expected, index) => {
      expect(labelOf('daily-row', index).split(',')[0]).toBe(expected);
    });
  });

  it('shows sunrise and sunset in the place time zone', async () => {
    const env = await envFor(testCase);
    await renderWithProviders(<DetailsScreen />, { environment: env });
    await screen.findByText('Humidity');
    expect(screen.getByText(testCase.sunrise)).toBeTruthy();
    expect(screen.getByText(testCase.sunset)).toBeTruthy();
  });

  it('converts temperatures consistently in metric and imperial units', async () => {
    const metric = await envFor(testCase, 'FR');
    const view = await renderWithProviders(<HomeScreen />, { environment: metric });
    await screen.findByTestId('current-temperature');
    expect(screen.getByTestId('current-temperature').props.children).toBe('21°');
    expect(labelOf('hourly-row', 0)).toMatch(/^Now, 18 degrees/);
    expect(labelOf('daily-row', 0)).toMatch(/high 25, low 15/);
    await view.unmount();

    const imperial = await envFor(testCase, 'US');
    await renderWithProviders(<HomeScreen />, { environment: imperial });
    await screen.findByTestId('current-temperature');
    expect(screen.getByTestId('current-temperature').props.children).toBe('71°');
    expect(labelOf('hourly-row', 0)).toMatch(/^Now, 65 degrees/);
    expect(labelOf('daily-row', 0)).toMatch(/high 78, low 60/);
  });
});

describe('the same instant on either side of the date line', () => {
  it('is a different calendar day for Kiritimati and Pago Pago', async () => {
    const [kiritimati, pagoPago] = ['Kiritimati', 'Pago Pago'].map((city) =>
      CASES.find((testCase) => testCase.city === city)!,
    );
    expect(kiritimati!.now).toBe(pagoPago!.now);
    // Both start on "Today", yet their third day differs: Friday versus Thursday.
    expect(kiritimati!.days[2]).not.toBe(pagoPago!.days[2]);
  });
});
