// Web stand-in for react-native-maps (native only). Draws a dark street-grid "map".
import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";

const grid = {
  backgroundColor: "#16121c",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px), radial-gradient(60% 50% at 70% 30%, rgba(46,211,160,.12), transparent 70%)",
  backgroundSize: "56px 56px, 56px 56px, 100% 100%",
};
const MapView = forwardRef(function MapView({ style, children }, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion() {}, animateCamera() {}, fitToCoordinates() {} }));
  return <View style={[style, grid]}>{null}</View>;
});
export const Marker = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_GOOGLE = "google";
export default MapView;
