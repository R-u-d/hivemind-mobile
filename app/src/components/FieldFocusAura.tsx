import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

const PRIMARY_RGB = '109, 40, 217'; // colors.primary #6D28D9

// The same two-layer breathing purple aura FormField renders on focus, lifted
// into a wrapper so non-TextInput fields (pickers, date/time) can reuse it.
// Wrap a bordered child; the aura fades/breathes in while `active` is true.

export default function FieldFocusAura({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, glow]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, breath]);

  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <View style={styles.haloFrame}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOuter,
          {
            backgroundColor: `rgba(${PRIMARY_RGB}, 0.07)`,
            opacity: Animated.multiply(glow, breathOpacity),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.glowInner, { backgroundColor: `rgba(${PRIMARY_RGB}, 0.16)`, opacity: glow }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  haloFrame: { position: 'relative' },
  glowOuter: {
    position: 'absolute',
    top: -7,
    left: -7,
    right: -7,
    bottom: -7,
    borderRadius: radius.input + 7,
  },
  glowInner: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: radius.input + 3,
  },
});
