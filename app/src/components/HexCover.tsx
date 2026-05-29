import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Pattern, Polygon, Rect, Stop } from 'react-native-svg';

import { communityTypeColors } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { CommunityType } from '@/theme';

interface HexCoverProps {
  type: CommunityType;
  height: number;
}

export default function HexCover({ type, height }: HexCoverProps) {
  const colors = useTheme();
  const typeColor = communityTypeColors[type]?.primary ?? colors.primary;

  return (
    <View style={[styles.wrap, { height, backgroundColor: typeColor }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <Pattern id="hc-hex" width={31.17} height={54} patternUnits="userSpaceOnUse">
              <Polygon
                points="15.585,0 31.17,9 31.17,27 15.585,36 0,27 0,9"
                fill="none"
                stroke="#fff"
                strokeWidth={0.8}
              />
              <Polygon
                points="0,27 15.585,36 15.585,54 0,63 -15.585,54 -15.585,36"
                fill="none"
                stroke="#fff"
                strokeWidth={0.8}
              />
              <Polygon
                points="31.17,27 46.755,36 46.755,54 31.17,63 15.585,54 15.585,36"
                fill="none"
                stroke="#fff"
                strokeWidth={0.8}
              />
            </Pattern>
            <LinearGradient id="hc-fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.22} />
              <Stop offset="0.55" stopColor="#fff" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#fff" stopOpacity={1} />
            </LinearGradient>
            <Mask id="hc-mask">
              <Rect width={400} height={240} fill="url(#hc-fade)" />
            </Mask>
          </Defs>
          <Rect width={400} height={240} fill="url(#hc-hex)" mask="url(#hc-mask)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden' },
});
