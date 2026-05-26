import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { fonts, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

export interface FilterChipItem<V extends string> {
  value: V;
  label: string;
}

interface FilterChipsProps<V extends string> {
  items: ReadonlyArray<FilterChipItem<V>>;
  active: V;
  onChange: (value: V) => void;
}

export default function FilterChips<V extends string>({
  items,
  active,
  onChange,
}: FilterChipsProps<V>) {
  const colors = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map(item => {
        const isActive = item.value === active;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(item.value)}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.ink : colors.surface,
                borderColor: isActive ? colors.ink : colors.border,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                {
                  fontFamily: fonts.medium,
                  color: isActive ? colors.bg : colors.text,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
