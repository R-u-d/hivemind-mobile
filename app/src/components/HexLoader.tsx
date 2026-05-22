import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { colors } from '@/theme';

interface HexLoaderProps {
  size?: number;
  color?: string;
}

// 7-cell honeycomb (center + ring of 6) where each hexagon pulses in a
// staggered rhythm — mirrors the design prototype's HMHexLoader. Reference
// geometry is an 80×80 box; everything scales from `size`.
const REF = 80;
const RING_RADIUS = 20;
const HEX_RADIUS = 7;

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

function HexCell({
  cx,
  cy,
  cell,
  hexR,
  delay,
  color,
}: {
  cx: number;
  cy: number;
  cell: number;
  hexR: number;
  delay: number;
  color: string;
}) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: 880, useNativeDriver: true }),
      ]),
    );
    const anim = Animated.sequence([Animated.delay(delay), pulse]);
    anim.start();
    return () => anim.stop();
  }, [delay, p]);

  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - cell / 2,
        top: cy - cell / 2,
        width: cell,
        height: cell,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Svg width={cell} height={cell}>
        <Polygon points={hexPoints(cell / 2, cell / 2, hexR)} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export default function HexLoader({ size = 44, color = colors.splashDot }: HexLoaderProps) {
  const scale = size / REF;
  const center = size / 2;
  const ringR = RING_RADIUS * scale;
  const hexR = HEX_RADIUS * scale;
  const cell = Math.ceil(hexR * 2) + 2;

  const cells = [{ cx: center, cy: center, delay: 0 }];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    cells.push({
      cx: center + ringR * Math.cos(a),
      cy: center + ringR * Math.sin(a),
      delay: (0.2 + i * 0.13) * 1000,
    });
  }

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {cells.map((c, i) => (
        <HexCell
          key={i}
          cx={c.cx}
          cy={c.cy}
          cell={cell}
          hexR={hexR}
          delay={c.delay}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
});
