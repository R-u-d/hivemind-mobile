import { useEffect, useState } from 'react';
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
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';

import Avatar from '@/components/Avatar';
import FormField from '@/components/FormField';
import PrimaryButton from '@/components/PrimaryButton';
import { extractDrfError } from '@/api/client';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLogout } from '@/hooks/useLogout';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z.object({
  display_name: z
    .string()
    .min(1, 'Name is required')
    .max(150, 'Name must be 150 characters or fewer'),
  location: z.string().max(100, 'Location must be 100 characters or fewer').optional(),
  bio: z.string().max(200, 'Bio must be 200 characters or fewer').optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const c = useTheme();
  const { data: user } = useCurrentUser();
  const { mutateAsync: updateProfile, isPending: updatePending } = useUpdateProfile();
  const { mutateAsync: uploadAvatar, isPending: avatarPending } = useAvatarUpload();
  const { mutate: logout } = useLogout();

  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url ?? null);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    setAvatarUri(prev => (prev?.startsWith('file://') ? prev : (user?.avatar_url ?? null)));
  }, [user?.avatar_url]);

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
      Alert.alert('Permission needed', 'Allow photo access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
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
      router.back();
    } catch (err) {
      setServerError(extractDrfError(err));
    }
  };

  const bioLength = (watch('bio') ?? '').length;

  const displayName = user?.display_name || user?.email || '';
  const isPending = updatePending || avatarPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.text,
          headerTitleStyle: { fontFamily: fonts.medium, fontSize: 17 },
          headerRight: () => (
            <Pressable onPress={() => logout()} accessibilityLabel="Log out" style={{ padding: 4 }}>
              <Ionicons name="log-out-outline" size={22} color={c.danger} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: c.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <Avatar uri={avatarUri} name={displayName} size={80} />
            <Pressable
              onPress={pickImage}
              style={[styles.changePhotoBtn, { borderColor: c.primary }]}
              accessibilityLabel="Change profile photo"
            >
              <Text
                style={[styles.changePhotoText, { color: c.primary, fontFamily: fonts.medium }]}
              >
                Change photo
              </Text>
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
                          bioLength >= 200 ? c.danger : bioLength >= 150 ? c.warning : c.textFaint,
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
            <Text style={[styles.serverError, { color: c.danger, fontFamily: fonts.regular }]}>
              {serverError}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <PrimaryButton
              label="Save changes"
              loadingLabel="Saving…"
              loading={isPending}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxxl },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  changePhotoBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  changePhotoText: { fontSize: 13 },
  form: { paddingHorizontal: spacing.base, gap: 14 },
  bioInput: { minHeight: 54 },
  charCounter: { fontSize: 11, textAlign: 'right', marginTop: 4, paddingHorizontal: 2 },
  serverError: { fontSize: 13, paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.lg },
});
