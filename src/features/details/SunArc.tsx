import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useLocale } from '@/lib/use-locale';
import { spacing, typography } from '@/theme/tokens';
import { Decorative } from '@/ui/Decorative';

import type { SunDetails } from './details-view-model';

export interface SunArcProps {
  sun: SunDetails;
  color: string;
  secondaryColor: string;
  accentColor: string;
}

const WIDTH = 220;
const HEIGHT = 112;
const RADIUS = 96;
const LEFT = 14;
const BASE = 100;

/** Position of the sun on the arc: progress 0 is the left horizon, 1 the right horizon. */
function sunPosition(progress: number) {
  const angle = Math.PI * progress;
  return { x: LEFT + RADIUS - RADIUS * Math.cos(angle), y: BASE - RADIUS * Math.sin(angle) };
}

function useSpoken(sun: SunDetails): string {
  const { details } = useLocale().messages;
  return sun.available
    ? details.sunSpoken(sun.sunriseLabel, sun.sunsetLabel)
    : details.sunUnavailable;
}

/** The horizon, the arc, and the sun on it (when there are sun events). */
function Arc({ sun, secondaryColor, accentColor }: Omit<SunArcProps, 'color'>) {
  const { x, y } = sunPosition(sun.progress);
  return (
    <Decorative>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line x1={4} y1={BASE} x2={WIDTH - 4} y2={BASE} stroke={secondaryColor} strokeWidth={1.5} />
        <Path
          d={`M${LEFT} ${BASE} A${RADIUS} ${RADIUS} 0 0 1 ${LEFT + 2 * RADIUS} ${BASE}`}
          stroke={secondaryColor}
          strokeWidth={2}
          strokeDasharray={sun.available ? undefined : '4 6'}
          fill="none"
        />
        {sun.available ? (
          <Circle
            cx={x}
            cy={y}
            r={7}
            fill={sun.isDay ? accentColor : 'none'}
            stroke={accentColor}
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </Decorative>
  );
}

/** Sunrise and sunset times under an arc that shows how far the sun has travelled. */
export function SunArc({ sun, color, secondaryColor, accentColor }: SunArcProps) {
  const label = useSpoken(sun);
  return (
    <View accessible accessibilityLabel={label} style={styles.container}>
      <Arc sun={sun} secondaryColor={secondaryColor} accentColor={accentColor} />
      <View style={styles.times}>
        <Text style={[typography.caption, { color }]}>{sun.sunriseLabel}</Text>
        <Text style={[typography.caption, { color }]}>{sun.sunsetLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
  times: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
});
