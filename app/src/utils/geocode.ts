import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

// iOS uses Apple's platform geocoder via expo-location (no key needed).
// Android uses the Google Geocoding API directly — the platform geocoder
// is unreliable on Android without Google Play Services being fully active.
const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export async function forwardGeocode(address: string): Promise<Coords | null> {
  if (Platform.OS === 'web' || !address.trim()) return null;

  if (Platform.OS === 'android' && MAPS_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&key=${MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results[0]) {
        const { lat, lng } = json.results[0].geometry.location;
        return { lat, lng };
      }
      return null;
    } catch {
      return null;
    }
  }

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

  if (Platform.OS === 'android' && MAPS_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results[0]) {
        return json.results[0].formatted_address;
      }
      return null;
    } catch {
      return null;
    }
  }

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
