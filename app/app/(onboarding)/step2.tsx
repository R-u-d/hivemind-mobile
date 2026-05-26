import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import CommunityIcon from '@/components/CommunityIcon';
import EmptyState from '@/components/EmptyState';
import GhostButton from '@/components/GhostButton';
import PrimaryButton from '@/components/PrimaryButton';
import SkeletonBox from '@/components/SkeletonBox';
import TypePill from '@/components/TypePill';
import { useCommunities } from '@/hooks/useCommunities';
import { useJoinCommunity, useLeaveCommunity } from '@/hooks/useJoinCommunity';
import { type CommunityType, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

interface CommunityCardProps {
  community: Community;
  joined: boolean;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
}

const CommunityCard = memo(function CommunityCard({
  community,
  joined,
  onJoin,
  onLeave,
}: CommunityCardProps) {
  const colors = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
      accessibilityLabel={community.name}
      accessibilityRole="button"
    >
      <CommunityIcon type={community.type} size={44} borderRadius={12} />
      <View style={styles.cardBody}>
        <Text
          style={[typography.body, { color: colors.text, fontFamily: fonts.medium }]}
          numberOfLines={1}
        >
          {community.name}
        </Text>
        <View style={styles.cardMeta}>
          <TypePill type={community.type} size="sm" />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {community.member_count.toLocaleString()} members
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => (joined ? onLeave(community.id) : onJoin(community.id))}
        accessibilityLabel={joined ? 'Joined' : 'Join'}
        accessibilityRole="button"
        accessibilityState={{ checked: joined }}
        style={[
          styles.joinBtn,
          joined
            ? {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                paddingHorizontal: 14,
              }
            : {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                paddingHorizontal: 16,
              },
        ]}
      >
        {joined && <Ionicons name="checkmark" size={13} color={colors.onPrimary} />}
        <Text
          style={[
            styles.joinBtnText,
            { color: joined ? colors.onPrimary : colors.primary, fontFamily: fonts.medium },
          ]}
        >
          {joined ? 'Joined' : 'Join'}
        </Text>
      </Pressable>
    </View>
  );
});

const ListSeparator = () => <View style={styles.separator} />;

export default function OnboardingStep2() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { types: typesParam } = useLocalSearchParams<{ types: string }>();
  const types = (() => {
    try {
      return JSON.parse(typesParam ?? '[]') as CommunityType[];
    } catch {
      return [] as CommunityType[];
    }
  })();

  const { data, isLoading, isError, refetch } = useCommunities({ types });
  const communities = data?.pages.flatMap(p => p.results) ?? [];
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const { mutate: joinMutate } = useJoinCommunity(
    useCallback((id: string) => setJoinedIds(prev => new Set([...prev, id])), []),
    useCallback(
      (id: string) =>
        setJoinedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      [],
    ),
  );

  const { mutate: leaveMutate } = useLeaveCommunity(
    useCallback(
      (id: string) =>
        setJoinedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      [],
    ),
    useCallback((id: string) => setJoinedIds(prev => new Set([...prev, id])), []),
  );

  const handleContinue = () => {
    if (joinedIds.size === 0) return;
    router.push({
      pathname: '/(onboarding)/step3',
      params: { joinedIds: JSON.stringify([...joinedIds]) },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(onboarding)/step3',
      params: { joinedIds: '[]' },
    });
  };

  const buttonLabel = joinedIds.size > 0 ? `Continue · ${joinedIds.size} joined` : 'Continue';

  const renderList = () => {
    if (isLoading) {
      return (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map(i => (
            <SkeletonBox key={i} height={72} borderRadius={radius.lg} />
          ))}
        </View>
      );
    }
    if (isError) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't reach the hive"
          message="Check your connection — we'll be right back."
          action={<GhostButton label="Try again" onPress={() => refetch()} />}
        />
      );
    }
    if (!communities || communities.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="No matches yet"
          message="We couldn't find communities for those interests."
          action={
            <PrimaryButton label="Create one" onPress={() => router.push('/(onboarding)/step2')} />
          }
        />
      );
    }
    const renderItem: ListRenderItem<Community> = ({ item }) => (
      <CommunityCard
        community={item}
        joined={joinedIds.has(item.id)}
        onJoin={joinMutate}
        onLeave={leaveMutate}
      />
    );
    return (
      <FlashList
        data={communities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        renderItem={renderItem}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14 }}>
            Back
          </Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          <Text style={{ color: colors.primary }}>{'2'}</Text>
          {' / 3'}
        </Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[typography.display, { color: colors.text }]}>Find your hive</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          {"Suggested based on what you're into."}
        </Text>
      </View>

      <View style={styles.listWrap}>{renderList()}</View>

      <View style={[styles.footer, { paddingBottom: Math.max(spacing.lg, bottom) }]}>
        <Pressable
          onPress={handleSkip}
          accessibilityLabel="Skip for now"
          accessibilityRole="button"
          style={styles.skipBtn}
        >
          <Text style={[typography.caption, { color: colors.textMuted, fontFamily: fonts.medium }]}>
            Skip for now
          </Text>
        </Pressable>
        <PrimaryButton
          label={buttonLabel}
          onPress={handleContinue}
          disabled={joinedIds.size === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  titleBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 6,
  },
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  skeletonWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  joinBtn: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  joinBtnText: { fontSize: 13 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: 12,
  },
  skipBtn: { alignSelf: 'center', paddingVertical: 4 },
  separator: { height: 10 },
});
