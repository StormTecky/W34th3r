import { useEffect } from 'react';
import type { ViewProps } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

export interface EnterViewProps extends ViewProps {
  /** Position in a group entering together; each step waits a little longer. */
  order?: number;
}

/**
 * A view that fades in and rises into place with a soft bounce when it first appears. With reduced
 * motion on it is simply there, never hidden.
 */
export function EnterView({ order = 0, style, ...rest }: EnterViewProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) progress.value = 1;
    else if (progress.value === 0) {
      progress.value = withDelay(order * motion.enterStagger, withSpring(1, motion.spring.enter));
    }
  }, [reducedMotion, order, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    // The spring overshoots 1, so the view rises a touch past its place before settling.
    transform: [{ translateY: (1 - progress.value) * motion.enterRise }],
  }));

  return <Animated.View {...rest} style={[style, animatedStyle]} />;
}
