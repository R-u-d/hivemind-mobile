import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type DimensionValue, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeContext';

interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Calm two-tone breath: fill cross-fades between `border` and `borderSoft`
// while a static vertical sheen (top highlight → bottom shade) gives the
// surface subtle depth.

const BREATH_MS = 1400;

export default function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  const colors = useTheme();
  const [boxW, setBoxW] = useState(0);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: BREATH_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const backgroundColor = t.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.borderSoft],
  });

  return (
    <Animated.View
      onLayout={e => setBoxW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius, backgroundColor, overflow: 'hidden' }, style]}
    >
      {boxW > 0 ? (
        <Svg
          width={boxW}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="sk-sheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.05} />
            </LinearGradient>
          </Defs>
          <Rect width={boxW} height={height} fill="url(#sk-sheen)" />
        </Svg>
      ) : null}
    </Animated.View>
  );
}
