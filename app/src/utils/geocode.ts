import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

// Geocoding is unsupported on web (expo-location throws). Native uses the OS
// geocoder (Apple/Android) and needs no foreground-location permission.

export async function forwardGeocode(address: string): Promise<Coords | null> {
  if (Platform.OS === 'web' || !address.trim()) return null;
  try {
    const [first] = await Location.geocodeAsync(address.trim());
    if (!first) return null;
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!place) return null;
    const line1 = [place.name, place.street].filter(Boolean).join(' ');
    const parts = [line1 || null, place.city, place.region].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
}
