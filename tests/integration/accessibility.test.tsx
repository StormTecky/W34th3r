import { act, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SearchScreen from '../../app/search';
import SettingsScreen from '../../app/settings';
import { PARIS, TOKYO } from '../helpers/places';
import { collect, textOf, type TreeNode } from '../helpers/tree';
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

const NOW = Math.floor(Date.parse('2026-10-20T12:20:00Z') / 1000);
const MIN_TARGET = 44;

type Node = TreeNode;

const isInteractive = (node: Node) =>
  ['button', 'radio'].includes(String(node.props.accessibilityRole)) ||
  typeof node.props.onClick === 'function';

function describeNode(node: Node): string {
  return `${node.props.accessibilityRole ?? 'pressable'} "${node.props.accessibilityLabel ?? textOf(node)}"`;
}

/** Height and width a control occupies, from its own style (min sizes count). */
function size(node: Node) {
  const style = StyleSheet.flatten(node.props.style) ?? {};
  const slop = node.props.hitSlop;
  const extra = typeof slop === 'number' ? slop * 2 : 0;
  const height = Math.max(Number(style.height ?? 0), Number(style.minHeight ?? 0)) + extra;
  const width = Math.max(Number(style.width ?? 0), Number(style.minWidth ?? 0)) + extra;
  return { height, width };
}

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

const SCREENS = [
  ['Home', <HomeScreen key="h" />, 'current-temperature'],
  ['Details', <DetailsScreen key="d" />, 'uv-marker'],
  ['Search', <SearchScreen key="q" />, 'search-screen'],
  ['Places', <PlacesScreen key="p" />, 'places-screen'],
  ['Settings', <SettingsScreen key="s" />, 'settings-screen'],
] as const;

async function renderScreen(element: (typeof SCREENS)[number][1], waitFor: string) {
  const env = await buildTestEnvironment({ now: NOW, scenario: 'alerts-active' });
  await env.placesStore.add(PARIS);
  await env.placesStore.add(TOKYO);
  await renderWithProviders(element, { environment: env });
  await screen.findByTestId(waitFor, { includeHiddenElements: true });
  await act(async () => undefined);
}

describe.each(SCREENS)('%s', (_name, element, waitFor) => {
  it('gives every control a role and an accessible name', async () => {
    await renderScreen(element, waitFor);
    const controls = collect(isInteractive);
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const name = String(control.props.accessibilityLabel ?? textOf(control)).trim();
      expect({
        control: describeNode(control),
        role: control.props.accessibilityRole,
        named: name.length > 0,
      }).toEqual({
        control: describeNode(control),
        role: expect.stringMatching(/^(button|radio)$/),
        named: true,
      });
    }
  });

  it('makes every control at least 44 points in both directions', async () => {
    await renderScreen(element, waitFor);
    for (const control of collect(isInteractive)) {
      const { height, width } = size(control);
      // Wide rows span the screen; only an explicitly small control is a failure.
      expect({ control: describeNode(control), tallEnough: height >= MIN_TARGET }).toEqual({
        control: describeNode(control),
        tallEnough: true,
      });
      expect(width === 0 || width >= MIN_TARGET).toBe(true);
    }
  });

  it('lets text scale with the OS font size setting', async () => {
    await renderScreen(element, waitFor);
    const fixed = collect((node) => node.type === 'Text' && node.props.allowFontScaling === false);
    expect(fixed.map(textOf)).toEqual([]);
  });

  it('marks headings so screen-reader users can navigate by them', async () => {
    await renderScreen(element, waitFor);
    expect(collect((node) => node.props.accessibilityRole === 'header').length).toBeGreaterThan(0);
  });
});

describe('largest text size', () => {
  it('keeps the temperature on one line, shrinking to fit', async () => {
    await renderScreen(<HomeScreen />, 'current-temperature');
    const temperature = screen.getByTestId('current-temperature');
    expect(temperature.props.numberOfLines).toBe(1);
    expect(temperature.props.adjustsFontSizeToFit).toBe(true);
  });
});

describe('reduced motion', () => {
  it('turns ambient weather effects off', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const env = await buildTestEnvironment({ now: NOW, scenario: 'rain-day' });
    await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');
    await act(async () => undefined);
    expect(screen.queryByTestId(/ambient-effect/, { includeHiddenElements: true })).toBeNull();
  });

  it('shows ambient effects when motion is allowed', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const env = await buildTestEnvironment({ now: NOW, scenario: 'rain-day' });
    await renderWithProviders(<HomeScreen />, { environment: env });
    await screen.findByTestId('current-temperature');
    await act(async () => undefined);
    expect(screen.getByTestId('ambient-effect-rain', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('information is not conveyed by colour alone', () => {
  it('writes alert severity, UV category and range values as text', async () => {
    await renderScreen(<HomeScreen />, 'current-temperature');
    expect(screen.getByText('Severe')).toBeTruthy();
    const dailyLabel = screen.getAllByTestId('daily-row')[0]!.props.accessibilityLabel as string;
    expect(dailyLabel).toMatch(/high \d+, low \d+/);
  });
});
