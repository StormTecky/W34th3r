import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { WeatherTheme } from '@/theme/theme-engine';
import { elevation, radii, spacing, typography } from '@/theme/tokens';
import { EnterView } from '@/ui/EnterView';
import { Icon, type IconName } from '@/ui/Icon';

export interface DetailTileProps {
  title: string;
  icon: IconName;
  theme: WeatherTheme;
  /** Spans both columns. */
  wide?: boolean;
  /** Position in the grid, so the tiles come in one after another. */
  order: number;
  children: ReactNode;
}

/** A solid tile with an icon and bold uppercase heading, one measurement per tile. */
export function DetailTile({ title, icon, theme, wide = false, order, children }: DetailTileProps) {
  const { tile } = theme;
  return (
    <EnterView
      testID="detail-tile"
      order={order}
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
    </EnterView>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  half: { flexGrow: 1, flexBasis: '47%' },
  wide: { flexBasis: '100%' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { textTransform: 'uppercase' },
});
