import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// params.types: JSON.stringify(CommunityType[]) — passed from onboarding step 1
export default function OnboardingStep2() {
  useLocalSearchParams<{ types: string }>();
  return <View />;
}
