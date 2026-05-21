import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

interface HexLoaderProps {
  size?: number;
  color?: string;
}

const CLUSTER: Array<{ x: number; y: number; delay: number }> = [
  { x: 0, y: 0, delay: 0 },
  { x: 10, y: -6, delay: 80 },
  { x: 10, y: 6, delay: 160 },
  { x: 0, y: 12, delay: 240 },
  { x: -10, y: 6, delay: 320 },
  { x: -10, y: -6, delay: 400 },
  { x: 0, y: -12, delay: 480 },
];

const CYCLE_TAIL_MS = CLUSTER.length * 80;

function HexDot({
  x,
  y,
  delay,
  dotSize,
  color,
}: {
  x: number;
  y: number;
  delay: number;
  dotSize: number;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 420, useNativeDriver: true }),
        Animated.delay(CYCLE_TAIL_MS),
      ]),
    ).start();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          transform: [{ translateX: x }, { translateY: y }],
        },
      ]}
    />
  );
}

export default function HexLoader({ size = 44, color = colors.splashDot }: HexLoaderProps) {
  const dotSize = size / 9;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {CLUSTER.map((d, i) => (
        <HexDot key={i} x={d.x} y={d.y} delay={d.delay} dotSize={dotSize} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute' },
});
