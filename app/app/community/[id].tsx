import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';

import EmptyState from '@/components/EmptyState';
import HexCover from '@/components/HexCover';
import LoadingTail from '@/components/LoadingTail';
import MembersSheet from '@/components/MembersSheet';
import SkeletonBox from '@/components/SkeletonBox';
import TypePill from '@/components/TypePill';
import { useCommunityChannels, useDeleteChannel } from '@/hooks/useCommunityChannels';
import { useCommunityDetail } from '@/hooks/useCommunityDetail';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useJoinCommunity, useLeaveCommunity } from '@/hooks/useJoinCommunity';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Channel, Community, CommunityDetail, CommunityPage } from '@/types/community';

const COVER_HEIGHT = 168;
const CHANNEL_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  announcements: 'megaphone-outline',
  general: 'chatbubble-outline',
  events: 'calendar-outline',
  media: 'image-outline',
  help: 'help-circle-outline',
};

interface InfiniteCommunityListData {
  pages: CommunityPage[];
  pageParams: unknown[];
}

// ── Channel row ───────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  onPress,
  canManage,
  onDelete,
}: {
  channel: Channel;
  onPress: (id: string) => void;
  canManage: boolean;
  onDelete: (id: string) => void;
}) {
  const colors = useTheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const iconName = CHANNEL_ICONS[channel.channel_type] ?? 'chatbubble-outline';

  function handleLongPress() {
    if (!canManage) return;
    const comingSoon = () => Alert.alert('Coming soon', 'This feature is not available yet.');
    const options = ['Cancel', '✏️  Rename', '🏷  Change Type', '🗑  Delete Channel'];
    const destructiveButtonIndex = 3;
    const cancelButtonIndex = 0;
    const callback = (i: number | undefined) => {
      if (i === 1) comingSoon();
      else if (i === 2) comingSoon();
      else if (i === 3) {
        Alert.alert('Delete channel', `Delete #${channel.name}? This cannot be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(channel.id) },
        ]);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex, cancelButtonIndex },
        callback,
      );
    } else {
      showActionSheetWithOptions({ options, destructiveButtonIndex, cancelButtonIndex }, callback);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${channel.name} channel`}
      onPress={() => onPress(channel.id)}
      onLongPress={canManage ? handleLongPress : undefined}
      style={[styles.channelRow, { borderBottomColor: colors.borderSoft }]}
    >
      <View style={[styles.channelIconWrap, { backgroundColor: colors.surfaceSunk }]}>
        <Ionicons name={iconName} size={18} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>
          #{channel.name}
        </Text>
        {channel.description ? (
          <Text
            style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {channel.description}
          </Text>
        ) : null}
      </View>
      {/* unread dot — hardcoded off until Posts backend ships (issue #55) */}
    </Pressable>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function CoverSkeleton() {
  return <SkeletonBox width="100%" height={COVER_HEIGHT} borderRadius={0} />;
}

function DetailSkeleton() {
  const colors = useTheme();
  return (
    <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
      <SkeletonBox width="55%" height={28} borderRadius={6} />
      <SkeletonBox width="30%" height={14} borderRadius={4} style={{ marginTop: spacing.xs }} />
      <SkeletonBox
        width={100}
        height={32}
        borderRadius={radius.full}
        style={{ marginTop: spacing.md }}
      />
      <LoadingTail caption="Opening the hive…" />
    </View>
  );
}

function ChannelsSkeleton() {
  return (
    <View style={styles.channelsSection}>
      {[1, 2, 3].map(i => (
        <SkeletonBox key={i} width="100%" height={44} borderRadius={radius.md} />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CommunityDetailScreen() {
  const colors = useTheme();
  const { top } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [membersOpen, setMembersOpen] = useState(false);

  const {
    data: community,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useCommunityDetail(id);

  const { data: currentUser } = useCurrentUser();

  const {
    data: channelsData,
    isLoading: channelsLoading,
    isError: channelsError,
    refetch: refetchChannels,
  } = useCommunityChannels(id, !!community?.is_member);

  const { mutate: deleteChannel } = useDeleteChannel(id);

  const {
    data: membersData,
    isLoading: membersLoading,
    isFetchingNextPage: membersFetchingNext,
    hasNextPage: membersHasNext,
    fetchNextPage: membersFetchNext,
  } = useCommunityMembers(id);

  const channels = useMemo(() => channelsData?.results ?? [], [channelsData]);
  const members = useMemo(() => membersData?.pages.flatMap(p => p.results) ?? [], [membersData]);
  const memberTotal = community?.member_count ?? 0;

  // Show channel context menu for owners and moderators.
  const canManageChannels = useMemo(() => {
    if (!community || !currentUser) return false;
    if (community.owner_id === currentUser.id) return true;
    const membership = members.find(m => m.user_id === currentUser.id);
    return membership?.role === 'moderator' || membership?.role === 'owner';
  }, [community, currentUser, members]);

  const patchDetail = useCallback(
    (patch: (c: CommunityDetail) => CommunityDetail) => {
      queryClient.setQueryData<CommunityDetail>(['communities', id], old =>
        old ? patch(old) : old,
      );
    },
    [queryClient, id],
  );

  const patchList = useCallback(
    (communityId: string, patch: (c: Community) => Community) => {
      queryClient.setQueriesData<InfiniteCommunityListData>({ queryKey: ['communities'] }, old => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.map(c => (c.id === communityId ? patch(c) : c)),
          })),
        };
      });
    },
    [queryClient],
  );

  const { mutate: join } = useJoinCommunity(
    communityId => {
      patchDetail(c => ({ ...c, is_member: true, member_count: c.member_count + 1 }));
      patchList(communityId, c => ({ ...c, is_member: true, member_count: c.member_count + 1 }));
    },
    communityId => {
      patchDetail(c => ({ ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) }));
      patchList(communityId, c => ({
        ...c,
        is_member: false,
        member_count: Math.max(0, c.member_count - 1),
      }));
    },
  );

  const { mutate: leave } = useLeaveCommunity(
    communityId => {
      patchDetail(c => ({ ...c, is_member: false, member_count: Math.max(0, c.member_count - 1) }));
      patchList(communityId, c => ({
        ...c,
        is_member: false,
        member_count: Math.max(0, c.member_count - 1),
      }));
    },
    communityId => {
      patchDetail(c => ({ ...c, is_member: true, member_count: c.member_count + 1 }));
      patchList(communityId, c => ({ ...c, is_member: true, member_count: c.member_count + 1 }));
    },
  );

  const handleChannelPress = useCallback(
    (channelId: string) => {
      router.push(`/channel/${channelId}?communityId=${id}` as never);
    },
    [id],
  );

  if (detailError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.bg, paddingTop: top + spacing.sm },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: top + spacing.sm }]}
          >
            <View style={[styles.backBtnInner, { backgroundColor: colors.surfaceSunk }]}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </View>
          </Pressable>
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load community"
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => refetchDetail()}
                style={[styles.retryBtn, { borderColor: colors.border }]}
                accessibilityLabel="Retry loading community"
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Cover */}
        <View style={styles.coverContainer}>
          {detailLoading ? (
            <CoverSkeleton />
          ) : community?.cover_image_url ? (
            <Image
              source={{ uri: community.cover_image_url }}
              style={styles.coverImage}
              contentFit="cover"
              accessibilityLabel={`${community.name} cover`}
            />
          ) : community ? (
            <HexCover type={community.type} height={COVER_HEIGHT} />
          ) : null}

          {/* Back button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: top + spacing.sm }]}
          >
            <View style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </Pressable>

          {/* Type pill */}
          {community && (
            <View style={styles.typePillWrap}>
              <TypePill type={community.type} size="sm" />
            </View>
          )}
        </View>

        {/* Info + channels */}
        {detailLoading ? (
          <DetailSkeleton />
        ) : community ? (
          <>
            <View style={[styles.infoSection, { borderBottomColor: colors.border }]}>
              {/* Name + join button on same row */}
              <View style={styles.nameBtnRow}>
                <Text
                  style={[typography.display, { color: colors.text, flex: 1 }]}
                  numberOfLines={2}
                >
                  {community.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    community.is_member ? `Leave ${community.name}` : `Join ${community.name}`
                  }
                  onPress={() => (community.is_member ? leave(id) : join(id))}
                  style={[
                    styles.joinBtn,
                    community.is_member
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.primary },
                  ]}
                >
                  {community.is_member ? (
                    <>
                      <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                      <Text
                        style={[
                          styles.joinBtnText,
                          { color: colors.onPrimary, fontFamily: fonts.medium },
                        ]}
                      >
                        Joined
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.joinBtnText,
                        { color: colors.primary, fontFamily: fonts.medium },
                      ]}
                    >
                      Join
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Members + privacy row */}
              <View style={styles.metaRow}>
                <Pressable
                  onPress={() => setMembersOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${community.member_count} members, tap to see list`}
                  style={styles.memberCountBtn}
                >
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Text style={[typography.body, { color: colors.textMuted }]}>
                    {community.member_count.toLocaleString()} members
                  </Text>
                </Pressable>
                <View style={[styles.metaDot, { backgroundColor: colors.textMuted }]} />
                <View style={styles.metaItem}>
                  <Ionicons
                    name={community.is_private ? 'lock-closed-outline' : 'globe-outline'}
                    size={13}
                    color={colors.textMuted}
                  />
                  <Text style={[typography.body, { color: colors.textMuted }]}>
                    {community.is_private ? 'Private' : 'Open'}
                  </Text>
                </View>
              </View>

              {community.description ? (
                <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
                  {community.description}
                </Text>
              ) : null}
            </View>

            {/* Channels section */}
            <View style={styles.channelsSection}>
              <Text
                style={[typography.overline, { color: colors.textMuted, marginBottom: spacing.sm }]}
              >
                Channels
              </Text>

              {!community.is_member ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Join this community to see its channels.
                </Text>
              ) : channelsLoading ? (
                <ChannelsSkeleton />
              ) : channelsError ? (
                <Pressable
                  onPress={() => refetchChannels()}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading channels"
                >
                  <Text style={[typography.caption, { color: colors.danger }]}>
                    Couldn't load channels — tap to retry
                  </Text>
                </Pressable>
              ) : channels.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  No channels yet.
                </Text>
              ) : (
                channels.map(channel => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    onPress={handleChannelPress}
                    canManage={canManageChannels}
                    onDelete={deleteChannel}
                  />
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <MembersSheet
        visible={membersOpen}
        onClose={() => setMembersOpen(false)}
        members={members}
        total={memberTotal}
        isLoading={membersLoading}
        isFetchingNextPage={membersFetchingNext}
        hasNextPage={membersHasNext ?? false}
        fetchNextPage={membersFetchNext}
      />
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1 },
  coverContainer: { height: COVER_HEIGHT, position: 'relative', overflow: 'hidden' },
  coverImage: { width: '100%', height: COVER_HEIGHT },
  backBtn: { position: 'absolute', left: spacing.base },
  backBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillWrap: { position: 'absolute', bottom: spacing.sm, left: spacing.base },
  infoSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    gap: 2,
  },
  nameBtnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  joinBtn: {
    marginTop: 2,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  joinBtnText: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  memberCountBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  channelsSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: 100,
    gap: spacing.xs,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  channelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  channelName: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
});
