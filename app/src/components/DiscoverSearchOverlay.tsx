import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CommunityCard from '@/components/CommunityCard';
import CommunityListSkeleton from '@/components/CommunityListSkeleton';
import EmptyState from '@/components/EmptyState';
import { useCommunities } from '@/hooks/useCommunities';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

interface DiscoverSearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onCardPress: (id: string) => void;
  onJoinPress: (id: string) => void;
  onLeavePress: (id: string) => void;
}

export default function DiscoverSearchOverlay({
  visible,
  onClose,
  onCardPress,
  onJoinPress,
  onLeavePress,
}: DiscoverSearchOverlayProps) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);

  const enabled = debounced.trim().length > 0;
  const { data, isFetching } = useCommunities(enabled ? { search: debounced.trim() } : {});

  const results = enabled ? (data?.pages.flatMap(p => p.results) ?? []) : [];

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={handleClose}
            hitSlop={12}
            style={styles.iconBtn}
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

        {!enabled ? (
          <View style={styles.hintWrap}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Type to search</Text>
          </View>
        ) : isFetching && results.length === 0 ? (
          <CommunityListSkeleton rows={3} showTail={false} />
        ) : results.length === 0 ? (
          <EmptyState icon="search-outline" title="No matches" message="Try a different name." />
        ) : (
          <FlashList<Community>
            data={results}
            keyExtractor={c => c.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <CommunityCard
                community={item}
                onPress={onCardPress}
                onJoinPress={onJoinPress}
                onLeavePress={onLeavePress}
              />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  iconBtn: { padding: 4 },
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
  hintWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.base },
});
