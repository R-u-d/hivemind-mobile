import { Ionicons } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';

import CommunityCard from '@/components/CommunityCard';
import CommunityListSkeleton from '@/components/CommunityListSkeleton';
import EmptyState from '@/components/EmptyState';
import FilterChips, { type FilterChipItem } from '@/components/FilterChips';
import HexLoader from '@/components/HexLoader';
import { useCommunities } from '@/hooks/useCommunities';
import { useJoinCommunity, useLeaveCommunity } from '@/hooks/useJoinCommunity';
import { communityTypeLabels, spacing, typography, type CommunityType } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community, CommunityPage } from '@/types/community';

type ChipValue = CommunityType | 'all';

interface InfiniteCommunityData {
  pages: CommunityPage[];
  pageParams: unknown[];
}

const CHIP_ITEMS: ReadonlyArray<FilterChipItem<ChipValue>> = [
  { value: 'all', label: 'All' },
  { value: 'study', label: communityTypeLabels.study },
  { value: 'gaming', label: communityTypeLabels.gaming },
  { value: 'sports', label: communityTypeLabels.sports },
  { value: 'creative', label: communityTypeLabels.creative },
  { value: 'social', label: communityTypeLabels.social },
];

export default function DiscoverScreen() {
  const colors = useTheme();
  const queryClient = useQueryClient();
  const listRef = useRef<FlashListRef<Community>>(null);
  useScrollToTop(listRef as never);
  const [active, setActive] = useState<ChipValue>('all');

  const typesArg = active === 'all' ? undefined : [active];
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useCommunities({ types: typesArg });

  const communities = useMemo(() => data?.pages.flatMap(p => p.results) ?? [], [data]);

  const patchPages = useCallback(
    (id: string, patch: (c: Community) => Community) => {
      queryClient.setQueriesData<InfiniteCommunityData>({ queryKey: ['communities'] }, old => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.map(c => (c.id === id ? patch(c) : c)),
          })),
        };
      });
    },
    [queryClient],
  );

  const {
    mutate: join,
    isPending: joinPending,
    variables: joinId,
  } = useJoinCommunity(
    id =>
      patchPages(id, c => ({
        ...c,
        is_member: true,
        member_count: c.member_count + 1,
      })),
    id =>
      patchPages(id, c => ({
        ...c,
        is_member: false,
        member_count: Math.max(0, c.member_count - 1),
      })),
  );

  const {
    mutate: leave,
    isPending: leavePending,
    variables: leaveId,
  } = useLeaveCommunity(
    id =>
      patchPages(id, c => ({
        ...c,
        is_member: false,
        member_count: Math.max(0, c.member_count - 1),
      })),
    id =>
      patchPages(id, c => ({
        ...c,
        is_member: true,
        member_count: c.member_count + 1,
      })),
  );

  const pendingId = joinPending ? joinId : leavePending ? leaveId : null;

  const handleCardPress = useCallback((id: string) => {
    // /community/[id] is not yet a registered route in expo-router's typed-routes table.
    // The cast is intentional and removable once the community-detail screen ships.
    router.push(`/community/${id}` as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Community }) => (
      <CommunityCard
        community={item}
        onPress={handleCardPress}
        onJoinPress={join}
        onLeavePress={leave}
        pendingId={pendingId}
      />
    ),
    [handleCardPress, join, leave, pendingId],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.text }]}>Discover</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new community"
          onPress={() => router.push('/community/create' as never)}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <Ionicons name="add" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <FilterChips items={CHIP_ITEMS} active={active} onChange={setActive} />

      {isLoading ? (
        <CommunityListSkeleton />
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't load communities"
          message="Pull down to try again."
        />
      ) : communities.length === 0 ? (
        <EmptyState
          icon={active === 'all' ? 'people-outline' : 'filter-outline'}
          title={
            active === 'all'
              ? 'No communities yet'
              : `No ${communityTypeLabels[active]} communities yet`
          }
        />
      ) : (
        <FlashList<Community>
          ref={listRef}
          data={communities}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={renderItem}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          onRefresh={refetch}
          refreshing={false}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <HexLoader size={28} color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search communities"
        onPress={() => router.push('/discover/search' as never)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="search" size={22} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconBtn: { padding: 4 },
  list: { padding: spacing.base, paddingBottom: 100 },
  footer: { paddingVertical: spacing.lg, alignItems: 'center' },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.base,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
