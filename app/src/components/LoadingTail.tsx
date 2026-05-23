import { StyleSheet, Text, View } from 'react-native';

import HexLoader from '@/components/HexLoader';
import { fonts } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface LoadingTailProps {
  caption: string;
  size?: number;
}

// Canonical loading-state tail per the design prototype's
// `HMScreenFeedLoading` (`design/screens-main.jsx:603-612`): a small purple
// HexLoader centered above a muted caption, rendered as the last child of a
// skeleton group to terminate it.
//
// Caption picks for screens not yet built (use these when those screens land
// instead of re-coining):
//   feed              → 'Catching the buzz…'
//   discover          → 'Scouting hives…'
//   events list       → 'Loading the dance card…'
//   community detail  → 'Opening the hive…'
//   channel detail    → 'Tuning the channel…'
//   event detail      → 'Loading the gathering…'

export default function LoadingTail({ caption, size = 40 }: LoadingTailProps) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <HexLoader size={size} color={colors.primary} />
      <Text
        style={[styles.caption, { color: colors.textMuted, fontFamily: fonts.regular }]}
        accessibilityLabel={caption}
      >
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 18,
    paddingBottom: 8,
  },
  caption: { fontSize: 12, letterSpacing: 0.2 },
});
