import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { mapHtml } from "./mapHtml";
import type { LiveMapProps } from "./types";
export type { MapMarker, MapRoute, LatLng } from "./types";

/** Web version: the same map page inside an iframe. */
export function LiveMap(p: LiveMapProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  // a blob: URL (not srcdoc) so the map page keeps a real origin — MapLibre's tile workers need it
  const src = useMemo(() => URL.createObjectURL(new Blob([mapHtml({ lat: p.initial.lat, lng: p.initial.lng, zoom: p.initial.zoom })], { type: "text/html" })), []);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  const state = { markers: p.markers, route: p.route ?? null, padding: p.padding, fit: p.fit, fitKey: p.fitKey, center: p.center, centerKey: p.centerKey, follow: p.follow, pick: !!p.pick };
  const json = JSON.stringify(state);
  const latest = useRef(json); latest.current = json;
  const cbs = useRef(p); cbs.current = p;
  const send = () => { if (ready.current) frame.current?.contentWindow?.postMessage({ agapeState: JSON.parse(latest.current) }, "*"); };
  useEffect(send, [json]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || !e.data.agapeMap) return;
      const m = e.data;
      if (m.type === "ready") { ready.current = true; send(); cbs.current.onReady?.(); }
      if (m.type === "center") cbs.current.onCenter?.({ lat: m.lat, lng: m.lng });
      if (m.type === "tap") cbs.current.onTap?.(m.id);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  return (
    <View style={p.style}>
      {React.createElement("iframe", { ref: frame, src, title: "Map", style: { border: 0, width: "100%", height: "100%", display: "block" }, allow: "geolocation" })}
    </View>
  );
}
