import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { useLocale } from '@/lib/use-locale';
import { spacing, typography } from '@/theme/tokens';
import { Decorative } from '@/ui/Decorative';

import type { WindDetails } from './details-view-model';

export interface WindCompassProps {
  wind: WindDetails;
  color: string;
  secondaryColor: string;
  accentColor: string;
}

const SIZE = 84;
const CENTER = SIZE / 2;

function Arrow({ degrees, color }: { degrees: number; color: string }) {
  // Meteorological degrees say where the wind comes from; the arrow points where it goes.
  return (
    <G transform={`rotate(${degrees + 180} ${CENTER} ${CENTER})`}>
      <Line
        x1={CENTER}
        y1={20}
        x2={CENTER}
        y2={64}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d={`M${CENTER - 7} 56 L${CENTER} 66 L${CENTER + 7} 56`}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  );
}

function Dial({
  degrees,
  secondaryColor,
  accentColor,
}: Pick<WindCompassProps, 'secondaryColor' | 'accentColor'> & { degrees: number | null }) {
  return (
    <Decorative>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={38}
          stroke={secondaryColor}
          strokeWidth={1.5}
          fill="none"
        />
        {[0, 90, 180, 270].map((angle) => (
          <G key={angle} transform={`rotate(${angle} ${CENTER} ${CENTER})`}>
            <Line x1={CENTER} y1={4} x2={CENTER} y2={10} stroke={secondaryColor} strokeWidth={2} />
          </G>
        ))}
        {degrees === null ? null : <Arrow degrees={degrees} color={accentColor} />}
      </Svg>
    </Decorative>
  );
}

/** A small compass with an arrow showing where the wind is blowing to, and the speed as text. */
export function WindCompass({ wind, color, secondaryColor, accentColor }: WindCompassProps) {
  const { messages } = useLocale();
  return (
    <View accessible accessibilityLabel={wind.a11yLabel} style={styles.container}>
      <Dial degrees={wind.degrees} secondaryColor={secondaryColor} accentColor={accentColor} />
      <Text style={[typography.headline, { color }]}>{wind.speedLabel}</Text>
      {wind.directionLabel ? (
        <Text style={[typography.caption, { color: secondaryColor }]}>{wind.directionLabel}</Text>
      ) : null}
      {wind.gustLabel ? (
        <Text style={[typography.caption, { color: secondaryColor }]}>
          {messages.details.gusts(wind.gustLabel)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ container: { alignItems: 'center', gap: spacing.xs } });
