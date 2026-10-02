/** Google Maps style for the ride map (Android). */
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#17131d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8196" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17131d" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2432" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#322b3c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3448" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e2233" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1b1622" }] },
];
