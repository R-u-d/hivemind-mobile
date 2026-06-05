import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeContext';
import { typography, radius } from '@/theme';
import { routeFromNotificationData } from '@/utils/notificationRouting';

export type InAppNotification = {
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type Props = {
  notification: InAppNotification | null;
  onDismiss: () => void;
};

const BANNER_HEIGHT = 72;
const AUTO_DISMISS_MS = 4000;

export default function InAppNotificationBanner({ notification, onDismiss }: Props) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  // Start off-screen above the safe area.
  const hiddenY = -(BANNER_HEIGHT + insets.top + 20);
  const translateY = useSharedValue(hiddenY);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const slideOut = useCallback(() => {
    translateY.value = withTiming(hiddenY, { duration: 250 }, finished => {
      if (finished) runOnJS(onDismiss)();
    });
  }, [translateY, hiddenY, onDismiss]);

  useEffect(() => {
    if (!notification) return;

    translateY.value = withSpring(insets.top + 8, { damping: 15, stiffness: 150 });
    const timer = setTimeout(slideOut, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notification, slideOut, translateY, insets.top]);

  const handlePress = () => {
    const href = routeFromNotificationData(notification?.data ?? {});
    slideOut();
    if (href) router.push(href);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.surface, shadowColor: colors.ink },
        animatedStyle,
      ]}
      pointerEvents={notification ? 'auto' : 'none'}
    >
      <Pressable
        style={styles.row}
        onPress={handlePress}
        accessibilityLabel={`Notification: ${notification?.title ?? ''}`}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="notifications" size={18} color={colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text
            style={[typography.caption, { color: colors.text, fontFamily: 'Inter_500Medium' }]}
            numberOfLines={1}
          >
            {notification?.title}
          </Text>
          {!!notification?.body && (
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {notification.body}
            </Text>
          )}
        </View>
        <Pressable
          onPress={slideOut}
          hitSlop={8}
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: radius.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});
