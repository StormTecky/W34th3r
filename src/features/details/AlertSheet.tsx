import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WeatherAlert } from '@/domain/types';
import { useLocale } from '@/lib/use-locale';
import { alertColors, radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { PressableScale } from '@/ui/PressableScale';

import { alertPeriodLabel } from './details-view-model';

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
  const { locale, messages } = useLocale();
  const palette = alertColors[alert.severity];
  return (
    <View style={[styles.entry, { backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: palette.background }]}>
        <Text style={[typography.label, { color: palette.text }]}>
          {messages.alerts.severity[alert.severity]}
        </Text>
      </View>
      <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
        {alert.event}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {messages.alerts.issuedBy(alert.sender)}
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {alertPeriodLabel(alert, timeZone, now, timeZoneOffset, locale)}
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
  const { messages } = useLocale();
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
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={messages.common.close}
          onPress={onClose}
          style={[
            styles.close,
            { backgroundColor: colors.accentFill, marginBottom: insets.bottom + spacing.md },
          ]}
        >
          <Text style={[typography.bodyStrong, { color: colors.onAccent }]}>
            {messages.common.close}
          </Text>
        </PressableScale>
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
