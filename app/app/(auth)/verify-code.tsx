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
import { useVerifyResetCode } from '@/hooks/useVerifyResetCode';
import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const schema = z.object({
  token: z.string().min(1, 'Reset code is required'),
});

type FormData = z.infer<typeof schema>;

export default function VerifyCodeScreen() {
  const colors = useTheme();
  const { mutate: verifyResetCode, isPending } = useVerifyResetCode();
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    setServerError('');
    verifyResetCode(data, {
      onSuccess: () =>
        router.push(`/(auth)/reset-password?token=${encodeURIComponent(data.token)}` as Href),
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
            Enter reset code
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs }]}>
            Check your email and paste the reset code below.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="token"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Reset code"
                placeholder="Paste code from email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.token?.message}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Reset code"
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
            label="Verify code"
            loadingLabel="Verifying…"
            loading={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.switchRow}>
            <Text
              style={[styles.switchText, { color: colors.textMuted, fontFamily: fonts.regular }]}
            >
              {"Didn't get a code? "}
            </Text>
            <Pressable onPress={() => router.back()} accessibilityLabel="Try again">
              <Text
                style={[styles.switchLink, { color: colors.primary, fontFamily: fonts.medium }]}
              >
                Try again
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
