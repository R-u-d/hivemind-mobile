import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { extractDrfError } from '@/api/client';
import { eventDraftStorage } from '@/api/eventDraftStorage';
import DateTimePickerField from '@/components/DateTimePickerField';
import FieldFocusAura from '@/components/FieldFocusAura';
import FormField from '@/components/FormField';
import HexLoader from '@/components/HexLoader';
import LocationPickerMap from '@/components/LocationPickerMap';
import PrimaryButton from '@/components/PrimaryButton';
import { useCreateEvent, useEventCoverUpload } from '@/hooks/useEvents';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import { useShakeAnimation } from '@/hooks/useShakeAnimation';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Community } from '@/types/community';
import { forwardGeocode, reverseGeocode } from '@/utils/geocode';
import { roundUpToInterval } from '@/utils/time';

const DESCRIPTION_MAX = 1500;
const DESCRIPTION_WARN = 1200;
const DESCRIPTION_DANGER = 1400;
const TIME_INTERVAL = 5;

// ── Date / time formatting ──────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

// When no time has been chosen yet, default it to the next 5-minute mark
// instead of the raw current time (e.g. 4:18 → 4:20).
function mergeDate(base: Date | null, picked: Date): Date {
  const next = base ? new Date(base) : roundUpToInterval(new Date(), TIME_INTERVAL);
  next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return next;
}

function mergeTime(base: Date | null, picked: Date): Date {
  const next = base ? new Date(base) : roundUpToInterval(new Date(), TIME_INTERVAL);
  next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
    description: z.string().max(DESCRIPTION_MAX, `Max ${DESCRIPTION_MAX} characters`).optional(),
    community: z.string().min(1, 'Community is required'),
    location_text: z.string().max(255, 'Max 255 characters').optional(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    startAt: z
      .date()
      .nullable()
      .refine(v => v !== null, 'Pick a start date and time')
      .refine(v => v === null || v.getTime() >= Date.now(), "Start can't be in the past"),
    endAt: z.date().nullable(),
    capacity: z
      .string()
      .optional()
      .refine(v => !v || /^\d+$/.test(v), 'Numbers only'),
    is_private: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.endAt && data.startAt && data.endAt <= data.startAt) {
      ctx.addIssue({
        code: 'custom',
        message: isSameDay(data.startAt, data.endAt)
          ? 'End time must be after start time'
          : 'End date must be after start',
        path: ['endAt'],
      });
    }
  });

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

// ── Generic option-picker modal ────────────────────────────────────────────────

interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

function OptionPickerModal({
  visible,
  title,
  options,
  selectedId,
  loading,
  emptyText,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId: string | null;
  loading?: boolean;
  emptyText: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const themeColors = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerSheet,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border },
          ]}
          onPress={() => {}}
        >
          <Text
            style={[styles.pickerTitle, { color: themeColors.textMuted, fontFamily: fonts.medium }]}
          >
            {title}
          </Text>
          {loading ? (
            <View style={styles.pickerEmpty}>
              <HexLoader color={themeColors.primary} />
            </View>
          ) : options.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Text style={[typography.body, { color: themeColors.textMuted }]}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={item => item.id}
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={item.label}
                    onPress={() => onSelect(item.id)}
                    style={[styles.pickerOption, active && { backgroundColor: colors.primarySoft }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          typography.body,
                          {
                            color: active ? colors.primary : themeColors.text,
                            fontFamily: active ? fonts.medium : fonts.regular,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text
                          style={[
                            typography.caption,
                            { color: themeColors.textMuted, marginTop: 2 },
                          ]}
                        >
                          {item.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Pressable select field ──────────────────────────────────────────────────

function SelectField({
  label,
  valueText,
  placeholder,
  error,
  active = false,
  onPress,
}: {
  label: string;
  valueText: string | null;
  placeholder: string;
  error?: string;
  active?: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const borderColor = error ? colors.danger : active ? colors.primary : colors.border;
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <FieldFocusAura active={active}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${valueText ?? placeholder}`}
          onPress={onPress}
          style={[styles.selectRow, { borderColor, backgroundColor: colors.surface }]}
        >
          <Text
            style={[
              typography.body,
              { color: valueText ? colors.text : colors.textFaint, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {valueText ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>
      </FieldFocusAura>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const [communityPickerOpen, setCommunityPickerOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const { mutateAsync: createEvent, isPending: creating } = useCreateEvent();
  const { mutateAsync: uploadCover, isPending: uploading } = useEventCoverUpload();
  const { data: communities = [], isLoading: communitiesLoading } = useMyCommunities();

  const isPending = creating || uploading;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      community: '',
      location_text: '',
      lat: null,
      lng: null,
      startAt: null,
      endAt: null,
      capacity: '',
      is_private: false,
    },
  });

  const communityId = watch('community');
  const lat = watch('lat');
  const lng = watch('lng');
  const startAt = watch('startAt');
  const endAt = watch('endAt');

  const [communityDefaultCenter, setCommunityDefaultCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // When a community with a location is selected, silently geocode it as a map hint.
  useEffect(() => {
    const community = communities.find((c: Community) => c.id === communityId);
    if (!community?.location) {
      setCommunityDefaultCenter(null);
      return;
    }
    let cancelled = false;
    forwardGeocode(community.location).then(coords => {
      if (!cancelled) setCommunityDefaultCenter(coords);
    });
    return () => {
      cancelled = true;
    };
  }, [communityId, communities]);
  const descriptionLength = (watch('description') ?? '').length;
  const { style: descShakeStyle, trigger: triggerDescShake } = useShakeAnimation();

  useEffect(() => {
    if (descriptionLength === DESCRIPTION_MAX) triggerDescShake();
  }, [descriptionLength, triggerDescShake]);

  // A past start whose date is today is a time problem, so surface it on the
  // Start time field; a past/empty date stays on the Start date field.
  const startErr = errors.startAt?.message;
  const startIsToday = !!(startAt && isSameDay(startAt, new Date()));
  const startDateError = startErr && (!startAt || !startIsToday) ? startErr : undefined;
  const startTimeError = startErr && startAt && startIsToday ? startErr : undefined;

  // A same-day end that's not after start is a time problem, so surface the
  // error on the End time field; otherwise it's a date problem.
  const endSameDay = !!(startAt && endAt && isSameDay(startAt, endAt));
  const endDateError = endSameDay ? undefined : errors.endAt?.message;
  const endTimeError = endSameDay ? errors.endAt?.message : undefined;

  const selectedCommunity = communities.find((c: Community) => c.id === communityId) ?? null;

  // Restore a saved draft on first mount.
  useEffect(() => {
    let mounted = true;
    eventDraftStorage.load().then(draft => {
      if (!mounted || !draft) return;
      reset({
        title: draft.title ?? '',
        description: draft.description ?? '',
        community: draft.community ?? '',
        location_text: draft.location_text ?? '',
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        startAt: draft.startAt ? new Date(draft.startAt) : null,
        endAt: draft.endAt ? new Date(draft.endAt) : null,
        capacity: draft.capacity ?? '',
      });
      if (draft.coverUri) setCoverUri(draft.coverUri);
    });
    return () => {
      mounted = false;
    };
  }, [reset]);

  const handleSaveDraft = async () => {
    const v = getValues();
    await eventDraftStorage.save({
      title: v.title,
      description: v.description,
      community: v.community,
      location_text: v.location_text,
      lat: v.lat,
      lng: v.lng,
      startAt: v.startAt ? v.startAt.toISOString() : null,
      endAt: v.endAt ? v.endAt.toISOString() : null,
      capacity: v.capacity,
      coverUri,
    });
    router.back();
  };

  const pickCover = async () => {
    if (isPending) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9] as [number, number],
      quality: 0.85,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  // Map tap → set coords, then reverse-geocode to fill the location text.
  const handlePickOnMap = async (pickedLat: number, pickedLng: number) => {
    setValue('lat', pickedLat, { shouldValidate: true });
    setValue('lng', pickedLng, { shouldValidate: true });
    const address = await reverseGeocode(pickedLat, pickedLng);
    if (address) setValue('location_text', address);
  };

  // Address text → forward-geocode to set coords + move the pin.
  const handleLocateAddress = async () => {
    const text = getValues('location_text') ?? '';
    if (!text.trim() || geocoding) return;
    setGeocoding(true);
    const coords = await forwardGeocode(text);
    setGeocoding(false);
    if (coords) {
      setValue('lat', coords.lat);
      setValue('lng', coords.lng);
    } else {
      Alert.alert(
        "Couldn't find that place",
        'Try a more specific address, or drop a pin on the map.',
      );
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.startAt) return; // guarded by schema; satisfies the type narrowing
    setServerError('');
    try {
      const event = await createEvent({
        community: data.community,
        title: data.title,
        description: data.description || undefined,
        location_text: data.location_text || undefined,
        lat: data.lat,
        lng: data.lng,
        start_datetime: data.startAt.toISOString(),
        end_datetime: data.endAt ? data.endAt.toISOString() : undefined,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        is_private: data.is_private,
      });
      if (coverUri) {
        try {
          await uploadCover({ localUri: coverUri, eventId: event.id });
        } catch {
          Alert.alert('Event created', 'The cover image failed to upload. You can add it later.');
        }
      }
      await eventDraftStorage.clear();
      router.replace(`/event/${event.id}` as never);
    } catch (err) {
      setServerError(extractDrfError(err));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New event',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.medium, fontSize: 17 },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
                Cancel
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleSaveDraft}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel="Save draft"
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text
                style={[
                  typography.body,
                  { color: colors.primary, fontFamily: fonts.medium, opacity: isPending ? 0.4 : 1 },
                ]}
                numberOfLines={1}
              >
                Save draft
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cover */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add cover image"
            onPress={pickCover}
            disabled={isPending}
          >
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={[styles.coverPreview, { borderColor: colors.border }]}
                contentFit="cover"
                accessibilityLabel="Cover image preview"
              />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  { borderColor: colors.border, backgroundColor: colors.surfaceSunk },
                ]}
              >
                <Ionicons name="image-outline" size={26} color={colors.textMuted} />
                <Text
                  style={[typography.body, { color: colors.textMuted, fontFamily: fonts.medium }]}
                >
                  Add a cover image
                </Text>
                <Text style={[typography.caption, { color: colors.textFaint }]}>
                  JPG or PNG, up to 5 MB
                </Text>
              </View>
            )}
          </Pressable>

          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <FormField
                label="Title"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.title?.message}
                maxLength={200}
                placeholder="What's the event?"
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <View>
                <FormField
                  label="Description"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.description?.message}
                  placeholder="Tell people what to expect"
                  multiline
                  maxLines={13}
                  maxLength={DESCRIPTION_MAX}
                  accessibilityLabel="Description"
                />
                <Animated.View style={descShakeStyle}>
                  <Text
                    style={[
                      styles.charCounter,
                      {
                        color:
                          descriptionLength >= DESCRIPTION_DANGER
                            ? colors.danger
                            : descriptionLength >= DESCRIPTION_WARN
                              ? colors.warning
                              : colors.textFaint,
                        fontFamily: fonts.regular,
                      },
                    ]}
                  >
                    {descriptionLength}/{DESCRIPTION_MAX}
                  </Text>
                </Animated.View>
              </View>
            )}
          />

          {/* Community */}
          <SelectField
            label="Community"
            valueText={selectedCommunity?.name ?? null}
            placeholder="Select a community"
            error={errors.community?.message}
            active={communityPickerOpen}
            onPress={() => setCommunityPickerOpen(true)}
          />

          <Controller
            control={control}
            name="is_private"
            render={({ field }) => (
              <View
                style={[
                  styles.switchRow,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text }]}>Private event</Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Only community members can see this event
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Private event"
                  value={field.value}
                  onValueChange={field.onChange}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
            )}
          />

          {/* Location */}
          <Controller
            control={control}
            name="location_text"
            render={({ field }) => (
              <FormField
                label="Location"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.location_text?.message}
                placeholder="Venue or address"
                maxLength={255}
                returnKeyType="search"
                onSubmitEditing={handleLocateAddress}
                rightAccessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Find address on map"
                    onPress={handleLocateAddress}
                    hitSlop={10}
                  >
                    {geocoding ? (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                      <Ionicons name="locate-outline" size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                }
              />
            )}
          />

          {/* Map */}
          <LocationPickerMap
            lat={lat}
            lng={lng}
            onPick={handlePickOnMap}
            defaultCenter={communityDefaultCenter ?? undefined}
            defaultCenterLabel={selectedCommunity?.location}
          />

          {/* Start date + time */}
          <View style={styles.dateTimeRow}>
            <View style={{ flex: 1 }}>
              <DateTimePickerField
                label="Start date"
                mode="date"
                value={startAt}
                onChange={picked => {
                  setValue('startAt', mergeDate(startAt, picked), { shouldValidate: true });
                  void trigger('endAt');
                }}
                placeholder="Pick date"
                format={formatDate}
                icon="calendar-outline"
                error={startDateError}
                minimumDate={new Date()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimePickerField
                label="Start time"
                mode="time"
                value={startAt}
                onChange={picked => {
                  setValue('startAt', mergeTime(startAt, picked), { shouldValidate: true });
                  void trigger('endAt');
                }}
                placeholder="Pick time"
                format={formatTime}
                icon="time-outline"
                error={startTimeError}
                minuteInterval={5}
              />
            </View>
          </View>

          {/* End date + time (optional) */}
          <View style={styles.dateTimeRow}>
            <View style={{ flex: 1 }}>
              <DateTimePickerField
                label="End date (optional)"
                mode="date"
                value={endAt}
                onChange={picked =>
                  setValue('endAt', mergeDate(endAt, picked), { shouldValidate: true })
                }
                placeholder="Pick date"
                format={formatDate}
                icon="calendar-outline"
                error={endDateError}
                minimumDate={startAt ?? undefined}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimePickerField
                label="End time (optional)"
                mode="time"
                value={endAt}
                onChange={picked =>
                  setValue('endAt', mergeTime(endAt, picked), { shouldValidate: true })
                }
                placeholder="Pick time"
                format={formatTime}
                icon="time-outline"
                error={endTimeError}
                minuteInterval={5}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="capacity"
            render={({ field }) => (
              <FormField
                label="Capacity (optional)"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.capacity?.message}
                placeholder="Leave blank for no cap"
                keyboardType="number-pad"
                maxLength={6}
              />
            )}
          />

          {serverError ? (
            <Text style={[typography.caption, { color: colors.danger }]}>{serverError}</Text>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: colors.borderSoft, paddingBottom: bottom + spacing.md },
          ]}
        >
          <PrimaryButton
            label="Publish event"
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            loading={isPending}
            loadingLabel="Publishing…"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Community picker */}
      <Controller
        control={control}
        name="community"
        render={({ field }) => (
          <OptionPickerModal
            visible={communityPickerOpen}
            title="Choose a community"
            options={communities.map((c: Community) => ({ id: c.id, label: c.name }))}
            selectedId={field.value || null}
            loading={communitiesLoading}
            emptyText="Join a community before creating an event."
            onSelect={id => {
              // Tapping the selected community again clears it.
              field.onChange(id === field.value ? '' : id);
              setCommunityPickerOpen(false);
            }}
            onClose={() => setCommunityPickerOpen(false)}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.base, gap: spacing.lg },
  headerBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  charCounter: { fontSize: 11, textAlign: 'right', marginTop: 4, paddingHorizontal: 2 },
  coverPlaceholder: {
    height: 132,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  coverPreview: {
    height: 132,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, letterSpacing: 0.1, fontFamily: fonts.medium },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
  },
  errorText: { fontSize: 12 },
  dateTimeRow: { flexDirection: 'row', gap: spacing.md },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.md,
  },
  footer: { padding: spacing.base, borderTopWidth: 1 },

  // Picker sheet — mirrors the RSVP picker in EventCard
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
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pickerList: { flexGrow: 0 },
  pickerEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
});
