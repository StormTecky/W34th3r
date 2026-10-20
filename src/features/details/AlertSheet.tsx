import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WeatherAlert } from '@/domain/types';
import { alertColors, radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { alertPeriodLabel, SEVERITY_LABEL } from './details-view-model';

export interface AlertSheetProps {
  visible: boolean;
  alerts: WeatherAlert[];
  timeZone: string;
  timeZoneOffset: number;
  /** Epoch seconds. */
  now: number;
  onClose: () => void;
}

function AlertEntry(
  props: { alert: WeatherAlert } & Pick<AlertSheetProps, 'timeZone' | 'timeZoneOffset' | 'now'>,
) {
  const { alert, timeZone, timeZoneOffset, now } = props;
  const { colors } = useTheme();
  const palette = alertColors[alert.severity];
  return (
    <View style={[styles.entry, { backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: palette.background }]}>
        <Text style={[typography.label, { color: palette.text }]}>
          {SEVERITY_LABEL[alert.severity]}
        </Text>
      </View>
      <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
        {alert.event}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {`Issued by ${alert.sender}`}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {alertPeriodLabel(alert, timeZone, now, timeZoneOffset)}
      </Text>
      {alert.description ? (
        <Text style={[typography.body, { color: colors.text }]}>{alert.description}</Text>
      ) : null}
    </View>
  );
}

/** Full text of every active alert, shown on demand. */
export function AlertSheet({ visible, alerts, onClose, ...place }: AlertSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingTop: insets.top + spacing.md },
        ]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {alerts.map((alert) => (
            <AlertEntry key={alert.id} alert={alert} {...place} />
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={[
            styles.close,
            { backgroundColor: colors.accentFill, marginBottom: insets.bottom + spacing.md },
          ]}
        >
          <Text style={[typography.bodyStrong, { color: colors.onAccent }]}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: spacing.lg },
  content: { gap: spacing.md, paddingBottom: spacing.lg },
  entry: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  close: {
    minHeight: touch.minTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
