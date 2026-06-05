import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

interface HiveLogoProps {
  size?: number;
  color?: string;
  animated?: boolean;
  glow?: boolean;
  style?: ViewStyle;
}

// "Hex Resonance" mark: a stroked outer hex ring (slow rotation) wrapping a
// solid inner hex core (gentle breath). Geometry matches the design prototype's
// HMLogoMark (32×32 viewBox). The two parts live on separate layers so the
// rotation/scale can run on the native driver.
export default function HiveLogo({
  size = 32,
  color = colors.primary,
  animated = false,
  glow = false,
  style,
}: HiveLogoProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 11000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    spinLoop.start();
    breatheLoop.start();
    return () => {
      spinLoop.stop();
      breatheLoop.stop();
    };
  }, [animated, spin, breathe]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  const layer: ViewStyle = { position: 'absolute', width: size, height: size };

  return (
    <View
      style={[
        { width: size, height: size },
        glow && {
          shadowColor: colors.primaryAmethyst,
          shadowOpacity: 0.9,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      <Animated.View style={[layer, animated ? { transform: [{ rotate }] } : null]}>
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path
            d="M16 2.5l11.7 6.75v13.5L16 29.5 4.3 22.75V9.25L16 2.5z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          {animated && <Circle cx={16} cy={3.6} r={0.85} fill={color} opacity={0.85} />}
          {animated && <Circle cx={26.2} cy={21.6} r={0.85} fill={color} opacity={0.5} />}
          {animated && <Circle cx={5.8} cy={21.6} r={0.85} fill={color} opacity={0.5} />}
        </Svg>
      </Animated.View>

      <Animated.View style={[layer, animated ? { transform: [{ scale }] } : null]}>
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M16 10l5.2 3v6L16 22l-5.2-3v-6L16 10z" fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
