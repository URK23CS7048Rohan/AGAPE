/* =========================================================
   AGAPE v3 — showpiece components
   Globe (dotted, arcs), bento mini-UIs, animated beam,
   magic spotlight cards, border beams.
   ========================================================= */
window.AgapeV3 = function (SITE) {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const onView = (el, cb, once = false, margin = "0px") => {
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { cb(e.isIntersecting); if (once && e.isIntersecting) io.disconnect(); }), { rootMargin: margin });
    io.observe(el);
  };

  /* ---------- magic spotlight cards ---------- */
  const SPOT = ".bcard, .camp, .gbox, .board, .vm, .ai__chat, .pform, .ytcard, .countdown, .chat, .time, .vcard, .map-card, .tcard, .scard--more, .h3__stats, .nation-chips span";
  $$(SPOT).forEach((el) => {
    if (el.querySelector(":scope > .spot-fx")) return;
    el.classList.add("spot");
    const fx = document.createElement("span"); fx.className = "spot-fx"; el.appendChild(fx);
  });
  if (!isTouch) {
    document.addEventListener("pointermove", (e) => {
      const el = e.target.closest && e.target.closest(".spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }
  /* ---------- scroll progress ---------- */
  const sp = $(".sprog");
  if (sp) gsap.to(sp, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  /* ---------- border beams ---------- */
  $$(".gbox, .vcard, .bcard--live, .player").forEach((el) => {
    if (el.querySelector(":scope > .beam-fx")) return;
    el.classList.add("beam");
    const b = document.createElement("span"); b.className = "beam-fx"; el.appendChild(b);
  });

  /* ---------- bento: live floating comments ---------- */
  const bf = $(".js-bfloat");
  if (bf) {
    const people = [["Grace", "#FF5A1F", "Amen! 🙌"], ["Daniel", "#6E4BFF", "Watching from Salmiya"], ["Mariam", "#2ED3A0", "Needed this today ❤️"], ["Joel", "#FFC23D", "That worship set 🔥"], ["Anita", "#FF3D7F", "Praying with you all"]];
    let k = 0, live = false;
    onView(bf, (v) => (live = v));
    const push = () => {
      const [n, c, t] = people[k++ % people.length];
      const d = document.createElement("div");
      d.innerHTML = `<i style="background:${c}">${n[0]}</i><span><b>${n}</b> ${t}</span>`;
      bf.appendChild(d);
      gsap.from(d, { y: 16, opacity: 0, scale: 0.9, filter: "blur(6px)", duration: 0.7, ease: "expo.out" });
      while (bf.children.length > 3) { const f = bf.firstElementChild; gsap.to(f, { opacity: 0, y: -10, duration: 0.3, onComplete: () => f.remove() }); break; }
    };
    push(); push();
    setInterval(() => live && !document.hidden && push(), 2400);
  }

  /* ---------- bento: AI typing ---------- */
  const bt = $(".js-btype");
  if (bt) {
    const full = bt.dataset.text;
    let started = false;
    const run = () => {
      let i = 0; bt.textContent = "";
      const t = setInterval(() => { bt.textContent = full.slice(0, ++i); if (i >= full.length) { clearInterval(t); setTimeout(run, 4200); } }, 32);
    };
    onView(bt, (v) => { if (v && !started) { started = true; setTimeout(run, 400); } });
  }

  /* ---------- bento: prayer notifications (animated list) ---------- */
  const bl = $(".js-blist");
  if (bl) {
    const notes = [
      ["🙏", "#FF3D7F", "<b>12 people</b> are praying for you", "now"],
      ["❤️", "#FF5A1F", "<b>Priya</b> marked a prayer answered", "2m"],
      ["✨", "#B25BFF", "<b>Joseph</b> shared a request", "5m"],
      ["🕊️", "#2ED3A0", "<b>Anonymous</b> needs prayer tonight", "8m"],
      ["🙌", "#FFC23D", "<b>Ruth &amp; Ben</b>: baby is here!", "12m"],
    ];
    let k = 0, live = false;
    onView(bl, (v) => (live = v));
    const add = () => {
      const [e, c, t, when] = notes[k++ % notes.length];
      const d = document.createElement("div"); d.className = "bnote";
      d.innerHTML = `<i style="background:${c}22;box-shadow:inset 0 0 0 1px ${c}55">${e}</i><span>${t}</span><small>${when}</small>`;
      bl.prepend(d);
      gsap.from(d, { scale: 0.85, opacity: 0, y: -24, duration: 0.7, ease: "back.out(1.6)" });
      while (bl.children.length > 4) bl.lastElementChild.remove();
    };
    add(); add(); add();
    setInterval(() => live && !document.hidden && add(), 2200);
  }

  /* ---------- bento: animated beam (Magic UI) ---------- */
  const bb = $(".js-bbeam");
  if (bb) {
    const svg = $(".bbeam__svg", bb);
    const draw = () => {
      const R = bb.getBoundingClientRect();
      const c = (sel) => { const r = $(sel + ">*", bb).getBoundingClientRect(); return [r.left - R.left + r.width / 2, r.top - R.top + r.height / 2]; };
      const [a, b, d] = [c(".bnode--a"), c(".bnode--b"), c(".bnode--c")];
      const path = (p, q, bend) => `M${p[0]},${p[1]} Q${(p[0] + q[0]) / 2},${Math.min(p[1], q[1]) - bend} ${q[0]},${q[1]}`;
      svg.setAttribute("viewBox", `0 0 ${R.width} ${R.height}`);
      svg.innerHTML = `<defs><linearGradient id="bgA" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${R.width}" y2="0"><stop offset="0" stop-color="#FF3D7F"/><stop offset="1" stop-color="#2ED3A0"/></linearGradient></defs>
        ${[path(a, b, 30), path(b, d, 30)].map((p, i) => `<path d="${p}" stroke="rgba(255,255,255,.1)" stroke-width="2" fill="none"/><path class="bbeam__flow" d="${p}" stroke="url(#bgA)" stroke-width="2.5" fill="none" stroke-linecap="round" style="animation-delay:${i * 0.9}s"/>`).join("")}`;
    };
    const st = document.createElement("style");
    st.textContent = ".bbeam__flow{stroke-dasharray:60 400;stroke-dashoffset:60;animation:beamFlow 2.4s cubic-bezier(.5,0,.3,1) infinite;filter:drop-shadow(0 0 6px rgba(46,211,160,.8))}@keyframes beamFlow{to{stroke-dashoffset:-400}}";
    document.head.appendChild(st);
    draw(); addEventListener("resize", draw); setTimeout(draw, 600);
  }

  /* ---------- bento: course ring ---------- */
  const ring = $(".bring"), rv = $(".js-bring");
  if (ring) onView(ring, (v) => {
    if (!v) return;
    const o = { p: 0 };
    gsap.to(o, { p: 67, duration: 2, ease: "power3.out", onUpdate: () => { ring.style.setProperty("--p", o.p.toFixed(1)); rv.textContent = Math.round(o.p) + "%"; } });
  }, true);

  /* ---------- bento entrance ---------- */
  if (!reduce) gsap.from(".bcard", { y: 60, opacity: 0, filter: "blur(10px)", duration: 1.2, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".bento", start: "top 85%", once: true } });

  /* =========================================================
     GLOBE — dotted sphere + arcs from Kuwait (canvas 2D)
     ========================================================= */
  const cv = $(".globe__cv"), G = window.AGAPE_GLOBE;
  if (cv && G) {
    const NAMES = { IND: ["India", "🇮🇳"], KWT: ["Kuwait", "🇰🇼"], PHL: ["Philippines", "🇵🇭"], LKA: ["Sri Lanka", "🇱🇰"], NPL: ["Nepal", "🇳🇵"], PAK: ["Pakistan", "🇵🇰"], BGD: ["Bangladesh", "🇧🇩"], EGY: ["Egypt", "🇪🇬"], ETH: ["Ethiopia", "🇪🇹"], KEN: ["Kenya", "🇰🇪"], NGA: ["Nigeria", "🇳🇬"], GHA: ["Ghana", "🇬🇭"], UGA: ["Uganda", "🇺🇬"], USA: ["USA", "🇺🇸"], CAN: ["Canada", "🇨🇦"], GBR: ["UK", "🇬🇧"], AUS: ["Australia", "🇦🇺"], ZAF: ["South Africa", "🇿🇦"], IDN: ["Indonesia", "🇮🇩"], MYS: ["Malaysia", "🇲🇾"], ARE: ["UAE", "🇦🇪"], SAU: ["Saudi Arabia", "🇸🇦"], JOR: ["Jordan", "🇯🇴"], LBN: ["Lebanon", "🇱🇧"], SYR: ["Syria", "🇸🇾"], BRA: ["Brazil", "🇧🇷"], DEU: ["Germany", "🇩🇪"], FRA: ["France", "🇫🇷"], KOR: ["South Korea", "🇰🇷"], CHN: ["China", "🇨🇳"], SGP: ["Singapore", "🇸🇬"] };
    const nations = G.nations.filter((n) => n[0] !== "KWT");
    const chips = $(".js-nation-chips");
    if (chips) chips.innerHTML = nations.map((n) => `<span data-c="${n[0]}"><i>${(NAMES[n[0]] || ["", ""])[1]}</i>${(NAMES[n[0]] || [n[0]])[0]}</span>`).join("");
    const chipEls = chips ? $$("span", chips) : [];
    const rad = Math.PI / 180;
    const vec = (lat, lon) => [Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad), Math.cos(lat * rad) * Math.cos(lon * rad)];
    const D = G.dots, N = D.length / 2;
    const P = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const v = vec(D[i * 2], D[i * 2 + 1]); P[i * 3] = v[0]; P[i * 3 + 1] = v[1]; P[i * 3 + 2] = v[2]; }
    const home = vec(29.34, 47.98);
    const slerp = (a, b, t) => {
      const d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), s = Math.sin(d) || 1;
      const k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s;
      return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2, d];
    };
    const arcs = nations.map((n) => {
      const to = vec(n[1], n[2]); const pts = [];
      const d = slerp(home, to, 0.5)[3];
      for (let i = 0; i <= 48; i++) { const t = i / 48, p = slerp(home, to, t), h = 1 + Math.sin(Math.PI * t) * Math.min(0.42, 0.06 + d * 0.32); pts.push([p[0] * h, p[1] * h, p[2] * h]); }
      return { code: n[0], to, pts, born: -1 };
    });
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, R = 0;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); R = Math.min(W, H) * 0.42; };
    size(); addEventListener("resize", size);
    let yaw = -58 * rad, pitch = 26 * rad, vy = 0.0016, drag = false, lx = 0, ly = 0, vis = false;
    cv.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; yaw += dx * 0.006; pitch = Math.max(-1, Math.min(1, pitch + dy * 0.004)); vy = dx * 0.0008; });
    const up = () => (drag = false);
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    onView(cv, (v) => (vis = v));
    const rot = (x, y, z) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return [x1, y2, z2];
    };
    let active = 0, lastSpawn = 0;
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (!vis || document.hidden || !W) return;
      if (!drag) { yaw += reduce ? 0 : vy; vy += (0.0016 - vy) * 0.02; }
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cyy = H / 2;
      // sphere body + rim light
      const g = ctx.createRadialGradient(cx - R * 0.3, cyy - R * 0.35, R * 0.1, cx, cyy, R);
      g.addColorStop(0, "rgba(58,34,62,.95)"); g.addColorStop(0.7, "rgba(22,14,28,.98)"); g.addColorStop(1, "rgba(12,9,17,1)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cyy, R, 0, Math.PI * 2); ctx.fill();
      const rim = ctx.createRadialGradient(cx, cyy, R * 0.86, cx, cyy, R * 1.08);
      rim.addColorStop(0, "rgba(255,120,80,0)"); rim.addColorStop(0.55, "rgba(255,110,90,.22)"); rim.addColorStop(1, "rgba(178,91,255,0)");
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cyy, R * 1.08, 0, Math.PI * 2); ctx.fill();
      // land dots
      const ds = Math.max(1.6, R / 170);
      for (let i = 0; i < N; i++) {
        const r = rot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        if (r[2] <= 0) continue;
        const a = 0.28 + Math.pow(r[2], 0.6) * 0.72;
        ctx.fillStyle = `rgba(255,${(214 + r[2] * 30) | 0},${(200 + r[2] * 40) | 0},${a.toFixed(2)})`;
        ctx.fillRect(cx + r[0] * R - ds / 2, cyy - r[1] * R - ds / 2, ds, ds);
      }
      // arcs: spawn one every 700ms
      if (now - lastSpawn > 700) { lastSpawn = now; const a = arcs[active % arcs.length]; a.born = now; chipEls.forEach((c) => c.classList.toggle("is-on", c.dataset.c === a.code)); active++; }
      arcs.forEach((a) => {
        if (a.born < 0) return;
        const age = (now - a.born) / 1000;
        const grow = Math.min(1, age / 1.1);
        const n = Math.max(2, Math.round(grow * a.pts.length));
        const fresh = age < 3.2;
        ctx.lineWidth = fresh ? 1.8 : 1;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
          const r = rot(...a.pts[i]);
          if (r[2] < -0.05) { started = false; continue; }
          const x = cx + r[0] * R, y = cyy - r[1] * R;
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true;
        }
        const k = fresh ? 1 : 0.28;
        const lg = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        lg.addColorStop(0, `rgba(255,194,61,${k})`); lg.addColorStop(0.5, `rgba(255,90,31,${k})`); lg.addColorStop(1, `rgba(255,61,127,${k})`);
        ctx.strokeStyle = lg; ctx.stroke();
        // head + destination pulse
        const hd = rot(...a.pts[n - 1]);
        if (hd[2] > 0 && fresh) {
          const x = cx + hd[0] * R, y = cyy - hd[1] * R;
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
          if (grow >= 1) { const pr = ((age - 1.1) % 1.2) / 1.2; ctx.strokeStyle = `rgba(255,138,80,${1 - pr})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 3 + pr * 12, 0, Math.PI * 2); ctx.stroke(); }
        }
      });
      // home marker
      const h = rot(...home);
      if (h[2] > 0) {
        const x = cx + h[0] * R, y = cyy - h[1] * R, pr = (now % 1600) / 1600;
        ctx.fillStyle = `rgba(255,90,31,${0.35 * (1 - pr)})`; ctx.beginPath(); ctx.arc(x, y, 6 + pr * 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FF5A1F"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      }
    };
    requestAnimationFrame(frame);
  }
};
