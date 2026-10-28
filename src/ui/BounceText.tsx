import { useEffect, useRef } from 'react';
import type { TextProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

export interface BounceTextProps extends TextProps {
  children: string;
}

/**
 * Text that pops a little larger and springs back whenever its value changes, so a new number
 * feels like it landed. It stays still on first appearance and when motion is reduced.
 */
export function BounceText({ children, style, ...rest }: BounceTextProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(children);

  useEffect(() => {
    if (previous.current === children) return;
    previous.current = children;
    if (reducedMotion) return;
    scale.value = motion.popScale;
    scale.value = withSpring(1, motion.spring.pop);
  }, [children, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.Text {...rest} style={[style, animatedStyle]}>
      {children}
    </Animated.Text>
  );
}
