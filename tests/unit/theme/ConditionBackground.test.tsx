import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { CONDITION_CATEGORIES } from '@/domain/types';
import { ConditionBackground } from '@/theme/ConditionBackground';
import { getTheme } from '@/theme/theme-engine';

/** The art layer is intentionally hidden from assistive tech, so queries must opt in to see it. */
const HIDDEN = { includeHiddenElements: true };

function mockReducedMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
}

afterEach(() => jest.restoreAllMocks());

describe('static background (reduced motion on)', () => {
  const PAIRS = CONDITION_CATEGORIES.flatMap((condition) =>
    [true, false].map((isDay) => [condition, isDay] as const),
  );

  it.each(PAIRS)('%s (day: %s) matches its snapshot', async (condition, isDay) => {
    mockReducedMotion(true);
    await render(<ConditionBackground condition={condition} isDay={isDay} />);
    await act(async () => undefined);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('never mounts an ambient effect', async () => {
    mockReducedMotion(true);
    await render(<ConditionBackground condition="rain" isDay={false} />);
    await act(async () => undefined);
    expect(screen.queryByTestId('ambient-effect-rain', HIDDEN)).toBeNull();
  });
});

describe('animated background (reduced motion off)', () => {
  it.each([
    ['rain', 'rain'],
    ['thunderstorm', 'rain'],
    ['snow', 'snow'],
    ['cloudy', 'clouds'],
    ['mist-fog', 'fog'],
  ] as const)('%s mounts the %s effect', async (condition, kind) => {
    mockReducedMotion(false);
    await render(<ConditionBackground condition={condition} isDay />);
    await act(async () => undefined);
    expect(screen.getByTestId(`ambient-effect-${kind}`, HIDDEN)).toBeTruthy();
  });

  it('mounts no effect for clear weather', async () => {
    mockReducedMotion(false);
    await render(<ConditionBackground condition="clear" isDay />);
    await act(async () => undefined);
    expect(screen.queryByTestId(/ambient-effect/, HIDDEN)).toBeNull();
  });

  it('removes the effect when the user turns reduced motion on', async () => {
    let enabled = false;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(async () => enabled);
    let listener: (value: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, handler) => {
      listener = handler as (value: boolean) => void;
      return { remove: jest.fn() } as never;
    });
    await render(<ConditionBackground condition="snow" isDay />);
    await act(async () => undefined);
    expect(screen.getByTestId('ambient-effect-snow', HIDDEN)).toBeTruthy();
    enabled = true;
    await act(async () => listener(true));
    expect(screen.queryByTestId('ambient-effect-snow', HIDDEN)).toBeNull();
  });
});

describe('theme identity and content', () => {
  it('exposes the theme key so tests and tooling can tell themes apart', async () => {
    mockReducedMotion(true);
    await render(<ConditionBackground condition="rain" isDay={false} />);
    expect(screen.getByTestId('condition-background').props.nativeID).toBe(
      getTheme('rain', false).key,
    );
  });

  it('renders children on top of the background', async () => {
    mockReducedMotion(true);
    await render(
      <ConditionBackground condition="clear" isDay>
        <Text>Hello</Text>
      </ConditionBackground>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('keeps the decorative layers out of the accessibility tree', async () => {
    mockReducedMotion(true);
    await render(<ConditionBackground condition="clear" isDay />);
    expect(
      screen.getByTestId('condition-background-art', HIDDEN).props.importantForAccessibility,
    ).toBe('no-hide-descendants');
  });

  it('switches theme when the condition changes', async () => {
    mockReducedMotion(true);
    const { rerender } = await render(<ConditionBackground condition="clear" isDay />);
    await rerender(<ConditionBackground condition="snow" isDay />);
    expect(screen.getByTestId('condition-background').props.nativeID).toBe('snow-day');
  });
});
