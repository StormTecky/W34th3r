import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '../use-reduced-motion';

export type MotionKind = 'float' | 'drift' | 'spin' | 'fall' | 'pulse';

export interface MotionSpec {
  kind: MotionKind;
  /** Length of one cycle in milliseconds. */
  duration: number;
  /** Start offset, so layers are never in lockstep. */
  delay?: number;
}

interface MotionProps {
  motion?: MotionSpec;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Whether a kind plays back and forth (true) or restarts from the beginning (false). */
const REVERSES: Record<MotionKind, boolean> = {
  float: true,
  drift: true,
  pulse: true,
  spin: false,
  fall: false,
};

/** Every kind starts at rest (progress 0), so a still scene is simply the first frame. */
function frame(kind: MotionKind, progress: number) {
  'worklet';
  switch (kind) {
    case 'float':
      return { transform: [{ translateY: interpolate(progress, [0, 1], [0, -10]) }] };
    case 'drift':
      return { transform: [{ translateX: interpolate(progress, [0, 1], [0, 18]) }] };
    case 'spin':
      return { transform: [{ rotate: `${progress * 360}deg` }] };
    case 'fall':
      return {
        opacity: interpolate(progress, [0, 0.7, 1], [1, 1, 0]),
        transform: [{ translateY: interpolate(progress, [0, 1], [0, 26]) }],
      };
    default:
      return { opacity: interpolate(progress, [0, 1], [1, 0.35]) };
  }
}

/** Gently animates its child: bobbing, drifting, spinning, falling or pulsing. Still when asked. */
export function Motion({ motion, style, children }: MotionProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const kind = motion?.kind ?? 'float';
  const duration = motion?.duration ?? 1000;
  const delay = motion?.delay ?? 0;
  const animated = motion !== undefined && !reducedMotion;

  useEffect(() => {
    if (!animated) return;
    const easing = REVERSES[kind] ? Easing.inOut(Easing.sin) : Easing.linear;
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing }), -1, REVERSES[kind]),
    );
  }, [animated, kind, duration, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => frame(kind, progress.value));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
