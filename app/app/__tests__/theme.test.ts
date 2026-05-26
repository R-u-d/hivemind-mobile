import {
  colors,
  darkColors,
  communityTypeColors,
  communityCreate,
  spacing,
  radius,
  typography,
} from '@/theme';

describe('colors', () => {
  it('exports primary', () => {
    expect(colors.primary).toBe('#6D28D9');
  });
});

describe('darkColors', () => {
  it('has the same keys as colors', () => {
    expect(Object.keys(darkColors)).toEqual(Object.keys(colors));
  });

  it('flips neutrals', () => {
    expect(darkColors.bg).not.toBe(colors.bg);
    expect(darkColors.surface).not.toBe(colors.surface);
    expect(darkColors.text).not.toBe(colors.text);
  });

  it('keeps brand colors identical', () => {
    expect(darkColors.primary).toBe(colors.primary);
    expect(darkColors.danger).toBe(colors.danger);
  });
});

describe('communityTypeColors', () => {
  const types = [
    'student',
    'gamer',
    'hobby',
    'sports',
    'music',
    'books',
    'outdoors',
    'travel',
    'photo',
    'foodie',
    'tech',
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
  it('uses the canonical 6-step ramp', () => {
    expect(typography.display.fontSize).toBe(28);
    expect(typography.title.fontSize).toBe(22);
    expect(typography.heading.fontSize).toBe(17);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.caption.fontSize).toBe(13);
    expect(typography.overline.fontSize).toBe(11);
  });

  it('heading is medium weight', () => {
    expect(typography.heading.fontWeight).toBe('500');
  });
});
