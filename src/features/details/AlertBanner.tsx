import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeatherAlert } from '@/domain/types';
import { alertColors, radii, spacing, typography } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';

import { SEVERITY_LABEL } from './details-view-model';

export interface AlertBannerProps {
  /** Sorted most severe first; the first is shown, the rest are counted. */
  alerts: WeatherAlert[];
  onPress: () => void;
}

/** Flags the most severe active alert. Severity is written out, never conveyed by colour alone. */
export function AlertBanner({ alerts, onPress }: AlertBannerProps) {
  const top = alerts[0];
  if (!top) return null;
  const palette = alertColors[top.severity];
  const more = alerts.length - 1;
  const severity = SEVERITY_LABEL[top.severity];
  const label = `${severity}: ${top.event}${more > 0 ? `. ${more} more` : ''}`;

  return (
    <Pressable
      testID="alert-banner"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the full alert"
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: palette.background, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name="info" color={palette.text} size={22} />
      <View style={styles.text}>
        <Text style={[typography.label, { color: palette.text }]}>{severity}</Text>
        <Text style={[typography.bodyStrong, { color: palette.text }]}>{top.event}</Text>
      </View>
      {more > 0 ? (
        <Text style={[typography.caption, { color: palette.text }]}>{`+${more} more`}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  text: { flex: 1 },
});
