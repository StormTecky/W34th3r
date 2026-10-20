import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, touch, typography } from '@/theme/tokens';
import type { WeatherTheme } from '@/theme/theme-engine';

export type LocationPermissionVariant = 'undetermined' | 'denied' | 'unavailable';

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

const COPY: Record<LocationPermissionVariant, { title: string; body: string }> = {
  undetermined: {
    title: 'See the weather where you are',
    body: 'W34th3r uses your location only to fetch the weather for where you are.',
  },
  denied: {
    title: 'Location is off',
    body: 'Turn on location access in Settings to see the weather where you are.',
  },
  unavailable: {
    title: "We couldn't find your location",
    body: 'Check that location services are turned on, then try again.',
  },
};

interface ActionProps {
  label: string;
  onPress: () => void;
  theme: WeatherTheme;
  primary?: boolean;
}

function Action({ label, onPress, theme, primary = false }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? { backgroundColor: theme.tile.background }
          : { borderWidth: 1.5, borderColor: theme.text },
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[typography.bodyStrong, { color: primary ? theme.tile.text : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Explains why location is needed, and what to do when it is off or unavailable. */
export function LocationPermissionState({
  variant,
  theme,
  onAllow,
  onRetry,
  onSearch,
}: LocationPermissionStateProps) {
  const { title, body } = COPY[variant];

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
        {variant === 'undetermined' && onAllow ? (
          <Action primary label="Use my location" onPress={onAllow} theme={theme} />
        ) : null}
        {variant === 'denied' ? (
          <Action
            primary
            label="Open Settings"
            onPress={() => void Linking.openSettings()}
            theme={theme}
          />
        ) : null}
        {variant === 'unavailable' && onRetry ? (
          <Action primary label="Try again" onPress={onRetry} theme={theme} />
        ) : null}
        {onSearch ? <Action label="Search for a place" onPress={onSearch} theme={theme} /> : null}
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
