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

export interface SnowEffectProps {
  /** 0..1; more intense snow has more flakes. */
  intensity: number;
  color: string;
}

const MIN_FLAKES = 14;
const MAX_FLAKES = 48;
const SEED = 23;

interface FlakeProps {
  particle: Particle;
  height: number;
  width: number;
  color: string;
}

function Flake({ particle, height, width, color }: FlakeProps) {
  const progress = useSharedValue(0);
  const duration = 5000 + (1 - particle.speed) * 6000;
  const size = 3 + particle.size * 6;
  const sway = 10 + particle.size * 22;

  useEffect(() => {
    progress.value = withDelay(
      particle.delay * duration,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [progress, duration, particle.delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-size, height + size]) },
      { translateX: Math.sin(progress.value * Math.PI * 4 + particle.x * 10) * sway },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.flake,
        {
          left: particle.x * width,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.35 + particle.opacity * 0.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Gently drifting snowflakes. */
export function SnowEffect({ intensity, color }: SnowEffectProps) {
  const { width, height } = useWindowDimensions();
  const count = particleCount(intensity, MIN_FLAKES, MAX_FLAKES);
  const flakes = useMemo(() => makeParticles(count, SEED), [count]);

  return (
    <View testID="ambient-effect-snow" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flakes.map((particle, index) => (
        <Flake key={index} particle={particle} width={width} height={height} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ flake: { position: 'absolute', top: 0 } });
