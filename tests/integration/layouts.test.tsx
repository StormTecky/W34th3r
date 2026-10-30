import { screen, waitFor, within } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { StyleSheet } from 'react-native';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SearchScreen from '../../app/search';
import SettingsScreen from '../../app/settings';
import { layout, spacing } from '@/theme/tokens';
import { renderWithProviders } from '../helpers/render';
import { PHONE_LANDSCAPE, setWindowSize, TABLET } from '../helpers/screen-size';

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
/** A phone on its side with the notch on the left. */
const NOTCH = { left: 47, right: 47, top: 0, bottom: 21 };

type Element = ReturnType<typeof screen.getByTestId>;
const styleOf = (element: Element) => StyleSheet.flatten(element.props.style) ?? {};
const contentStyleOf = (element: Element) =>
  StyleSheet.flatten(element.props.contentContainerStyle) ?? {};

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

async function renderHome(options: Parameters<typeof renderWithProviders>[1] = {}) {
  await renderWithProviders(<HomeScreen />, { now: nowSeconds(), ...options });
  await waitFor(() => expect(screen.getByTestId('current-temperature')).toBeTruthy());
}

describe('Home', () => {
  it('stacks the conditions above the forecast on a phone held upright', async () => {
    await renderHome();
    expect(styleOf(screen.getByTestId('home-columns')).flexDirection).not.toBe('row');
  });

  it.each([
    ['a tablet', TABLET],
    ['a phone on its side', PHONE_LANDSCAPE],
  ])('puts the conditions beside the forecast on %s', async (_, size) => {
    setWindowSize(size);
    await renderHome();
    expect(styleOf(screen.getByTestId('home-columns')).flexDirection).toBe('row');
    const hero = screen.getByTestId('home-hero');
    const forecast = screen.getByTestId('home-forecast');
    expect(within(hero).getByTestId('current-temperature')).toBeTruthy();
    expect(within(forecast).getAllByTestId('hourly-row').length).toBeGreaterThan(0);
    expect(within(forecast).getAllByTestId('daily-row').length).toBeGreaterThan(0);
  });

  it('keeps the content and buttons clear of a notch on the side', async () => {
    setWindowSize(PHONE_LANDSCAPE);
    await renderHome({ insets: NOTCH });
    const content = contentStyleOf(screen.getByTestId('home-scroll'));
    expect(content.paddingLeft).toBe(NOTCH.left + spacing.lg);
    expect(content.paddingRight).toBe(NOTCH.right + spacing.lg);
    expect(styleOf(screen.getByTestId('home-nav')).paddingLeft).toBe(NOTCH.left + spacing.sm);
    expect(styleOf(screen.getByTestId('home-scrubber')).left).toBe(NOTCH.left + spacing.lg);
  });

  it('caps the content width on a large tablet', async () => {
    setWindowSize({ width: 1366, height: 1024 });
    await renderHome();
    expect(contentStyleOf(screen.getByTestId('home-scroll')).maxWidth).toBe(layout.maxWidth);
  });
});

describe('Details', () => {
  async function renderDetails() {
    await renderWithProviders(<DetailsScreen />, { now: nowSeconds() });
    await waitFor(() => expect(screen.getAllByTestId('detail-tile').length).toBe(6));
  }
  const basis = () => screen.getAllByTestId('detail-tile').map((t) => styleOf(t).flexBasis);

  it('shows two tiles per row on a phone', async () => {
    await renderDetails();
    expect(basis()).toEqual(['47%', '47%', '47%', '47%', '47%', '100%']);
  });

  it('shows three tiles per row on a wide screen, the sun arc still across the whole row', async () => {
    setWindowSize(TABLET);
    await renderDetails();
    expect(basis()).toEqual(['30%', '30%', '30%', '30%', '30%', '100%']);
  });

  it('keeps the tiles clear of a notch on the side', async () => {
    setWindowSize(PHONE_LANDSCAPE);
    await renderWithProviders(<DetailsScreen />, { now: nowSeconds(), insets: NOTCH });
    const content = contentStyleOf(screen.getByTestId('details-scroll'));
    expect(content.paddingLeft).toBe(NOTCH.left + spacing.lg);
    expect(content.paddingRight).toBe(NOTCH.right + spacing.lg);
  });
});

describe.each([
  ['Saved places', 'places-screen', <PlacesScreen key="places" />],
  ['Search', 'search-screen', <SearchScreen key="search" />],
  ['Settings', 'settings-screen', <SettingsScreen key="settings" />],
])('%s', (_, testID, ui) => {
  it('keeps its content at a readable width, centred', async () => {
    setWindowSize(TABLET);
    await renderWithProviders(ui, { now: nowSeconds() });
    const column = within(screen.getByTestId(testID)).getByTestId('readable-column');
    expect(styleOf(column)).toMatchObject({ maxWidth: layout.readableWidth, alignSelf: 'center' });
  });

  it('keeps its content clear of a notch on the side', async () => {
    setWindowSize(PHONE_LANDSCAPE);
    await renderWithProviders(ui, { now: nowSeconds(), insets: NOTCH });
    expect(styleOf(screen.getByTestId(testID))).toMatchObject({
      paddingLeft: NOTCH.left + spacing.lg,
      paddingRight: NOTCH.right + spacing.lg,
    });
  });
});
