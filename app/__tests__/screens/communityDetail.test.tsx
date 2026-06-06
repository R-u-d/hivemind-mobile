/**
 * Focused regression test for community detail → channel navigation.
 * Verifies that handleChannelPress passes ?communityId= so the channel screen
 * can load community metadata without requiring prior navigation context.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import type { CommunityDetail } from '@/types/community';

import CommunityDetailScreen from '../../app/community/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'com-1' }),
  Stack: { Screen: () => null },
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Stub out SVG — not testable in Jest
jest.mock('react-native-svg', () => {
  const React = require('react');
  const stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    default: stub,
    Svg: stub,
    Defs: stub,
    LinearGradient: stub,
    Mask: stub,
    Pattern: stub,
    Polygon: stub,
    Rect: stub,
    Stop: stub,
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Image: (props: object) => React.createElement(View, props) };
});

const community: CommunityDetail = {
  id: 'com-1',
  name: 'Test Community',
  type: 'social',
  member_count: 5,
  created_at: '2026-01-01T00:00:00Z',
  is_member: true,
  cover_image_url: null,
  is_private: false,
  description: '',
  owner_id: 'user-1',
  my_role: 'owner' as const,
};

const channel = {
  id: 'ch-1',
  name: 'general',
  channel_type: 'general' as const,
  description: '',
  created_at: '',
};

jest.mock('@/hooks/useCommunityDetail', () => ({
  useCommunityDetail: () => ({
    data: community,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCommunityChannels', () => ({
  useCommunityChannels: () => ({
    data: { next: null, previous: null, results: [channel] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCreateChannel: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteChannel: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useCommunityMembers', () => ({
  useCommunityMembers: () => ({
    data: { pages: [{ next: null, previous: null, results: [] }], pageParams: [undefined] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'user-1' } }),
}));

jest.mock('@/hooks/useJoinCommunity', () => ({
  useJoinCommunity: () => ({ mutate: jest.fn() }),
  useLeaveCommunity: () => ({ mutate: jest.fn() }),
}));

// MembersSheet — bottom sheet not needed for this test
jest.mock('@/components/MembersSheet', () => () => null);

// useQueryClient — provide a minimal stub
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    setQueriesData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
}));

beforeEach(() => jest.clearAllMocks());

it('navigates to channel with communityId query param when channel row is pressed', async () => {
  render(
    <ThemeProvider>
      <CommunityDetailScreen />
    </ThemeProvider>,
  );

  await waitFor(() => {
    expect(screen.getByLabelText('general channel')).toBeTruthy();
  });

  fireEvent.press(screen.getByLabelText('general channel'));

  expect(router.push).toHaveBeenCalledWith('/channel/ch-1?communityId=com-1');
});
