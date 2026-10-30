import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import type { LocationPromptVariant, Messages } from '@/domain/messages';
import { useLocale } from '@/lib/use-locale';
import { radii, spacing, touch, typography } from '@/theme/tokens';
import type { WeatherTheme } from '@/theme/theme-engine';
import { PressableScale } from '@/ui/PressableScale';

export type LocationPermissionVariant = LocationPromptVariant;

export interface LocationPermissionStateProps {
  variant: LocationPermissionVariant;
  theme: WeatherTheme;
  /** Shows the OS permission prompt (undetermined). */
  onAllow?: () => void;
  /** Tries to read the location again (unavailable). */
  onRetry?: () => void;
  /** Opens place search. Omitted until search exists, in which case no button is shown. */
  onSearch?: () => void;
}

interface ActionProps {
  label: string;
  onPress: () => void;
  theme: WeatherTheme;
  primary?: boolean;
}

function Action({ label, onPress, theme, primary = false }: ActionProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.button,
        primary
          ? { backgroundColor: theme.tile.background }
          : { borderWidth: 1.5, borderColor: theme.text },
      ]}
    >
      <Text style={[typography.bodyStrong, { color: primary ? theme.tile.text : theme.text }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * The main way out of each state. A browser has no Settings app to open (react-native-web has no
 * `Linking.openSettings`), so there the fix is the site permission, then trying again.
 */
function primaryAction(
  { variant, onAllow, onRetry }: LocationPermissionStateProps,
  inBrowser: boolean,
  messages: Messages,
): { label: string; onPress: () => void } | null {
  if (variant === 'undetermined') {
    return onAllow ? { label: messages.places.useMyLocation, onPress: onAllow } : null;
  }
  if (variant === 'denied' && !inBrowser) {
    return { label: messages.places.openSettings, onPress: () => void Linking.openSettings() };
  }
  return onRetry ? { label: messages.common.tryAgain, onPress: onRetry } : null;
}

/** Explains why location is needed, and what to do when it is off or unavailable. */
export function LocationPermissionState(props: LocationPermissionStateProps) {
  const { variant, theme, onSearch } = props;
  const { messages } = useLocale();
  const inBrowser = Platform.OS === 'web';
  const { title, body } =
    variant === 'denied' && inBrowser
      ? messages.places.deniedInBrowser
      : messages.places.permission[variant];
  const primary = primaryAction(props, inBrowser, messages);

  return (
    <View style={styles.container}>
      <Text
        accessibilityRole="header"
        style={[typography.title, styles.centered, { color: theme.text }]}
      >
        {title}
      </Text>
      <Text style={[typography.body, styles.centered, { color: theme.textSecondary }]}>{body}</Text>
      <View style={styles.actions}>
        {primary ? <Action primary {...primary} theme={theme} /> : null}
        {onSearch ? (
          <Action label={messages.common.searchForAPlace} onPress={onSearch} theme={theme} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  centered: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.lg },
  button: {
    minHeight: touch.minTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
