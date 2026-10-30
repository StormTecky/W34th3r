import { useRef, type ReactNode } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

export interface GrabbableProps {
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Position, tilt and lift of a grabbed element, with the pointer handlers that drive them. */
function useGrab() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(1);
  const start = useRef({ pageX: 0, pageY: 0 });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${x.value * motion.grabTilt}deg` },
      { scale: lift.value },
    ],
  }));

  const grab = ({ nativeEvent }: GestureResponderEvent) => {
    start.current = { pageX: nativeEvent.pageX, pageY: nativeEvent.pageY };
    lift.set(withSpring(motion.popScale, motion.spring.press));
  };
  const follow = ({ nativeEvent }: GestureResponderEvent) => {
    x.set(nativeEvent.pageX - start.current.pageX);
    y.set(nativeEvent.pageY - start.current.pageY);
  };
  const release = () => {
    x.set(withSpring(0, motion.spring.pop));
    y.set(withSpring(0, motion.spring.pop));
    lift.set(withSpring(1, motion.spring.press));
  };

  return { style, grab, follow, release };
}

/**
 * Something to play with: grab it and it follows the finger or mouse in every direction, lifting a
 * little and turning with the sideways drag; let go and it springs back home with a bounce. It
 * cannot be grabbed when the OS asks for reduced motion.
 */
export function Grabbable({ testID, style, children }: GrabbableProps) {
  const reducedMotion = useReducedMotion();
  const grabbed = useGrab();

  return (
    <Animated.View
      testID={testID}
      onStartShouldSetResponder={() => !reducedMotion}
      onMoveShouldSetResponder={() => !reducedMotion}
      // Keep hold until the pointer lets go, even over scrollable content.
      onResponderTerminationRequest={() => false}
      onResponderGrant={grabbed.grab}
      onResponderMove={grabbed.follow}
      onResponderRelease={grabbed.release}
      onResponderTerminate={grabbed.release}
      style={[style, grabbed.style]}
    >
      {children}
    </Animated.View>
  );
}
