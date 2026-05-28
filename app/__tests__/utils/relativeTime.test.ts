import { relativeTime } from '@/utils/relativeTime';

function iso(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

describe('relativeTime', () => {
  it('returns "just now" for timestamps under 60 seconds ago', () => {
    expect(relativeTime(iso(30))).toBe('just now');
    expect(relativeTime(iso(0))).toBe('just now');
  });

  it('returns Xm for timestamps between 1 and 59 minutes ago', () => {
    expect(relativeTime(iso(60))).toBe('1m');
    expect(relativeTime(iso(90))).toBe('1m');
    expect(relativeTime(iso(59 * 60))).toBe('59m');
  });

  it('returns Xh for timestamps between 1 and 23 hours ago', () => {
    expect(relativeTime(iso(3600))).toBe('1h');
    expect(relativeTime(iso(2 * 3600))).toBe('2h');
    expect(relativeTime(iso(23 * 3600))).toBe('23h');
  });

  it('returns Xd for timestamps between 1 and 6 days ago', () => {
    expect(relativeTime(iso(24 * 3600))).toBe('1d');
    expect(relativeTime(iso(6 * 24 * 3600))).toBe('6d');
  });

  it('returns "DD MMM" for timestamps 7 or more days ago', () => {
    const d = new Date('2026-05-01T12:00:00Z');
    expect(relativeTime(d.toISOString())).toBe('1 May');
  });

  it('returns "just now" for future timestamps (clock skew / optimistic inserts)', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(relativeTime(future)).toBe('just now');
  });
});
