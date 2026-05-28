import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import TypePill from '@/components/TypePill';
import { fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Event } from '@/types/event';

interface EventCardProps {
  event: Event;
  onPress: (id: string) => void;
}

const MONTH_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}:00 ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function EventCard({ event, onPress }: EventCardProps) {
  const themeColors = useTheme();
  const date = new Date(event.start_datetime);
  const month = MONTH_ABBR[date.getMonth()];
  const day = date.getDate();

  return (
    <Pressable
      onPress={() => onPress(event.id)}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={[styles.month, { color: themeColors.primary }]}>{month}</Text>
        <Text style={[styles.day, { color: themeColors.primary }]}>{day}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.pills}>
          <TypePill type={event.community.type} size="sm" />
          {event.rsvp_status && event.rsvp_status !== 'not_going' && (
            <View style={[styles.rsvpBadge, { backgroundColor: themeColors.primarySoft }]}>
              <Ionicons name="checkmark" size={11} color={themeColors.primary} />
              <Text style={[styles.rsvpLabel, { color: themeColors.primary }]}>
                {event.rsvp_status === 'going' ? 'Going' : 'Interested'}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={themeColors.textMuted} />
            <Text style={[styles.metaText, { color: themeColors.textMuted }]}>
              {formatTime(event.start_datetime)}
            </Text>
          </View>
          {event.location_text ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>
                {event.location_text}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={themeColors.textMuted} />
            <Text style={[styles.metaText, { color: themeColors.textMuted }]}>
              {event.going_count}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(EventCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dateCol: {
    width: 48,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 2,
  },
  month: {
    fontSize: 11,
    fontFamily: fonts.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  day: {
    fontSize: 30,
    fontFamily: fonts.medium,
    lineHeight: 32,
    letterSpacing: -0.8,
    marginTop: 1,
  },
  content: { flex: 1, gap: 5, minWidth: 0 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  rsvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  rsvpLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.medium,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: fonts.regular },
});
