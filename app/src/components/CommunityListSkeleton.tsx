import { StyleSheet, View } from 'react-native';

import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface CommunityListSkeletonProps {
  rows?: number;
  showTail?: boolean;
}

export default function CommunityListSkeleton({
  rows = 6,
  showTail = true,
}: CommunityListSkeletonProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <SkeletonBox width={44} height={44} borderRadius={12} />
          <View style={styles.textCol}>
            <SkeletonBox width="60%" height={14} borderRadius={4} />
            <SkeletonBox width="35%" height={11} borderRadius={4} />
          </View>
          <SkeletonBox width={72} height={32} borderRadius={999} />
        </View>
      ))}
      {showTail ? <LoadingTail caption="Scouting hives…" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingHorizontal: spacing.base, paddingTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  textCol: { flex: 1, gap: 6 },
});
