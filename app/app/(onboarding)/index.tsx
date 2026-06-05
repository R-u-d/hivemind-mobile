import { useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/PrimaryButton';
import { useShakeAnimation } from '@/hooks/useShakeAnimation';
import {
  communityTypeColors,
  communityTypeLabels,
  type CommunityType,
  fonts,
  radius,
  spacing,
  typography,
} from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

// ── Constants ────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<CommunityType, IoniconsName> = {
  study: 'school-outline',
  gaming: 'game-controller-outline',
  sports: 'football-outline',
  creative: 'color-palette-outline',
  social: 'people-outline',
};

// Cluster order: 5 community types + 'create' at index 3 (center)
const CLUSTER: (CommunityType | 'create')[] = [
  'study',
  'gaming',
  'sports',
  'create',
  'creative',
  'social',
];

const CELL_W = 84;
const CELL_H = CELL_W * (Math.sqrt(3) / 2);
const BBOX_W = 2.5 * CELL_W;
const BBOX_H = 2.8 * CELL_H;

// Positions for seamless flat-top hex tiling (no gaps). Create at center.
const POSITIONS: [number, number][] = [
  [0, -CELL_H], // study (top)
  [-0.75 * CELL_W, -0.5 * CELL_H], // gaming (top-left)
  [0.75 * CELL_W, -0.5 * CELL_H], // sports (top-right)
  [0, 0], // create (center)
  [-0.75 * CELL_W, 0.5 * CELL_H], // creative (bottom-left)
  [0.75 * CELL_W, 0.5 * CELL_H], // social (bottom-right)
];

function hexPoints(w: number, h: number): string {
  return `0,${h / 2} ${w * 0.25},0 ${w * 0.75},0 ${w},${h / 2} ${w * 0.75},${h} ${w * 0.25},${h}`;
}

// ── HexCell ──────────────────────────────────────────────────────────────────

interface HexCellProps {
  type: CommunityType;
  selected: boolean;
  scale: number;
  onToggle: () => void;
}

function HexCell({ type, selected, scale, onToggle }: HexCellProps) {
  const colors = useTheme();
  const palette = communityTypeColors[type];
  const w = CELL_W * scale;
  const h = CELL_H * scale;
  const iconSize = Math.floor(w * 0.28);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityLabel={communityTypeLabels[type]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[
        { width: w, height: h },
        selected && {
          shadowColor: palette.primary,
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        },
      ]}
    >
      <Svg width={w} height={h} viewBox={`0 0 ${CELL_W} ${CELL_H}`}>
        <Polygon
          points={hexPoints(CELL_W, CELL_H)}
          fill={selected ? palette.background : colors.surface}
          stroke={selected ? palette.primary : colors.border}
          strokeWidth={selected ? 1.8 : 1.2}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.cellContent]}>
        <Ionicons
          name={ICONS[type]}
          size={iconSize}
          color={selected ? palette.primary : colors.textMuted}
        />
        <Text
          style={[
            typography.caption,
            { color: selected ? palette.primary : colors.textMuted, fontFamily: fonts.medium },
          ]}
        >
          {communityTypeLabels[type]}
        </Text>
      </View>
      {selected && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: palette.primary,
              borderColor: colors.surface,
              top: h * 0.1,
              right: w * 0.04,
            },
          ]}
        >
          <Ionicons name="checkmark" size={9} color={colors.surface} />
        </View>
      )}
    </Pressable>
  );
}

// ── CreateHex ────────────────────────────────────────────────────────────────

function CreateHex({ scale }: { scale: number }) {
  const colors = useTheme();
  const w = CELL_W * scale;
  const h = CELL_H * scale;
  const iconSize = Math.floor(w * 0.28);

  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          'Create a community',
          'Finish setting up your profile first — you can create a community right after.',
        )
      }
      accessibilityLabel="Create a community"
      accessibilityRole="button"
      style={{ width: w, height: h }}
    >
      <Svg width={w} height={h} viewBox={`0 0 ${CELL_W} ${CELL_H}`}>
        <Polygon
          points={hexPoints(CELL_W, CELL_H)}
          fill={colors.primarySoft}
          stroke={colors.primary}
          strokeWidth={1.4}
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.cellContent]}>
        <Ionicons name="add-outline" size={iconSize} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.primary, fontFamily: fonts.medium }]}>
          Create
        </Text>
      </View>
    </Pressable>
  );
}

// ── HoneycombCluster ─────────────────────────────────────────────────────────

interface HoneycombClusterProps {
  selectedTypes: Set<CommunityType>;
  onToggle: (type: CommunityType) => void;
  scale: number;
}

function HoneycombCluster({ selectedTypes, onToggle, scale }: HoneycombClusterProps) {
  return (
    <View style={{ position: 'relative', width: BBOX_W * scale, height: BBOX_H * scale }}>
      {CLUSTER.map((type, i) => {
        const [cx, cy] = POSITIONS[i];
        const left = (cx + 0.75 * CELL_W) * scale;
        const top = (cy + CELL_H) * scale;

        if (type === 'create') {
          return (
            <View key="create" style={[styles.cell, { left, top }]}>
              <CreateHex scale={scale} />
            </View>
          );
        }

        return (
          <View key={type} style={[styles.cell, { left, top }]}>
            <HexCell
              type={type}
              selected={selectedTypes.has(type)}
              scale={scale}
              onToggle={() => onToggle(type)}
            />
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const [selectedTypes, setSelectedTypes] = useState<Set<CommunityType>>(new Set());
  const { style: shakeStyle, trigger: triggerShake } = useShakeAnimation();

  const scale = (width - 2 * spacing.xl - spacing.base) / BBOX_W;

  const toggle = (type: CommunityType) =>
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });

  const buttonLabel =
    selectedTypes.size > 0 ? `Continue · ${selectedTypes.size} selected` : 'Continue';

  const handleContinue = () => {
    if (selectedTypes.size === 0) {
      triggerShake();
      return;
    }
    router.push({
      pathname: '/(onboarding)/step2',
      params: { types: JSON.stringify([...selectedTypes]) },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(auth)/login' as Href)}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14 }}>
            Back
          </Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          <Text style={{ color: colors.primary }}>{'1'}</Text>
          {' / 3'}
        </Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[typography.display, { color: colors.text }]}>What are you into?</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          {"Pick a few — you'll join their hive. Don't see yours? Create one."}
        </Text>
      </View>

      <View style={styles.clusterWrap}>
        <HoneycombCluster selectedTypes={selectedTypes} onToggle={toggle} scale={scale} />
      </View>

      <Animated.View style={[styles.footer, shakeStyle]}>
        <PrimaryButton
          label={buttonLabel}
          onPress={handleContinue}
          disabled={selectedTypes.size === 0}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 6,
  },
  clusterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: { position: 'absolute' },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  badge: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});
