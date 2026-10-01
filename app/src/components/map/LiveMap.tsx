import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { mapHtml } from "./mapHtml";
import type { LiveMapProps } from "./types";
export type { MapMarker, MapRoute, LatLng } from "./types";

/** Free Google-style street map (OpenStreetMap) in a WebView — no API key needed. */
export function LiveMap(p: LiveMapProps) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);
  const html = useMemo(() => mapHtml({ lat: p.initial.lat, lng: p.initial.lng, zoom: p.initial.zoom }), []);
  const state = { markers: p.markers, route: p.route ?? null, padding: p.padding, fit: p.fit, fitKey: p.fitKey, center: p.center, centerKey: p.centerKey, follow: p.follow, pick: !!p.pick };
  const json = JSON.stringify(state);
  const send = () => { if (ready.current) ref.current?.injectJavaScript(`window.agape&&window.agape.update(${json});true;`); };
  useEffect(send, [json]);
  return (
    <View style={p.style} pointerEvents="box-none">
      <WebView
        ref={ref}
        source={{ html, baseUrl: "https://agape.church/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: "#F2EFE9" }}
        onMessage={(e) => {
          let m: any; try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
          if (m.type === "ready") { ready.current = true; send(); p.onReady?.(); }
          if (m.type === "center") p.onCenter?.({ lat: m.lat, lng: m.lng });
          if (m.type === "tap") p.onTap?.(m.id);
        }}
      />
    </View>
  );
}
