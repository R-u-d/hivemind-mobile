export type CommunityType =
  | 'student'
  | 'gamer'
  | 'hobby'
  | 'sports'
  | 'music'
  | 'books'
  | 'outdoors'
  | 'travel'
  | 'photo'
  | 'foodie'
  | 'tech';

// ── Colors ────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primaryPressed: '#5B21B6',
  primarySoft: '#EDE9FE',

  // Neutrals
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
} as const;

// ── Community type colors ─────────────────────────────────────────────────

export const communityTypeColors: Record<
  CommunityType,
  { primary: string; background: string; text: string }
> = {
  student:  { primary: '#378ADD', background: '#E7F1FB', text: '#378ADD' },
  gamer:    { primary: '#D85A30', background: '#FBE9E1', text: '#D85A30' },
  hobby:    { primary: '#1D9E75', background: '#E1F2EC', text: '#1D9E75' },
  sports:   { primary: '#EF9F27', background: '#FDF1DA', text: '#EF9F27' },
  music:    { primary: '#534AB7', background: '#EDE9FE', text: '#534AB7' },
  books:    { primary: '#92400E', background: '#FEF3C7', text: '#92400E' },
  outdoors: { primary: '#65A30D', background: '#ECFCCB', text: '#65A30D' },
  travel:   { primary: '#0D9488', background: '#CCFBF1', text: '#0D9488' },
  photo:    { primary: '#DB2777', background: '#FCE7F3', text: '#DB2777' },
  foodie:   { primary: '#DC2626', background: '#FEE2E2', text: '#DC2626' },
  tech:     { primary: '#4F46E5', background: '#E0E7FF', text: '#4F46E5' },
};

// Token for the "create a new community" card/action — not a community type itself
export const communityCreate = {
  primary:    colors.primary,
  background: colors.surfaceSunk,
  text:       colors.textMuted,
  border:     colors.border,
} as const;

// ── Spacing (4px base unit) ───────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────
// Weights 400 (Inter_400Regular) and 500 (Inter_500Medium) only.
// fontFamily values match the keys loaded via useFonts in _layout.tsx.

export const fonts = {
  regular: 'Inter_400Regular',
  medium:  'Inter_500Medium',
} as const;

export const typography = {
  title:     { fontSize: 17, fontWeight: '500' as const, fontFamily: fonts.medium },
  cardTitle: { fontSize: 13, fontWeight: '500' as const, fontFamily: fonts.medium },
  body:      { fontSize: 12, fontWeight: '400' as const, fontFamily: fonts.regular },
  caption:   { fontSize: 10, fontWeight: '400' as const, fontFamily: fonts.regular },
} as const;

// ── Dark mode ─────────────────────────────────────────────────────────────
// Stubbed — not implemented in v1, planned for v2.
// export const darkColors: typeof colors = { ... };
