import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import EventCard from '@/components/EventCard';
import EventListSkeleton from '@/components/EventListSkeleton';
import FilterChips, { type FilterChipItem } from '@/components/FilterChips';
import GhostButton from '@/components/GhostButton';
import HexLoader from '@/components/HexLoader';
import { useEvents } from '@/hooks/useEvents';
import { spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Event } from '@/types/event';

type EventFilter = 'all' | 'going' | 'interested' | 'this_week' | 'past';

const CHIP_ITEMS: ReadonlyArray<FilterChipItem<EventFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'going', label: 'Going' },
  { value: 'interested', label: 'Interested' },
  { value: 'this_week', label: 'This Week' },
  { value: 'past', label: 'Past' },
];

function getThisWeekRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    dateFrom: monday.toISOString(),
    dateTo: sunday.toISOString(),
  };
}

function buildQueryArgs(filter: EventFilter) {
  switch (filter) {
    case 'going':
      return { rsvp: 'going' as const, upcoming: true };
    case 'interested':
      return { rsvp: 'interested' as const, upcoming: true };
    case 'this_week':
      return { upcoming: true, ...getThisWeekRange() };
    case 'past':
      return { upcoming: false };
    default:
      return { upcoming: true };
  }
}

export default function EventsScreen() {
  const colors = useTheme();

  const [filter, setFilter] = useState<EventFilter>('all');

  const queryArgs = buildQueryArgs(filter);
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useEvents(queryArgs);

  const events = useMemo(() => data?.pages.flatMap(p => p.results) ?? [], [data]);

  function handleEventPress(id: string) {
    router.push(`/event/${id}` as never);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.text }]}>Events</Text>
        <Pressable
          onPress={() => router.push('/events/create' as never)}
          accessibilityRole="button"
          accessibilityLabel="Create event"
          hitSlop={12}
          style={styles.createBtn}
        >
          <Ionicons name="add" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {/* Filter chips */}
      <FilterChips items={CHIP_ITEMS} active={filter} onChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <EventListSkeleton />
      ) : isError ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Couldn't load events"
            message="Check your connection and try again."
            action={<GhostButton label="Retry" onPress={refetch} />}
          />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="calendar-outline"
            title={filter === 'past' ? 'No past events' : 'Nothing coming up'}
            message={
              filter === 'going'
                ? "You haven't RSVPd Going to any events yet."
                : filter === 'interested'
                  ? "You haven't marked any events as Interested."
                  : filter === 'this_week'
                    ? 'No events scheduled for this week.'
                    : filter === 'past'
                      ? "Events you've attended will appear here."
                      : 'Join communities to discover upcoming events.'
            }
          />
        </View>
      ) : (
        <FlashList<Event>
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <EventCard event={item} onPress={handleEventPress} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <HexLoader size={28} color={colors.primary} />
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
  createBtn: { padding: 4 },
  centerFill: { flex: 1 },
  list: { padding: spacing.base, paddingBottom: 100 },
  footer: { alignItems: 'center', paddingVertical: spacing.lg },
});
