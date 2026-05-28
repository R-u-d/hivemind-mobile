import { StyleSheet, View } from 'react-native';

import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface EventListSkeletonProps {
  rows?: number;
  showTail?: boolean;
}

export default function EventListSkeleton({ rows = 5, showTail = true }: EventListSkeletonProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Date column */}
          <View style={styles.dateCol}>
            <SkeletonBox width={28} height={10} borderRadius={3} />
            <SkeletonBox width={36} height={30} borderRadius={4} />
          </View>
          {/* Content */}
          <View style={styles.content}>
            <SkeletonBox width={64} height={20} borderRadius={radius.full} />
            <SkeletonBox width="80%" height={14} borderRadius={4} />
            <SkeletonBox width="55%" height={11} borderRadius={4} />
            <View style={styles.metaRow}>
              <SkeletonBox width={60} height={11} borderRadius={4} />
              <SkeletonBox width={80} height={11} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
      {showTail ? <LoadingTail caption="Loading the dance card…" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, paddingTop: spacing.sm },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dateCol: { width: 48, alignItems: 'center', gap: 6, paddingTop: 2 },
  content: { flex: 1, gap: 6 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
});
