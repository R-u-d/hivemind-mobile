export type CommunityType = 'study' | 'gaming' | 'sports' | 'creative' | 'social';

// ── Colors ────────────────────────────────────────────────────────────────

export type Colors = { readonly [K in keyof typeof colors]: string };

export const colors = {
  // Brand
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primaryPressed: '#5B21B6',
  primarySoft: '#EDE9FE',
  primaryGlow: 'rgba(109, 40, 217, 0.32)',
  primaryAmethyst: '#7C3AED',
  primaryPlum: '#3B0764',

  // Neutrals
  ink: '#0E0E11',
  text: '#1A1A1F',
  textMuted: '#6B6B73',
  textFaint: '#9B9BA3',
  border: '#E5E5E5',
  borderSoft: '#EDEDEF',
  surface: '#FFFFFF',
  surfaceSunk: '#F6F6F8',
  bg: '#FAFAFB',

  // Semantic
  danger: '#DC2626',
  warning: '#EF9F27',
  onPrimary: '#FFFFFF',
  eventAccent: '#1D9E75',

  // Splash screen (always dark — do not flip in darkColors)
  splash: '#130C2E',
  splashBg: '#0A0420',
  splashGradient: '#2E1065',
  splashGradientMid: '#1A0B3D',
  splashFg: '#F5F3FF',
  splashTagline: 'rgba(216, 200, 255, 0.78)',
  splashDot: '#C4B5FD',
} as const;

// ── Community type colors ─────────────────────────────────────────────────

export const communityTypeColors: Record<
  CommunityType,
  { primary: string; background: string; text: string }
> = {
  study: { primary: '#378ADD', background: '#E7F1FB', text: '#378ADD' },
  gaming: { primary: '#D85A30', background: '#FBE9E1', text: '#D85A30' },
  sports: { primary: '#EF9F27', background: '#FDF1DA', text: '#EF9F27' },
  creative: { primary: '#DB2777', background: '#FCE7F3', text: '#DB2777' },
  social: { primary: '#0D9488', background: '#CCFBF1', text: '#0D9488' },
};

export const communityTypeLabels: Record<CommunityType, string> = {
  study: 'Study',
  gaming: 'Gaming',
  sports: 'Sports',
  creative: 'Creative',
  social: 'Social',
};

// Token for the "create a new community" card/action — not a community type itself
export const communityCreate = {
  primary: colors.primary,
  background: colors.surfaceSunk,
  text: colors.textMuted,
  border: colors.border,
} as const;

// ── Spacing (4px base unit) ───────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  input: 12,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────
// Weights 400 (Inter_400Regular) and 500 (Inter_500Medium) only.
// fontFamily values match the keys loaded via useFonts in _layout.tsx.

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
} as const;

// Canonical 6-step ramp — matches design spec §2 (design/design-spec.md).
// Names: display / title / heading / body / caption / overline.

export const typography = {
  display: {
    fontSize: 28,
    letterSpacing: -0.8,
    fontWeight: '500' as const,
    fontFamily: fonts.medium,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
    fontWeight: '500' as const,
    fontFamily: fonts.medium,
  },
  heading: {
    fontSize: 17,
    letterSpacing: -0.2,
    fontWeight: '500' as const,
    fontFamily: fonts.medium,
  },
  body: {
    fontSize: 15,
    lineHeight: 15 * 1.45,
    fontWeight: '400' as const,
    fontFamily: fonts.regular,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: fonts.regular,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
    fontFamily: fonts.medium,
  },
} as const;

// ── Dark mode ─────────────────────────────────────────────────────────────
// Brand tokens are identical. Only neutrals flip.

export const darkColors: Colors = {
  // Brand — unchanged
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primaryPressed: '#5B21B6',
  primarySoft: '#2D1B69',
  primaryGlow: 'rgba(109, 40, 217, 0.32)',
  primaryAmethyst: '#7C3AED',
  primaryPlum: '#3B0764',

  // Neutrals — flipped
  ink: '#F5F5F7',
  text: '#F2F2F7',
  textMuted: '#8E8E93',
  textFaint: '#636366',
  border: '#2C2C2E',
  borderSoft: '#242426',
  surface: '#1C1C1E',
  surfaceSunk: '#141416',
  bg: '#0F0F10',

  // Semantic — unchanged
  danger: '#DC2626',
  warning: '#EF9F27',
  onPrimary: '#FFFFFF',
  eventAccent: '#1D9E75',

  // Splash screen — same as light; splash is always dark
  splash: '#130C2E',
  splashBg: '#0A0420',
  splashGradient: '#2E1065',
  splashGradientMid: '#1A0B3D',
  splashFg: '#F5F3FF',
  splashTagline: 'rgba(216, 200, 255, 0.78)',
  splashDot: '#C4B5FD',
};
