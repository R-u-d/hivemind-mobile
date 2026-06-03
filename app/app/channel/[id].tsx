import { Ionicons } from '@expo/vector-icons';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommunityIcon from '@/components/CommunityIcon';
import EmptyState from '@/components/EmptyState';
import EventCard from '@/components/EventCard';
import HexLoader from '@/components/HexLoader';
import LoadingTail from '@/components/LoadingTail';
import PostCard from '@/components/PostCard';
import SkeletonBox from '@/components/SkeletonBox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useChannelPosts, useCreatePost, useDeletePost } from '@/hooks/useChannelPosts';
import { useCommunityChannels } from '@/hooks/useCommunityChannels';
import { useCommunityDetail } from '@/hooks/useCommunityDetail';
import { useEvents } from '@/hooks/useEvents';
import { communityTypeColors, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Post } from '@/types/community';
import type { Event } from '@/types/event';

// Channel feed items: text posts and (in events channels) events, interleaved.
type FeedItem =
  | { type: 'post'; data: Post; ts: number }
  | { type: 'event'; data: Event; ts: number };

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChannelSkeleton() {
  return (
    <View style={{ flex: 1, padding: spacing.base, gap: spacing.md }}>
      {[80, 60, 100, 50, 90].map((h, i) => (
        <SkeletonBox key={i} width="100%" height={h} borderRadius={radius.lg} />
      ))}
      <LoadingTail caption="Tuning the channel…" />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChannelScreen() {
  const colors = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const rawParams = useLocalSearchParams<{ id: string; communityId: string }>();
  const channelId = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
  const communityId = Array.isArray(rawParams.communityId)
    ? rawParams.communityId[0]
    : rawParams.communityId;

  const flashListRef = useRef<FlashListRef<FeedItem>>(null);
  const pendingScrollRef = useRef(false);
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, []),
  );

  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const {
    data: community,
    isLoading: communityLoading,
    isError: communityError,
    refetch: refetchCommunity,
  } = useCommunityDetail(communityId ?? '');

  const { data: channelsData, isLoading: channelsLoading } = useCommunityChannels(
    communityId ?? '',
  );

  const { data: currentUser } = useCurrentUser();

  const channel = useMemo(
    () => channelsData?.results.find(c => c.id === channelId),
    [channelsData, channelId],
  );

  const {
    data: postsData,
    isLoading: postsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useChannelPosts(channelId ?? '', isFocused);

  const { mutate: createPost, isPending: createPending } = useCreatePost(
    channelId ?? '',
    currentUser
      ? {
          id: currentUser.id,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url,
        }
      : null,
  );

  const { mutate: deletePost } = useDeletePost(channelId ?? '');

  // Backend returns newest-first; scaleY(-1) on container renders newest at bottom
  const posts = useMemo(() => postsData?.pages.flatMap(p => p.results) ?? [], [postsData]);

  const isEventsChannel = channel?.channel_type === 'events';

  // Events channels surface their events interleaved with posts.
  const { data: eventsData } = useEvents(
    { channel: channelId ?? '' },
    !!channelId && isEventsChannel && isFocused,
  );
  const events = useMemo(() => eventsData?.pages.flatMap(p => p.results) ?? [], [eventsData]);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = posts.map(p => ({
      type: 'post',
      data: p,
      ts: new Date(p.created_at).getTime(),
    }));
    if (isEventsChannel) {
      for (const e of events) {
        items.push({ type: 'event', data: e, ts: new Date(e.created_at).getTime() });
      }
      items.sort((a, b) => b.ts - a.ts); // newest first, matching the inverted list
    }
    return items;
  }, [posts, events, isEventsChannel]);

  const accentColor = community ? communityTypeColors[community.type].primary : colors.primary;

  const isAnnouncementsChannel = channel?.channel_type === 'announcements';
  const showComposeBar = !!community?.is_member && !isAnnouncementsChannel;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || createPending) return;
    setText('');
    pendingScrollRef.current = true;
    createPost({ body: trimmed }, { onError: () => setText(trimmed) });
    inputRef.current?.focus();
  }, [text, createPending, createPost]);

  // Scroll to newest message after the optimistic post is rendered
  useEffect(() => {
    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [posts]);

  // ── Missing param guard ───────────────────────────────────────────────────

  if (!communityId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { backgroundColor: colors.bg, paddingTop: top }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: top + spacing.sm }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <EmptyState icon="alert-circle-outline" title="Something went wrong" />
        </View>
      </>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (communityError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { backgroundColor: colors.bg, paddingTop: top }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: top + spacing.sm }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </Pressable>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load channel"
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading channel"
                onPress={() => refetchCommunity()}
                style={[styles.retryBtn, { borderColor: colors.border }]}
              >
                <Text
                  style={[typography.caption, { color: colors.primary, fontFamily: fonts.medium }]}
                >
                  Try again
                </Text>
              </Pressable>
            }
          />
        </View>
      </>
    );
  }

  const isLoading = communityLoading || channelsLoading || postsLoading;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderSoft,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>
            #{channel?.name ?? '…'}
          </Text>
          <Text
            style={[typography.caption, { color: colors.textMuted, marginTop: -1 }]}
            numberOfLines={1}
          >
            {community?.name ?? ''}
          </Text>
        </View>

        {community && <CommunityIcon type={community.type} size={32} borderRadius={10} />}
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <ChannelSkeleton />
        ) : (
          <View style={styles.invertedContainer}>
            <FlashList<FeedItem>
              ref={flashListRef}
              data={feed}
              keyboardDismissMode="none"
              keyExtractor={item => `${item.type}:${item.data.id}`}
              renderItem={({ item }) => (
                <View style={styles.invertedItem}>
                  {item.type === 'event' ? (
                    <EventCard
                      event={item.data}
                      onPress={id => router.push(`/event/${id}` as never)}
                      hidePill
                    />
                  ) : (
                    <PostCard
                      post={item.data}
                      currentUserId={currentUser?.id}
                      accentColor={accentColor}
                      isAnnouncementsChannel={isAnnouncementsChannel}
                      onDelete={deletePost}
                    />
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <EmptyState
                    icon={isEventsChannel ? 'calendar-outline' : 'chatbubble-outline'}
                    title={isEventsChannel ? 'Nothing here yet' : 'No posts yet'}
                  />
                </View>
              }
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footerLoader}>
                    <HexLoader color={colors.primary} size={28} />
                  </View>
                ) : null
              }
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) fetchNextPage();
              }}
              onEndReachedThreshold={0.4}
              contentContainerStyle={{ paddingVertical: spacing.sm }}
            />
          </View>
        )}

        {/* Compose bar */}
        {showComposeBar && (
          <View
            style={[
              styles.composeBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.borderSoft,
                paddingBottom: bottom + spacing.sm,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={`Message #${channel?.name ?? 'channel'}…`}
              placeholderTextColor={colors.textFaint}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
              multiline={false}
              editable={!createPending}
              accessibilityLabel="Message input"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSunk,
                  color: colors.text,
                  fontFamily: fonts.regular,
                  opacity: createPending ? 0.5 : 1,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={handleSubmit}
              disabled={createPending || !text.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: createPending || !text.trim() ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerCenter: { flex: 1, minWidth: 0 },
  channelName: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2, fontFamily: fonts.medium },

  invertedContainer: { flex: 1, transform: [{ scaleY: -1 }] },
  invertedItem: { transform: [{ scaleY: -1 }] },
  emptyWrap: { transform: [{ scaleY: -1 }] },
  footerLoader: { alignItems: 'center', paddingVertical: spacing.md },

  composeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: 42,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  retryBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
