import { Linking, Platform } from "react-native";

/** Turn-by-turn directions in Google Maps (or Waze, or the browser). */
export function directions(lat: number, lng: number, label?: string) {
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (Platform.OS === "web") return Linking.openURL(web);
  const app = Platform.select({ ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, default: `google.navigation:q=${lat},${lng}` })!;
  return Linking.openURL(app).catch(() => Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`)).catch(() => Linking.openURL(web));
}
/** Directions to a written address when there's no pin. */
export function directionsTo(address: string) {
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);
}
