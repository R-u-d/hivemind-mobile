import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import MapView, {
  Marker,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from 'react-native-maps';

import { colors, fonts, radius, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  defaultCenter?: { lat: number; lng: number };
  defaultCenterLabel?: string;
}

// Coarse region centres derived from the IANA timezone area prefix.
// No permission or network call needed — Intl is available in Hermes.
const TIMEZONE_REGIONS: Record<string, { latitude: number; longitude: number; delta: number }> = {
  Africa: { latitude: 7, longitude: 21, delta: 45 },
  America: { latitude: 45, longitude: -100, delta: 50 },
  Antarctica: { latitude: -75, longitude: 0, delta: 30 },
  Arctic: { latitude: 80, longitude: 0, delta: 20 },
  Asia: { latitude: 35, longitude: 95, delta: 50 },
  Atlantic: { latitude: 25, longitude: -30, delta: 50 },
  Australia: { latitude: -25, longitude: 133, delta: 25 },
  Europe: { latitude: 50, longitude: 15, delta: 25 },
  Indian: { latitude: 15, longitude: 75, delta: 35 },
  Pacific: { latitude: 0, longitude: 160, delta: 50 },
  US: { latitude: 45, longitude: -100, delta: 50 },
};

function getTimezoneRegion() {
  try {
    const area = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0];
    const r = TIMEZONE_REGIONS[area];
    if (r)
      return {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: r.delta,
        longitudeDelta: r.delta,
      };
  } catch {}
  return null;
}

// Resolved once at module load — timezone doesn't change during a session.
const DEFAULT_REGION = getTimezoneRegion() ?? {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

const CITY_DELTA = 0.15;

function PinDot() {
  return (
    <Svg width={38} height={38} viewBox="0 0 38 38">
      <Circle cx="19" cy="19" r="18" fill={colors.primary} opacity={0.13} />
      <Circle cx="19" cy="19" r="11.5" fill="#fff" />
      <Circle cx="19" cy="19" r="9" fill={colors.primary} />
      <Circle cx="19" cy="19" r="3.2" fill="#fff" />
    </Svg>
  );
}

export default function LocationPickerMap({
  lat,
  lng,
  onPick,
  defaultCenter,
  defaultCenterLabel,
}: LocationPickerMapProps) {
  const themeColors = useTheme();
  const mapRef = useRef<MapView>(null);
  const hasPin = lat !== null && lng !== null;

  const initialRegion = (() => {
    if (hasPin) return { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    if (defaultCenter)
      return {
        latitude: defaultCenter.lat,
        longitude: defaultCenter.lng,
        latitudeDelta: CITY_DELTA,
        longitudeDelta: CITY_DELTA,
      };
    return DEFAULT_REGION;
  })();

  // Animate to pin when coords change from outside (e.g. address geocoding).
  useEffect(() => {
    if (lat !== null && lng !== null) {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        350,
      );
    }
  }, [lat, lng]);

  // Animate to community location when it arrives, but only if no pin is set.
  useEffect(() => {
    if (!hasPin && defaultCenter) {
      mapRef.current?.animateToRegion(
        {
          latitude: defaultCenter.lat,
          longitude: defaultCenter.lng,
          latitudeDelta: CITY_DELTA,
          longitudeDelta: CITY_DELTA,
        },
        350,
      );
    }
  }, [defaultCenter, hasPin]);

  const handlePress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPick(latitude, longitude);
  };

  const handleDragEnd = (e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPick(latitude, longitude);
  };

  const hintText = hasPin
    ? 'Tap to move the pin'
    : defaultCenterLabel
      ? `Near ${defaultCenterLabel} · tap to drop a pin`
      : 'Tap the map to drop a pin';

  return (
    <View style={[styles.wrap, { borderColor: themeColors.borderSoft }]}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} onPress={handlePress}>
        {hasPin ? (
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            draggable
            onDragEnd={handleDragEnd}
          >
            <PinDot />
          </Marker>
        ) : null}
      </MapView>
      <View style={[styles.hint, { backgroundColor: themeColors.surface }]} pointerEvents="none">
        <Text
          style={[typography.caption, { color: themeColors.textMuted, fontFamily: fonts.medium }]}
        >
          {hintText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: { height: 180 },
  hint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
});
