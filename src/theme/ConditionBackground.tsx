import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { ConditionCategory } from '@/domain/types';

import { CloudEffect } from './effects/CloudEffect';
import { RainEffect } from './effects/RainEffect';
import { SnowEffect } from './effects/SnowEffect';
import { StarsEffect } from './effects/StarsEffect';
import { getTheme, type WeatherTheme } from './theme-engine';
import { motion } from './tokens';
import { useReducedMotion } from './use-reduced-motion';

export interface ConditionBackgroundProps {
  condition: ConditionCategory;
  isDay: boolean;
  children?: ReactNode;
}

interface Layer {
  id: number;
  theme: WeatherTheme;
  /** Whether this layer fades in over the previous one. */
  fade: boolean;
}

function GradientLayer({ theme, fade }: { theme: WeatherTheme; fade: boolean }) {
  const opacity = useSharedValue(fade ? 0 : 1);

  useEffect(() => {
    if (fade) opacity.value = withTiming(1, { duration: motion.theme });
  }, [fade, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={[...theme.gradient]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function AmbientEffect({ theme }: { theme: WeatherTheme }) {
  const { kind, intensity } = theme.effect;
  switch (kind) {
    case 'rain':
      return <RainEffect intensity={intensity} color={theme.particle} />;
    case 'snow':
      return <SnowEffect intensity={intensity} color={theme.particle} />;
    case 'clouds':
      return <CloudEffect intensity={intensity} color={theme.particle} variant="clouds" />;
    case 'fog':
      return <CloudEffect intensity={intensity} color={theme.particle} variant="fog" />;
    case 'stars':
      return <StarsEffect intensity={intensity} color={theme.particle} />;
    default:
      return null;
  }
}

/**
 * Full-screen sky for the current weather: a gradient that cross-fades when the weather changes,
 * plus an ambient effect (rain, snow, clouds, fog) that stops when the OS asks for reduced motion.
 */
export function ConditionBackground({ condition, isDay, children }: ConditionBackgroundProps) {
  const theme = getTheme(condition, isDay);
  const reducedMotion = useReducedMotion();
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, theme, fade: false }]);

  // When the theme changes, stack the new gradient on top and fade it in. Updating state during
  // render (guarded by the comparison) is React's pattern for deriving state from props.
  const newest = layers[layers.length - 1]!;
  if (newest.theme.key !== theme.key) {
    setLayers([...layers.slice(-1), { id: newest.id + 1, theme, fade: !reducedMotion }]);
  }

  // Once the fade has finished, drop the layers underneath.
  const layerCount = layers.length;
  useEffect(() => {
    if (layerCount < 2) return;
    const timer = setTimeout(() => setLayers((current) => current.slice(-1)), motion.theme + 50);
    return () => clearTimeout(timer);
  }, [layerCount]);

  const showEffect = !reducedMotion && theme.effect.kind !== 'none';

  return (
    <View
      testID="condition-background"
      nativeID={theme.key}
      style={[styles.root, { backgroundColor: theme.gradient[0] }]}
    >
      <View
        testID="condition-background-art"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        {layers.map((layer) => (
          <GradientLayer key={layer.id} theme={layer.theme} fade={layer.fade} />
        ))}
        {showEffect ? <AmbientEffect theme={theme} /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
