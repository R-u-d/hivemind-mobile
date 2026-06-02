import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import { client } from '@/api/client';
import DiscoverScreen from '../../app/(tabs)/discover';
import type { Community } from '@/types/community';

jest.mock('@react-navigation/native', () => ({ useScrollToTop: jest.fn() }));

jest.mock('@/api/client', () => ({
  client: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock(
  '@shopify/flash-list',
  () => {
    const React = require('react');
    const { ScrollView, View } = require('react-native');
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
          data?.map((item: unknown, i: number) =>
            React.createElement(
              React.Fragment,
              { key: keyExtractor ? keyExtractor(item) : i },
              renderItem({ item, index: i }),
            ),
          ),
          ListFooterComponent
            ? React.createElement(View, { testID: 'flashlist-footer' }, ListFooterComponent)
            : null,
        ),
    };
  },
  { virtual: true },
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: { name: string; testID?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mock = (name: string) =>
    function MockSvg(props: Record<string, unknown>) {
      return React.createElement(View, { testID: name, ...props });
    };
  return {
    __esModule: true,
    default: mock('Svg'),
    Svg: mock('Svg'),
    Polygon: mock('Polygon'),
    Defs: mock('Defs'),
    LinearGradient: mock('LinearGradient'),
    Rect: mock('Rect'),
    Stop: mock('Stop'),
  };
});

const mockedClient = client as jest.Mocked<typeof client>;

function makeCommunity(over: Partial<Community> = {}): Community {
  return {
    id: 'c1',
    name: 'Brooklyn Linocut Club',
    type: 'creative',
    member_count: 412,
    created_at: '2026-01-01T00:00:00Z',
    is_member: false,
    cover_image_url: null,
    is_private: false,
    ...over,
  };
}

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <DiscoverScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedClient.get.mockReset();
  mockedClient.post.mockReset();
  mockedClient.delete.mockReset();
  (router.push as jest.Mock).mockReset();
});

describe('DiscoverScreen', () => {
  it('renders the community list after loading', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { next: null, previous: null, results: [makeCommunity()] },
    });

    const { findByText } = renderScreen();
    expect(await findByText('Brooklyn Linocut Club')).toBeTruthy();
  });

  it('refetches with type=gaming when the Gaming chip is pressed', async () => {
    mockedClient.get
      .mockResolvedValueOnce({
        data: { next: null, previous: null, results: [makeCommunity()] },
      })
      .mockResolvedValueOnce({
        data: {
          next: null,
          previous: null,
          results: [makeCommunity({ id: 'c2', name: 'Smash Bracket', type: 'gaming' })],
        },
      });

    const { findByText, getByRole } = renderScreen();
    await findByText('Brooklyn Linocut Club');

    await act(async () => {
      fireEvent.press(getByRole('tab', { name: 'Gaming' }));
    });

    await waitFor(() => expect(mockedClient.get).toHaveBeenCalledTimes(2));
    expect(mockedClient.get).toHaveBeenLastCalledWith('/communities/?type=gaming');
  });

  it('optimistically flips Join to Joined and rolls back on error', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { next: null, previous: null, results: [makeCommunity()] },
    });

    // Pending promise we control so we can observe the optimistic state
    // before the rejection rolls it back.
    let rejectJoin: (err: Error) => void = () => {};
    const pendingJoin = new Promise<never>((_, reject) => {
      rejectJoin = reject;
    });
    mockedClient.post.mockReturnValueOnce(pendingJoin);

    const { findByLabelText, queryByLabelText } = renderScreen();
    const joinBtn = await findByLabelText('Join Brooklyn Linocut Club');

    await act(async () => {
      fireEvent.press(joinBtn);
    });

    // Optimistic: button flips to Leave (onMutate runs as a microtask)
    await waitFor(() => {
      expect(queryByLabelText('Leave Brooklyn Linocut Club')).toBeTruthy();
    });
    expect(queryByLabelText('Join Brooklyn Linocut Club')).toBeNull();

    // Now reject the mutation; rollback should restore Join
    await act(async () => {
      rejectJoin(new Error('boom'));
      await pendingJoin.catch(() => {});
    });

    await waitFor(() => expect(queryByLabelText('Join Brooklyn Linocut Club')).toBeTruthy());
    expect(queryByLabelText('Leave Brooklyn Linocut Club')).toBeNull();
  });

  it('navigates to /community/:id when a card body is pressed', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { next: null, previous: null, results: [makeCommunity()] },
    });

    const { findByLabelText } = renderScreen();
    const card = await findByLabelText('Brooklyn Linocut Club, creative, 412 members');

    fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/community/c1');
  });
});
