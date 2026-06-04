import { memo, useCallback, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';

import Avatar from '@/components/Avatar';
import CommunityIcon from '@/components/CommunityIcon';
import EmptyState from '@/components/EmptyState';
import TabErrorState from '@/components/TabErrorState';
import EventCard from '@/components/EventCard';
import FilterChips from '@/components/FilterChips';
import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import StatCard from '@/components/StatCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEvents } from '@/hooks/useEvents';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

function ProfileSkeleton() {
  const colors = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
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
    </SafeAreaView>
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

function RsvpEventsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcoming = tab === 'upcoming';

  const {
    data: goingData,
    isLoading: goingLoading,
    hasNextPage: goingHasNext,
    fetchNextPage: goingFetchNext,
    isFetchingNextPage: goingFetchingNext,
  } = useEvents({ rsvp: 'going', upcoming }, visible);

  const {
    data: interestedData,
    isLoading: interestedLoading,
    hasNextPage: interestedHasNext,
    fetchNextPage: interestedFetchNext,
    isFetchingNextPage: interestedFetchingNext,
  } = useEvents({ rsvp: 'interested', upcoming }, visible);

  const goingEvents = goingData?.pages.flatMap(p => p.results) ?? [];
  const interestedEvents = interestedData?.pages.flatMap(p => p.results) ?? [];
  const isLoading = goingLoading || interestedLoading;
  const isEmpty = goingEvents.length === 0 && interestedEvents.length === 0;

  function handleScroll(e: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 80) {
      if (goingHasNext) goingFetchNext();
      else if (interestedHasNext) interestedFetchNext();
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sheetStyles.root, { backgroundColor: colors.bg }]}>
        <View style={[sheetStyles.header, { borderBottomColor: colors.borderSoft }]}>
          <Text style={[typography.heading, { color: colors.text }]}>My Events</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close events"
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <FilterChips
          items={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {isLoading ? (
          <View style={sheetStyles.skeletonPad}>
            {[0, 1, 2].map(i => (
              <SkeletonBox key={i} height={80} borderRadius={radius.lg} />
            ))}
          </View>
        ) : isEmpty ? (
          <EmptyState
            icon="calendar-outline"
            title={upcoming ? 'No upcoming events' : 'No past events'}
            message={
              upcoming
                ? 'RSVP to events to see them here.'
                : 'Events you RSVPd to will appear here.'
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.base, paddingBottom: bottom + 20 }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {goingEvents.length > 0 && (
              <Animated.View layout={LinearTransition}>
                <Animated.Text
                  layout={LinearTransition}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  style={[
                    sheetStyles.sectionLabel,
                    { color: colors.textMuted, fontFamily: fonts.medium },
                  ]}
                >
                  Going
                </Animated.Text>
                {goingEvents.map(event => (
                  <Animated.View
                    key={event.id}
                    layout={LinearTransition}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                  >
                    <EventCard
                      event={event}
                      onPress={id => {
                        onClose();
                        router.push(`/event/${id}` as never);
                      }}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {interestedEvents.length > 0 && (
              <Animated.View layout={LinearTransition}>
                <Animated.Text
                  layout={LinearTransition}
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  style={[
                    sheetStyles.sectionLabel,
                    { color: colors.textMuted, fontFamily: fonts.medium },
                  ]}
                >
                  Interested
                </Animated.Text>
                {interestedEvents.map(event => (
                  <Animated.View
                    key={event.id}
                    layout={LinearTransition}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                  >
                    <EventCard
                      event={event}
                      onPress={id => {
                        onClose();
                        router.push(`/event/${id}` as never);
                      }}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {(goingFetchingNext || interestedFetchingNext) && (
              <LoadingTail caption="Loading more events…" size={28} />
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [rsvpSheetOpen, setRsvpSheetOpen] = useState(false);
  const commSectionY = useRef(0);
  const labelHighlight = useRef(new RNAnimated.Value(0)).current;

  const scrollToCommunities = useCallback(() => {
    scrollRef.current?.scrollTo({ y: commSectionY.current, animated: true });
    labelHighlight.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(labelHighlight, { toValue: 1, duration: 250, useNativeDriver: false }),
      RNAnimated.timing(labelHighlight, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  }, [labelHighlight]);

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    isRefetching: userRefetching,
    refetch: refetchUser,
  } = useCurrentUser();

  const { data: communities = [], isLoading: commLoading } = useMyCommunities();

  if (userLoading) return <ProfileSkeleton />;

  if (userError || !user) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]} edges={['top']}>
        <TabErrorState title="Couldn't load profile" onRetry={refetchUser} />
      </SafeAreaView>
    );
  }

  const displayName = user.display_name || user.email;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={[typography.display, { color: colors.text }]}>Profile</Text>
        <Pressable
          onPress={() => router.push('/profile/edit')}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          hitSlop={12}
          style={styles.editBtn}
        >
          <Ionicons name="options-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={userRefetching} onRefresh={refetchUser} />}
      >
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
          <Pressable
            onPress={scrollToCommunities}
            accessibilityRole="button"
            accessibilityLabel="Scroll to my communities"
            style={styles.statItem}
          >
            <StatCard label="Communities" value={communities.length} />
          </Pressable>
          <Pressable
            onPress={() => setRsvpSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="View RSVPd events"
            style={styles.statItem}
          >
            <StatCard label="Events RSVP'd" value={user.event_count} />
          </Pressable>
        </View>

        <View
          onLayout={e => {
            commSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <RNAnimated.Text
            style={[
              styles.sectionLabel,
              {
                fontFamily: fonts.medium,
                color: labelHighlight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.textMuted, colors.text],
                }),
              },
            ]}
          >
            My communities
          </RNAnimated.Text>

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
                <CommunityRow
                  key={comm.id}
                  community={comm}
                  isLast={i === communities.length - 1}
                />
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
                <Text
                  style={[styles.ctaText, { color: colors.onPrimary, fontFamily: fonts.medium }]}
                >
                  Discover communities
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <RsvpEventsSheet visible={rsvpSheetOpen} onClose={() => setRsvpSheetOpen(false)} />
    </SafeAreaView>
  );
}

const sheetStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingTop: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  skeletonPad: { padding: spacing.base, gap: spacing.md },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  editBtn: { padding: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  displayName: { fontSize: 19, letterSpacing: -0.3, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  locationText: { fontSize: 12 },
  bio: { fontSize: 13, lineHeight: 13 * 1.45 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statItem: { flex: 1 },
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
