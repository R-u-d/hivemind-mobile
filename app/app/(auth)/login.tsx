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
import HiveLogo from '@/components/HiveLogo';
import PrimaryButton from '@/components/PrimaryButton';
import { extractDrfError } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';
import { useLogin } from '@/hooks/useLogin';
import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const colors = useTheme();
  const { mutate: login, isPending } = useLogin();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setServerError('');
    login(data, {
      onSuccess: async () => {
        const onboarded = await tokenStorage.isOnboarded();
        router.replace((onboarded ? '/(tabs)/feed' : '/(onboarding)') as Href);
      },
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
          <HiveLogo size={32} color={colors.primary} />
          <Text style={[typography.display, { color: colors.text, marginTop: spacing.lg }]}>
            Welcome back
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Sign in to pick up where you left off.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
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

          {/* TODO: forgot-password link — backend reset flow not implemented yet */}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {serverError ? (
            <Text style={[styles.serverError, { color: colors.danger, fontFamily: fonts.regular }]}>
              {serverError}
            </Text>
          ) : null}

          <View style={styles.switchRow}>
            <Text
              style={[styles.switchText, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              No account?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register' as Href)}
              accessibilityLabel="Register"
            >
              <Text
                style={[styles.switchLink, { color: colors.primary, fontFamily: fonts.medium }]}
              >
                Register
              </Text>
            </Pressable>
          </View>

          <PrimaryButton
            label="Sign in"
            loadingLabel="Signing in…"
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />
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
