import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { communityTypeColors, type CommunityType } from '@/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<CommunityType, IoniconsName> = {
  study: 'school-outline',
  gaming: 'game-controller-outline',
  sports: 'football-outline',
  creative: 'color-palette-outline',
  social: 'people-outline',
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
