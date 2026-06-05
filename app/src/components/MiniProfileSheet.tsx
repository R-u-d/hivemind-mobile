import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Avatar from '@/components/Avatar';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

interface MiniProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export default function MiniProfileSheet({
  visible,
  onClose,
  userId,
  displayName,
  avatarUrl,
}: MiniProfileSheetProps) {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  function handleViewProfile() {
    onClose();
    router.push(`/user/${userId}` as never);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: bottom + spacing.base,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.profileRow}>
            <Avatar uri={avatarUrl} name={displayName} size={56} />
            <View style={styles.nameBlock}>
              <Text style={[typography.heading, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleViewProfile}
            accessibilityRole="button"
            accessibilityLabel={`View ${displayName}'s profile`}
            style={[styles.profileBtn, { borderColor: colors.primary }]}
          >
            <Text
              style={[styles.profileBtnText, { color: colors.primary, fontFamily: fonts.medium }]}
            >
              View full profile
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  profileBtn: {
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  profileBtnText: { fontSize: 15 },
});
