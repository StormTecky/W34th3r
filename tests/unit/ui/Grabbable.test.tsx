import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { motion } from '@/theme/tokens';
import { Grabbable } from '@/ui/Grabbable';

import { advance, flush, mockReducedMotion, SETTLE_MS, transformOf } from '../../helpers/motion';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const view = () => screen.getByTestId('grab');
const START = { pageX: 200, pageY: 300 };

async function renderGrabbable() {
  await render(
    <Grabbable testID="grab">
      <Text>15°</Text>
    </Grabbable>,
  );
  await flush();
}

/** Puts the pointer down on the element and drags it by (x, y), still holding it. */
async function drag(x: number, y: number) {
  if (!view().props.onStartShouldSetResponder()) return;
  await fireEvent(view(), 'responderGrant', { nativeEvent: START });
  await fireEvent(view(), 'responderMove', {
    nativeEvent: { pageX: START.pageX + x, pageY: START.pageY + y },
  });
  await advance(SETTLE_MS);
}

const letGo = () => fireEvent(view(), 'responderRelease', { nativeEvent: START });

describe('with motion allowed', () => {
  beforeEach(() => mockReducedMotion(false));

  it('rests in place, upright, at its size', async () => {
    await renderGrabbable();
    expect(screen.getByText('15°')).toBeTruthy();
    expect(transformOf(view(), 'translateX')).toBe(0);
    expect(transformOf(view(), 'translateY')).toBe(0);
    expect(transformOf(view(), 'rotate')).toBe(0);
    expect(transformOf(view(), 'scale')).toBe(1);
  });

  it('follows the pointer in every direction while held, lifted a little', async () => {
    await renderGrabbable();
    await drag(-80, 60);
    expect(transformOf(view(), 'translateX')).toBe(-80);
    expect(transformOf(view(), 'translateY')).toBe(60);
    expect(transformOf(view(), 'scale')).toBeCloseTo(motion.popScale, 2);
  });

  it('turns with the sideways drag: right is clockwise, left is anticlockwise', async () => {
    await renderGrabbable();
    await drag(100, 0);
    expect(transformOf(view(), 'rotate')).toBeCloseTo(100 * motion.grabTilt, 5);
    await drag(-100, 0);
    expect(transformOf(view(), 'rotate')).toBeCloseTo(-100 * motion.grabTilt, 5);
  });

  it('keeps hold when a scroll view asks for the touch', async () => {
    await renderGrabbable();
    expect(view().props.onResponderTerminationRequest()).toBe(false);
  });

  it('springs back home when let go, overshooting a little on the way', async () => {
    await renderGrabbable();
    await drag(120, -40);
    await letGo();
    let lowest = 120;
    for (let elapsed = 0; elapsed < SETTLE_MS; elapsed += 16) {
      await advance(16);
      lowest = Math.min(lowest, transformOf(view(), 'translateX'));
    }
    expect(lowest).toBeLessThan(0);
    expect(transformOf(view(), 'translateX')).toBeCloseTo(0, 1);
    expect(transformOf(view(), 'translateY')).toBeCloseTo(0, 1);
    expect(transformOf(view(), 'rotate')).toBeCloseTo(0, 1);
    expect(transformOf(view(), 'scale')).toBeCloseTo(1, 2);
  });

  it('also springs back when the system takes the touch away', async () => {
    await renderGrabbable();
    await drag(50, 50);
    await fireEvent(view(), 'responderTerminate', { nativeEvent: START });
    await advance(SETTLE_MS);
    expect(transformOf(view(), 'translateX')).toBeCloseTo(0, 1);
  });
});

describe('with reduced motion', () => {
  beforeEach(() => mockReducedMotion(true));

  it('cannot be grabbed and stays in place', async () => {
    await renderGrabbable();
    expect(view().props.onStartShouldSetResponder()).toBe(false);
    expect(view().props.onMoveShouldSetResponder()).toBe(false);
    await drag(100, 50);
    expect(transformOf(view(), 'translateX')).toBe(0);
    expect(transformOf(view(), 'rotate')).toBe(0);
  });
});
