import { Pressable, StyleSheet } from 'react-native';

import { radii, touch } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Required: an icon alone has no accessible name. */
  label: string;
  onPress: () => void;
  color: string;
  filled?: boolean;
  /** Fill behind the icon, for a chip-style button. */
  background?: string;
  disabled?: boolean;
  testID?: string;
}

/** A 44-point round icon button with an accessible name. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  filled,
  background,
  disabled = false,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        background !== undefined && { backgroundColor: background },
        {
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <Icon name={icon} color={color} filled={filled} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
