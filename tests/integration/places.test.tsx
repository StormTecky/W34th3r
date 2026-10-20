import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { weatherQueryKey } from '@/data/query-client';
import { buildSnapshot } from '@/providers/fake/scenarios';

import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SearchScreen from '../../app/search';
import { makePlace, PARIS, SYDNEY, TOKYO } from '../helpers/places';
import {
  buildTestEnvironment,
  createTestQueryClient,
  renderWithProviders,
  type TestEnvironment,
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
const { router } = jest.requireMock('expo-router') as {
  router: Record<'push' | 'back' | 'replace', jest.Mock>;
};

const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);
/** 07:20 in Springfield, Illinois (CDT) and 14:20 in Paris. */
const NOW = utc('2026-10-20T12:20:00Z');

const SPRINGFIELD_IL = 'Springfield, Illinois, US';
const SEARCH_BOX = 'City or place';

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
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

const typeSearch = async (text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(SEARCH_BOX), text);

async function renderSearch(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<SearchScreen />, { now: NOW, ...options });
}

async function renderPlaces(environment: TestEnvironment) {
  return renderWithProviders(<PlacesScreen />, { environment });
}

describe('acceptance scenario 1: search disambiguates places', () => {
  it('shows a hint before anything is typed', async () => {
    await renderSearch();
    expect(screen.getByText('Search for a city or place.')).toBeTruthy();
  });

  it('lists matching places with region and country so same names can be told apart', async () => {
    await renderSearch();
    await typeSearch('spring');
    for (const label of [
      SPRINGFIELD_IL,
      'Springfield, Massachusetts, US',
      'Springfield, Missouri, US',
    ]) {
      expect(await screen.findByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getAllByText('Springfield')).toHaveLength(3);
    expect(screen.getByText('Illinois, US')).toBeTruthy();
  });

  it('finds places with non-Latin names', async () => {
    await renderSearch();
    await typeSearch('moscow');
    expect(await screen.findByRole('button', { name: 'Москва, RU' })).toBeTruthy();
  });

  it('can clear the search box', async () => {
    await renderSearch();
    await typeSearch('spring');
    await screen.findByRole('button', { name: SPRINGFIELD_IL });
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByPlaceholderText(SEARCH_BOX).props.value).toBe('');
    expect(screen.getByText('Search for a city or place.')).toBeTruthy();
  });
});

describe('acceptance scenario 2: opening a result shows its weather in its own local time', () => {
  it('remembers the chosen place and returns to the weather screen', async () => {
    const env = await renderSearch();
    await typeSearch('spring');
    await fireEvent.press(await screen.findByRole('button', { name: SPRINGFIELD_IL }));

    await waitFor(() =>
      expect(env.preferencesStore.getState().lastViewedPlaceId).toBe('39.80,-89.64'),
    );
    expect(env.placesStore.getSnapshot().viewed?.name).toBe('Springfield');
    expect(router.back).toHaveBeenCalled();
    // Viewing is not saving.
    expect(env.placesStore.getSnapshot().places).toEqual([]);
  });

  it('then shows that place, with hours and days labelled for its time zone', async () => {
    const env = await renderSearch();
    await typeSearch('spring');
    await fireEvent.press(await screen.findByRole('button', { name: SPRINGFIELD_IL }));
    await waitFor(() =>
      expect(env.preferencesStore.getState().lastViewedPlaceId).toBe('39.80,-89.64'),
    );

    const home = await renderWithProviders(<HomeScreen />, { environment: env });
    expect(await screen.findByText('Springfield')).toBeTruthy();
    await screen.findByTestId('current-temperature');
    const hours = screen
      .getAllByTestId('hourly-row')
      .slice(0, 2)
      .map((row) => (row.props.accessibilityLabel as string).split(',')[0]);
    // 13:00 UTC is 8 AM in Springfield; the same instant is 3 PM in Paris.
    expect(hours).toEqual(['Now', '8 AM']);
    // Weather was fetched for Springfield, not the device location.
    expect(home.fake.calls.getWeather).toBe(1);
    expect(home.fake.calls.reverseGeocode).toBe(0);
    expect(mocked.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('saving places', () => {
  it('saves and unsaves from the result list', async () => {
    const env = await renderSearch();
    await typeSearch('spring');
    await fireEvent.press(await screen.findByRole('button', { name: `Save ${SPRINGFIELD_IL}` }));
    await waitFor(() => expect(env.placesStore.getSnapshot().places).toHaveLength(1));
    expect(env.placesStore.getSnapshot().places[0]).toMatchObject({
      id: '39.80,-89.64',
      name: 'Springfield',
      kind: 'saved',
      sortOrder: 0,
    });

    await fireEvent.press(
      await screen.findByRole('button', { name: `Remove ${SPRINGFIELD_IL} from saved places` }),
    );
    await waitFor(() => expect(env.placesStore.getSnapshot().places).toEqual([]));
  });

  it('keeps saved places, in order, after the app restarts', async () => {
    const first = await buildTestEnvironment({ now: NOW });
    await first.placesStore.add(PARIS);
    await first.placesStore.add(TOKYO);
    await first.placesStore.move(TOKYO.id, 'up');

    // A new process: new stores, same device storage.
    const restarted = await buildTestEnvironment({ now: NOW });
    await renderPlaces(restarted);
    const rows = screen.getAllByTestId('place-row');
    expect(rows.map((row) => row.props.accessibilityLabel as string)).toEqual([
      expect.stringMatching(/^Current location/),
      expect.stringMatching(/^Tokyo, Tokyo, JP/),
      expect.stringMatching(/^Paris, Île-de-France, FR/),
    ]);
  });
});

describe('acceptance scenario 4: nothing found', () => {
  it('says so, with a hint to check the spelling', async () => {
    await renderSearch();
    await typeSearch('zzzzqq');
    expect(await screen.findByText('No places found')).toBeTruthy();
    expect(screen.getByText('Check the spelling, or try a nearby city.')).toBeTruthy();
  });

  it('explains a failed search and lets the user retry', async () => {
    const env = await renderSearch({ scenario: 'offline' });
    await typeSearch('spring');
    expect(await screen.findByText("You're offline")).toBeTruthy();
    env.fake.setScenario('clear-day');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: SPRINGFIELD_IL })).toBeTruthy();
  });
});

describe('search-first when location is denied', () => {
  it('offers to search for a place and opens the search screen', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    await renderWithProviders(<HomeScreen />, { now: NOW });
    await fireEvent.press(await screen.findByRole('button', { name: 'Search for a place' }));
    expect(router.push).toHaveBeenCalledWith('/search');
  });
});

describe('saved places list', () => {
  async function withSaved(...places: ReturnType<typeof makePlace>[]) {
    const env = await buildTestEnvironment({ now: NOW });
    for (const place of places) await env.placesStore.add(place);
    await renderPlaces(env);
    return env;
  }

  const rowLabels = () =>
    screen
      .getAllByTestId('place-row')
      .map((row) => (row.props.accessibilityLabel as string).split(',')[0]);

  it('pins the current location first, then the saved places in order', async () => {
    await withSaved(PARIS, TOKYO, SYDNEY);
    expect(rowLabels()).toEqual(['Current location', 'Paris', 'Tokyo', 'Sydney']);
  });

  it('shows an empty state with a way to search', async () => {
    await withSaved();
    expect(screen.getByText('No saved places yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Search for a place' }));
    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('shows the cached temperature for places that have been viewed', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      weatherQueryKey(TOKYO.id),
      buildSnapshot('clear-day', { placeId: TOKYO.id, timeZone: 'Asia/Tokyo', now: NOW }),
    );
    const env = await buildTestEnvironment({ now: NOW, queryClient });
    await env.placesStore.add(TOKYO);
    await renderPlaces(env);
    const row = screen
      .getAllByTestId('place-row')
      .find((candidate) => /^Tokyo/.test(candidate.props.accessibilityLabel as string));
    expect(row).toBeDefined();
    expect(within(row!).getByText('21°')).toBeTruthy();
  });

  it('opens a saved place and goes back to the weather screen', async () => {
    const env = await withSaved(PARIS, TOKYO);
    await fireEvent.press(screen.getByRole('button', { name: /^Tokyo, Tokyo, JP/ }));
    await waitFor(() => expect(env.preferencesStore.getState().lastViewedPlaceId).toBe(TOKYO.id));
    expect(env.placesStore.getSnapshot().viewed?.name).toBe('Tokyo');
    expect(router.back).toHaveBeenCalled();
  });

  it('switches back to the current location', async () => {
    const env = await buildTestEnvironment({
      now: NOW,
      preferences: { lastViewedPlaceId: TOKYO.id },
    });
    await renderPlaces(env);
    await fireEvent.press(screen.getByRole('button', { name: /^Current location/ }));
    await waitFor(() => expect(env.preferencesStore.getState().lastViewedPlaceId).toBe('current'));
    expect(router.back).toHaveBeenCalled();
  });

  it('hides editing controls until Edit is pressed, and never offers them for the current location', async () => {
    await withSaved(PARIS, TOKYO);
    expect(screen.queryByRole('button', { name: 'Remove Paris' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Remove Paris' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remove Current location/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('button', { name: 'Remove Paris' })).toBeNull();
  });

  it('reorders with accessible move up and move down controls', async () => {
    const env = await withSaved(PARIS, TOKYO, SYDNEY);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Move Sydney up' }));
    await waitFor(() =>
      expect(rowLabels()).toEqual(['Current location', 'Paris', 'Sydney', 'Tokyo']),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Move Paris down' }));
    await waitFor(() =>
      expect(rowLabels()).toEqual(['Current location', 'Sydney', 'Paris', 'Tokyo']),
    );
    expect(env.placesStore.getSnapshot().places.map((p) => p.name)).toEqual([
      'Sydney',
      'Paris',
      'Tokyo',
    ]);
  });

  it('disables moving the first place up and the last place down', async () => {
    await withSaved(PARIS, TOKYO);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    expect(
      screen.getByRole('button', { name: 'Move Paris up' }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Move Tokyo down' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('removes a place', async () => {
    const env = await withSaved(PARIS, TOKYO);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Tokyo' }));
    await waitFor(() => expect(rowLabels()).toEqual(['Current location', 'Paris']));
    expect(env.placesStore.getSnapshot().places.map((p) => p.name)).toEqual(['Paris']);
  });

  it('renders 20 or more places in a virtualized list', async () => {
    const places = Array.from({ length: 25 }, (_, i) =>
      makePlace({ name: `City ${i}`, lat: -60 + i * 2, lon: -150 + i * 10 }),
    );
    await withSaved(...places);
    const rendered = screen.getAllByTestId('place-row').length;
    expect(rendered).toBeGreaterThanOrEqual(5);
    expect(rendered).toBeLessThan(places.length + 1);
  });
});
