import { StyleSheet, Text, View } from 'react-native';

import {
  communityTypeColors,
  communityTypeLabels,
  fonts,
  radius,
  type CommunityType,
} from '@/theme';

type Size = 'sm' | 'md';

interface TypePillProps {
  type: CommunityType;
  size?: Size;
  suffix?: string;
}

export default function TypePill({ type, size = 'sm', suffix }: TypePillProps) {
  const palette = communityTypeColors[type];
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: palette.background,
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? 8 : 10,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.primary }]} />
      <Text
        style={[
          styles.label,
          { color: palette.text, fontSize: small ? 11 : 12, fontFamily: fonts.medium },
        ]}
      >
        {communityTypeLabels[type]}{suffix ? ` · ${suffix}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: radius.full,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  label: { letterSpacing: 0.1 },
});
