import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  accessibilityLabel?: string;
}

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: loading || disabled || pressed ? colors.primaryPressed : colors.primary,
          shadowColor: colors.primary,
        },
      ]}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.label, { color: colors.onPrimary, fontFamily: fonts.medium }]}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 3,
  },
  label: { fontSize: 15, letterSpacing: -0.1 },
});
