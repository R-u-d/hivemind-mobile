import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { communityTypeColors, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { FeedEventItem } from '@/types/feed';

interface FeedEventCardProps {
  item: FeedEventItem;
  onPress: (id: string) => void;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const time = m === 0 ? `${hour}:00 ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  return `${weekday}, ${month} ${day} · ${time}`;
}

function FeedEventCard({ item, onPress }: FeedEventCardProps) {
  const colors = useTheme();
  const typeColor = communityTypeColors[item.community.type]?.primary ?? colors.textMuted;
  const isPast = new Date(item.start_datetime) < new Date();

  const locationLabel =
    item.location_text ||
    (item.lat != null && item.lng != null
      ? `${item.lat.toFixed(2)}, ${item.lng.toFixed(2)}`
      : null);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: typeColor }]} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={[typography.overline, { color: colors.primary }]}>Event</Text>
          <Text style={[styles.dot, { color: colors.textFaint }]}>·</Text>
          <Text style={[styles.communityName, { color: typeColor }]} numberOfLines={1}>
            {item.community.name}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
              {formatEventDate(item.start_datetime)}
            </Text>
          </View>
          {locationLabel ? (
            <>
              <Text style={[styles.metaSep, { color: colors.textFaint }]}>·</Text>
              <View style={[styles.metaItem, styles.locationItem]}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text
                  style={[styles.metaText, styles.metaLocation, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </View>
            </>
          ) : null}
          <Text style={[styles.metaSep, { color: colors.textFaint }]}>·</Text>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {item.going_count} {isPast ? 'went' : 'going'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(FeedEventCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    flexShrink: 0,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: 18,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  dot: {
    fontSize: 12,
  },
  communityName: {
    fontSize: 12,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.medium,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  locationItem: {
    flexShrink: 1,
    minWidth: 0,
  },
  metaSep: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
  },
  metaLocation: {
    flexShrink: 1,
  },
});
