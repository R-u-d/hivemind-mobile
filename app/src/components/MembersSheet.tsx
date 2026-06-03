import { FlashList } from '@shopify/flash-list';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '@/components/Avatar';
import HexLoader from '@/components/HexLoader';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { Member } from '@/types/community';

interface MembersSheetProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  total: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

function RoleBadge({ role }: { role: Member['role'] }) {
  const colors = useTheme();
  if (role === 'member') return null;
  const label = role === 'owner' ? 'Owner' : 'Mod';
  return (
    <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
      <Text style={[styles.badgeText, { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

function MemberRow({ item }: { item: Member }) {
  const colors = useTheme();
  return (
    <View style={styles.memberRow}>
      <Avatar uri={item.avatar_url} name={item.display_name} size={36} />
      <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>
        {item.display_name}
      </Text>
      <RoleBadge role={item.role} />
    </View>
  );
}

export default function MembersSheet({
  visible,
  onClose,
  members,
  total,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: MembersSheetProps) {
  const colors = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = screenHeight * 0.75;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [500, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close members sheet"
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              backgroundColor: colors.surface,
              paddingBottom: bottom + spacing.base,
            },
            { transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>
            Members{total > 0 ? ` · ${total.toLocaleString()}` : ''}
          </Text>

          {isLoading ? (
            <View style={styles.loaderWrap}>
              <HexLoader size={28} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.listWrap}>
              <FlashList<Member>
                data={members}
                keyExtractor={m => m.id}
                renderItem={({ item }) => <MemberRow item={item} />}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                  isFetchingNextPage ? (
                    <View style={styles.loaderWrap}>
                      <HexLoader size={22} color={colors.primary} />
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
  },
  listWrap: { flex: 1 },
  loaderWrap: { paddingVertical: spacing.lg, alignItems: 'center' },
});
