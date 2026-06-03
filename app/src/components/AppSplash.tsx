import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '@/theme';
import HexLoader from '@/components/HexLoader';
import HiveLogo from '@/components/HiveLogo';

interface Props {
  onDone: () => void;
}

const VISIBLE_MS = 1800;
const FADE_MS = 320;

export default function AppSplash({ onDone }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

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
  }, [containerOpacity, halo, logoScale, onDone]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Single backdrop layer — gradient + 3D honeycomb baked into one WebP.
          One native-backed layer avoids the iOS Fabric two-layer compositing bug. */}
      <Image
        source={require('../../assets/images/splash-bg.webp')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessible={false}
      />

      {/* Logo + wordmark — JS layer, always visible above the single native backdrop */}
      <Animated.View style={[styles.center, { transform: [{ scale: logoScale }] }]}>
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
