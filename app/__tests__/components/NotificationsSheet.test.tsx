import { fireEvent, render, screen } from '@testing-library/react-native';
import { createElement } from 'react';

import { ThemeProvider } from '@/theme/ThemeContext';
import type { AppNotification } from '@/types/notifications';

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
  useMarkRead: jest.fn(),
  useMarkUnread: jest.fn(),
  useMarkAllRead: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Swipeable: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/utils/notificationRouting', () => ({
  routeFromNotificationData: jest.fn(() => '/channel/ch-1'),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListFooterComponent,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown) => string;
      ListFooterComponent?: React.ReactNode;
    }) =>
      React.createElement(
        ScrollView,
        null,
        data.map((item: unknown, i: number) =>
          React.createElement(
            React.Fragment,
            { key: keyExtractor ? keyExtractor(item) : i },
            renderItem({ item, index: i }),
          ),
        ),
        ListFooterComponent,
      ),
  };
});

import NotificationsSheet from '@/components/NotificationsSheet';
import {
  useMarkAllRead,
  useMarkRead,
  useMarkUnread,
  useNotifications,
} from '@/hooks/useNotifications';

const mockUseNotifications = useNotifications as jest.Mock;
const mockUseMarkRead = useMarkRead as jest.Mock;
const mockUseMarkUnread = useMarkUnread as jest.Mock;
const mockUseMarkAllRead = useMarkAllRead as jest.Mock;

const mockMarkRead = jest.fn();
const mockMarkUnread = jest.fn();
const mockMarkAllRead = jest.fn();

const makeNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n-1',
  notification_type: 'new_post',
  title: 'New post in Bushwick Synth Heads',
  body: 'Anyone got a Moog tip?',
  data: { channel_id: 'ch-1' },
  is_read: false,
  created_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

const emptyHookState = {
  notifications: [] as AppNotification[],
  hasUnread: false,
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
};

function renderSheet(props: Partial<React.ComponentProps<typeof NotificationsSheet>> = {}) {
  return render(
    createElement(
      ThemeProvider,
      null,
      createElement(NotificationsSheet, { visible: true, onClose: jest.fn(), ...props }),
    ),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotifications.mockReturnValue({ ...emptyHookState });
  mockUseMarkRead.mockReturnValue({ mutate: mockMarkRead });
  mockUseMarkUnread.mockReturnValue({ mutate: mockMarkUnread });
  mockUseMarkAllRead.mockReturnValue({ mutate: mockMarkAllRead });
});

describe('NotificationsSheet', () => {
  it('shows skeleton rows while loading', () => {
    mockUseNotifications.mockReturnValue({ ...emptyHookState, isLoading: true });
    renderSheet();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.queryByText('New post in Bushwick Synth Heads')).toBeNull();
  });

  it('shows empty state when there are no notifications', () => {
    renderSheet();
    expect(screen.getByText('No notifications yet')).toBeTruthy();
    expect(
      screen.getByText("You'll see updates here when something happens in your communities."),
    ).toBeTruthy();
  });

  it('renders notification rows when notifications are present', () => {
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification()],
      hasUnread: true,
    });
    renderSheet();
    expect(screen.getByText('New post in Bushwick Synth Heads')).toBeTruthy();
    expect(screen.getByText('Anyone got a Moog tip?')).toBeTruthy();
  });

  it('shows "Mark all read" button only when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification()],
      hasUnread: true,
    });
    renderSheet();
    expect(screen.getByLabelText('Mark all notifications as read')).toBeTruthy();
  });

  it('hides "Mark all read" button when all are read', () => {
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification({ is_read: true })],
      hasUnread: false,
    });
    renderSheet();
    expect(screen.queryByLabelText('Mark all notifications as read')).toBeNull();
  });

  it('calls markAllRead when "Mark all read" is pressed', () => {
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification()],
      hasUnread: true,
    });
    renderSheet();
    fireEvent.press(screen.getByLabelText('Mark all notifications as read'));
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it('calls markRead and onClose when an unread notification row is pressed', () => {
    const onClose = jest.fn();
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification()],
      hasUnread: true,
    });
    renderSheet({ onClose });
    fireEvent.press(screen.getByLabelText('New post in Bushwick Synth Heads'));
    expect(mockMarkRead).toHaveBeenCalledWith('n-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call markRead when pressing an already-read notification', () => {
    const onClose = jest.fn();
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification({ is_read: true })],
      hasUnread: false,
    });
    renderSheet({ onClose });
    fireEvent.press(screen.getByLabelText('New post in Bushwick Synth Heads'));
    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });
    fireEvent.press(screen.getByLabelText('Close notifications'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render content when visible=false', () => {
    mockUseNotifications.mockReturnValue({
      ...emptyHookState,
      notifications: [makeNotification()],
    });
    renderSheet({ visible: false });
    expect(screen.queryByText('Notifications')).toBeNull();
  });
});
