import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router, type Href } from 'expo-router';

import FormField from '@/components/FormField';
import PrimaryButton from '@/components/PrimaryButton';
import { extractDrfError } from '@/api/client';
import { useRegister } from '@/hooks/useRegister';
import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z
  .object({
    display_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name is too long'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine(data => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const colors = useTheme();
  const { mutate: register, isPending } = useRegister();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ confirm_password: _cp, ...payload }: FormData) => {
    setServerError('');
    register(payload, {
      onSuccess: () => router.replace('/(onboarding)' as Href),
      onError: err => setServerError(extractDrfError(err)),
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logoText, { color: colors.primary, fontFamily: fonts.medium }]}>
            HiveMind
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Find your people. Join your first community in under a minute.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="display_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Display name"
                placeholder="e.g. Maya Okonkwo"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.display_name?.message}
                autoCapitalize="words"
                autoComplete="name"
                accessibilityLabel="Display name"
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Email"
                placeholder="you@university.edu"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Password"
                placeholder="At least 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Password"
                rightAccessory={
                  <Pressable
                    onPress={() => setShowPassword(v => !v)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.showHide, { color: colors.primary, fontFamily: fonts.medium }]}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                }
              />
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Confirm password"
                placeholder="Repeat password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirm_password?.message}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Confirm password"
                rightAccessory={
                  <Pressable
                    onPress={() => setShowConfirm(v => !v)}
                    accessibilityLabel={
                      showConfirm ? 'Hide confirm password' : 'Show confirm password'
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.showHide, { color: colors.primary, fontFamily: fonts.medium }]}
                    >
                      {showConfirm ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                }
              />
            )}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {serverError ? (
            <Text style={[styles.serverError, { color: colors.danger, fontFamily: fonts.regular }]}>
              {serverError}
            </Text>
          ) : null}

          <PrimaryButton
            label="Create account"
            loadingLabel="Creating account…"
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.switchRow}>
            <Text
              style={[styles.switchText, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.back()} accessibilityLabel="Sign in">
              <Text
                style={[styles.switchLink, { color: colors.primary, fontFamily: fonts.medium }]}
              >
                Sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 54 },
  header: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  logoText: { fontSize: 15, letterSpacing: -0.3, marginBottom: spacing.lg },
  title: { ...typography.screenTitle },
  subtitle: { ...typography.screenSubtitle, marginTop: spacing.xs },
  form: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: 14,
  },
  showHide: { fontSize: 13 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    paddingTop: spacing.base,
    gap: 14,
  },
  serverError: { fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText: { fontSize: 13 },
  switchLink: { fontSize: 13 },
});
