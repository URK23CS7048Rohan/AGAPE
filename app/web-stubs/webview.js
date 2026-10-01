// Web stand-in for react-native-webview (native only): renders an <iframe>.
import React from "react";
import { View } from "react-native";

export function WebView({ source, style }) {
  const props = source && source.html ? { srcDoc: source.html } : { src: source && source.uri };
  return (
    <View style={[{ overflow: "hidden", backgroundColor: "#000" }, style]}>
      {React.createElement("iframe", { ...props, style: { border: 0, width: "100%", height: "100%" }, allow: "autoplay; encrypted-media" })}
    </View>
  );
}
export default WebView;
