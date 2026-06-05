import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

export function useShakeAnimation() {
  const anim = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [anim]);

  const style = { transform: [{ translateX: anim }] };

  return { style, trigger };
}
