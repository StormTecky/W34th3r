import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeParticles, particleCount, type Particle } from './particles';

export interface RainEffectProps {
  /** 0..1; more intense rain has more, faster drops. */
  intensity: number;
  color: string;
}

const MIN_DROPS = 18;
const MAX_DROPS = 70;
const SEED = 11;

interface DropProps {
  particle: Particle;
  height: number;
  width: number;
  color: string;
}

function Drop({ particle, height, width, color }: DropProps) {
  const progress = useSharedValue(0);
  const duration = 650 + (1 - particle.speed) * 800;

  useEffect(() => {
    progress.value = withDelay(
      particle.delay * duration,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [progress, duration, particle.delay]);

  const length = 14 + particle.size * 18;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-length, height + length]) },
      { translateX: interpolate(progress.value, [0, 1], [0, -height * 0.1]) },
      { rotate: '10deg' },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: particle.x * width,
          height: length,
          opacity: 0.25 + particle.opacity * 0.45,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Falling rain drops, driven entirely on the UI thread. */
export function RainEffect({ intensity, color }: RainEffectProps) {
  const { width, height } = useWindowDimensions();
  const count = particleCount(intensity, MIN_DROPS, MAX_DROPS);
  const drops = useMemo(() => makeParticles(count, SEED), [count]);

  return (
    <View testID="ambient-effect-rain" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((particle, index) => (
        <Drop key={index} particle={particle} width={width} height={height} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', top: 0, width: 1.5, borderRadius: 1 },
});
