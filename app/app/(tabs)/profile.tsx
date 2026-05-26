import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '@/components/Avatar';
import CommunityIcon from '@/components/CommunityIcon';
import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import StatCard from '@/components/StatCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

function ProfileSkeleton() {
  const colors = useTheme();
  const { top } = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: top + spacing.base }]}
    >
      <View style={styles.head}>
        <SkeletonBox width={68} height={68} borderRadius={34} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="40%" height={13} />
          <SkeletonBox width="90%" height={13} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <SkeletonBox height={72} style={{ flex: 1 }} borderRadius={radius.lg} />
        <SkeletonBox height={72} style={{ flex: 1 }} borderRadius={radius.lg} />
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.communityRow, { borderBottomColor: colors.borderSoft }]}>
          <SkeletonBox width={34} height={34} borderRadius={10} />
          <SkeletonBox width="60%" height={14} />
        </View>
      ))}
      <LoadingTail caption="Tidying your cell…" />
    </ScrollView>
  );
}

function CommunityListSkeleton() {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.communityRow, { borderBottomColor: colors.borderSoft }]}>
          <SkeletonBox width={34} height={34} borderRadius={10} />
          <SkeletonBox width="60%" height={14} />
        </View>
      ))}
    </View>
  );
}

const CommunityRow = memo(function CommunityRow({
  community,
  isLast,
}: {
  community: Community;
  isLast?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.communityRow,
        isLast && styles.lastRow,
        {
          borderBottomColor: colors.borderSoft,
          backgroundColor: pressed ? colors.surfaceSunk : 'transparent',
        },
      ]}
      onPress={() => router.push(`/community/${community.id}` as Href)}
      accessibilityLabel={`Open ${community.name} community`}
    >
      <CommunityIcon type={community.type} size={34} />
      <Text
        style={[styles.communityName, { color: colors.text, fontFamily: fonts.medium }]}
        numberOfLines={1}
      >
        {community.name}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
    </Pressable>
  );
});

export default function ProfileScreen() {
  const colors = useTheme();
  const { top } = useSafeAreaInsets();

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useCurrentUser();

  const { data: communities = [], isLoading: commLoading } = useMyCommunities();

  if (userLoading) return <ProfileSkeleton />;

  if (userError || !user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, paddingTop: top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorTitle, { color: colors.text, fontFamily: fonts.medium }]}>
          Failed to load profile
        </Text>
        <Pressable
          onPress={() => refetchUser()}
          style={[styles.retryBtn, { borderColor: colors.border }]}
          accessibilityLabel="Retry loading profile"
        >
          <Text style={[styles.retryText, { color: colors.primary, fontFamily: fonts.medium }]}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  const displayName = user.display_name || user.email;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: top + spacing.base }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.display, { color: colors.text }]}>Profile</Text>
        <Pressable
          onPress={() => router.push('/profile/edit')}
          style={styles.editBtn}
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="options-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.head}>
        <Avatar uri={user.avatar_url} name={displayName} size={68} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.displayName, { color: colors.text, fontFamily: fonts.medium }]}>
            {displayName}
          </Text>
          {user.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text
                style={[
                  styles.locationText,
                  { color: colors.textMuted, fontFamily: fonts.regular },
                ]}
              >
                {user.location}
              </Text>
            </View>
          ) : null}
          {user.bio ? (
            <Text style={[styles.bio, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              {user.bio}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Communities" value={communities.length} />
        <StatCard label="Events RSVP'd" value={0} />
      </View>

      <View>
        <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: fonts.medium }]}>
          My communities
        </Text>

        {commLoading ? (
          <>
            <CommunityListSkeleton />
            <LoadingTail caption="Counting your hives…" size={28} />
          </>
        ) : communities.length > 0 ? (
          <View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {communities.map((comm, i) => (
              <CommunityRow key={comm.id} community={comm} isLast={i === communities.length - 1} />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyComm,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="people-outline" size={40} color={colors.textFaint} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: fonts.medium }]}>
              No communities yet
            </Text>
            <Text
              style={[styles.emptyBody, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              Join a community to see it here.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Discover communities"
            >
              <Text style={[styles.ctaText, { color: colors.onPrimary, fontFamily: fonts.medium }]}>
                Discover communities
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.base, paddingBottom: spacing.xxxl, gap: spacing.base },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: { padding: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  displayName: { fontSize: 19, letterSpacing: -0.3, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  locationText: { fontSize: 12 },
  bio: { fontSize: 13, lineHeight: 13 * 1.45 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  communityName: { flex: 1, fontSize: 14 },
  emptyComm: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 15 },
  emptyBody: { fontSize: 13, textAlign: 'center' },
  ctaBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  ctaText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  errorTitle: { fontSize: 15 },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  retryText: { fontSize: 13 },
});
