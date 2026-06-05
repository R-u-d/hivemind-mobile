import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface TabErrorStateProps {
  title?: string;
  onRetry: () => void;
}

export default function TabErrorState({
  title = 'Something went wrong',
  onRetry,
}: TabErrorStateProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={52} color={colors.textMuted} />
      <View style={styles.textBlock}>
        <Text
          style={[
            typography.body,
            { color: colors.text, fontFamily: fonts.medium, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
          Check your connection and try again.
        </Text>
      </View>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={[styles.btn, { borderColor: colors.border }]}
      >
        <Text style={[styles.btnText, { color: colors.textMuted, fontFamily: fonts.medium }]}>
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 12,
  },
  textBlock: { gap: 6, alignItems: 'center' },
  btn: {
    marginTop: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  btnText: { fontSize: 13 },
});
