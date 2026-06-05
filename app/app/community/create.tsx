import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
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

import FormField from '@/components/FormField';
import PrimaryButton from '@/components/PrimaryButton';
import { extractDrfError } from '@/api/client';
import { useCreateCommunity } from '@/hooks/useCreateCommunity';
import { useCoverUpload } from '@/hooks/useCoverUpload';
import { useShakeAnimation } from '@/hooks/useShakeAnimation';
import {
  communityTypeColors,
  communityTypeLabels,
  fonts,
  radius,
  spacing,
  typography,
  type CommunityType,
} from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const TYPES: CommunityType[] = ['study', 'gaming', 'sports', 'creative', 'social'];

const DESCRIPTION_MAX = 500;
const DESCRIPTION_WARN = 400;
const DESCRIPTION_DANGER = 480;

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  community_type: z
    .enum(['study', 'gaming', 'sports', 'creative', 'social'])
    .nullable()
    .refine(v => v !== null, 'Please select a type'),
  is_private: z.boolean(),
  location: z.string().max(100, 'Max 100 characters').optional(),
  description: z.string().max(DESCRIPTION_MAX, `Max ${DESCRIPTION_MAX} characters`).optional(),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

function TypePickerChips({
  value,
  onChange,
  error,
}: {
  value: CommunityType | null;
  onChange: (t: CommunityType | null) => void;
  error?: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Type</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TYPES.map(type => {
          const tc = communityTypeColors[type];
          const selected = value === type;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={communityTypeLabels[type]}
              onPress={() => onChange(selected ? null : type)}
              style={[
                styles.typeChip,
                {
                  borderColor: selected ? tc.primary : colors.border,
                  backgroundColor: selected ? tc.background : colors.surface,
                },
              ]}
            >
              <View style={[styles.typeDot, { backgroundColor: tc.primary }]} />
              <Text
                style={[
                  typography.caption,
                  { color: selected ? tc.text : colors.textMuted, fontFamily: fonts.medium },
                ]}
              >
                {communityTypeLabels[type]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

export default function CreateCommunityScreen() {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');

  const { mutateAsync: createCommunity, isPending: creating } = useCreateCommunity();
  const { mutateAsync: uploadCover, isPending: uploading } = useCoverUpload();

  const isPending = creating || uploading;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      community_type: null,
      is_private: false,
      location: '',
      description: '',
    },
  });

  const descriptionLength = (watch('description') ?? '').length;
  const { style: descShakeStyle, trigger: triggerDescShake } = useShakeAnimation();

  useEffect(() => {
    if (descriptionLength === DESCRIPTION_MAX) triggerDescShake();
  }, [descriptionLength, triggerDescShake]);

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

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const community = await createCommunity({
        name: data.name,
        community_type: data.community_type!,
        is_private: data.is_private,
        location: data.location || undefined,
        description: data.description || undefined,
      });
      if (coverUri) {
        try {
          await uploadCover({ localUri: coverUri, communityId: community.id });
        } catch {
          Alert.alert(
            'Community created',
            'The cover image failed to upload. You can add it later.',
          );
        }
      }
      router.replace(`/community/${community.id}` as never);
    } catch (err) {
      setServerError(extractDrfError(err));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New community',
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
            name="name"
            render={({ field }) => (
              <FormField
                label="Name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.name?.message}
                maxLength={100}
                placeholder="Give your community a name"
              />
            )}
          />

          <Controller
            control={control}
            name="community_type"
            render={({ field }) => (
              <TypePickerChips
                value={field.value}
                onChange={field.onChange}
                error={errors.community_type?.message}
              />
            )}
          />

          <View
            style={[
              styles.switchRow,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>Private community</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                Only members can see posts
              </Text>
            </View>
            <Controller
              control={control}
              name="is_private"
              render={({ field }) => (
                <Switch
                  accessibilityLabel="Private community"
                  value={field.value}
                  onValueChange={field.onChange}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.surface}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <FormField
                label="Location"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.location?.message}
                placeholder="e.g. Brooklyn, NY"
                maxLength={100}
                rightAccessory={
                  <Ionicons name="location-outline" size={18} color={colors.textFaint} />
                }
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
                  placeholder="What's this community about?"
                  multiline
                  maxLength={DESCRIPTION_MAX}
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
            label="Create community"
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            loading={isPending}
            loadingLabel="Creating…"
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  body: {
    padding: spacing.base,
    gap: spacing.lg,
  },
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
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: 13, letterSpacing: 0.1, fontFamily: fonts.medium },
  chipRow: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorText: { fontSize: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.md,
  },
  charCounter: { fontSize: 11, textAlign: 'right', marginTop: 4, paddingHorizontal: 2 },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
  },
});
