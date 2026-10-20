import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { WeatherTheme } from '@/theme/theme-engine';
import { elevation, radii, spacing, touch, typography } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';
import { IconButton } from '@/ui/IconButton';

import type { HourlyRow } from './forecast-view-model';
import { clampIndex, indexFromPosition, positionFromIndex } from './scrub';

export interface ScrubBarProps {
  rows: HourlyRow[];
  /** 0 is now. */
  index: number;
  onChange: (index: number) => void;
  theme: WeatherTheme;
}

const THUMB = 26;
const BAR_HEIGHT = touch.minTarget + 8;
const SPRING = { damping: 18, stiffness: 240, mass: 0.6 };
/** A taller tick every this many hours, so the bar reads as a clock face. */
const MAJOR_EVERY = 6;

/** Moves the handle to `index`, with a springy catch-up unless motion is reduced. */
function useThumbStyle(index: number, count: number, width: number) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(0);
  const target = positionFromIndex(index, count) * Math.max(0, width - THUMB);

  useEffect(() => {
    x.value = reducedMotion ? target : withSpring(target, SPRING);
  }, [x, target, reducedMotion]);

  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
}

interface Input {
  width: number;
  handlers: {
    onLayout: (event: LayoutChangeEvent) => void;
    onStartShouldSetResponder: () => boolean;
    onMoveShouldSetResponder: () => boolean;
    onResponderTerminationRequest: () => boolean;
    onResponderGrant: (event: GestureResponderEvent) => void;
    onResponderMove: (event: GestureResponderEvent) => void;
    onAccessibilityAction: (event: AccessibilityActionEvent) => void;
  };
}

/** Touch and accessibility input for the bar: dragging picks the hour under the finger. */
function useScrubInput(count: number, index: number, onChange: (index: number) => void): Input {
  const [width, setWidth] = useState(0);
  const lastReported = useRef(index);

  useEffect(() => {
    lastReported.current = index;
  }, [index]);

  const reportFrom = (event: GestureResponderEvent) => {
    const next = indexFromPosition(event.nativeEvent.locationX, width, count);
    if (width === 0 || next === lastReported.current) return;
    lastReported.current = next;
    onChange(next);
  };

  return {
    width,
    handlers: {
      onLayout: (event) => setWidth(event.nativeEvent.layout.width),
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      // Keep the touch until the finger lifts, even over scrollable content.
      onResponderTerminationRequest: () => false,
      onResponderGrant: reportFrom,
      onResponderMove: reportFrom,
      onAccessibilityAction: (event) => {
        const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        onChange(clampIndex(index + delta, count));
      },
    },
  };
}

function Ticks({ rows, color }: { rows: HourlyRow[]; color: string }) {
  return (
    <View pointerEvents="none" style={styles.ticks}>
      {rows.map((row, i) => (
        <View
          key={row.key}
          testID="scrub-tick"
          style={[styles.tick, { backgroundColor: color, height: i % MAJOR_EVERY === 0 ? 16 : 9 }]}
        />
      ))}
    </View>
  );
}

function Handle({ label, theme, style }: { label: string; theme: WeatherTheme; style: object }) {
  const { tile } = theme;
  return (
    <Animated.View pointerEvents="none" style={[styles.thumbArea, style]}>
      <Text
        testID="scrub-label"
        numberOfLines={1}
        style={[typography.label, styles.label, { color: tile.text }]}
      >
        {label}
      </Text>
      <View
        style={[styles.thumb, { backgroundColor: tile.accent, borderColor: tile.background }]}
      />
    </Animated.View>
  );
}

/**
 * A bar along the bottom of the weather screen: drag across it to travel through the coming hours.
 * It is also an accessible slider, so screen-reader users can step an hour at a time.
 */
export function ScrubBar({ rows, index, onChange, theme }: ScrubBarProps) {
  const { width, handlers } = useScrubInput(rows.length, index, onChange);
  const { onAccessibilityAction, ...touchHandlers } = handlers;
  const thumbStyle = useThumbStyle(index, rows.length, width);
  const { tile } = theme;
  if (rows.length === 0) return null;
  const current = rows[clampIndex(index, rows.length)]!;

  return (
    <View style={styles.row}>
      {index > 0 ? (
        <IconButton
          icon="clock"
          label="Back to now"
          color={tile.text}
          background={tile.background}
          onPress={() => onChange(0)}
        />
      ) : null}
      <View
        testID="scrub-bar"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Time of day"
        accessibilityValue={{ text: current.dayTimeLabel }}
        aria-valuetext={current.dayTimeLabel}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        {...touchHandlers}
        style={[styles.bar, elevation.low, { backgroundColor: tile.background }]}
      >
        <Ticks rows={rows} color={tile.textSecondary} />
        <Handle label={current.timeLabel} theme={theme} style={thumbStyle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: {
    flex: 1,
    minHeight: BAR_HEIGHT,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  ticks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tick: { width: 3, borderRadius: 2, opacity: 0.5 },
  // The handle's travel is measured over the bar's inner width, so it lines up with the ticks.
  thumbArea: { position: 'absolute', left: spacing.lg, top: 4, alignItems: 'center', width: THUMB },
  label: { position: 'absolute', top: -22, minWidth: 64, textAlign: 'center' },
  thumb: {
    position: 'absolute',
    top: BAR_HEIGHT / 2 - 4 - THUMB / 2 + 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
