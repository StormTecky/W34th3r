import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, touch, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { PressableScale } from '@/ui/PressableScale';

export interface SegmentOption<T extends string> {
  value: T;
  /** Short visible text, e.g. "°F". */
  label: string;
  /** Spoken name, e.g. "Fahrenheit". Defaults to the label. */
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group for screen readers, e.g. "Temperature". */
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}

/** A single-choice control: exactly one option is selected, every option is a 44-point target. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, { borderColor: colors.controlBorder, backgroundColor: colors.surface }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ checked: selected, selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && { backgroundColor: colors.accentFill }]}
          >
            <Text
              style={[typography.bodyStrong, { color: selected ? colors.onAccent : colors.text }]}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  option: {
    flex: 1,
    minHeight: touch.minTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
