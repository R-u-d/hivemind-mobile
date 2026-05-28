import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { CommunityDetail } from '@/types/community';

import ChannelScreen from '../../app/channel/[id]';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useLocalSearchParams: () => ({ id: 'ch-1', communityId: 'com-1' }),
    Stack: { Screen: () => null },
    router: { back: jest.fn() },
    useFocusEffect: (cb: () => (() => void) | void) => {
      useEffect(() => {
        const cleanup = cb();
        return cleanup ?? undefined;
      }, []);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListEmptyComponent,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown) => string;
      ListEmptyComponent?: React.ReactNode;
    }) =>
      React.createElement(
        ScrollView,
        null,
        data && data.length > 0
          ? data.map((item: unknown, i: number) =>
              React.createElement(
                React.Fragment,
                { key: keyExtractor ? keyExtractor(item) : i },
                renderItem({ item, index: i }),
              ),
            )
          : ListEmptyComponent,
      ),
  };
});

const mockClient = client as jest.Mocked<typeof client>;

const baseCommunity: CommunityDetail = {
  id: 'com-1',
  name: 'Linocut Club',
  type: 'creative',
  member_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  is_member: true,
  cover_image_url: null,
  is_private: false,
  description: '',
  owner_id: 'user-1',
};

const generalChannel = {
  id: 'ch-1',
  name: 'general',
  channel_type: 'general',
  description: '',
  created_at: '',
};

const announcementsChannel = {
  id: 'ch-1',
  name: 'announcements',
  channel_type: 'announcements',
  description: '',
  created_at: '',
};

const emptyPosts = { next: null, previous: null, results: [] };

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(ThemeProvider, null, children),
    );
}

function setupMocks(community: CommunityDetail, channel: typeof generalChannel) {
  mockClient.get.mockImplementation((url: string) => {
    if (url.includes('/communities/com-1/channels')) {
      return Promise.resolve({ data: { next: null, previous: null, results: [channel] } });
    }
    if (url.includes('/communities/com-1')) {
      return Promise.resolve({ data: community });
    }
    if (url.includes('/channels/ch-1/posts')) {
      return Promise.resolve({ data: emptyPosts });
    }
    if (url.includes('/users/me')) {
      return Promise.resolve({ data: { id: 'user-1', display_name: 'Alice', avatar_url: null } });
    }
    return Promise.reject(new Error(`Unexpected: ${url}`));
  });
}

beforeEach(() => jest.clearAllMocks());

it('renders channel name in header once data loads', async () => {
  setupMocks(baseCommunity, generalChannel);
  render(createElement(ChannelScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('#general')).toBeTruthy();
  });
});

it('shows retry button when community fetch fails', async () => {
  mockClient.get.mockRejectedValue(new Error('Network error'));
  render(createElement(ChannelScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByLabelText('Retry loading channel')).toBeTruthy();
  });
});

it('hides compose bar for announcements channel', async () => {
  setupMocks(baseCommunity, announcementsChannel);
  render(createElement(ChannelScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('#announcements')).toBeTruthy();
  });
  expect(screen.queryByLabelText('Message input')).toBeNull();
});

it('hides compose bar for non-members', async () => {
  setupMocks({ ...baseCommunity, is_member: false }, generalChannel);
  render(createElement(ChannelScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('#general')).toBeTruthy();
  });
  expect(screen.queryByLabelText('Message input')).toBeNull();
});
