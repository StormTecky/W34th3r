import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { useReducedMotion } from '@/theme/use-reduced-motion';
import { motion, radii } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Fill colour; defaults to the app palette's border colour. */
  color?: string;
}

/** Loading placeholder. Pulses gently, or stays static when the OS asks for reduced motion. */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, color }: SkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: motion.slow, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: motion.slow, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { width, height, borderRadius: radius, backgroundColor: color ?? colors.border, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({ block: { overflow: 'hidden' } });
