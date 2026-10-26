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

import { useLocale } from '@/lib/use-locale';
import type { WeatherTheme } from '@/theme/theme-engine';
import { elevation, radii, spacing, touch, typography } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';
import { Icon } from '@/ui/Icon';
import { IconButton } from '@/ui/IconButton';

import type { HourlyRow } from './forecast-view-model';
import { centerFromIndex, clampIndex, indexFromPosition } from './scrub';

export interface ScrubBarProps {
  rows: HourlyRow[];
  /** 0 is now. */
  index: number;
  onChange: (index: number) => void;
  theme: WeatherTheme;
}

const THUMB = 26;
const TICK_WIDTH = 3;
/** Space between the track's edge and its first and last ticks (before half a tick). */
const TRACK_PADDING = spacing.md;
/** Distance from the bar's edge to the centre of its first and last ticks. */
export const SCRUB_INSET = TRACK_PADDING + TICK_WIDTH / 2;
const BAR_HEIGHT = touch.minTarget + 8;
// No overshoot: the handle must come to rest exactly on a tick.
const SPRING = { damping: 22, stiffness: 260, mass: 0.6, overshootClamping: true };
/** A taller tick every this many hours, so the bar reads as a clock face. */
const MAJOR_EVERY = 6;

/** Moves the handle to `index`, with a springy catch-up unless motion is reduced. */
function useThumbStyle(index: number, count: number, width: number) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(0);
  // The handle's centre sits on the tick, so its left edge is half a handle before it.
  const target = centerFromIndex(index, count, width, SCRUB_INSET) - THUMB / 2;

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
    const next = indexFromPosition(event.nativeEvent.locationX, width, count, SCRUB_INSET);
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
        testID="scrub-thumb"
        style={[styles.thumb, { backgroundColor: tile.accent, borderColor: tile.background }]}
      />
    </Animated.View>
  );
}

/**
 * A bar along the bottom of the weather screen: drag across it to travel through the coming hours.
 * It is also an accessible slider, so screen-reader users can step an hour at a time.
 */
/**
 * The slot at the start of the bar. It is always the same size, so the track never moves when the
 * way back to now appears: a clock at rest, a "Back to now" button once you have travelled.
 */
function Cap({
  index,
  onChange,
  theme,
}: {
  index: number;
  onChange: (i: number) => void;
  theme: WeatherTheme;
}) {
  const { tile } = theme;
  const { messages } = useLocale();
  return (
    <View testID="scrub-cap" style={styles.cap}>
      {index > 0 ? (
        <IconButton
          icon="clock"
          label={messages.forecast.backToNow}
          color={tile.text}
          onPress={() => onChange(0)}
        />
      ) : (
        <Icon name="clock" size={22} color={tile.textSecondary} />
      )}
    </View>
  );
}

export function ScrubBar({ rows, index, onChange, theme }: ScrubBarProps) {
  const { width, handlers } = useScrubInput(rows.length, index, onChange);
  const { onAccessibilityAction, ...touchHandlers } = handlers;
  const thumbStyle = useThumbStyle(index, rows.length, width);
  const { tile } = theme;
  const { messages } = useLocale();
  if (rows.length === 0) return null;
  const current = rows[clampIndex(index, rows.length)]!;

  return (
    <View style={[styles.pill, elevation.low, { backgroundColor: tile.background }]}>
      <Cap index={index} onChange={onChange} theme={theme} />
      <View
        testID="scrub-bar"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={messages.forecast.timeOfDay}
        accessibilityValue={{ text: current.dayTimeLabel }}
        aria-valuetext={current.dayTimeLabel}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        {...touchHandlers}
        style={styles.track}
      >
        <Ticks rows={rows} color={tile.textSecondary} />
        <Handle label={current.timeLabel} theme={theme} style={thumbStyle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.pill },
  cap: {
    width: touch.minTarget,
    height: touch.minTarget,
    marginLeft: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    minHeight: BAR_HEIGHT,
    paddingHorizontal: TRACK_PADDING,
    justifyContent: 'center',
  },
  ticks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tick: { width: TICK_WIDTH, borderRadius: 2, opacity: 0.5 },
  // Positioned from the bar's left edge; the animated translateX puts its centre on a tick.
  thumbArea: { position: 'absolute', left: 0, top: 0, alignItems: 'center', width: THUMB },
  label: { position: 'absolute', top: -22, minWidth: 64, textAlign: 'center' },
  thumb: {
    position: 'absolute',
    left: 0,
    // The ticks are centred in the bar, so the handle's centre is too.
    top: BAR_HEIGHT / 2 - THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
  },
});
