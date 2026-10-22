import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLocale } from '@/lib/use-locale';
import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { IconButton } from './IconButton';

export interface ScreenHeaderProps {
  title: string;
  /** Controls shown on the right, e.g. an Edit button. */
  right?: ReactNode;
  /** Overrides the text colour, e.g. on top of a weather gradient. */
  color?: string;
}

/** Back button, title, and optional trailing controls for the app's plain (non-weather) screens. */
export function ScreenHeader({ title, right, color }: ScreenHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const ink = color ?? colors.text;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.row}>
      <IconButton icon="chevron-left" label={messages.common.back} onPress={goBack} color={ink} />
      <Text accessibilityRole="header" style={[typography.title, styles.title, { color: ink }]}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 56 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
});
