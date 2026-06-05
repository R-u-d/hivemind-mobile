import { memo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import TypePill from '@/components/TypePill';
import { useRsvp } from '@/hooks/useEvents';
import { colors, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Event, RsvpStatus } from '@/types/event';

interface EventCardProps {
  event: Event;
  onPress: (id: string) => void;
  hidePill?: boolean;
  isNew?: boolean;
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

const RSVP_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  going: 'checkmark',
  interested: 'star-outline',
  not_going: 'eye-off-outline',
};

const RSVP_LABEL: Record<string, string> = {
  going: 'Going',
  interested: 'Interested',
  not_going: 'Not Interested',
};

const RSVP_PAST_LABEL: Record<string, string> = {
  going: 'Went',
  interested: 'Saved',
  not_going: 'Passed',
};

const PICKER_OPTIONS: {
  value: RsvpStatus;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'going', label: 'Going', icon: 'checkmark-circle-outline' },
  { value: 'interested', label: 'Interested', icon: 'star-outline' },
  { value: 'not_going', label: 'Not Interested', icon: 'eye-off-outline' },
];

function RsvpPicker({
  eventId,
  eventTitle,
  current,
  visible,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  current: RsvpStatus | null;
  visible: boolean;
  onClose: () => void;
}) {
  const themeColors = useTheme();
  const { mutate, isPending } = useRsvp();

  function handleSelect(value: RsvpStatus) {
    const next = current === value ? null : value;
    mutate({ eventId, status: next });
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerSheet,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
          onPress={() => {}}
        >
          <Text
            style={[styles.pickerEventName, { color: themeColors.text, fontFamily: fonts.medium }]}
            numberOfLines={1}
          >
            {eventTitle}
          </Text>
          <Text
            style={[styles.pickerTitle, { color: themeColors.textMuted, fontFamily: fonts.medium }]}
          >
            Update RSVP
          </Text>
          {PICKER_OPTIONS.map(opt => {
            const active = current === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => !isPending && handleSelect(opt.value)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                style={[
                  styles.pickerOption,
                  active && { backgroundColor: themeColors.primarySoft },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? themeColors.primaryOnSoft : themeColors.textMuted}
                />
                <Text
                  style={[
                    styles.pickerOptionLabel,
                    {
                      color: active ? themeColors.primaryOnSoft : themeColors.text,
                      fontFamily: active ? fonts.medium : fonts.regular,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={themeColors.primaryOnSoft}
                    style={styles.pickerCheck}
                  />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EventCard({ event, onPress, hidePill = false, isNew }: EventCardProps) {
  const themeColors = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const date = new Date(event.start_datetime);
  const month = MONTH_ABBR[date.getMonth()];
  const day = date.getDate();
  const isPast = date < new Date();

  // Fall back to coordinates when there's no address text but a pin was dropped.
  const locationLabel =
    event.location_text ||
    (event.lat != null && event.lng != null
      ? `${event.lat.toFixed(2)}, ${event.lng.toFixed(2)}`
      : null);

  return (
    <>
      <Pressable
        onPress={() => onPress(event.id)}
        accessibilityRole="button"
        accessibilityLabel={event.title}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            opacity: pressed ? 0.85 : event.rsvp_status === 'not_going' || isPast ? 0.6 : 1,
          },
        ]}
      >
        {isNew && <View style={styles.newDot} />}
        {/* Date column */}
        <View style={styles.dateCol}>
          <Text style={[styles.month, { color: themeColors.primary }]}>{month}</Text>
          <Text style={[styles.day, { color: themeColors.primary }]}>{day}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.pills}>
            {!hidePill && <TypePill type={event.community.type} size="sm" />}
            {event.rsvp_status && (
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  if (!isPast) setPickerOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`RSVP: ${RSVP_LABEL[event.rsvp_status]}. ${isPast ? '' : 'Tap to change.'}`}
                style={[styles.rsvpBadge, { backgroundColor: themeColors.primarySoft }]}
              >
                <Ionicons
                  name={RSVP_ICON[event.rsvp_status]}
                  size={11}
                  color={themeColors.primaryOnSoft}
                />
                <Text style={[styles.rsvpLabel, { color: themeColors.primaryOnSoft }]}>
                  {isPast ? RSVP_PAST_LABEL[event.rsvp_status] : RSVP_LABEL[event.rsvp_status]}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaFixed}>
              <Ionicons name="time-outline" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>
                {formatTime(event.start_datetime)}
              </Text>
            </View>
            {locationLabel ? (
              <>
                <Text style={[styles.metaSep, { color: themeColors.textMuted }]}>·</Text>
                <View style={styles.locationItem}>
                  <Ionicons name="location-outline" size={12} color={themeColors.textMuted} />
                  <Text
                    style={[styles.metaText, styles.metaLocation, { color: themeColors.textMuted }]}
                    numberOfLines={1}
                  >
                    {locationLabel}
                  </Text>
                </View>
              </>
            ) : null}
            <Text style={[styles.metaSep, { color: themeColors.textMuted }]}>·</Text>
            <View style={styles.metaFixed}>
              <Ionicons name="people-outline" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>
                {isPast ? `${event.going_count} attended` : event.going_count}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      {pickerOpen && (
        <RsvpPicker
          eventId={event.id}
          eventTitle={event.title}
          current={event.rsvp_status}
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaFixed: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  metaSep: { fontSize: 12, fontFamily: fonts.regular },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: { fontSize: 12, fontFamily: fonts.regular },
  metaLocation: { flexShrink: 1 },

  newDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  // RSVP picker
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.xs,
  },
  pickerEventName: {
    fontSize: 15,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  pickerTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pickerOptionLabel: { flex: 1, fontSize: 15 },
  pickerCheck: { marginLeft: 'auto' },
});
