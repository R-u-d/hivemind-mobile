import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fonts, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const colors = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={52} color={colors.textMuted} />
      <View style={styles.textBlock}>
        <Text
          style={[
            typography.body,
            { color: colors.text, fontFamily: fonts.medium, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
        {message ? (
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            {message}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
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
  action: { marginTop: 8, width: '100%' },
});
