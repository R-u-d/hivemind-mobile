import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import CreateEventScreen from '../../app/events/create';
import { useCreateEvent, useEventCoverUpload } from '../../src/hooks/useEvents';
import { useMyCommunities } from '../../src/hooks/useMyCommunities';
import { useCommunityChannels } from '../../src/hooks/useCommunityChannels';
import { eventDraftStorage } from '../../src/api/eventDraftStorage';
import { reverseGeocode } from '../../src/utils/geocode';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { replace: jest.fn(), back: jest.fn() },
    Stack: {
      // Render the native-header option slots so tests can see the title and buttons.
      Screen: ({
        options,
      }: {
        options?: Record<string, unknown> | (() => Record<string, unknown>);
      }) => {
        const opts = typeof options === 'function' ? options() : options;
        const { Text } = require('react-native');
        const slot = (fn: unknown) =>
          typeof fn === 'function' ? (fn as () => React.ReactNode)() : null;
        return React.createElement(
          React.Fragment,
          null,
          opts?.title ? React.createElement(Text, null, opts.title as string) : null,
          slot(opts?.headerLeft),
          slot(opts?.headerRight),
        );
      },
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
      React.createElement(View, { accessibilityLabel }),
  };
});

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(),
}));

// Map picker → expose a button that drops a pin at fixed coords.
jest.mock('@/components/LocationPickerMap', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPick }: { onPick: (lat: number, lng: number) => void }) =>
      React.createElement(
        Pressable,
        { accessibilityLabel: 'mock-map', onPress: () => onPick(40.7, -73.9) },
        React.createElement(Text, null, 'map'),
      ),
  };
});

// Date/time picker → a button that fires onChange with a future date.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (e: { type: string }, d: Date) => void }) =>
      React.createElement(
        Pressable,
        {
          accessibilityLabel: 'mock-picker',
          onPress: () => onChange({ type: 'set' }, new Date(Date.now() + 86_400_000)),
        },
        React.createElement(Text, null, 'pick'),
      ),
  };
});

jest.mock('../../src/hooks/useEvents', () => ({
  useCreateEvent: jest.fn(),
  useEventCoverUpload: jest.fn(),
}));
jest.mock('../../src/hooks/useMyCommunities', () => ({ useMyCommunities: jest.fn() }));
jest.mock('../../src/hooks/useCommunityChannels', () => ({ useCommunityChannels: jest.fn() }));
jest.mock('../../src/utils/geocode', () => ({
  forwardGeocode: jest.fn(),
  reverseGeocode: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  extractDrfError: jest.fn(() => 'Server error'),
}));

jest.mock('@/api/eventDraftStorage', () => ({
  eventDraftStorage: {
    load: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockCreateEvent = useCreateEvent as jest.Mock;
const mockCoverUpload = useEventCoverUpload as jest.Mock;
const mockMyCommunities = useMyCommunities as jest.Mock;
const mockChannels = useCommunityChannels as jest.Mock;
const mockReverseGeocode = reverseGeocode as jest.Mock;
const mockRouter = router as jest.Mocked<typeof router>;
const mockDraftStorage = eventDraftStorage as jest.Mocked<typeof eventDraftStorage>;

const COMMUNITIES = [
  { id: 'c1', name: 'Brooklyn Linocut Club', type: 'creative' },
  { id: 'c2', name: 'Bushwick Synth Heads', type: 'social' },
];

let createMutate: jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  createMutate = jest.fn().mockResolvedValue({ id: 'e1' });
  mockCreateEvent.mockReturnValue({ mutateAsync: createMutate, isPending: false });
  mockCoverUpload.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockMyCommunities.mockReturnValue({ data: COMMUNITIES, isLoading: false });
  mockChannels.mockReturnValue({ data: { results: [] }, isLoading: false });
  mockReverseGeocode.mockResolvedValue('87 Franklin St, Brooklyn');
});

it('renders the header', () => {
  const { getByText } = render(<CreateEventScreen />, { wrapper });
  expect(getByText('New event')).toBeTruthy();
});

it('shows inline validation errors for required fields on submit', async () => {
  const { getByLabelText, findByText } = render(<CreateEventScreen />, { wrapper });
  fireEvent.press(getByLabelText('Publish event'));
  expect(await findByText('Title is required')).toBeTruthy();
  expect(await findByText('Community is required')).toBeTruthy();
  expect(await findByText('Pick a start date and time')).toBeTruthy();
  expect(createMutate).not.toHaveBeenCalled();
});

it('fills location text from a map tap (reverse geocode)', async () => {
  const { getByLabelText, getByDisplayValue } = render(<CreateEventScreen />, { wrapper });
  fireEvent.press(getByLabelText('mock-map'));
  await waitFor(() => expect(mockReverseGeocode).toHaveBeenCalledWith(40.7, -73.9));
  await waitFor(() => expect(getByDisplayValue('87 Franklin St, Brooklyn')).toBeTruthy());
});

it('creates the event and navigates to its detail screen', async () => {
  const { getByLabelText, getByPlaceholderText, getByText } = render(<CreateEventScreen />, {
    wrapper,
  });

  fireEvent.changeText(getByPlaceholderText("What's the event?"), 'Linocut Night');

  // Pick community
  fireEvent.press(getByLabelText('Community: Select a community'));
  fireEvent.press(getByLabelText('Brooklyn Linocut Club'));

  // Pick start date (iOS commits on Done)
  fireEvent.press(getByLabelText('Start date: Pick date'));
  fireEvent.press(getByLabelText('mock-picker'));
  fireEvent.press(getByLabelText('Done'));

  fireEvent.press(getByText('Publish event'));

  await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
  expect(createMutate).toHaveBeenCalledWith(
    expect.objectContaining({ community: 'c1', title: 'Linocut Night' }),
  );
  expect(typeof createMutate.mock.calls[0][0].start_datetime).toBe('string');
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/event/e1'));
  expect(mockDraftStorage.clear).toHaveBeenCalled();
});

it('flags end-before-start even when start is chosen after end', async () => {
  const { getByLabelText, findByText } = render(<CreateEventScreen />, { wrapper });

  // Choose end first…
  fireEvent.press(getByLabelText('End date (optional): Pick date'));
  fireEvent.press(getByLabelText('mock-picker'));
  fireEvent.press(getByLabelText('Done'));

  // …then a start that isn't before it — the end error must refresh.
  fireEvent.press(getByLabelText('Start date: Pick date'));
  fireEvent.press(getByLabelText('mock-picker'));
  fireEvent.press(getByLabelText('Done'));

  expect(await findByText('End time must be after start time')).toBeTruthy();
});

it('saves a draft and goes back', async () => {
  const { getByLabelText, getByPlaceholderText } = render(<CreateEventScreen />, { wrapper });
  fireEvent.changeText(getByPlaceholderText("What's the event?"), 'Draft Night');
  fireEvent.press(getByLabelText('Save draft'));
  await waitFor(() => expect(mockDraftStorage.save).toHaveBeenCalled());
  expect(mockDraftStorage.save).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Draft Night' }),
  );
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
});

it('restores a saved draft on mount', async () => {
  mockDraftStorage.load.mockResolvedValueOnce({ title: 'Restored Event', community: 'c1' });
  const { getByDisplayValue } = render(<CreateEventScreen />, { wrapper });
  await waitFor(() => expect(getByDisplayValue('Restored Event')).toBeTruthy());
});
