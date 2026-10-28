import { StyleSheet, Text, View } from 'react-native';

import { useLocale } from '@/lib/use-locale';
import type { ProviderErrorKind } from '@/providers/weather-provider';
import { radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { describeError } from './error-messages';
import { PressableScale } from './PressableScale';

/** Colours to use on a coloured backdrop instead of the app palette. */
export interface ErrorStatePalette {
  text: string;
  textSecondary: string;
  button: string;
  onButton: string;
}

export interface ErrorStateProps {
  kind: ProviderErrorKind;
  onRetry?: () => void;
  palette?: ErrorStatePalette;
}

/** A calm full-width explanation of a failure, with a retry action where retrying can help. */
export function ErrorState({ kind, onRetry, palette }: ErrorStateProps) {
  const { colors } = useTheme();
  const { locale, messages } = useLocale();
  const ink = palette ?? {
    text: colors.text,
    textSecondary: colors.textSecondary,
    button: colors.accentFill,
    onButton: colors.onAccent,
  };
  const { title, message, retryable } = describeError(kind, locale);

  return (
    <View accessible accessibilityRole="alert" style={styles.container}>
      <Text style={[typography.headline, styles.centered, { color: ink.text }]}>{title}</Text>
      <Text style={[typography.body, styles.centered, { color: ink.textSecondary }]}>
        {message}
      </Text>
      {retryable && onRetry ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={messages.common.tryAgain}
          onPress={onRetry}
          style={[styles.button, { backgroundColor: ink.button }]}
        >
          <Text style={[typography.bodyStrong, { color: ink.onButton }]}>
            {messages.common.tryAgain}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  centered: { textAlign: 'center' },
  button: {
    minHeight: touch.minTarget,
    minWidth: touch.minTarget * 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});
