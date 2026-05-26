import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import CommunityIcon from '@/components/CommunityIcon';
import TypePill from '@/components/TypePill';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';

interface CommunityCardProps {
  community: Community;
  onPress: (id: string) => void;
  onJoinPress: (id: string) => void;
  onLeavePress: (id: string) => void;
}

function CommunityCardImpl({ community, onPress, onJoinPress, onLeavePress }: CommunityCardProps) {
  const colors = useTheme();
  const { id, name, type, member_count, is_member } = community;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${type}, ${member_count} members`}
      onPress={() => onPress(id)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <CommunityIcon type={type} size={44} borderRadius={12} />
      <View style={styles.middle}>
        <Text
          numberOfLines={1}
          style={[typography.body, { color: colors.text, fontFamily: fonts.medium }]}
        >
          {name}
        </Text>
        <View style={styles.subRow}>
          <TypePill type={type} size="sm" />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {member_count.toLocaleString()} members
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={is_member ? `Leave ${name}` : `Join ${name}`}
        accessibilityState={{ selected: is_member }}
        onPress={() => (is_member ? onLeavePress(id) : onJoinPress(id))}
        style={[
          styles.button,
          is_member
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.surface, borderColor: colors.primary },
        ]}
      >
        {is_member ? (
          <>
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Joined</Text>
          </>
        ) : (
          <Text style={[styles.buttonText, { color: colors.primary }]}>Join</Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  middle: { flex: 1, minWidth: 0, gap: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buttonText: { fontSize: 13, fontFamily: fonts.medium },
});

export default memo(CommunityCardImpl);
