import { act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

type Animatable = { props: Record<string, unknown> };

/** The style Reanimated is currently applying to an element (shared values resolved). */
export function animatedStyle(element: Animatable) {
  // Reanimated types this helper from its web stub (no argument, no result); under Jest it takes
  // the rendered element and returns its current style.
  const read = getAnimatedStyle as unknown as (element: Animatable) => {
    opacity?: number;
    transform?: Record<string, number>[];
  };
  return read(element);
}

/** The `scale`, `translateY` etc. in an element's animated transform; 1 or 0 when absent. */
export function transformOf(
  element: Animatable,
  key: 'scale' | 'translateX' | 'translateY' | 'rotate',
): number {
  const entry = animatedStyle(element).transform?.find((item) => key in item);
  const value: number | string | undefined = entry?.[key];
  // Rotations are written as "12deg".
  if (typeof value === 'string') return parseFloat(value);
  return value ?? (key === 'scale' ? 1 : 0);
}

/** Moves the fake clock forward so running springs and timings advance. */
export async function advance(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

/** Sets the OS "reduce motion" answer; call before rendering, restore mocks after each test. */
export function mockReducedMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
}

/** Lets components finish reading async OS settings such as reduce motion. */
export async function flush() {
  await act(async () => undefined);
}

/** Time for any of the app's springs to come to rest. */
export const SETTLE_MS = 3000;
