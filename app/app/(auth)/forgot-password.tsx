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
import { useForgotPassword } from '@/hooks/useForgotPassword';
import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const colors = useTheme();
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (_data: FormData) => {
    setServerError('');
    forgotPassword(_data, {
      onSuccess: () => router.push('/(auth)/verify-code' as Href),
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
            Forgot your password?
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            {"Enter your email and we'll send you a reset code."}
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
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {serverError ? (
            <Text style={[styles.serverError, { color: colors.danger, fontFamily: fonts.regular }]}>
              {serverError}
            </Text>
          ) : null}

          <PrimaryButton
            label="Send reset code"
            loadingLabel="Sending…"
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.switchRow}>
            <Text
              style={[styles.switchText, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              Already Reset?{' '}
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
