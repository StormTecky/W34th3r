import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from './tokens';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Animated style that dips in opacity and recovers whenever `signature` changes, so updated content
 * reads as a transition rather than a jump. Does nothing when the OS asks for reduced motion.
 */
export function useFadeOnChange(signature: string) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = 0.4;
    opacity.value = withTiming(1, { duration: motion.base });
  }, [signature, reducedMotion, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
