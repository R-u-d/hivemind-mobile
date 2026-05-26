import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import OnboardingStep2 from '../../app/(onboarding)/step2';
import { useCommunities } from '../../src/hooks/useCommunities';
import { useJoinCommunity, useLeaveCommunity } from '../../src/hooks/useJoinCommunity';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ types: '["study","gaming"]' })),
}));

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.useWindowDimensions = () => ({ width: 390, height: 844, scale: 2, fontScale: 1 });
  return rn;
});

jest.mock('../../src/hooks/useCommunities', () => ({ useCommunities: jest.fn() }));
jest.mock('../../src/hooks/useJoinCommunity', () => ({
  useJoinCommunity: jest.fn(),
  useLeaveCommunity: jest.fn(),
}));

jest.mock(
  '@shopify/flash-list',
  () => {
    const React = require('react');
    const { ScrollView } = require('react-native');
    return {
      FlashList: ({
        data,
        renderItem,
        keyExtractor,
      }: {
        data: unknown[];
        renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
        keyExtractor?: (item: unknown) => string;
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
        ),
    };
  },
  { virtual: true },
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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

const mockUseCommunities = useCommunities as jest.Mock;
const mockUseJoinCommunity = useJoinCommunity as jest.Mock;
const mockUseLeaveCommunity = useLeaveCommunity as jest.Mock;

const SAMPLE_COMMUNITIES = [
  {
    id: 'c1',
    name: 'Study Group A',
    type: 'study' as const,
    member_count: 100,
    created_at: '2026-01-01',
  },
  {
    id: 'c2',
    name: 'Gaming Hub',
    type: 'gaming' as const,
    member_count: 250,
    created_at: '2026-01-01',
  },
];

const mockRefetch = jest.fn();
const mockMutate = jest.fn();
const mockRouter = router as jest.Mocked<typeof router>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCommunities.mockReturnValue({
    data: SAMPLE_COMMUNITIES,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  });
  mockUseJoinCommunity.mockReturnValue({ mutate: mockMutate });
  mockUseLeaveCommunity.mockReturnValue({ mutate: jest.fn() });
});

it('does not render community names while loading', () => {
  mockUseCommunities.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: mockRefetch,
  });
  const { queryByText } = render(<OnboardingStep2 />, { wrapper });
  expect(queryByText('Study Group A')).toBeNull();
  expect(queryByText('Gaming Hub')).toBeNull();
});

it('renders community names when data loads', () => {
  const { getByText } = render(<OnboardingStep2 />, { wrapper });
  expect(getByText('Study Group A')).toBeTruthy();
  expect(getByText('Gaming Hub')).toBeTruthy();
});

it('renders member count for each community', () => {
  const { getByText } = render(<OnboardingStep2 />, { wrapper });
  expect(getByText('100 members')).toBeTruthy();
  expect(getByText('250 members')).toBeTruthy();
});

it('tapping Join calls mutate with community id', () => {
  const { getAllByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getAllByLabelText('Join')[0]);
  expect(mockMutate).toHaveBeenCalledWith('c1');
});

it('Continue is disabled when nothing joined', () => {
  const { getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  expect(getByLabelText('Continue').props.accessibilityState?.disabled).toBe(true);
});

it('Continue label updates after optimistic join', () => {
  mockUseJoinCommunity.mockImplementation((onOptimisticJoin: (id: string) => void) => ({
    mutate: (id: string) => {
      onOptimisticJoin(id);
    },
  }));
  const { getAllByLabelText, getByText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getAllByLabelText('Join')[0]);
  expect(getByText('Continue · 1 joined')).toBeTruthy();
});

it('Continue disabled press does not navigate', () => {
  const { getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getByLabelText('Continue'));
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it('Continue navigates to step3 with joined ids', () => {
  mockUseJoinCommunity.mockImplementation((onOptimisticJoin: (id: string) => void) => ({
    mutate: (id: string) => {
      onOptimisticJoin(id);
    },
  }));
  const { getAllByLabelText, getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getAllByLabelText('Join')[0]);
  fireEvent.press(getByLabelText('Continue · 1 joined'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/(onboarding)/step3',
    params: { joinedIds: JSON.stringify(['c1']) },
  });
});

it('Skip navigates to step3 with empty joinedIds', () => {
  const { getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getByLabelText('Skip for now'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/(onboarding)/step3',
    params: { joinedIds: '[]' },
  });
});

it('Back calls router.back', () => {
  const { getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getByLabelText('Go back'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it('shows error message when fetch fails', () => {
  mockUseCommunities.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: mockRefetch,
  });
  const { getByText } = render(<OnboardingStep2 />, { wrapper });
  expect(getByText("Couldn't reach the hive")).toBeTruthy();
});

it('retry button calls refetch', () => {
  mockUseCommunities.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch: mockRefetch,
  });
  const { getByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getByLabelText('Try again'));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it('joined community shows Joined label', () => {
  mockUseJoinCommunity.mockImplementation((onOptimisticJoin: (id: string) => void) => ({
    mutate: (id: string) => {
      onOptimisticJoin(id);
    },
  }));
  const { getAllByLabelText } = render(<OnboardingStep2 />, { wrapper });
  fireEvent.press(getAllByLabelText('Join')[0]);
  expect(getAllByLabelText('Joined').length).toBeGreaterThan(0);
});
