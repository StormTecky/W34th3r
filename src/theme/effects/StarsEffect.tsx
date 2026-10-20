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

export interface StarsEffectProps {
  /** 0..1; more intense skies have more stars. */
  intensity: number;
  color: string;
}

const MIN_STARS = 14;
const MAX_STARS = 40;
const SEED = 53;
/** Stars fill the upper part of the screen, where the night sky is. */
const SKY_FRACTION = 0.7;

/** Opacity and scale that pulse between bright and dim; each star runs on its own rhythm. */
function useTwinkle(particle: Particle, duration: number) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay * duration,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [progress, duration, particle.delay]);

  return useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.2]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.6]) }],
  }));
}

interface StarProps {
  particle: Particle;
  width: number;
  height: number;
  color: string;
}

function Star({ particle, width, height, color }: StarProps) {
  const size = 2 + particle.size * 4;
  const twinkle = useTwinkle(particle, 1200 + particle.speed * 2200);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: particle.x * width,
          top: ((particle.delay * 7) % 1) * height * SKY_FRACTION,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        twinkle,
      ]}
    />
  );
}

/** Twinkling stars for a clear night. */
export function StarsEffect({ intensity, color }: StarsEffectProps) {
  const { width, height } = useWindowDimensions();
  const count = particleCount(intensity, MIN_STARS, MAX_STARS);
  const stars = useMemo(() => makeParticles(count, SEED), [count]);

  return (
    <View testID="ambient-effect-stars" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((particle, index) => (
        <Star key={index} particle={particle} width={width} height={height} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ star: { position: 'absolute' } });
