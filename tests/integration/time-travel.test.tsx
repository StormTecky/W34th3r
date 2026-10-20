import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AccessibilityInfo } from 'react-native';

import { buildSnapshot } from '@/providers/fake/scenarios';

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
/** 14:20 in Paris (UTC+2). The fake sun rose 4 hours ago and sets 8 hours from now. */
const NOW = Math.floor(Date.parse('2026-10-20T12:20:00Z') / 1000);
const snapshot = (scenario: Parameters<typeof buildSnapshot>[0] = 'clear-day') =>
  buildSnapshot(scenario, { placeId: 'current', timeZone: 'Europe/Paris', now: NOW });

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
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

async function renderHome(options: Parameters<typeof renderWithProviders>[1] = {}) {
  const view = await renderWithProviders(<HomeScreen />, { now: NOW, ...options });
  await screen.findByTestId('current-temperature');
  return view;
}

const bar = () => screen.getByTestId('scrub-bar');
const temperature = () => screen.getByTestId('current-temperature').props.children as string;
const theme = () => screen.getByTestId('condition-background').props.nativeID as string;
const step = async (name: 'increment' | 'decrement', times = 1) => {
  for (let i = 0; i < times; i++) {
    await fireEvent(bar(), 'accessibilityAction', { nativeEvent: { actionName: name } });
  }
};
const layout = async () =>
  fireEvent(bar(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 230, height: 48 } } });

describe('the bar on the weather screen', () => {
  it('appears once the weather has loaded, set to now', async () => {
    await renderHome();
    expect(bar().props.accessibilityValue).toEqual({ text: 'Now' });
    expect(screen.getAllByTestId('scrub-tick')).toHaveLength(24);
  });

  it('is not shown while there is no weather', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    } as never);
    await renderWithProviders(<HomeScreen />, { now: NOW });
    await screen.findByText('Location is off');
    expect(screen.queryByTestId('scrub-bar')).toBeNull();
  });

  it('is not shown for an error with nothing cached', async () => {
    await renderWithProviders(<HomeScreen />, { now: NOW, scenario: 'offline' });
    await screen.findByText("You're offline");
    expect(screen.queryByTestId('scrub-bar')).toBeNull();
  });
});

describe('travelling in time', () => {
  it('shows the temperature of the chosen hour instead of the current one', async () => {
    await renderHome();
    expect(temperature()).toBe('21°');
    await step('increment');
    expect(temperature()).toBe(`${Math.round(snapshot().hourly[1]!.temperature)}°`);
    await step('increment', 8);
    expect(temperature()).toBe(`${Math.round(snapshot().hourly[9]!.temperature)}°`);
  });

  it('names the moment with its day and local time, and drops the "feels like" chip', async () => {
    await renderHome();
    expect(screen.getByText('Feels like 21°')).toBeTruthy();
    await step('increment');
    expect(screen.getByText('Today 3 PM')).toBeTruthy();
    expect(screen.queryByText(/Feels like/)).toBeNull();
    await step('increment', 8);
    expect(screen.getByText('Today 11 PM')).toBeTruthy();
    await step('increment', 1);
    expect(screen.getByText('Tomorrow 12 AM')).toBeTruthy();
  });

  it('moves the sky from day to night as the hours pass the sunset', async () => {
    await renderHome();
    expect(theme()).toBe('clear-day');
    await step('increment', 9); // the fake sun sets 8 hours from now
    expect(theme()).toBe('clear-night');
  });

  it('changes the one-liner with the moment', async () => {
    await renderHome();
    expect(screen.getByText("Sun's out. Go play!")).toBeTruthy();
    await step('increment', 9);
    expect(screen.getByText('Clear skies. Look up!')).toBeTruthy();
  });

  it('shows the chance of rain for a wet hour', async () => {
    await renderHome({ scenario: 'rain-day' });
    await step('increment');
    expect(screen.getByText(/^Rain chance \d+%$/)).toBeTruthy();
  });

  it('shows no rain chip for a dry hour', async () => {
    await renderHome({ scenario: 'clear-day' });
    await step('increment');
    expect(screen.queryByText(/Rain chance/)).toBeNull();
  });

  it('follows the preferred temperature unit', async () => {
    await renderHome({ regionCode: 'US' });
    await step('increment');
    const celsius = snapshot().hourly[1]!.temperature;
    expect(temperature()).toBe(`${Math.round((celsius * 9) / 5 + 32)}°`);
  });

  it('describes the moment in one sentence for screen readers', async () => {
    await renderHome();
    await step('increment');
    const hour = Math.round(snapshot().hourly[1]!.temperature);
    expect(
      screen.getByLabelText(new RegExp(`^Paris\\. ${hour} degrees\\. Clear sky\\. Today 3 PM`)),
    ).toBeTruthy();
  });

  it('keeps the forecast sections in place while scrubbing', async () => {
    await renderHome();
    await step('increment', 3);
    expect(screen.getAllByTestId('hourly-row')).toHaveLength(24);
    expect(screen.getAllByTestId('daily-row')).toHaveLength(7);
  });
});

describe('dragging', () => {
  it('jumps to the hour under the finger', async () => {
    await renderHome();
    await layout();
    await fireEvent(bar(), 'responderGrant', { nativeEvent: { locationX: 230 } });
    expect(temperature()).toBe(`${Math.round(snapshot().hourly[23]!.temperature)}°`);
    expect(screen.getByText(/^Tomorrow /)).toBeTruthy();
    await fireEvent(bar(), 'responderMove', { nativeEvent: { locationX: 0 } });
    expect(temperature()).toBe('21°');
  });
});

describe('coming back', () => {
  it('returns to the live conditions with the "Back to now" button', async () => {
    await renderHome();
    await step('increment', 10);
    expect(theme()).toBe('clear-night');
    await fireEvent.press(screen.getByRole('button', { name: 'Back to now' }));
    expect(temperature()).toBe('21°');
    expect(theme()).toBe('clear-day');
    expect(screen.getByText('Feels like 21°')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to now' })).toBeNull();
  });

  it('stays on the chosen hour after a refresh brings new data', async () => {
    const view = await renderHome();
    await step('increment', 3);
    await act(async () => {
      await view.queryClient.invalidateQueries({ queryKey: ['weather'] });
    });
    await waitFor(() => expect(view.fake.calls.getWeather).toBe(2));
    expect(bar().props.accessibilityValue.text).toBe('Today 5 PM');
  });

  it('starts at now again on the next visit', async () => {
    const env = await buildTestEnvironment({ now: NOW });
    const first = await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');
    await step('increment', 4);
    await first.unmount();
    await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');
    expect(bar().props.accessibilityValue).toEqual({ text: 'Now' });
  });
});

describe('with reduced motion', () => {
  it('still works, just without animated movement', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderHome();
    await act(async () => undefined);
    await step('increment', 2);
    expect(bar().props.accessibilityValue.text).toBe('Today 4 PM');
  });
});
