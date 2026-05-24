import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ThemeProvider } from '@/theme/ThemeContext';
import OnboardingScreen from '../../app/(onboarding)/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
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

it('renders all 11 community type hexes', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  const types = [
    'Music',
    'Student',
    'Hobby',
    'Books',
    'Sports',
    'Outdoors',
    'Gamer',
    'Travel',
    'Photo',
    'Foodie',
    'Tech',
  ];
  types.forEach(label => expect(getByLabelText(label)).toBeTruthy());
});

it('renders the Create hex', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  expect(getByLabelText('Create a community')).toBeTruthy();
});

it('Continue button is disabled when nothing is selected', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  const btn = getByLabelText('Continue');
  expect(btn.props.accessibilityState?.disabled).toBe(true);
});

it('tapping a hex selects it and updates the button label', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  expect(getByText('Continue · 1 selected')).toBeTruthy();
});

it('tapping a selected hex deselects it', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  fireEvent.press(getByLabelText('Music'));
  expect(getByText('Continue')).toBeTruthy();
});

it('Continue button is enabled after at least one selection', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  const btn = getByLabelText('Continue · 1 selected');
  expect(btn.props.accessibilityState?.disabled).toBeFalsy();
});

it('shows correct count in button label with multiple selections', () => {
  const { getByLabelText, getByText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  fireEvent.press(getByLabelText('Student'));
  expect(getByText('Continue · 2 selected')).toBeTruthy();
});

it('pressing Continue navigates to step 2 with serialised types param', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  fireEvent.press(getByLabelText('Continue · 1 selected'));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/(onboarding)/step2',
    params: { types: JSON.stringify(['music']) },
  });
});

it('pressing Continue when disabled does not navigate', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Continue'));
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it('each hex has the correct accessibilityRole', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  const musicHex = getByLabelText('Music');
  expect(musicHex.props.accessibilityRole).toBe('checkbox');
});

it('selected hex has checked accessibilityState', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Music'));
  expect(getByLabelText('Music').props.accessibilityState?.checked).toBe(true);
});

it('pressing Back calls router.back', () => {
  const { getByLabelText } = render(<OnboardingScreen />, { wrapper });
  fireEvent.press(getByLabelText('Go back'));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});
