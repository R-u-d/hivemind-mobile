import { memo } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
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
  const { showActionSheetWithOptions } = useActionSheet();
  const isOwn = post.author.id === currentUserId;

  function handleLongPress() {
    if (!isOwn) return;
    const sheetOptions = {
      options: ['Cancel', 'Delete Message'] as string[],
      destructiveButtonIndex: 1,
      cancelButtonIndex: 0,
    };
    const callback = (buttonIndex: number | undefined) => {
      if (buttonIndex === 1) onDelete(post.id);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(sheetOptions, callback);
    } else {
      showActionSheetWithOptions(sheetOptions, callback);
    }
  }

  return (
    <Pressable
      onLongPress={isOwn ? handleLongPress : undefined}
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
