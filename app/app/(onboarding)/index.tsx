import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import PrimaryButton from '@/components/PrimaryButton';
import { tokenStorage } from '@/api/tokenStorage';
import {
  communityTypeColors,
  type CommunityType,
  fonts,
  radius,
  spacing,
  typography,
} from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

const COMMUNITY_TYPES: CommunityType[] = [
  'student',
  'gamer',
  'hobby',
  'sports',
  'music',
  'books',
  'outdoors',
  'travel',
  'tech',
  'foodie',
  'photo',
];

const TYPE_LABELS: Record<CommunityType, string> = {
  student: 'Student',
  gamer: 'Gamer',
  hobby: 'Hobby',
  sports: 'Sports',
  music: 'Music',
  books: 'Books',
  outdoors: 'Outdoors',
  travel: 'Travel',
  tech: 'Tech',
  foodie: 'Foodie',
  photo: 'Photo',
};

export default function OnboardingScreen() {
  const colors = useTheme();

  const handleContinue = async () => {
    await tokenStorage.setOnboarded();
    router.replace('/(tabs)/feed');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[typography.display, { color: colors.text }]}>What are you into?</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Pick a few — you'll join their hive. Don't see yours? Create one.
        </Text>
      </View>

      {/* Interest grid */}
      <View style={styles.grid}>
        {COMMUNITY_TYPES.map(type => {
          const { primary, background } = communityTypeColors[type];
          return (
            <View
              key={type}
              style={[styles.chip, { backgroundColor: background, borderColor: primary }]}
            >
              <Text style={[styles.chipText, { color: primary, fontFamily: fonts.medium }]}>
                {TYPE_LABELS[type]}
              </Text>
            </View>
          );
        })}
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.primarySoft, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.chipText, { color: colors.primary, fontFamily: fonts.medium }]}>
            Create +
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <PrimaryButton label="Get started" onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 54 },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 10,
    alignContent: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 14 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});
