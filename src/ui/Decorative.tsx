import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export interface DecorativeProps {
  children: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hides purely decorative graphics from screen readers.
 *
 * The accessibility props live on a `View`, not on the SVG itself: on the web an `<svg>` is a DOM
 * element that does not know React Native's props and logs a warning for each one.
 */
export function Decorative({ children, testID, style }: DecorativeProps) {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      {children}
    </View>
  );
}
