import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

import { client } from '@/api/client';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { FeedPage } from '@/types/feed';

import FeedScreen from '../../app/(tabs)/feed';

jest.mock('@/api/client', () => ({
  client: { get: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
      ListEmptyComponent,
      ListFooterComponent,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor?: (item: unknown) => string;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
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
        ListFooterComponent,
      ),
  };
});

const mockClient = client as jest.Mocked<typeof client>;

const emptyFeed: FeedPage = { next: null, results: [] };

const feedWithPost: FeedPage = {
  next: null,
  results: [
    {
      type: 'post',
      id: 'post-1',
      channel: 'ch-1',
      channel_name: 'general',
      community_name: 'Bushwick Synth Heads',
      community_type: 'social',
      author: { id: 'user-1', display_name: 'Theo Reyes', avatar_url: null },
      body: 'Anyone got a tip for taming the resonance on a Moog Sub 25?',
      created_at: '2026-05-23T12:00:00Z',
    },
  ],
};

const feedWithEvent: FeedPage = {
  next: null,
  results: [
    {
      type: 'event',
      id: 'ev-1',
      title: 'Senior Show install party',
      community: { id: 'com-1', name: 'Parsons Design 2026', type: 'study' },
      location_text: 'Anna Maria 9th Floor',
      lat: null,
      lng: null,
      start_datetime: '2099-05-23T18:00:00Z',
      end_datetime: null,
      cover_image_url: null,
      capacity: null,
      going_count: 42,
      interested_count: 5,
      rsvp_status: null,
      created_at: '2026-05-20T10:00:00Z',
    },
  ],
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(ThemeProvider, null, children));
}

beforeEach(() => jest.clearAllMocks());

it('shows skeleton while loading', () => {
  mockClient.get.mockReturnValue(new Promise(() => {})); // never resolves
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  expect(screen.getByText('Loading your feed…')).toBeTruthy();
});

it('shows error state and retry when fetch fails', async () => {
  mockClient.get.mockRejectedValue(new Error('Network error'));
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText("Couldn't load feed")).toBeTruthy();
  });
  expect(screen.getByText('Retry')).toBeTruthy();
});

it('shows empty state with discover CTA when feed is empty', async () => {
  mockClient.get.mockResolvedValue({ data: emptyFeed });
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('Your feed is empty')).toBeTruthy();
  });
  expect(screen.getByText('Discover communities')).toBeTruthy();
});

it('renders a post card with community, channel, author and body', async () => {
  mockClient.get.mockResolvedValue({ data: feedWithPost });
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('Bushwick Synth Heads')).toBeTruthy();
  });
  expect(screen.getByText('#general')).toBeTruthy();
  expect(screen.getByText('Theo Reyes')).toBeTruthy();
  expect(
    screen.getByText('Anyone got a tip for taming the resonance on a Moog Sub 25?'),
  ).toBeTruthy();
});

it('renders an event card with title, community, location and going count', async () => {
  mockClient.get.mockResolvedValue({ data: feedWithEvent });
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('Senior Show install party')).toBeTruthy();
  });
  expect(screen.getByText('Parsons Design 2026')).toBeTruthy();
  expect(screen.getByText('Anna Maria 9th Floor')).toBeTruthy();
  expect(screen.getByText('42 going')).toBeTruthy();
});

it('shows the Feed header and bell icon', async () => {
  mockClient.get.mockResolvedValue({ data: emptyFeed });
  render(createElement(FeedScreen), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(screen.getByText('Feed')).toBeTruthy();
  });
  expect(screen.getByLabelText('Notifications')).toBeTruthy();
});
