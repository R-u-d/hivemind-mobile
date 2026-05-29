import * as Location from 'expo-location';

import { forwardGeocode, reverseGeocode } from '@/utils/geocode';

jest.mock('expo-location', () => ({
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const mockGeocode = Location.geocodeAsync as jest.Mock;
const mockReverse = Location.reverseGeocodeAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('forwardGeocode', () => {
  it('returns coords from the first result', async () => {
    mockGeocode.mockResolvedValue([{ latitude: 40.7, longitude: -73.9 }]);
    expect(await forwardGeocode('Brooklyn')).toEqual({ lat: 40.7, lng: -73.9 });
  });

  it('returns null for empty input without calling the geocoder', async () => {
    expect(await forwardGeocode('   ')).toBeNull();
    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it('returns null when the geocoder throws', async () => {
    mockGeocode.mockRejectedValue(new Error('no network'));
    expect(await forwardGeocode('Nowhere')).toBeNull();
  });
});

describe('reverseGeocode', () => {
  it('builds a readable address line', async () => {
    mockReverse.mockResolvedValue([
      { name: '87', street: 'Franklin St', city: 'Brooklyn', region: 'NY' },
    ]);
    expect(await reverseGeocode(40.7, -73.9)).toBe('87 Franklin St, Brooklyn, NY');
  });

  it('returns null when no place is found', async () => {
    mockReverse.mockResolvedValue([]);
    expect(await reverseGeocode(0, 0)).toBeNull();
  });
});
