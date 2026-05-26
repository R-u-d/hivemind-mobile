import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import OnboardingScreen from '../../app/(onboarding)/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.useWindowDimensions = () => ({ width: 390, height: 844, scale: 2, fontScale: 1 });
  return rn;
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
  };
});

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

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const mockRouter = router as jest.Mocked<typeof router>;

beforeEach(() => jest.clearAllMocks());

it('renders all 5 community type hexes', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  ['Study', 'Gaming', 'Sports', 'Creative', 'Social'].forEach(label =>
    expect(getByLabelText(label)).toBeTruthy(),
  );
});

it('renders the Create hex', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  expect(getByLabelText('Create a community')).toBeTruthy();
});

it('Continue button is disabled when nothing is selected', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  expect(getByLabelText('Continue').props.accessibilityState?.disabled).toBe(true);
});

it('tapping a hex selects it and updates the button label', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  expect(getByText('Continue · 1 selected')).toBeTruthy();
});

it('tapping a selected hex deselects it', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  fireEvent.press(getByLabelText('Study'));
  expect(getByText('Continue')).toBeTruthy();
});

it('Continue button is enabled after at least one selection', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  expect(getByLabelText('Continue · 1 selected').props.accessibilityState?.disabled).toBeFalsy();
});

it('shows correct count in button label with multiple selections', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  fireEvent.press(getByLabelText('Gaming'));
  expect(getByText('Continue · 2 selected')).toBeTruthy();
});

it('pressing Continue navigates to step 2 with serialised types param', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  fireEvent.press(getByLabelText('Continue · 1 selected'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/(onboarding)/step2',
    params: { types: JSON.stringify(['study']) },
  });
});

it('pressing Continue when disabled does not navigate', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Continue'));
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it('each hex has the correct accessibilityRole', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  expect(getByLabelText('Study').props.accessibilityRole).toBe('checkbox');
});

it('selected hex has checked accessibilityState', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Study'));
  expect(getByLabelText('Study').props.accessibilityState?.checked).toBe(true);
});

it('pressing Back calls router.replace to login', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Go back'));
  expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
});
