import { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import FormField from '@/components/FormField';
import HiveLogo from '@/components/HiveLogo';
import PrimaryButton from '@/components/PrimaryButton';
import { extractDrfError } from '@/api/client';
import { useResetPassword } from '@/hooks/useResetPassword';
import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine(data => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const colors = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { mutate: resetPassword, isPending } = useResetPassword();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.replace('/(auth)/login' as Href), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ confirm_password: _cp, ...data }: FormData) => {
    setServerError('');
    resetPassword(
      { token: token ?? '', ...data },
      {
        onSuccess: () => setSuccess(true),
        onError: err => setServerError(extractDrfError(err)),
      },
    );
  };

  if (success) {
    return (
      <View style={[styles.flex, styles.successContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        <Text style={[typography.display, { color: colors.text, marginTop: spacing.lg }]}>
          Password updated!
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
          ]}
        >
          Taking you to sign in…
        </Text>
      </View>
    );
  }

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
            Choose a new password
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Pick something strong. You won't be prompted again.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="New password"
                placeholder="At least 8 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="New password"
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
                label="Confirm new password"
                placeholder="Repeat password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirm_password?.message}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoComplete="new-password"
                accessibilityLabel="Confirm new password"
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
            label="Reset password"
            loadingLabel="Resetting…"
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.switchRow}>
            <Text
              style={[styles.switchText, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              Remember it?{' '}
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login' as Href)}
              accessibilityLabel="Sign in"
            >
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
  successContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
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
