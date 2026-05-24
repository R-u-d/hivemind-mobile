import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface GhostButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export default function GhostButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: GhostButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: colors.border,
          backgroundColor: pressed && !disabled ? colors.surfaceSunk : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  label: { fontSize: 15, letterSpacing: -0.1 },
});
