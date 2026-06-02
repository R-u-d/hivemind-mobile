import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Stack, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EventCard from '@/components/EventCard';
import EventListSkeleton from '@/components/EventListSkeleton';
import EmptyState from '@/components/EmptyState';
import { useEvents } from '@/hooks/useEvents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Event } from '@/types/event';

type SectionHeader = { _type: 'header'; label: string };
type ListItem = Event | SectionHeader;

function isSectionHeader(item: ListItem): item is SectionHeader {
  return '_type' in item && item._type === 'header';
}

export default function EventSearchScreen() {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);

  const enabled = debounced.trim().length > 0;
  const q = debounced.trim();

  const { data: upcomingData, isFetching: upcomingFetching } = useEvents(
    enabled ? { q, upcoming: true } : {},
    enabled,
  );
  const { data: pastData, isFetching: pastFetching } = useEvents(
    enabled ? { q, upcoming: false } : {},
    enabled,
  );

  const isFetching = upcomingFetching || pastFetching;

  const upcoming = enabled ? (upcomingData?.pages.flatMap(p => p.results) ?? []) : [];
  // Most recent past events first
  const past = enabled ? [...(pastData?.pages.flatMap(p => p.results) ?? [])].reverse() : [];

  const listData: ListItem[] = [];
  if (upcoming.length > 0) {
    if (past.length > 0) listData.push({ _type: 'header', label: 'Upcoming' });
    listData.push(...upcoming);
  }
  if (past.length > 0) {
    listData.push({ _type: 'header', label: 'Past' });
    listData.push(...past);
  }

  const totalResults = upcoming.length + past.length;

  const handleCardPress = useCallback((id: string) => {
    router.push(`/event/${id}` as never);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.surfaceSunk, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Search events"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search events"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.input, { color: colors.text, fontFamily: fonts.regular }]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setQuery('')}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {!enabled ? (
            <EmptyState icon="search-outline" title="Search events" message="Type to search" />
          ) : isFetching && totalResults === 0 ? (
            <EventListSkeleton rows={3} showTail={false} />
          ) : totalResults === 0 ? (
            <EmptyState icon="search-outline" title="No matches" message="Try a different name." />
          ) : (
            <FlashList<ListItem>
              data={listData}
              keyExtractor={(item, i) => (isSectionHeader(item) ? `header-${i}` : item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              getItemType={item => (isSectionHeader(item) ? 'header' : 'card')}
              renderItem={({ item }) => {
                if (isSectionHeader(item)) {
                  return (
                    <Text
                      style={[
                        typography.caption,
                        styles.sectionHeader,
                        { color: colors.textMuted },
                      ]}
                    >
                      {item.label}
                    </Text>
                  );
                }
                return <EventCard event={item} onPress={handleCardPress} />;
              }}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, padding: 0, outlineStyle: 'none' as never },
  list: { padding: spacing.base },
  sectionHeader: {
    fontFamily: fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
