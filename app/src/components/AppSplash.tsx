import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, fonts } from '@/theme';
import HexLoader from '@/components/HexLoader';

interface Props {
  onDone: () => void;
}

const VISIBLE_MS = 1800;
const FADE_MS = 320;

export default function AppSplash({ onDone }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(haloOpacity, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0.25, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();

    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(onDone);
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [containerOpacity, haloOpacity, logoOpacity, logoScale, onDone]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Lighter centre to approximate a radial gradient */}
      <View style={[StyleSheet.absoluteFill, styles.bgInner]} />

      {/* Hex tile pattern tilted into the floor */}
      <View style={styles.hexTileWrapper} pointerEvents="none">
        <Image
          source={require('../../assets/images/auth-bg.png')}
          style={styles.hexTile}
          resizeMode="repeat"
        />
      </View>

      {/* Logo + wordmark */}
      <Animated.View
        style={[styles.center, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.halo, { opacity: haloOpacity }]} />
          <MaterialCommunityIcons name="hexagon-outline" size={72} color={colors.splashFg} />
        </View>
        <Text style={styles.wordmark}>HiveMind</Text>
        <Text style={styles.tagline}>Join. Sync. Evolve.</Text>
      </Animated.View>

      {/* Hex cluster loader */}
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
  bgInner: {
    backgroundColor: colors.splashGradient,
    borderRadius: 9999,
    margin: '15%',
    opacity: 0.55,
  },
  hexTileWrapper: {
    ...StyleSheet.absoluteFillObject,
    top: '-80%',
    left: '-40%',
    right: '-40%',
    bottom: '-40%',
    transform: [{ perspective: 1100 }, { rotateX: '58deg' }],
  },
  hexTile: { flex: 1, opacity: 0.09 },
  center: { alignItems: 'center', gap: 16, marginTop: -40 },
  logoWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primaryAmethyst,
    shadowColor: colors.primaryAmethyst,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 60,
    shadowOpacity: 0.9,
  },
  wordmark: {
    fontSize: 30,
    letterSpacing: -0.5,
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
