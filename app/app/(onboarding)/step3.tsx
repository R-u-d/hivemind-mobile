import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';

import FormField from '@/components/FormField';
import PrimaryButton from '@/components/PrimaryButton';
import { client, extractDrfError } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { User } from '@/types/user';

const AVATAR_SIZE = 112;

const schema = z.object({
  display_name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Name must be 150 characters or fewer'),
  location: z.string().max(100, 'Location must be 100 characters or fewer').optional(),
  bio: z.string().max(200, 'Bio must be 200 characters or fewer').optional(),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingStep3() {
  const colors = useTheme();
  const queryClient = useQueryClient();

  const { data: user } = useCurrentUser();
  const { mutateAsync: uploadAvatar, isPending: avatarPending } = useAvatarUpload();
  const { mutateAsync: updateProfile, isPending: updatePending } = useUpdateProfile();

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);
  const [finishPending, setFinishPending] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      display_name: user?.display_name ?? '',
      location: user?.location ?? '',
      bio: user?.bio ?? '',
    },
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const onSubmit = async (formData: FormData) => {
    setServerError('');
    try {
      const newAvatarUrl = avatarUri?.startsWith('file://')
        ? await uploadAvatar(avatarUri)
        : undefined;

      await updateProfile({
        display_name: formData.display_name,
        location: formData.location || '',
        bio: formData.bio || '',
        ...(newAvatarUrl !== undefined && { avatar_url: newAvatarUrl }),
      });

      setFinishPending(true);
      await client.patch('/users/me/', { has_onboarded: true });
      queryClient.setQueryData<User>(['users', 'me'], old =>
        old ? { ...old, has_onboarded: true } : old,
      );
      await tokenStorage.setOnboarded();
      router.replace('/(tabs)/feed');
    } catch (err) {
      setServerError(extractDrfError(err));
      setFinishPending(false);
    }
  };

  const bioLength = (watch('bio') ?? '').length;
  const isPending = avatarPending || updatePending || finishPending;
  const hasImage = !!avatarUri;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14 }}>
            Back
          </Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          <Text style={{ color: colors.primary }}>{'3'}</Text>
          <Text>{' / 3'}</Text>
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={[typography.display, { color: colors.text }]}>Set up your profile</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              This is how others will see you.
            </Text>
          </View>

          <View style={styles.avatarWrap}>
            <Pressable
              onPress={pickImage}
              accessibilityLabel="Set profile photo"
              accessibilityRole="button"
              style={styles.avatarOuter}
            >
              <View
                style={[
                  styles.avatarCircle,
                  hasImage
                    ? styles.avatarCircleFilled
                    : { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                ]}
              >
                {hasImage ? (
                  <Image
                    source={{ uri: avatarUri! }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    accessibilityLabel="Profile photo preview"
                  />
                ) : (
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                )}
              </View>
              <View
                style={[
                  styles.avatarBadge,
                  { backgroundColor: colors.primary, borderColor: colors.surface },
                ]}
              >
                <Ionicons name="add-outline" size={14} color={colors.onPrimary} />
              </View>
            </Pressable>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Display name"
                  placeholder="Your name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.display_name?.message}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={150}
                  accessibilityLabel="Display name"
                />
              )}
            />

            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField
                  label="Location"
                  placeholder="City, country (optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.location?.message}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={100}
                  accessibilityLabel="Location"
                />
              )}
            />

            <Controller
              control={control}
              name="bio"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <FormField
                    label="Bio"
                    placeholder="A few words about you (optional)"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.bio?.message}
                    multiline
                    maxLength={200}
                    style={styles.bioInput}
                    accessibilityLabel="Bio"
                  />
                  <Text
                    style={[
                      styles.charCounter,
                      {
                        color:
                          bioLength >= 200
                            ? colors.danger
                            : bioLength >= 150
                              ? colors.warning
                              : colors.textFaint,
                        fontFamily: fonts.regular,
                      },
                    ]}
                  >
                    {bioLength}/200
                  </Text>
                </View>
              )}
            />
          </View>

          {serverError ? (
            <Text style={[styles.serverError, { color: colors.danger, fontFamily: fonts.regular }]}>
              {serverError}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <PrimaryButton
              label="Let's go"
              loadingLabel="Setting up…"
              loading={isPending}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scroll: { flexGrow: 1 },
  titleBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 6,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleFilled: {
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: spacing.base,
    gap: 14,
  },
  bioInput: { minHeight: 54 },
  charCounter: { fontSize: 11, textAlign: 'right', marginTop: 4, paddingHorizontal: 2 },
  serverError: { fontSize: 13, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.lg },
});
