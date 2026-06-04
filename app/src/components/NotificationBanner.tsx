import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme';

export default function NotificationBanner() {
  const colors = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
    >
      <Ionicons name="notifications-off-outline" size={18} color={colors.textMuted} />
      <Text style={[typography.caption, styles.text, { color: colors.textMuted }]}>
        Notifications are off.{' '}
        <Text
          style={{ color: colors.primary }}
          onPress={() => Linking.openSettings()}
          accessibilityLabel="Open device settings to enable notifications"
          accessibilityRole="link"
        >
          Enable in Settings
        </Text>
      </Text>
      <Pressable
        onPress={() => setDismissed(true)}
        accessibilityLabel="Dismiss notification banner"
        hitSlop={8}
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
  },
});
