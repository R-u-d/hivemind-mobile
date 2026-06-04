import { memo } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as Clipboard from 'expo-clipboard';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { fonts, radius, spacing, typography } from '@/theme';
import { useIsDark, useTheme } from '@/theme/ThemeContext';
import type { Post } from '@/types/community';
import { relativeTime } from '@/utils/relativeTime';

interface PostCardProps {
  post: Post;
  currentUserId: string | undefined;
  accentColor: string;
  isAnnouncementsChannel: boolean;
  onDelete: (id: string) => void;
}

function PostCard({
  post,
  currentUserId,
  accentColor,
  isAnnouncementsChannel,
  onDelete,
}: PostCardProps) {
  const colors = useTheme();
  const isDark = useIsDark();
  const { showActionSheetWithOptions } = useActionSheet();
  const isOwn = post.author.id === currentUserId;

  const iosStyle = { userInterfaceStyle: isDark ? ('dark' as const) : ('light' as const) };
  const androidDark = isDark
    ? {
        containerStyle: { backgroundColor: colors.surface },
        tintColor: colors.text,
        destructiveColor: colors.danger,
        textStyle: { color: colors.text },
        titleTextStyle: { color: colors.textMuted },
        separatorStyle: { backgroundColor: colors.border },
      }
    : {};

  function handleLongPress() {
    const comingSoon = () => Alert.alert('Coming soon', 'This feature is not available yet.');

    if (isOwn) {
      const options = [
        'Cancel',
        '😀  React',
        '↩️  Reply',
        '📋  Copy Text',
        '➡️  Forward',
        '📌  Pin Message',
        '✏️  Edit Message',
        '🗑  Delete Message',
      ];
      const destructiveButtonIndex = options.length - 1;
      const cancelButtonIndex = 0;
      const callback = (i: number | undefined) => {
        if (i === 1) comingSoon();
        else if (i === 2) comingSoon();
        else if (i === 3) Clipboard.setStringAsync(post.body);
        else if (i === 4) comingSoon();
        else if (i === 5) comingSoon();
        else if (i === 6) comingSoon();
        else if (i === 7) onDelete(post.id);
      };
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, destructiveButtonIndex, cancelButtonIndex, ...iosStyle },
          callback,
        );
      } else {
        showActionSheetWithOptions(
          { options, destructiveButtonIndex, cancelButtonIndex, ...androidDark },
          callback,
        );
      }
    } else {
      const options = ['Cancel', '😀  React', '↩️  Reply', '📋  Copy Text', '➡️  Forward'];
      const cancelButtonIndex = 0;
      const callback = (i: number | undefined) => {
        if (i === 1) comingSoon();
        else if (i === 2) comingSoon();
        else if (i === 3) Clipboard.setStringAsync(post.body);
        else if (i === 4) comingSoon();
      };
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex, ...iosStyle },
          callback,
        );
      } else {
        showActionSheetWithOptions({ options, cancelButtonIndex, ...androidDark }, callback);
      }
    }
  }

  return (
    <Pressable
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${post.author.display_name}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderLeftWidth: isAnnouncementsChannel ? 3 : StyleSheet.hairlineWidth,
          borderTopColor: isAnnouncementsChannel ? accentColor + '55' : colors.border,
          borderRightColor: isAnnouncementsChannel ? accentColor + '55' : colors.border,
          borderBottomColor: isAnnouncementsChannel ? accentColor + '55' : colors.border,
          borderLeftColor: isAnnouncementsChannel ? accentColor : colors.border,
        },
      ]}
    >
      <Avatar name={post.author.display_name} uri={post.author.avatar_url} size={32} />
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text style={[styles.author, { color: colors.text, fontFamily: fonts.medium }]}>
            {post.author.display_name}
          </Text>
          <Text style={[styles.time, { color: colors.textFaint }]}>
            {relativeTime(post.created_at)}
          </Text>
          {isAnnouncementsChannel && (
            <Text
              style={[
                typography.overline,
                { color: accentColor, marginLeft: 'auto' as unknown as number },
              ]}
            >
              PINNED
            </Text>
          )}
        </View>
        <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>
      </View>
    </Pressable>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
  },
  content: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  author: { fontSize: 13.5 },
  time: { fontSize: 11.5 },
  body: { marginTop: spacing.xs, fontSize: 14, lineHeight: 14 * 1.45, letterSpacing: -0.1 },
});
