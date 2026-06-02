import { StyleSheet, View } from 'react-native';

import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

export default function FeedSkeleton() {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      {/* Alternating post/event skeletons */}
      {[false, true, false, false, true, false].map((isEvent, i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.accentBar, { backgroundColor: colors.border }]} />
          <View style={styles.inner}>
            <SkeletonBox width="55%" height={11} borderRadius={4} />
            {isEvent ? (
              <>
                <SkeletonBox width="80%" height={16} borderRadius={4} />
                <SkeletonBox width="65%" height={11} borderRadius={4} />
              </>
            ) : (
              <View style={styles.postRow}>
                <SkeletonBox width={28} height={28} borderRadius={999} />
                <View style={styles.postText}>
                  <SkeletonBox width="40%" height={12} borderRadius={4} />
                  <SkeletonBox width="90%" height={12} borderRadius={4} />
                  <SkeletonBox width="70%" height={12} borderRadius={4} />
                </View>
              </View>
            )}
          </View>
        </View>
      ))}
      <LoadingTail caption="Loading your feed…" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.xs },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  accentBar: { width: 3, flexShrink: 0 },
  inner: { flex: 1, padding: spacing.md, gap: spacing.sm },
  postRow: { flexDirection: 'row', gap: spacing.sm },
  postText: { flex: 1, gap: 6 },
});
