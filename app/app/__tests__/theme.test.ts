import { colors, communityTypeColors, communityCreate, spacing, radius, typography } from '@/theme';

describe('colors', () => {
  it('exports primary', () => {
    expect(colors.primary).toBe('#6D28D9');
  });
});

describe('communityTypeColors', () => {
  const types = [
    'student', 'gamer', 'hobby', 'sports', 'music',
    'books', 'outdoors', 'travel', 'photo', 'foodie', 'tech',
  ] as const;

  it.each(types)('%s has primary, background and text', type => {
    const c = communityTypeColors[type];
    expect(c.primary).toBeTruthy();
    expect(c.background).toBeTruthy();
    expect(c.text).toBeTruthy();
  });
});

describe('communityCreate', () => {
  it('has primary, background, text and border', () => {
    expect(communityCreate.primary).toBeTruthy();
    expect(communityCreate.background).toBeTruthy();
    expect(communityCreate.text).toBeTruthy();
    expect(communityCreate.border).toBeTruthy();
  });
});

describe('spacing', () => {
  it('base is 16', () => {
    expect(spacing.base).toBe(16);
  });
});

describe('radius', () => {
  it('full is 999', () => {
    expect(radius.full).toBe(999);
  });
});

describe('typography', () => {
  it('title is 17/500', () => {
    expect(typography.title.fontSize).toBe(17);
    expect(typography.title.fontWeight).toBe('500');
  });
});
