import { memo, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '@/components/Avatar';
import { communityTypeColors, fonts, radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { FeedPostItem } from '@/types/feed';
import { relativeTime } from '@/utils/relativeTime';

// Toggle to compare: 'ellipsis' shows standard …  |  'gradient' fades the last line
const TRUNCATE_STYLE: 'ellipsis' | 'gradient' = 'gradient';

const BODY_LINE_HEIGHT = 14 * 1.45;
const FADE_HEIGHT = BODY_LINE_HEIGHT * 1.2;

interface FeedPostCardProps {
  item: FeedPostItem;
  onPress: (channelId: string, communityId: string) => void;
}

function FeedPostCard({ item, onPress }: FeedPostCardProps) {
  const colors = useTheme();
  const typeColor = communityTypeColors[item.community_type]?.primary ?? colors.textMuted;
  // Only true after onTextLayout confirms the body exceeds 3 rendered lines
  const [isTruncated, setIsTruncated] = useState(false);

  // Reset when FlashList recycles this cell for a different item
  useEffect(() => {
    setIsTruncated(false);
  }, [item.id]);

  return (
    <Pressable
      onPress={() => onPress(item.channel, item.community_id)}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${item.author.display_name} in ${item.community_name}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: typeColor }]} />
      <View style={styles.inner}>
        <View style={styles.meta}>
          <Text style={[styles.communityName, { color: typeColor }]} numberOfLines={1}>
            {item.community_name}
          </Text>
          <Text style={[styles.dot, { color: colors.textFaint }]}>·</Text>
          <Text style={[styles.channelName, { color: colors.textMuted }]} numberOfLines={1}>
            #{item.channel_name}
          </Text>
          <Text style={[styles.time, { color: colors.textFaint }]}>
            {relativeTime(item.created_at)}
          </Text>
        </View>
        <View style={styles.content}>
          <Avatar name={item.author.display_name} uri={item.author.avatar_url} size={28} />
          <View style={styles.textBlock}>
            <Text style={[styles.author, { color: colors.text, fontFamily: fonts.medium }]}>
              {item.author.display_name}
            </Text>
            <View>
              {/* Invisible full-text renderer: measures true line count without affecting layout */}
              <Text
                style={[styles.body, styles.measureText]}
                onTextLayout={e => {
                  if (!isTruncated && e.nativeEvent.lines.length > 4) {
                    setIsTruncated(true);
                  }
                }}
                importantForAccessibility="no"
              >
                {item.body}
              </Text>

              {/* Visible truncated text */}
              <Text
                style={[styles.body, { color: colors.text }]}
                numberOfLines={4}
                ellipsizeMode={TRUNCATE_STYLE === 'gradient' ? 'clip' : 'tail'}
              >
                {item.body}
              </Text>

              {TRUNCATE_STYLE === 'gradient' && isTruncated && (
                <LinearGradient
                  colors={['transparent', colors.surface]}
                  style={styles.bodyFade}
                  pointerEvents="none"
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(FeedPostCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    flexShrink: 0,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: 18,
    gap: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  communityName: {
    fontSize: 12,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  dot: {
    fontSize: 12,
  },
  channelName: {
    fontSize: 12,
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 'auto' as unknown as number,
    flexShrink: 0,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  author: {
    fontSize: 13,
  },
  measureText: {
    position: 'absolute',
    opacity: 0,
    // left/right 0 ensures it wraps at the same width as the visible text
    left: 0,
    right: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: BODY_LINE_HEIGHT,
    letterSpacing: -0.1,
    fontFamily: fonts.regular,
  },
  bodyFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
});
