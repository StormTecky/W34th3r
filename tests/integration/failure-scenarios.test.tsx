import { fireEvent, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { weatherQueryKey } from '@/data/query-client';
import { buildSnapshot } from '@/providers/fake/scenarios';
import { PROVIDER_ERROR_KINDS } from '@/providers/weather-provider';
import { describeError } from '@/ui/error-messages';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import SearchScreen from '../../app/search';
import { screenText } from '../helpers/tree';
import {
  buildTestEnvironment,
  createTestQueryClient,
  renderWithProviders,
} from '../helpers/render';

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

function permission(status: 'granted' | 'denied' | 'undetermined') {
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
    mocked.requestForegroundPermissionsAsync,
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
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

/** All the text on screen, so a blank screen is easy to detect. */
const visibleText = screenText;

describe.each(PROVIDER_ERROR_KINDS)('when the weather service fails with %s', (kind) => {
  const { title } = describeError(kind);

  it('explains the problem on the home screen instead of going blank', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds(), scenario: kind });
    expect(await screen.findByText(title)).toBeTruthy();
    expect(visibleText()).not.toMatch(/undefined|NaN|\[object/);
  });

  it('explains the problem on the details screen', async () => {
    await renderWithProviders(<DetailsScreen />, { now: nowSeconds(), scenario: kind });
    expect(await screen.findByText(title)).toBeTruthy();
  });

  it('explains the problem in search', async () => {
    await renderWithProviders(<SearchScreen />, { now: nowSeconds(), scenario: kind });
    await fireEvent.changeText(screen.getByPlaceholderText('City or place'), 'spring');
    expect(await screen.findByText(title)).toBeTruthy();
  });

  it('keeps showing cached weather, with its age, when a refresh fails', async () => {
    const queryClient = createTestQueryClient();
    const age = 30 * 60;
    const at = nowSeconds() - age;
    queryClient.setQueryData(
      weatherQueryKey('current'),
      {
        ...buildSnapshot('clear-day', { placeId: 'current', timeZone: 'Europe/Paris', now: at }),
        fetchedAt: at,
      },
      { updatedAt: Date.now() - age * 1000 },
    );
    await renderWithProviders(<HomeScreen />, { now: nowSeconds(), scenario: kind, queryClient });
    expect(await screen.findByText('Updated 30 min ago')).toBeTruthy();
    expect(screen.getByTestId('current-temperature').props.children).toBe('21°');
    // The age label shows as soon as data is stale; the error arrives when the refresh fails.
    expect(await screen.findByText(title)).toBeTruthy();
  });
});

describe('partial data', () => {
  it('renders every screen when optional values are missing', async () => {
    await renderWithProviders(<HomeScreen />, { now: nowSeconds(), scenario: 'missing-optionals' });
    expect(await screen.findByTestId('current-temperature')).toBeTruthy();
    expect(visibleText()).not.toMatch(/NaN|undefined/);
    expect(screen.getAllByTestId('hourly-row')).toHaveLength(24);

    const env = await buildTestEnvironment({ now: nowSeconds(), scenario: 'missing-optionals' });
    await renderWithProviders(<DetailsScreen />, { environment: env });
    expect(await screen.findByText('Humidity')).toBeTruthy();
    expect(visibleText()).not.toMatch(/NaN|undefined/);
  });
});

describe('location problems', () => {
  it.each(['denied', 'undetermined'] as const)(
    'shows a usable screen when permission is %s',
    async (status) => {
      mocked.getForegroundPermissionsAsync.mockResolvedValue(permission(status));
      await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
      expect(await screen.findByRole('button', { name: 'Search for a place' })).toBeTruthy();
      expect(visibleText()).not.toMatch(/undefined|NaN/);
    },
  );

  it('shows a usable screen when the location cannot be read', async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('Location services are disabled'));
    await renderWithProviders(<HomeScreen />, { now: nowSeconds() });
    expect(await screen.findByText("We couldn't find your location")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search for a place' })).toBeTruthy();
  });
});
