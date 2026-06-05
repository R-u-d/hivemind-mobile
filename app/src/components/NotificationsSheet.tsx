import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useMarkUnread,
} from '@/hooks/useNotifications';
import { routeFromNotificationData } from '@/utils/notificationRouting';
import { relativeTime } from '@/utils/relativeTime';
import SkeletonBox from '@/components/SkeletonBox';
import EmptyState from '@/components/EmptyState';
import HexLoader from '@/components/HexLoader';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { AppNotification, NotificationType } from '@/types/notifications';

const TYPE_ICON: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  new_post: 'chatbubble-outline',
  new_event: 'calendar-outline',
  event_reminder: 'alarm-outline',
  rsvp: 'checkmark-circle-outline',
  member_join: 'person-add-outline',
};

function MarkReadAction({ dragX }: { dragX: Animated.AnimatedInterpolation<number> }) {
  const scale = dragX.interpolate({
    inputRange: [-80, -40],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[styles.swipeAction, styles.swipeActionRead, { transform: [{ scale }] }]}>
      <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
      <Text style={styles.swipeActionLabel}>Read</Text>
    </Animated.View>
  );
}

function MarkUnreadAction({ dragX }: { dragX: Animated.AnimatedInterpolation<number> }) {
  const scale = dragX.interpolate({
    inputRange: [40, 80],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View
      style={[styles.swipeAction, styles.swipeActionUnread, { transform: [{ scale }] }]}
    >
      <Ionicons name="ellipse" size={10} color={colors.primary} />
      <Text style={[styles.swipeActionLabel, { color: colors.primary }]}>Unread</Text>
    </Animated.View>
  );
}

function NotificationRow({
  item,
  onPress,
  onMarkRead,
  onMarkUnread,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
}) {
  const themeColors = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const icon = TYPE_ICON[item.notification_type] ?? 'notifications-outline';
  const read = item.is_read;

  const renderRightActions = useCallback(
    (_: unknown, dragX: Animated.AnimatedInterpolation<number>) => <MarkReadAction dragX={dragX} />,
    [],
  );

  const renderLeftActions = useCallback(
    (_: unknown, dragX: Animated.AnimatedInterpolation<number>) => (
      <MarkUnreadAction dragX={dragX} />
    ),
    [],
  );

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={60}
      leftThreshold={60}
      renderRightActions={read ? undefined : renderRightActions}
      renderLeftActions={read ? renderLeftActions : undefined}
      onSwipeableOpen={direction => {
        swipeRef.current?.close();
        if (direction === 'right') onMarkRead(item.id);
        else onMarkUnread(item.id);
      }}
    >
      <Pressable
        style={[styles.row, !read && { backgroundColor: colors.primarySoft }]}
        onPress={() => onPress(item)}
        accessibilityLabel={item.title}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.iconWrap,
            read
              ? { backgroundColor: themeColors.surfaceSunk }
              : {
                  backgroundColor: colors.primarySoft,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                },
          ]}
        >
          <Ionicons name={icon} size={18} color={read ? themeColors.textMuted : colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text
            style={[
              typography.caption,
              {
                color: read ? themeColors.text : colors.primary,
                fontFamily: read ? fonts.regular : fonts.medium,
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!!item.body && (
            <Text
              style={[typography.caption, { color: read ? themeColors.textMuted : colors.primary }]}
              numberOfLines={1}
            >
              {item.body}
            </Text>
          )}
          <Text
            style={[
              typography.overline,
              { color: read ? themeColors.textFaint : colors.primary, marginTop: 2 },
            ]}
          >
            {relativeTime(item.created_at)}
          </Text>
        </View>
        {!read && <Ionicons name="ellipse" size={8} color={colors.primary} />}
      </Pressable>
    </Swipeable>
  );
}

function SheetSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.skeletonRow}>
          <SkeletonBox width={38} height={38} borderRadius={19} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="80%" height={13} borderRadius={6} />
            <SkeletonBox width="55%" height={11} borderRadius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsSheet({ visible, onClose }: NotificationsSheetProps) {
  const themeColors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 0,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) panY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          Animated.timing(panY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() =>
            onClose(),
          );
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const { notifications, hasUnread, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useNotifications();

  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead } = useMarkAllRead();
  const { mutate: markUnread } = useMarkUnread();

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
      panY.setValue(0);
    }
  }, [visible, slideAnim, panY]);

  const translateY = Animated.add(
    slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
    panY,
  );

  const handleRowPress = useCallback(
    (item: AppNotification) => {
      if (!item.is_read) markRead(item.id);
      const href = routeFromNotificationData(item.data);
      onClose();
      if (href) router.push(href);
    },
    [markRead, onClose],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close notifications"
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            paddingBottom: bottom + spacing.base,
          },
          { transform: [{ translateY }] },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
          <View style={styles.header}>
            <Text style={[typography.title, { color: themeColors.text }]}>Notifications</Text>
            {hasUnread && (
              <Pressable
                onPress={() => markAllRead()}
                accessibilityLabel="Mark all notifications as read"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    typography.caption,
                    { color: themeColors.primary, fontFamily: fonts.medium },
                  ]}
                >
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {isLoading ? (
          <SheetSkeleton />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="notifications-off-outline"
              title="No notifications yet"
              message="You'll see updates here when something happens in your communities."
            />
          </View>
        ) : (
          <FlashList<AppNotification>
            data={notifications}
            keyExtractor={n => n.id}
            renderItem={({ item }) => (
              <NotificationRow
                item={item}
                onPress={handleRowPress}
                onMarkRead={markRead}
                onMarkUnread={markUnread}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: spacing.base }}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.loaderWrap}>
                  <HexLoader size={22} color={colors.primary} />
                </View>
              ) : null
            }
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
  },
  dragArea: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  skeletonWrap: { gap: spacing.md, paddingVertical: spacing.sm },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  loaderWrap: { paddingVertical: spacing.lg, alignItems: 'center' },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: radius.md,
    marginBottom: 2,
    gap: 3,
  },
  swipeActionRead: { backgroundColor: colors.primary },
  swipeActionUnread: { backgroundColor: colors.primarySoft },
  swipeActionLabel: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fonts.medium,
  },
});
