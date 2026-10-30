import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sidePadding } from '@/theme/layout';
import { layout, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface PlainScreenProps {
  testID?: string;
  children: ReactNode;
}

/**
 * The frame of the app's plain (non-weather) screens: the palette background, content kept clear
 * of notches and rounded corners on every side, and a centred column of readable width so rows do
 * not stretch across a tablet.
 */
export function PlainScreen({ testID, children }: PlainScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    ...sidePadding(insets, spacing.lg),
  };

  return (
    <View testID={testID} style={[styles.screen, { backgroundColor: colors.background }, padding]}>
      <View testID="readable-column" style={styles.column}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: layout.readableWidth, alignSelf: 'center' },
});
