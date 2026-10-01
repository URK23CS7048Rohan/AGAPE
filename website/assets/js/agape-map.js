/* =========================================================
   AGAPE — real street map for the Rides section (free, no API key)
   MapLibre GL + OpenFreeMap vector tiles (OpenStreetMap data), styled like
   Google Maps' night mode, with a car driving a real road route (OSRM).
   If the map can't load (offline, old browser) the canvas illustration stays.
   ========================================================= */
(function () {
  "use strict";
  const LIB = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl";
  const STYLE = "https://tiles.openfreemap.org/styles/liberty";
  const ROUTER = "https://router.project-osrm.org";
  let loading = null;
  const load = () => loading || (loading = new Promise((res, rej) => {
    if (window.maplibregl) return res(window.maplibregl);
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = LIB + ".css"; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = LIB + ".js"; s.async = true;
    s.onload = () => (window.maplibregl ? res(window.maplibregl) : rej(new Error("maplibre missing")));
    s.onerror = () => rej(new Error("maplibre failed to load"));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error("timeout")), 15000);
  }));

  /* Google Maps "night" palette applied to the OpenStreetMap layers */
  function night(map) {
    const set = (id, k, v) => { try { map.setPaintProperty(id, k, v); } catch (e) {} };
    (map.getStyle().layers || []).forEach((l) => {
      const id = l.id, sl = l["source-layer"] || "", t = l.type, low = id.toLowerCase();
      if (t === "background") return set(id, "background-color", "#242F3E");
      if (sl === "water" && t === "fill") return set(id, "fill-color", "#17263C");
      if (sl === "waterway" && t === "line") return set(id, "line-color", "#17263C");
      if ((sl === "park" || sl === "landcover") && t === "fill") { set(id, "fill-color", /sand|beach/.test(low) ? "#2E3440" : "#263C3F"); return set(id, "fill-opacity", 0.9); }
      if (sl === "landuse" && t === "fill") return set(id, "fill-color", "#2A3546");
      if (sl === "aeroway" && t === "fill") return set(id, "fill-color", "#2F3948");
      if (sl === "building") {
        if (t === "fill") { set(id, "fill-color", "#2B3544"); return set(id, "fill-outline-color", "#222B37"); }
        if (t === "fill-extrusion") { set(id, "fill-extrusion-color", "#2E3948"); return set(id, "fill-extrusion-opacity", 0.8); }
      }
      if (sl === "transportation" && t === "line") {
        if (/rail|transit|ferry|cable|aerialway/.test(low)) return set(id, "line-color", "#2F3948");
        const casing = /casing|outline/.test(low), hw = /motorway|trunk/.test(low);
        if (casing) return set(id, "line-color", hw ? "#1F2835" : "#212A37");
        return set(id, "line-color", hw ? "#746855" : "#38414E");
      }
      if (t === "symbol") {
        const water = /water|ocean|sea|lake|river|marine/.test(low), road = sl === "transportation_name", poi = sl === "poi", place = sl === "place";
        set(id, "text-color", water ? "#515C6D" : road ? (/motorway|trunk/.test(low) ? "#F3D19C" : "#9CA5B3") : poi ? "#D59563" : place ? "#D59563" : "#9CA5B3");
        set(id, "text-halo-color", water ? "#17263C" : "#242F3E"); set(id, "text-halo-width", 1.4);
        if (poi) set(id, "icon-opacity", 0.55);
      }
    });
  }

  async function route(a, b) {
    try {
      const r = await fetch(`${ROUTER}/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`);
      const j = await r.json();
      const c = j && j.routes && j.routes[0];
      if (c && c.geometry.coordinates.length > 1) return { coords: c.geometry.coordinates, minutes: Math.max(3, Math.round((c.duration / 60) * 1.25)) };
    } catch (e) {}
    return { coords: [a, [a[0], (a[1] + b[1]) / 2], [b[0], (a[1] + b[1]) / 2], b], minutes: 7 };
  }
  function along(coords, t) {
    const seg = []; let total = 0;
    for (let i = 1; i < coords.length; i++) { const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]); seg.push(d); total += d; }
    let d = t * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) {
        const k = seg[i] ? d / seg[i] : 0, a = coords[i], b = coords[i + 1];
        const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
        return { p, i, heading: (Math.atan2((b[0] - a[0]) * Math.cos((p[1] * Math.PI) / 180), b[1] - a[1]) * 180) / Math.PI };
      }
      d -= seg[i];
    }
    return { p: coords[coords.length - 1], i: coords.length - 2, heading: 0 };
  }

  /**
   * Renders the live ride demo into `host`. opts: { church:[lng,lat], start:[lng,lat], label, onProgress(p, minutes), padding() }
   * Returns a promise; rejects if the map can't load (caller keeps its fallback).
   */
  async function ride(host, opts) {
    const ml = await load();
    const map = new ml.Map({ container: host, style: STYLE, center: opts.church, zoom: 13.4, interactive: false, attributionControl: false, fadeDuration: 0 });
    map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");
    await new Promise((res, rej) => { map.once("load", res); map.once("error", (e) => rej(e && e.error)); setTimeout(() => rej(new Error("style timeout")), 15000); });
    night(map);
    const r = await route(opts.start, opts.church);
    const before = (map.getStyle().layers.find((l) => l.type === "symbol") || {}).id;
    map.addSource("trip", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: r.coords } } });
    map.addSource("left", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: r.coords } } });
    map.addLayer({ id: "trip", type: "line", source: "trip", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#4285F4", "line-opacity": 0.25, "line-width": 9 } }, before);
    map.addLayer({ id: "left-casing", type: "line", source: "left", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#1A56B8", "line-width": 9 } }, before);
    map.addLayer({ id: "left", type: "line", source: "left", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#4285F4", "line-width": 5.5 } }, before);

    const pin = document.createElement("div");
    pin.className = "rm-church";
    pin.innerHTML = '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.6 0 14.8 0 25.9 15 40 15 40s15-14.1 15-25.2C30 6.6 23.3 0 15 0z" fill="#EA4335"/><path d="M13.6 7h2.8v4.2h4.1V14h-4.1v8.4h-2.8V14H9.5v-2.8h4.1z" fill="#fff"/></svg><b></b>';
    pin.querySelector("b").textContent = opts.label || "Agape";
    new ml.Marker({ element: pin, anchor: "bottom-left" }).setLngLat(opts.church).addTo(map);
    const start = document.createElement("div"); start.className = "rm-start";
    new ml.Marker({ element: start }).setLngLat(r.coords[0]).addTo(map);
    const car = document.createElement("div"); car.className = "rm-car";
    car.innerHTML = '<svg width="44" height="44" viewBox="0 0 44 44"><g transform="translate(22 22)"><rect x="-8.5" y="-17" width="17" height="34" rx="7" fill="#fff"/><rect x="-6.5" y="-9.5" width="13" height="7" rx="2.2" fill="#2E3A46"/><rect x="-6" y="7.5" width="12" height="4.5" rx="1.8" fill="#2E3A46"/><rect x="-7.5" y="-16" width="4" height="2.2" rx="1" fill="#FFE08A"/><rect x="3.5" y="-16" width="4" height="2.2" rx="1" fill="#FFE08A"/></g></svg>';
    const carM = new ml.Marker({ element: car, rotationAlignment: "map" }).setLngLat(r.coords[0]).addTo(map);

    const fit = () => {
      const b = new ml.LngLatBounds(); r.coords.forEach((c) => b.extend(c)); b.extend(opts.church);
      map.fitBounds(b, { padding: opts.padding ? opts.padding() : 60, duration: 0, maxZoom: 15.5 });
    };
    fit();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { map.resize(); fit(); }, 200); });

    let p = 0, hold = 0, last = 0, running = false, raf = 0;
    const dur = 26000;
    const frame = (t) => {
      if (!running) return;
      const dt = last ? Math.min(64, t - last) : 16; last = t;
      if (hold > 0) { hold -= dt; if (hold <= 0) p = 0; }
      else { p = Math.min(1, p + dt / dur); if (p >= 1) hold = 2800; }
      const a = along(r.coords, p);
      carM.setLngLat(a.p); carM.setRotation(a.heading);
      if ((t | 0) % 3 === 0) map.getSource("left").setData({ type: "Feature", geometry: { type: "LineString", coordinates: [a.p, ...r.coords.slice(a.i + 1)] } });
      opts.onProgress && opts.onProgress(p, Math.max(1, Math.ceil((1 - p) * r.minutes)));
      raf = requestAnimationFrame(frame);
    };
    return {
      map,
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }

  window.AgapeMap = { load, ride, night };
})();
