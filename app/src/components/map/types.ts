export type LatLng = { lat: number; lng: number };
export type MapMarker = {
  id: string;
  kind: "church" | "you" | "pickup" | "car" | "person";
  lat: number; lng: number;
  heading?: number; label?: string; color?: string; letter?: string;
};
export type MapRoute = { coords: [number, number][]; dashed?: boolean; color?: string } | null;
export type LiveMapProps = {
  style?: any;
  initial: LatLng & { zoom?: number };
  markers: MapMarker[];
  route?: MapRoute;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Fit the camera to these points whenever fitKey changes. */
  fit?: LatLng[]; fitKey?: string;
  /** Move the camera here whenever centerKey changes. */
  center?: LatLng & { zoom?: number }; centerKey?: string;
  /** Keep this marker in view. */
  follow?: string;
  /** Show the drag-the-map pickup pin; onCenter fires when the map stops moving. */
  pick?: boolean;
  onCenter?: (p: LatLng) => void;
  onTap?: (id: string) => void;
  onReady?: () => void;
};
