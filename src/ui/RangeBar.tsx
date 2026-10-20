import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { radii } from '@/theme/tokens';

export interface RangeBarProps {
  /** Start of the range within the track, 0..1. */
  start: number;
  /** End of the range within the track, 0..1. */
  end: number;
  trackColor: string;
  fillColor: string;
  /** Left and right colours of the fill, e.g. the temperature colours of the day's low and high. */
  gradient?: readonly [string, string];
}

/** Narrowest visible fill, in percent of the track, so equal highs and lows still show. */
const MIN_FILL_PERCENT = 8;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * A daily temperature range drawn against the week's range. Decorative: the low and high numbers
 * beside it carry the meaning, so it is hidden from screen readers.
 */
export function RangeBar({ start, end, trackColor, fillColor, gradient }: RangeBarProps) {
  const from = clamp01(start) * 100;
  const width = Math.max((clamp01(end) - clamp01(start)) * 100, MIN_FILL_PERCENT);
  const left = Math.min(from, 100 - width);

  return (
    <View
      testID="range-bar"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, { backgroundColor: trackColor }]}
    >
      <View
        testID="range-bar-fill"
        style={[styles.fill, { left: `${left}%`, width: `${width}%`, backgroundColor: fillColor }]}
      >
        {gradient ? (
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radii.pill, flex: 1, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: radii.pill, overflow: 'hidden' },
});
