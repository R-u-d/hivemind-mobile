// Web fallback — react-native-maps is native-only. The location text field
// remains usable; pin-dropping is a native-only affordance.
interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  defaultCenter?: { lat: number; lng: number };
  defaultCenterLabel?: string;
}

export default function LocationPickerMap(_props: LocationPickerMapProps) {
  return null;
}
