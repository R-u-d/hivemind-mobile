import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommunityCard from '@/components/CommunityCard';
import CommunityListSkeleton from '@/components/CommunityListSkeleton';
import EmptyState from '@/components/EmptyState';
import { useCommunities } from '@/hooks/useCommunities';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useJoinCommunity, useLeaveCommunity } from '@/hooks/useJoinCommunity';
import { fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community, CommunityPage } from '@/types/community';

interface InfiniteCommunityData {
  pages: CommunityPage[];
  pageParams: unknown[];
}

export default function DiscoverSearchScreen() {
  const colors = useTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);

  const enabled = debounced.trim().length > 0;
  const { data, isFetching } = useCommunities(enabled ? { search: debounced.trim() } : {});
  const results = enabled ? (data?.pages.flatMap(p => p.results) ?? []) : [];

  const patchCommunities = useCallback(
    (id: string, patch: (c: Community) => Community) => {
      queryClient.setQueriesData<InfiniteCommunityData>({ queryKey: ['communities'] }, old => {
        if (!old?.pages) return old;
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
    id => patchCommunities(id, c => ({ ...c, is_member: true, member_count: c.member_count + 1 })),
    id =>
      patchCommunities(id, c => ({
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
      patchCommunities(id, c => ({
        ...c,
        is_member: false,
        member_count: Math.max(0, c.member_count - 1),
      })),
    id => patchCommunities(id, c => ({ ...c, is_member: true, member_count: c.member_count + 1 })),
  );

  const pendingId = joinPending ? joinId : leavePending ? leaveId : null;

  const handleCardPress = useCallback((id: string) => {
    router.push(`/community/${id}` as never);
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
              accessibilityLabel="Search communities"
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search communities"
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
            <EmptyState icon="search-outline" title="Search communities" message="Type to search" />
          ) : isFetching && results.length === 0 ? (
            <CommunityListSkeleton rows={3} showTail={false} />
          ) : results.length === 0 ? (
            <EmptyState icon="search-outline" title="No matches" message="Try a different name." />
          ) : (
            <FlashList<Community>
              data={results}
              keyExtractor={c => c.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => (
                <CommunityCard
                  community={item}
                  onPress={handleCardPress}
                  onJoinPress={join}
                  onLeavePress={leave}
                  pendingId={pendingId}
                />
              )}
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
});
