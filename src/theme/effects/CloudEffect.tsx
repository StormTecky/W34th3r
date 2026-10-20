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

export interface CloudEffectProps {
  /** 0..1; denser skies have more, more opaque wisps. */
  intensity: number;
  color: string;
  /** Fog hangs low in wide bands; clouds drift higher in smaller wisps. */
  variant: 'clouds' | 'fog';
}

const SEED = { clouds: 37, fog: 41 } as const;

interface WispProps {
  particle: Particle;
  index: number;
  width: number;
  height: number;
  color: string;
  intensity: number;
  variant: CloudEffectProps['variant'];
}

function Wisp({ particle, index, width, height, color, intensity, variant }: WispProps) {
  const progress = useSharedValue(0);
  const duration = (variant === 'fog' ? 70_000 : 45_000) + particle.speed * 40_000;
  const wispWidth = width * (variant === 'fog' ? 1.2 : 0.6 + particle.size * 0.5);
  const wispHeight = variant === 'fog' ? 150 + particle.size * 90 : 60 + particle.size * 70;
  const top =
    variant === 'fog'
      ? height * (0.35 + 0.12 * index + particle.delay * 0.1)
      : height * (0.04 + 0.14 * index) + particle.delay * 30;

  useEffect(() => {
    progress.value = withDelay(
      0,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [progress, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate((progress.value + particle.delay) % 1, [0, 1], [-wispWidth, width]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.wisp,
        {
          top,
          width: wispWidth,
          height: wispHeight,
          borderRadius: wispHeight / 2,
          opacity: (variant === 'fog' ? 0.12 : 0.08) + intensity * 0.14 * (0.6 + particle.opacity),
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** Slow-drifting cloud wisps, or low fog banks. */
export function CloudEffect({ intensity, color, variant }: CloudEffectProps) {
  const { width, height } = useWindowDimensions();
  const count = particleCount(intensity, 2, variant === 'fog' ? 4 : 5);
  const wisps = useMemo(() => makeParticles(count, SEED[variant]), [count, variant]);

  return (
    <View testID={`ambient-effect-${variant}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {wisps.map((particle, index) => (
        <Wisp
          key={index}
          particle={particle}
          index={index}
          width={width}
          height={height}
          color={color}
          intensity={intensity}
          variant={variant}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wisp: { position: 'absolute', left: 0 } });
