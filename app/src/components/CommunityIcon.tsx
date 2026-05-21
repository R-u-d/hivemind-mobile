import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { communityTypeColors, type CommunityType } from '@/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<CommunityType, IoniconsName> = {
  student: 'school-outline',
  gamer: 'game-controller-outline',
  hobby: 'color-palette-outline',
  sports: 'football-outline',
  music: 'musical-notes-outline',
  books: 'book-outline',
  outdoors: 'leaf-outline',
  travel: 'airplane-outline',
  photo: 'camera-outline',
  foodie: 'restaurant-outline',
  tech: 'code-slash-outline',
};

interface CommunityIconProps {
  type: CommunityType;
  size?: number;
  borderRadius?: number;
}

export default function CommunityIcon({ type, size = 34, borderRadius = 10 }: CommunityIconProps) {
  const palette = communityTypeColors[type];
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius, backgroundColor: palette.background },
      ]}
    >
      <Ionicons name={ICONS[type]} size={Math.floor(size * 0.5)} color={palette.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
