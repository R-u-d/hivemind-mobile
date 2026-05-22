import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, communityTypeColors, fonts } from '@/theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

const PALETTE = Object.values(communityTypeColors).map(c => c.primary);

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const diameter = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={diameter}
        contentFit="cover"
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }

  return (
    <View
      style={[styles.circle, diameter, { backgroundColor: colorFromName(name) }]}
      accessibilityLabel={`${name}'s avatar`}
    >
      <Text style={[styles.text, { fontSize: Math.floor(size * 0.36), fontFamily: fonts.medium }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.onPrimary, letterSpacing: 0.5 },
});
