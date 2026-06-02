import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '@/components/Avatar';
import LoadingTail from '@/components/LoadingTail';
import SkeletonBox from '@/components/SkeletonBox';
import StatCard from '@/components/StatCard';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

function PublicProfileSkeleton() {
  const colors = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.head}>
        <SkeletonBox width={68} height={68} borderRadius={34} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="60%" height={18} />
          <SkeletonBox width="90%" height={13} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <SkeletonBox height={72} style={{ flex: 1 }} borderRadius={radius.lg} />
        <SkeletonBox height={72} style={{ flex: 1 }} borderRadius={radius.lg} />
      </View>
      <LoadingTail caption="Knocking on the comb…" />
    </ScrollView>
  );
}

export default function PublicProfileScreen() {
  const colors = useTheme();
  const { top } = useSafeAreaInsets();
  const { id, backTitle } = useLocalSearchParams<{ id: string; backTitle?: string }>();

  const { data: user, isLoading, isError, refetch } = usePublicProfile(id);

  if (isLoading) return <PublicProfileSkeleton />;

  const displayName = user?.display_name || user?.email || 'User';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.medium, fontSize: 17 },
          headerBackTitle: backTitle ?? 'Back',
        }}
      />

      {isError || !user ? (
        <View style={[styles.center, { backgroundColor: colors.bg, paddingTop: top }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.text, fontFamily: fonts.medium }]}>
            Profile not found
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.border }]}
            accessibilityLabel="Retry loading profile"
          >
            <Text style={[styles.retryText, { color: colors.primary, fontFamily: fonts.medium }]}>
              Try again
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} accessibilityLabel="Go back">
            <Text style={[styles.backText, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              Go back
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Avatar uri={user.avatar_url} name={displayName} size={68} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.displayName, { color: colors.text, fontFamily: fonts.medium }]}>
                {displayName}
              </Text>
              {user.location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text
                    style={[
                      styles.locationText,
                      { color: colors.textMuted, fontFamily: fonts.regular },
                    ]}
                  >
                    {user.location}
                  </Text>
                </View>
              ) : null}
              {user.bio ? (
                <Text
                  style={[styles.bio, { color: colors.text, fontFamily: fonts.regular }]}
                  numberOfLines={5}
                >
                  {user.bio}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Communities" value={user.community_count} />
            <StatCard label="Events RSVP'd" value={user.event_count} />
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  displayName: { fontSize: 19, letterSpacing: -0.3, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  locationText: { fontSize: 12 },
  bio: { fontSize: 13, lineHeight: 13 * 1.45 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  errorTitle: { fontSize: 15 },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  retryText: { fontSize: 13 },
  backText: { fontSize: 13, marginTop: spacing.xs },
});
