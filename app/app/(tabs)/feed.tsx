import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import { spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

export default function FeedScreen() {
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.text }]}>Feed</Text>
      </View>

      <View style={styles.centerFill}>
        <EmptyState
          icon="newspaper-outline"
          title="Feed coming soon"
          message="Activity from your communities will appear here."
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  centerFill: { flex: 1 },
});
