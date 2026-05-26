import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

type Size = 'lg' | 'md' | 'sm';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const HEIGHT: Record<Size, number> = { lg: 52, md: 36, sm: 30 };
const FONT_SIZE: Record<Size, number> = { lg: 14, md: 14, sm: 13 };

export default function SecondaryButton({
  label,
  onPress,
  size = 'md',
  full = false,
  disabled = false,
  accessibilityLabel,
}: SecondaryButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          height: HEIGHT[size],
          alignSelf: full ? 'stretch' : 'flex-start',
          backgroundColor: pressed && !disabled ? colors.primarySoft : colors.surface,
          borderColor: disabled ? colors.border : colors.primary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.label,
          { color: colors.primary, fontFamily: fonts.medium, fontSize: FONT_SIZE[size] },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { letterSpacing: -0.1 },
});
