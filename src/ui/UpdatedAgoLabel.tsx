import { StyleSheet, Text } from 'react-native';

import { formatAge, freshnessOf } from '@/domain/freshness';
import { useNowSeconds } from '@/lib/use-now';
import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface UpdatedAgoLabelProps {
  /** Epoch seconds when the data was fetched. */
  fetchedAt: number;
  /** Epoch seconds; defaults to the live clock. Injectable for tests. */
  now?: number;
  /** Show the age even while the data is still fresh (e.g. after a failed refresh). */
  always?: boolean;
  /** Text colour on a coloured backdrop; defaults to the app palette. */
  color?: string;
}

/** "Updated 20 min ago" for stale data; renders nothing while data is fresh. */
export function UpdatedAgoLabel({ fetchedAt, now, always = false, color }: UpdatedAgoLabelProps) {
  const liveNow = useNowSeconds();
  const { colors } = useTheme();
  const current = now ?? liveNow;
  if (!always && freshnessOf(fetchedAt, current) === 'fresh') return null;

  const text = formatAge(fetchedAt, current);
  return (
    <Text
      accessibilityLabel={text}
      style={[typography.caption, styles.label, { color: color ?? colors.textSecondary }]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({ label: { textAlign: 'center' } });
