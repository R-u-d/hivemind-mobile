import { roundUpToInterval } from '@/utils/time';

function at(h: number, m: number, s = 0): Date {
  return new Date(2026, 4, 29, h, m, s, 0);
}

describe('roundUpToInterval', () => {
  it('rounds up to the next 5-minute mark', () => {
    expect(roundUpToInterval(at(10, 13), 5)).toEqual(at(10, 15));
  });

  it('leaves a value already on the interval unchanged', () => {
    expect(roundUpToInterval(at(10, 15), 5)).toEqual(at(10, 15));
  });

  it('rolls over the hour boundary', () => {
    expect(roundUpToInterval(at(10, 58), 5)).toEqual(at(11, 0));
  });

  it('drops stray seconds when rounding up', () => {
    expect(roundUpToInterval(at(10, 13, 30), 5)).toEqual(at(10, 15));
  });
});
