import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WeatherTheme } from '@/theme/theme-engine';
import { elevation, radii, spacing, typography } from '@/theme/tokens';
import { Icon, type IconName } from '@/ui/Icon';

export interface ForecastCardProps {
  title: string;
  icon: IconName;
  theme: WeatherTheme;
  children: ReactNode;
}

/** A solid, rounded tile with a bold uppercase heading, shared by the forecast sections. */
export function ForecastCard({ title, icon, theme, children }: ForecastCardProps) {
  const { tile } = theme;
  return (
    <View style={[styles.card, elevation.low, { backgroundColor: tile.background }]}>
      <View style={styles.heading}>
        <Icon name={icon} size={16} color={tile.accent} />
        <Text
          accessibilityRole="header"
          style={[typography.label, styles.title, { color: tile.textSecondary }]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: { textTransform: 'uppercase' },
});
