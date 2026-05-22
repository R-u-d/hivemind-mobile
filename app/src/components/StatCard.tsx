import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface StatCardProps {
  label: string;
  value: number | string;
}

export default function StatCard({ label, value }: StatCardProps) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.medium }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.text, fontFamily: fonts.medium }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: spacing.base, borderRadius: radius.lg, borderWidth: 1, gap: 2 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 26, letterSpacing: -0.6 },
});
