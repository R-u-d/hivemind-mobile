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
}

// Broad default view (continental US) until the user drops a pin.
const DEFAULT_REGION = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

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

export default function LocationPickerMap({ lat, lng, onPick }: LocationPickerMapProps) {
  const themeColors = useTheme();
  const mapRef = useRef<MapView>(null);
  const hasPin = lat !== null && lng !== null;

  // Recenter when coords change from outside (e.g. address geocoding).
  useEffect(() => {
    if (lat !== null && lng !== null) {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        350,
      );
    }
  }, [lat, lng]);

  const handlePress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPick(latitude, longitude);
  };

  const handleDragEnd = (e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPick(latitude, longitude);
  };

  return (
    <View style={[styles.wrap, { borderColor: themeColors.borderSoft }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          hasPin
            ? { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : DEFAULT_REGION
        }
        onPress={handlePress}
      >
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
          {hasPin ? 'Tap to move the pin' : 'Tap the map to drop a pin'}
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
