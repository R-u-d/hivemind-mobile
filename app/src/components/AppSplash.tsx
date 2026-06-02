import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Mask,
  Pattern,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors, fonts } from '@/theme';
import HexLoader from '@/components/HexLoader';
import HiveLogo from '@/components/HiveLogo';

interface Props {
  onDone: () => void;
}

const VISIBLE_MS = 1800;
const FADE_MS = 320;

// Honeycomb tile in a 600×900 reference space, tiled via an SVG <Pattern>.
const HEX_W = 31.17;

export default function AppSplash({ onDone }: Props) {
  const { width: W, height: H } = Dimensions.get('window');

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    haloLoop.start();

    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(onDone);
    }, VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      haloLoop.stop();
    };
  }, [containerOpacity, halo, logoOpacity, logoScale, onDone]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Radial-gradient backdrop */}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
        <Defs>
          <RadialGradient
            id="hm-bg"
            cx={W * 0.5}
            cy={H * 0.36}
            rx={W * 1.2}
            ry={H * 0.8}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.splashGradient} />
            <Stop offset="0.5" stopColor={colors.splashGradientMid} />
            <Stop offset="1" stopColor={colors.splashBg} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#hm-bg)" />
      </Svg>

      {/* Honeycomb lying flat and receding, fading out toward the top */}
      <View style={styles.hexWrapper} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <Pattern
              id="hm-hex"
              x={0}
              y={0}
              width={HEX_W}
              height={54}
              patternUnits="userSpaceOnUse"
            >
              <Polygon
                points="15.585,0 31.17,9 31.17,27 15.585,36 0,27 0,9"
                fill="none"
                stroke={colors.splashDot}
                strokeWidth={0.5}
              />
              <Polygon
                points="0,27 15.585,36 15.585,54 0,63 -15.585,54 -15.585,36"
                fill="none"
                stroke={colors.splashDot}
                strokeWidth={0.5}
              />
              <Polygon
                points="31.17,27 46.755,36 46.755,54 31.17,63 15.585,54 15.585,36"
                fill="none"
                stroke={colors.splashDot}
                strokeWidth={0.5}
              />
            </Pattern>
            <LinearGradient id="hm-vignette" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity={0} />
              <Stop offset="0.12" stopColor="#fff" stopOpacity={0.05} />
              <Stop offset="0.22" stopColor="#fff" stopOpacity={0.18} />
              <Stop offset="0.32" stopColor="#fff" stopOpacity={0.45} />
              <Stop offset="0.45" stopColor="#fff" stopOpacity={0.85} />
              <Stop offset="0.6" stopColor="#fff" stopOpacity={1} />
              <Stop offset="1" stopColor="#fff" stopOpacity={1} />
            </LinearGradient>
            <Mask id="hm-vmask">
              <Rect x={0} y={0} width={600} height={900} fill="url(#hm-vignette)" />
            </Mask>
          </Defs>
          <Rect width={600} height={900} fill="url(#hm-hex)" mask="url(#hm-vmask)" />
        </Svg>
      </View>

      {/* Logo + wordmark */}
      <Animated.View
        style={[styles.center, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <View style={styles.logoWrap}>
          <Animated.View
            style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
            pointerEvents="none"
          >
            <Svg width={320} height={320}>
              <Defs>
                <RadialGradient id="hm-halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.primaryAmethyst} stopOpacity={0.38} />
                  <Stop offset="0.38" stopColor={colors.primaryAmethyst} stopOpacity={0.15} />
                  <Stop offset="0.7" stopColor={colors.primaryAmethyst} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={320} height={320} fill="url(#hm-halo)" />
            </Svg>
          </Animated.View>
          <HiveLogo size={72} color={colors.splashFg} animated />
        </View>
        <Text style={styles.wordmark}>HiveMind</Text>
        <Text style={styles.tagline}>Join. Sync. Evolve.</Text>
      </Animated.View>

      {/* Hex-cluster loader */}
      <View style={styles.loaderWrap} pointerEvents="none">
        <HexLoader size={44} color={colors.splashDot} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.splashBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    overflow: 'hidden',
  },
  hexWrapper: {
    position: 'absolute',
    top: '-80%',
    left: '-40%',
    right: '-40%',
    bottom: '-40%',
    opacity: 0.11,
    transform: [{ perspective: 1100 }, { rotateX: '58deg' }],
  },
  center: { alignItems: 'center', gap: 18, marginTop: -40 },
  logoWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 320, height: 320, left: -124, top: -124 },
  wordmark: {
    fontSize: 34,
    letterSpacing: -0.6,
    color: colors.splashFg,
    fontFamily: fonts.medium,
  },
  tagline: {
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.splashTagline,
    fontFamily: fonts.regular,
  },
  loaderWrap: { position: 'absolute', bottom: 90 },
});
