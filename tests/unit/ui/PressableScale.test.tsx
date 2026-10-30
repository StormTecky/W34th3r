import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { motion, opacity } from '@/theme/tokens';
import { PressableScale } from '@/ui/PressableScale';

import {
  advance,
  animatedStyle,
  flush,
  mockReducedMotion,
  SETTLE_MS,
  transformOf,
} from '../../helpers/motion';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderButton(props: { disabled?: boolean; onPress?: () => void } = {}) {
  await render(
    <PressableScale accessibilityRole="button" accessibilityLabel="Go" {...props}>
      <Text>Go</Text>
    </PressableScale>,
  );
  await flush();
  return screen.getByRole('button', { name: 'Go' });
}

describe('with motion allowed', () => {
  beforeEach(() => mockReducedMotion(false));

  it('rests at full size and opacity', async () => {
    const button = await renderButton();
    expect(transformOf(button, 'scale')).toBe(1);
    expect(animatedStyle(button).opacity).toBe(1);
  });

  it('shrinks and dims while pressed', async () => {
    const button = await renderButton();
    await fireEvent(button, 'pressIn');
    await advance(SETTLE_MS);
    expect(transformOf(button, 'scale')).toBeCloseTo(motion.pressedScale, 1);
    expect(animatedStyle(button).opacity).toBeCloseTo(opacity.pressed, 2);
  });

  it('shrinks to the scale it is given, for wide controls', async () => {
    await render(
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Row"
        scaleTo={motion.pressedScaleWide}
      >
        <Text>Row</Text>
      </PressableScale>,
    );
    await flush();
    const row = screen.getByRole('button', { name: 'Row' });
    await fireEvent(row, 'pressIn');
    await advance(SETTLE_MS);
    expect(transformOf(row, 'scale')).toBeCloseTo(motion.pressedScaleWide, 2);
  });

  it('springs back past its size on release, then settles at 1', async () => {
    const button = await renderButton();
    await fireEvent(button, 'pressIn');
    await advance(SETTLE_MS);
    await fireEvent(button, 'pressOut');

    // A spring with overshoot crosses 1 on its way back: that is the bounce.
    let peak = 0;
    for (let elapsed = 0; elapsed < SETTLE_MS; elapsed += 16) {
      await advance(16);
      peak = Math.max(peak, transformOf(button, 'scale'));
    }
    expect(peak).toBeGreaterThan(1);
    expect(transformOf(button, 'scale')).toBeCloseTo(1, 2);
    expect(animatedStyle(button).opacity).toBeCloseTo(1, 2);
  });

  it('still calls onPress and keeps its role and name', async () => {
    const onPress = jest.fn();
    const button = await renderButton({ onPress });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('is dimmed, and does not respond, when disabled', async () => {
    const onPress = jest.fn();
    const button = await renderButton({ disabled: true, onPress });
    expect(animatedStyle(button).opacity).toBe(opacity.disabled);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('with reduced motion', () => {
  beforeEach(() => mockReducedMotion(true));

  it('never changes size, but still dims so a press is visible', async () => {
    const button = await renderButton();
    await fireEvent(button, 'pressIn');
    await advance(SETTLE_MS);
    expect(transformOf(button, 'scale')).toBe(1);
    expect(animatedStyle(button).opacity).toBeCloseTo(opacity.pressed, 2);
  });
});
