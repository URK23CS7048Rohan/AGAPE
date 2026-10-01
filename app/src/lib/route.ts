/**
 * Real road routes + drive times, free: the public OSRM server (OpenStreetMap data).
 * For heavy production use the church can point EXPO_PUBLIC_ROUTER_URL at its own OSRM / Valhalla.
 * Falls back to a straight line if the router can't be reached.
 */
import { useEffect, useRef, useState } from "react";

const ROUTER = (process.env.EXPO_PUBLIC_ROUTER_URL || "https://router.project-osrm.org").replace(/\/$/, "");
export type Pt = { lat: number; lng: number };
export type Route = { coords: [number, number][]; minutes: number; km: number; real: boolean };
const cache = new Map<string, Route>();
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const dist = (a: Pt, b: Pt) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export async function fetchRoute(a: Pt, b: Pt): Promise<Route> {
  const key = `${r4(a.lng)},${r4(a.lat)};${r4(b.lng)},${r4(b.lat)}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`${ROUTER}/route/v1/driving/${key}?overview=full&geometries=geojson`, { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    const best = j?.routes?.[0];
    if (best?.geometry?.coordinates?.length) {
      // public OSRM durations are free-flow; add a city-traffic margin
      const out: Route = { coords: best.geometry.coordinates, minutes: Math.max(1, Math.round((best.duration / 60) * 1.25)), km: best.distance / 1000, real: true };
      cache.set(key, out);
      return out;
    }
  } catch {}
  const km = dist(a, b);
  return { coords: [[a.lng, a.lat], [b.lng, b.lat]], minutes: Math.max(1, Math.round((km / 28) * 60 * 1.3 + 1)), km, real: false };
}

/**
 * Route from `from` to `to`, re-fetched when either end moves more than `refreshKm`
 * (so a driver's ETA stays fresh without hammering the router).
 */
export function useRoute(from: Pt | null, to: Pt | null, refreshKm = 0.15) {
  const [route, setRoute] = useState<Route | null>(null);
  const lastFrom = useRef<Pt | null>(null), lastTo = useRef<Pt | null>(null);
  useEffect(() => {
    if (!from || !to) { setRoute(null); lastFrom.current = lastTo.current = null; return; }
    if (lastFrom.current && lastTo.current && dist(lastFrom.current, from) < refreshKm && dist(lastTo.current, to) < 0.05) return;
    lastFrom.current = from; lastTo.current = to;
    let alive = true;
    fetchRoute(from, to).then((r) => alive && setRoute(r));
    return () => { alive = false; };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);
  return route;
}

/** Remaining part of a route from the point closest to `p` (so the line shrinks as the car drives). */
export function remaining(route: Route | null, p: Pt | null): [number, number][] | null {
  if (!route) return null;
  if (!p) return route.coords;
  let best = 0, bd = Infinity;
  route.coords.forEach(([lng, lat], i) => { const d = (lng - p.lng) ** 2 + (lat - p.lat) ** 2; if (d < bd) { bd = d; best = i; } });
  return [[p.lng, p.lat], ...route.coords.slice(best + 1)];
}

/** A point t ∈ [0,1] along a route, with heading (used for the demo drive). */
export function along(coords: [number, number][], t: number) {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) { const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]); seg.push(d); total += d; }
  let d = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const k = seg[i] ? d / seg[i] : 0, a = coords[i], b = coords[i + 1];
      const lng = a[0] + (b[0] - a[0]) * k, lat = a[1] + (b[1] - a[1]) * k;
      const heading = (Math.atan2((b[0] - a[0]) * Math.cos((lat * Math.PI) / 180), b[1] - a[1]) * 180) / Math.PI;
      return { lat, lng, heading };
    }
    d -= seg[i];
  }
  const l = coords[coords.length - 1];
  return { lat: l[1], lng: l[0], heading: 0 };
}
