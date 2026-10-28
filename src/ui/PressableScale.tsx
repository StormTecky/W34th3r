import { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, opacity } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed; wide controls pass `motion.pressedScaleWide`. */
  scaleTo?: number;
}

/**
 * A Pressable that shrinks under the finger and springs back with a small bounce. It also dims
 * while pressed, and when disabled. With reduced motion on it only dims, so a press still shows.
 */
export function PressableScale({
  style,
  disabled,
  scaleTo = motion.pressedScale,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(disabled ? opacity.disabled : 1);

  useEffect(() => {
    dim.value = disabled ? opacity.disabled : 1;
  }, [disabled, dim]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!reducedMotion) scale.set(withSpring(scaleTo, motion.spring.press));
        dim.set(withTiming(opacity.pressed, { duration: motion.fast }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reducedMotion) scale.set(withSpring(1, motion.spring.press));
        dim.set(withTiming(1, { duration: motion.fast }));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
