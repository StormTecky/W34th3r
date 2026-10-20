import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WeatherTheme } from '@/theme/theme-engine';
import { elevation, radii, spacing, typography } from '@/theme/tokens';
import { Icon, type IconName } from '@/ui/Icon';

export interface DetailTileProps {
  title: string;
  icon: IconName;
  theme: WeatherTheme;
  /** Spans both columns. */
  wide?: boolean;
  children: ReactNode;
}

/** A solid tile with an icon and bold uppercase heading, one measurement per tile. */
export function DetailTile({ title, icon, theme, wide = false, children }: DetailTileProps) {
  const { tile } = theme;
  return (
    <View
      style={[
        styles.tile,
        elevation.low,
        wide ? styles.wide : styles.half,
        { backgroundColor: tile.background },
      ]}
    >
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
  tile: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  half: { flexGrow: 1, flexBasis: '47%' },
  wide: { flexBasis: '100%' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { textTransform: 'uppercase' },
});
