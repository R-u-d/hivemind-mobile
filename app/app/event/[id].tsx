import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '@/components/Avatar';
import EventMap from '@/components/EventMap';
import EmptyState from '@/components/EmptyState';
import HexCover from '@/components/HexCover';
import GhostButton from '@/components/GhostButton';
import LoadingTail from '@/components/LoadingTail';
import SecondaryButton from '@/components/SecondaryButton';
import SkeletonBox from '@/components/SkeletonBox';
import TypePill from '@/components/TypePill';
import { useEvent, useEventAttendees, useRsvp } from '@/hooks/useEvents';
import { colors, communityTypeColors, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Attendee, Event, RsvpStatus } from '@/types/event';

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 30;
const AVATAR_STACK_OFFSET = 10;
const ATTENDEE_PREVIEW_COUNT = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDateTime(start: string, end: string | null): string {
  const s = new Date(start);
  const datePart = `${WEEKDAYS[s.getDay()]}, ${MONTHS[s.getMonth()]} ${s.getDate()}`;
  const timePart = formatTime(s);
  if (!end) return `${datePart} · ${timePart}`;
  const e = new Date(end);
  return `${datePart} · ${timePart} – ${formatTime(e)}`;
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}:00 ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function openInMaps(lat: number, lng: number, label: string) {
  const url = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label)}`;
  Linking.openURL(url).catch(() => {
    const gUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(gUrl);
  });
}

// ── Cover ─────────────────────────────────────────────────────────────────────

function EventCover({ event }: { event: Event }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.coverWrap, { height: COVER_HEIGHT + insets.top }]}>
      {event.cover_image_url ? (
        <Image
          source={{ uri: event.cover_image_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Event cover image"
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <HexCover type={event.community.type} height={COVER_HEIGHT + insets.top} />
        </View>
      )}

      {/* Back button */}
      <View style={[styles.coverBack, { top: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.coverBackBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      {/* Community pill */}
      <View style={styles.coverPill}>
        <TypePill type={event.community.type} size="sm" suffix={event.community.name} />
      </View>
    </View>
  );
}

// ── RSVP toggle ───────────────────────────────────────────────────────────────

const RSVP_OPTIONS: {
  value: RsvpStatus;
  label: string;
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
  iconInactive: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    value: 'going',
    label: 'Going',
    iconActive: 'checkmark-circle',
    iconInactive: 'checkmark-circle-outline',
  },
  { value: 'interested', label: 'Interested', iconActive: 'star', iconInactive: 'star-outline' },
  {
    value: 'not_going',
    label: 'Not Interested',
    iconActive: 'eye-off',
    iconInactive: 'eye-off-outline',
  },
];

function RsvpPastBanner({ current }: { current: RsvpStatus | null }) {
  const colors = useTheme();

  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    current === 'going'
      ? 'checkmark-circle'
      : current === 'interested'
        ? 'star'
        : current === 'not_going'
          ? 'eye-off-outline'
          : 'calendar-outline';
  const label =
    current === 'going'
      ? 'You went'
      : current === 'interested'
        ? 'You saved this event'
        : current === 'not_going'
          ? 'You passed on this'
          : 'Event ended';
  const usePrimary = current === 'going' || current === 'interested';

  return (
    <View
      style={[
        styles.rsvpWrap,
        styles.rsvpPastBanner,
        {
          backgroundColor: usePrimary ? colors.primarySoft : colors.surfaceSunk,
          borderColor: usePrimary ? colors.primarySoft : colors.borderSoft,
        },
      ]}
    >
      <Ionicons name={icon} size={15} color={usePrimary ? colors.primary : colors.textMuted} />
      <Text
        style={[
          styles.rsvpLabel,
          { color: usePrimary ? colors.primary : colors.textMuted, fontFamily: fonts.medium },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function RsvpToggle({ eventId, current }: { eventId: string; current: RsvpStatus | null }) {
  const colors = useTheme();
  const { mutate, isPending } = useRsvp();

  function handlePress(value: RsvpStatus) {
    const next = current === value ? null : value;
    mutate({ eventId, status: next });
  }

  return (
    <View
      style={[
        styles.rsvpWrap,
        { backgroundColor: colors.surfaceSunk, borderColor: colors.borderSoft },
      ]}
    >
      {RSVP_OPTIONS.map(opt => {
        const active = current === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => !isPending && handlePress(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={[styles.rsvpOption, active && { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name={active ? opt.iconActive : opt.iconInactive}
              size={13}
              color={active ? colors.onPrimary : colors.textMuted}
            />
            <Text
              style={[styles.rsvpLabel, { color: active ? colors.onPrimary : colors.textMuted }]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Capacity bar ──────────────────────────────────────────────────────────────

function CapacityBar({
  going,
  capacity,
  typeColor,
}: {
  going: number;
  capacity: number;
  typeColor: string;
}) {
  const colors = useTheme();
  const pct = Math.min(going / capacity, 1);
  const isNearFull = pct >= 0.8;
  if (!isNearFull) return null;

  return (
    <View style={styles.capWrap}>
      <View style={[styles.capTrack, { backgroundColor: colors.borderSoft }]}>
        <View
          style={[
            styles.capFill,
            {
              width: `${Math.round(pct * 100)}%` as `${number}%`,
              backgroundColor: typeColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.capLabel, { color: colors.textMuted, fontFamily: fonts.regular }]}>
        {pct >= 1 ? 'Event is full' : `${going} / ${capacity} spots filled`}
      </Text>
    </View>
  );
}

// ── Attendees row ─────────────────────────────────────────────────────────────

function AttendeesRow({
  preview,
  total,
  interested,
  isPast,
  onPress,
}: {
  preview: Attendee[];
  total: number;
  interested: number;
  isPast: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const overflow = total - preview.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${total} ${isPast ? 'attended' : 'going'} — tap to see attendees`}
      style={styles.attendeesRow}
    >
      <View style={styles.avatarStack}>
        {preview.map((a, i) => (
          <View
            key={a.user_id}
            style={[
              styles.avatarBorder,
              { marginLeft: i === 0 ? 0 : -AVATAR_STACK_OFFSET, borderColor: colors.bg },
            ]}
          >
            <Avatar uri={a.avatar_url} name={a.display_name} size={AVATAR_SIZE} />
          </View>
        ))}
        {overflow > 0 && (
          <View
            style={[
              styles.avatarBorder,
              styles.avatarOverflow,
              {
                marginLeft: -AVATAR_STACK_OFFSET,
                borderColor: colors.bg,
                backgroundColor: colors.surfaceSunk,
              },
            ]}
          >
            <Text
              style={[styles.overflowText, { color: colors.textMuted, fontFamily: fonts.medium }]}
            >
              +{overflow}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.attendeesCount, { color: colors.textMuted, fontFamily: fonts.regular }]}>
        <Text style={{ color: colors.text, fontFamily: fonts.medium }}>
          {total} {isPast ? 'attended' : 'going'}
        </Text>
        {interested > 0 && ` · ${interested} ${isPast ? 'saved' : 'interested'}`}
      </Text>
      <Ionicons name="chevron-forward" size={14} color={colors.textFaint} style={styles.chevron} />
    </Pressable>
  );
}

// ── Attendees sheet ───────────────────────────────────────────────────────────

function AttendeesSheet({
  eventId,
  visible,
  onClose,
}: {
  eventId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useEventAttendees(
    eventId,
    visible,
  );

  const attendees = useMemo(() => data?.pages.flatMap(p => p.results) ?? [], [data]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheetRoot, { backgroundColor: colors.bg }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.borderSoft }]}>
          <Text style={[typography.heading, { color: colors.text }]}>Attendees</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close attendees"
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.sheetPad}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.sheetSkeleton}>
                <SkeletonBox width={36} height={36} borderRadius={18} />
                <SkeletonBox width={140} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        ) : attendees.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No attendees yet"
            message="Be the first to RSVP going!"
          />
        ) : (
          <FlashList<Attendee>
            data={attendees}
            keyExtractor={a => a.user_id}
            contentContainerStyle={{ padding: spacing.base, paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <View style={styles.attendeeRow}>
                <Avatar uri={item.avatar_url} name={item.display_name} size={36} />
                <Text
                  style={[styles.attendeeName, { color: colors.text, fontFamily: fonts.medium }]}
                >
                  {item.display_name}
                </Text>
              </View>
            )}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage ? <LoadingTail caption="Loading the gathering…" size={28} /> : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function EventDetailSkeleton() {
  const colors = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <SkeletonBox width="100%" height={COVER_HEIGHT} borderRadius={0} />
      <View style={styles.skeletonBody}>
        <SkeletonBox width="75%" height={26} borderRadius={6} />
        <SkeletonBox width="55%" height={14} borderRadius={4} />
        <SkeletonBox width="60%" height={14} borderRadius={4} />
        <SkeletonBox width="100%" height={140} borderRadius={radius.lg} />
        <SkeletonBox width="100%" height={52} borderRadius={radius.lg} />
        <SkeletonBox width="100%" height={16} borderRadius={4} />
        <SkeletonBox width="80%" height={16} borderRadius={4} />
      </View>
      <LoadingTail caption="Loading the gathering…" />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const { data: attendeesData } = useEventAttendees(id, !!event && event.going_count > 0);

  const attendeePreview = useMemo(
    () => attendeesData?.pages[0]?.results.slice(0, ATTENDEE_PREVIEW_COUNT) ?? [],
    [attendeesData],
  );

  if (isLoading)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <EventDetailSkeleton />
      </>
    );

  if (isError || !event) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.screen, styles.centerFill, { backgroundColor: colors.bg }]}>
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load event"
            message="Check your connection and try again."
            action={<GhostButton label="Retry" onPress={refetch} />}
          />
        </View>
      </>
    );
  }

  const dateTimeStr = formatDateTime(event.start_datetime, event.end_datetime);
  const hasCoords = event.lat !== null && event.lng !== null;
  // Fall back to coordinates when there's no address text but a pin was dropped.
  const locationLabel =
    event.location_text || (hasCoords ? `${event.lat!.toFixed(2)}, ${event.lng!.toFixed(2)}` : '');
  const showCapacityBar = event.capacity !== null && event.going_count / event.capacity >= 0.8;
  const isPast = new Date(event.start_datetime) < new Date();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false, headerBackTitle: 'Event' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        <EventCover event={event} />

        {/* Title + meta */}
        <View style={styles.titleBlock}>
          <Text style={[typography.title, { color: colors.text }]}>{event.title}</Text>
          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
              <Text
                style={[styles.metaText, { color: colors.textMuted, fontFamily: fonts.regular }]}
              >
                {dateTimeStr}
              </Text>
            </View>
            {locationLabel ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                <Text
                  style={[styles.metaText, { color: colors.textMuted, fontFamily: fonts.regular }]}
                  numberOfLines={2}
                >
                  {locationLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Map */}
        {hasCoords && (
          <EventMap
            lat={event.lat!}
            lng={event.lng!}
            title={event.title}
            onPress={() => openInMaps(event.lat!, event.lng!, locationLabel)}
          />
        )}

        {/* RSVP */}
        <View style={styles.section}>
          {isPast ? (
            <RsvpPastBanner current={event.rsvp_status} />
          ) : (
            <RsvpToggle eventId={event.id} current={event.rsvp_status} />
          )}
        </View>

        {/* Capacity bar */}
        {showCapacityBar && (
          <View style={styles.section}>
            <CapacityBar
              going={event.going_count}
              capacity={event.capacity!}
              typeColor={communityTypeColors[event.community.type]?.primary ?? colors.primary}
            />
          </View>
        )}

        {/* Attendees */}
        {event.going_count > 0 && (
          <View style={[styles.section, styles.sectionBorder, { borderColor: colors.borderSoft }]}>
            <AttendeesRow
              preview={attendeePreview}
              total={event.going_count}
              interested={event.interested_count}
              isPast={isPast}
              onPress={() => setAttendeesOpen(true)}
            />
          </View>
        )}

        {/* Description */}
        {!!event.description && (
          <View style={styles.section}>
            <Text style={[styles.description, { color: colors.text, fontFamily: fonts.regular }]}>
              {event.description}
            </Text>
          </View>
        )}

        {/* Organiser */}
        <View style={styles.section}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/user/[id]',
                params: { id: event.organiser.id, backTitle: 'Event' },
              } as never)
            }
            accessibilityRole="button"
            accessibilityLabel={`View ${event.organiser.display_name}'s profile`}
            style={[
              styles.organiserCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Avatar
              uri={event.organiser.avatar_url}
              name={event.organiser.display_name}
              size={44}
            />
            <View style={styles.organiserInfo}>
              <Text
                style={[
                  styles.organiserLabel,
                  { color: colors.textMuted, fontFamily: fonts.medium },
                ]}
              >
                Organiser
              </Text>
              <Text
                style={[styles.organiserName, { color: colors.text, fontFamily: fonts.medium }]}
              >
                {event.organiser.display_name}
              </Text>
            </View>
            <View>
              <SecondaryButton
                label="Profile"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: event.organiser.id, backTitle: 'Event' },
                  } as never)
                }
              />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <AttendeesSheet
        eventId={event.id}
        visible={attendeesOpen}
        onClose={() => setAttendeesOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerFill: { justifyContent: 'center', alignItems: 'center' },

  // Cover
  coverWrap: { width: '100%', overflow: 'hidden' },
  coverBack: { position: 'absolute', left: spacing.base },
  coverBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPill: { position: 'absolute', bottom: spacing.sm, left: spacing.base },

  // Title block
  titleBlock: { padding: spacing.base, paddingBottom: spacing.base, gap: spacing.sm },
  metaList: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaText: { fontSize: 13.5, flex: 1 },

  // Sections
  section: { paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  sectionBorder: {
    paddingTop: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // RSVP
  rsvpWrap: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  rsvpPastBanner: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  rsvpOption: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  rsvpLabel: { fontSize: 13.5, fontFamily: fonts.medium },

  // Capacity
  capWrap: { gap: 6 },
  capTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  capFill: { height: '100%', borderRadius: 3 },
  capLabel: { fontSize: 12 },

  // Attendees row
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarStack: { flexDirection: 'row' },
  avatarBorder: { borderWidth: 2, borderRadius: AVATAR_SIZE / 2 + 2 },
  avatarOverflow: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { fontSize: 11 },
  attendeesCount: { flex: 1, fontSize: 13 },
  chevron: { marginLeft: 'auto' },

  // Description
  description: { fontSize: 14, lineHeight: 14 * 1.55 },

  // Organiser
  organiserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  organiserInfo: { flex: 1, gap: 2 },
  organiserLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  organiserName: { fontSize: 14 },

  // Skeleton
  skeletonBody: { padding: spacing.base, gap: spacing.md },

  // Sheet
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingTop: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetPad: { padding: spacing.base, gap: spacing.md },
  sheetSkeleton: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  attendeeName: { fontSize: 14 },
});
