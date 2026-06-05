import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemeProvider } from '@/theme/ThemeContext';
import OnboardingStep3 from '../../app/(onboarding)/step3';
import { useCurrentUser } from '../../src/hooks/useCurrentUser';
import { useAvatarUpload } from '../../src/hooks/useAvatarUpload';
import { useUpdateProfile } from '../../src/hooks/useUpdateProfile';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ joinedIds: '["c1"]' })),
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

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: { name: string; testID?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name),
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
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../src/hooks/useCurrentUser', () => ({ useCurrentUser: jest.fn() }));
jest.mock('../../src/hooks/useAvatarUpload', () => ({ useAvatarUpload: jest.fn() }));
jest.mock('../../src/hooks/useUpdateProfile', () => ({ useUpdateProfile: jest.fn() }));

jest.mock('@/api/client', () => ({
  client: { patch: jest.fn() },
  extractDrfError: jest.fn((_err: unknown) => 'Server error'),
}));

jest.mock('@/api/tokenStorage', () => ({
  tokenStorage: { setOnboarded: jest.fn() },
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(() => ({ setQueryData: jest.fn() })),
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockUseAvatarUpload = useAvatarUpload as jest.Mock;
const mockUseUpdateProfile = useUpdateProfile as jest.Mock;
const mockRouter = router as jest.Mocked<typeof router>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const MOCK_USER = {
  id: 'u1',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: null,
  location: null,
  avatar_url: null,
  has_onboarded: false,
  created_at: '2026-01-01',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCurrentUser.mockReturnValue({ data: MOCK_USER });
  mockUseAvatarUpload.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
  mockUseUpdateProfile.mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(MOCK_USER),
    isPending: false,
  });
});

it('renders the screen heading', () => {
  const { getByText } = render(<OnboardingStep3 />, { wrapper });
  expect(getByText('Set up your profile')).toBeTruthy();
});

it('shows progress 3 / 3', () => {
  const { getByText } = render(<OnboardingStep3 />, { wrapper });
  expect(getByText('3')).toBeTruthy();
  expect(getByText(' / 3')).toBeTruthy();
});

it('pre-fills display name from current user', () => {
  const { getByDisplayValue } = render(<OnboardingStep3 />, { wrapper });
  expect(getByDisplayValue('Test User')).toBeTruthy();
});

it('back button calls router.back', () => {
  const { getByLabelText } = render(<OnboardingStep3 />, { wrapper });
  fireEvent.press(getByLabelText('Go back'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

it("renders the Let's go button", () => {
  const { getByLabelText } = render(<OnboardingStep3 />, { wrapper });
  expect(getByLabelText("Let's go")).toBeTruthy();
});

it('shows validation error when display name is cleared', async () => {
  const { getByLabelText, findByText } = render(<OnboardingStep3 />, { wrapper });
  fireEvent.changeText(getByLabelText('Display name'), '');
  fireEvent.press(getByLabelText("Let's go"));
  expect(await findByText('Name is required')).toBeTruthy();
});

it('navigates to feed after successful submit', async () => {
  const { client } = require('@/api/client');
  const { tokenStorage } = require('@/api/tokenStorage');
  client.patch.mockResolvedValue({});
  tokenStorage.setOnboarded.mockResolvedValue(undefined);

  const { getByLabelText } = render(<OnboardingStep3 />, { wrapper });
  fireEvent.press(getByLabelText("Let's go"));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/feed'));
});

it('shows server error when updateProfile fails', async () => {
  const { extractDrfError } = require('@/api/client');
  extractDrfError.mockReturnValue('Something went wrong');
  mockUseUpdateProfile.mockReturnValue({
    mutateAsync: jest.fn().mockRejectedValue(new Error('fail')),
    isPending: false,
  });

  const { getByLabelText, findByText } = render(<OnboardingStep3 />, { wrapper });
  fireEvent.press(getByLabelText("Let's go"));
  expect(await findByText('Something went wrong')).toBeTruthy();
});

it('tapping avatar circle requests media library permissions', async () => {
  mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
    status: 'denied',
    expires: 'never',
    granted: false,
    canAskAgain: false,
  } as ImagePicker.MediaLibraryPermissionResponse);

  const { getByLabelText } = render(<OnboardingStep3 />, { wrapper });
  fireEvent.press(getByLabelText('Set profile photo'));
  await waitFor(() =>
    expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1),
  );
});
