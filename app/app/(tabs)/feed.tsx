import { Ionicons } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';

import EmptyState from '@/components/EmptyState';
import FeedEventCard from '@/components/FeedEventCard';
import FeedPostCard from '@/components/FeedPostCard';
import FeedSkeleton from '@/components/FeedSkeleton';
import GhostButton from '@/components/GhostButton';
import HexLoader from '@/components/HexLoader';
import { useFeed } from '@/hooks/useFeed';
import { colors, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { FeedItem } from '@/types/feed';

function getItemType(item: FeedItem): string {
  return item.type;
}

function keyExtractor(item: FeedItem): string {
  return `${item.type}-${item.id}`;
}

export default function FeedScreen() {
  const themeColors = useTheme();
  const listRef = useRef<FlashListRef<FeedItem>>(null);
  useScrollToTop(listRef as never);

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useFeed();

  const items = useMemo(() => data?.pages.flatMap(p => p.results) ?? [], [data]);

  const handleEventPress = useCallback((id: string) => {
    router.push(`/event/${id}` as never);
  }, []);

  const handlePostPress = useCallback((channelId: string, communityId: string) => {
    router.push(`/channel/${channelId}?communityId=${communityId}` as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.type === 'event') {
        return <FeedEventCard item={item} onPress={handleEventPress} />;
      }
      return <FeedPostCard item={item} onPress={handlePostPress} />;
    },
    [handleEventPress, handlePostPress],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: themeColors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.display, { color: themeColors.text }]}>Feed</Text>
        <Ionicons
          name="notifications-outline"
          size={22}
          color={themeColors.ink}
          accessibilityLabel="Notifications"
        />
      </View>

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load feed"
            message="Check your connection and try again."
            action={<GhostButton label="Retry" onPress={refetch} />}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="newspaper-outline"
            title="Your feed is empty"
            message="Join communities to see posts and events here."
            action={
              <GhostButton
                label="Discover communities"
                onPress={() => router.push('/(tabs)/discover' as never)}
              />
            }
          />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <HexLoader color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
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
  listContent: { paddingBottom: 100, paddingTop: spacing.xs },
  footer: { alignItems: 'center', paddingVertical: spacing.lg },
});
