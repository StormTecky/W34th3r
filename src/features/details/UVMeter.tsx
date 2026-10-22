import { StyleSheet, Text, View } from 'react-native';

import type { Messages } from '@/domain/messages';
import { useLocale } from '@/lib/use-locale';
import { radii, spacing, typography } from '@/theme/tokens';

import type { UvDetails } from './details-view-model';

export interface UVMeterProps {
  uv: UvDetails;
  color: string;
  secondaryColor: string;
  accentColor: string;
}

const BAND_OPACITY = [0.25, 0.4, 0.55, 0.75, 1];

function spoken(uv: UvDetails, { details }: Messages): string {
  const { categoryLabel, advice } = uv;
  if (!uv.available || categoryLabel === null || advice === null) return details.uvUnavailable;
  return details.uvSpoken(uv.label, categoryLabel, advice);
}

/** UV index as a number and a word, with a five-band scale and a marker. */
export function UVMeter({ uv, color, secondaryColor, accentColor }: UVMeterProps) {
  const { messages } = useLocale();
  return (
    <View accessible accessibilityLabel={spoken(uv, messages)} style={styles.container}>
      <Text style={[uv.available ? typography.numeral : typography.headline, { color }]}>
        {uv.label}
      </Text>
      {uv.categoryLabel ? (
        <Text style={[typography.bodyStrong, { color }]}>{uv.categoryLabel}</Text>
      ) : null}
      {uv.available ? (
        <View style={styles.scale}>
          <View style={styles.bands}>
            {BAND_OPACITY.map((opacity) => (
              <View
                key={opacity}
                style={[styles.band, { backgroundColor: accentColor, opacity }]}
              />
            ))}
          </View>
          <View
            testID="uv-marker"
            style={[styles.marker, { left: `${uv.fraction * 100}%`, borderColor: color }]}
          />
        </View>
      ) : null}
      {uv.advice ? (
        <Text style={[typography.caption, styles.advice, { color: secondaryColor }]}>
          {uv.advice}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  scale: { height: 14, justifyContent: 'center', marginVertical: spacing.xs },
  bands: { flexDirection: 'row', gap: 2, height: 6 },
  band: { flex: 1, borderRadius: radii.pill },
  marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
  },
  advice: { lineHeight: 18 },
});
