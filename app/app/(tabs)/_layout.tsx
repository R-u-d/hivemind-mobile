import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme';
import NotificationBanner from '@/components/NotificationBanner';
import InAppNotificationBanner from '@/components/InAppNotificationBanner';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { useNotifications } from '@/hooks/useNotifications';

function TabIcon({
  name,
  size,
  color,
  dot,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size: number;
  color: string;
  dot?: boolean;
}) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {dot && <View style={styles.dot} />}
    </View>
  );
}

export default function TabLayout() {
  const themeColors = useTheme();
  const { permissionStatus, incomingNotification, clearIncomingNotification } =
    useNotificationSetup();

  const { notifications, hasUnread } = useNotifications();

  const hasNewEvent = notifications.some(n => n.notification_type === 'new_event' && !n.is_read);

  return (
    <View style={{ flex: 1 }}>
      {permissionStatus === 'denied' && <NotificationBanner />}
      <InAppNotificationBanner
        notification={incomingNotification}
        onDismiss={clearIncomingNotification}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textMuted,
          tabBarStyle: {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.borderSoft,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="home-outline" size={size} color={color} dot={hasUnread} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar-outline" size={size} color={color} dot={hasNewEvent} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
