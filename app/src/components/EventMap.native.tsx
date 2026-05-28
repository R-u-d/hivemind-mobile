import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';

import { colors, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface EventMapProps {
  lat: number;
  lng: number;
  title: string;
  onPress: () => void;
}

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

export default function EventMap({ lat, lng, title, onPress }: EventMapProps) {
  const themeColors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open location in Maps"
      style={[styles.wrap, { borderColor: themeColors.borderSoft }]}
    >
      <MapView
        style={styles.map}
        region={{ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        liteMode
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title={title}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <PinDot />
        </Marker>
      </MapView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: { height: 140 },
});
