/* =========================================================
   AGAPE v4 — global motion layer
   Letter-roll buttons, colour-flow page background,
   scroll-velocity skew, kinetic headings.
   Section engines (promos stack, days, cinema, library,
   prayer notes, jars, trail) register below.
   ========================================================= */
window.AgapeV4 = function (SITE) {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const onView = (el, cb, margin = "0px") => {
    if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin });
    io.observe(el);
  };
  const V4 = (window.AGAPE_V4 = { $, $$, reduce, isTouch, onView });

  /* ---------- letter roll ---------- */
  V4.roll = (el) => {
    if (!el || el.dataset.rolled) return;
    el.dataset.rolled = 1;
    const t = el.textContent;
    el.setAttribute("aria-label", t);
    el.innerHTML = `<span class="roll" aria-hidden="true">${[...t].map((c, i) => `<i style="--i:${i}" data-c="${c === " " ? " " : c.replace(/"/g, "&quot;")}">${c === " " ? "&nbsp;" : c}</i>`).join("")}</span>`;
  };
  $$("[data-roll]").forEach(V4.roll);

  /* ---------- colour-flow background ---------- */
  document.body.dataset.tone = "dark";
  const root = document.documentElement;
  let bgNow = getComputedStyle(root).getPropertyValue("--page-bg").trim() || "#0B0710";
  const bgTween = { t: 0 };
  const setBg = (c) => {
    const lerp = gsap.utils.interpolate(bgNow, c);
    bgTween.t = 0;
    gsap.to(bgTween, { t: 1, duration: 0.9, ease: "power2.out", overwrite: true, onUpdate: () => { bgNow = lerp(bgTween.t); root.style.setProperty("--page-bg", bgNow); } });
  };
  $$("[data-page-bg]").forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 55%",
      onToggle: (s) => { if (s.isActive) { setBg(sec.dataset.pageBg); document.body.dataset.tone = sec.dataset.tone || "dark"; } },
    });
  });

  /* ---------- scroll-velocity skew on marked media ---------- */
  if (!reduce) {
    const skewEls = $$("[data-skew]");
    if (skewEls.length) {
      const proxy = { s: 0 };
      const setters = skewEls.map((el) => gsap.quickSetter(el, "skewY", "deg"));
      ScrollTrigger.create({
        onUpdate: (self) => {
          const s = gsap.utils.clamp(-6, 6, self.getVelocity() / -400);
          if (Math.abs(s) > Math.abs(proxy.s)) {
            proxy.s = s;
            gsap.to(proxy, { s: 0, duration: 0.8, ease: "power3", overwrite: true, onUpdate: () => setters.forEach((f) => f(proxy.s)) });
          }
        },
      });
    }
  }

  /* ---------- section engines ---------- */
  (window.AGAPE_V4_ENGINES || []).forEach((fn) => { try { fn(SITE, V4); } catch (e) { console.warn("[agape v4]", e); } });
  // triggers were created out of DOM order (engines run after main.js) — sort so pin spacing is accounted for top-down
  const elOf = (st) => { const t = st.trigger || (st.vars && st.vars.trigger); return t && t.nodeType === 1 ? t : null; };
  ScrollTrigger.sort((a, b) => {
    const ea = elOf(a), eb = elOf(b);
    if (!ea || !eb) return (ea ? -1 : 1) - (eb ? -1 : 1);
    if (ea === eb) return 0;
    const p = ea.compareDocumentPosition(eb);
    if (p & Node.DOCUMENT_POSITION_CONTAINED_BY) return -1;
    if (p & Node.DOCUMENT_POSITION_CONTAINS) return 1;
    return p & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  ScrollTrigger.refresh();
};

/* =========================================================
   ENGINE: promo poster stack (pinned, scrubbed)
   ========================================================= */
(window.AGAPE_V4_ENGINES = window.AGAPE_V4_ENGINES || []).push(function promoStack() {
  const { $, $$, reduce, isTouch } = window.AGAPE_V4;
  const sec = $(".pstack"), cards = $$(".poster"), n = cards.length;
  if (!sec || !n) return;
  const bars = $$(".js-pbars b"), num = $(".js-pnum");
  let last = -1;
  const setProg = (p) => {
    const k = p * (n - 1);
    bars.forEach((b, i) => b.style.setProperty("--f", i === 0 ? 1 : Math.max(0, Math.min(1, k - i + 1)).toFixed(3)));
    const idx = Math.min(n - 1, Math.round(k));
    if (idx !== last) { last = idx; if (num) num.textContent = String(idx + 1).padStart(2, "0"); cards.forEach((c, i) => c.classList.toggle("is-front", i === idx)); }
  };
  if (reduce || n < 2) { setProg(1); return; }
  gsap.set(cards, { yPercent: (i) => (i ? 118 : 0), rotate: (i) => (i ? 6 : 0), transformPerspective: 1400 });
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec, start: "top top", end: () => "+=" + (n - 1) * innerHeight * 0.95, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (s) => setProg(s.progress),
    },
  });
  cards.forEach((c, i) => {
    if (!i) return;
    tl.to(c, { yPercent: 0, rotate: 0, duration: 1, ease: "power1.out" }, i - 1);
    cards.slice(0, i).forEach((prev, j) => {
      const depth = i - j;
      tl.to(prev, { scale: 1 - depth * 0.045, yPercent: -depth * 3.2, "--dim": Math.min(0.55, depth * 0.22), duration: 1 }, i - 1);
    });
  });
  setProg(0);
  // tilt + glare on the front card
  if (!isTouch) {
    cards.forEach((c) => {
      const rx = gsap.quickTo(c, "rotationX", { duration: 0.9, ease: "power3" });
      const ry = gsap.quickTo(c, "rotationY", { duration: 0.9, ease: "power3" });
      c.addEventListener("pointermove", (e) => {
        if (!c.classList.contains("is-front")) return;
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        rx((0.5 - y) * 4); ry((x - 0.5) * 5);
        c.style.setProperty("--gx", x * 100 + "%"); c.style.setProperty("--gy", y * 100 + "%");
      });
      c.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }
});

/* =========================================================
   ENGINE: a week at Agape — pinned horizontal track
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function weekScroll() {
  const { $, $$, reduce, onView } = window.AGAPE_V4;
  const sec = $(".week"), track = $(".week__track");
  if (!sec || !track) return;
  const bar = $(".week__bar i");
  const amount = () => Math.max(0, track.scrollWidth - innerWidth);
  let tween = null;
  if (!reduce) {
    tween = gsap.to(track, {
      x: () => -amount(), ease: "none",
      scrollTrigger: { trigger: sec, start: "top top", end: () => "+=" + amount(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (s) => bar && (bar.style.transform = `scaleX(${s.progress})`), onToggle: (s) => bar && bar.parentElement.classList.toggle("is-on", s.isActive) },
    });
    $$(".day", track).forEach((d) => {
      const img = $(".day__media img", d), name = $(".day__name", d), media = $(".day__media", d), txt = $(".day__txt", d);
      const opt = (start = "left right", end = "right left") => ({ trigger: d, containerAnimation: tween, start, end, scrub: true });
      if (img) gsap.fromTo(img, { xPercent: -9 }, { xPercent: 9, ease: "none", scrollTrigger: opt() });
      if (name) gsap.fromTo(name, { xPercent: -18 }, { xPercent: 12, ease: "none", scrollTrigger: opt() });
      if (media) gsap.fromTo(media, { rotate: 6, scale: 0.86 }, { rotate: 0, scale: 1, ease: "power2.out", scrollTrigger: opt("left 95%", "left 35%") });
      if (txt) gsap.from(txt.children, { y: 60, opacity: 0, stagger: 0.08, ease: "power3.out", scrollTrigger: opt("left 80%", "left 30%") });
    });
    const intro = $(".week__intro");
    if (intro) gsap.from($$(":scope > *", intro), { y: 50, opacity: 0, stagger: 0.1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: sec, start: "top 70%", once: true } });
  }
  const ring = $(".dw-ring__c"), ringV = $(".js-dw-ring");
  if (ring) onView(ring, (x) => { if (!x || ring.dataset.done) return; ring.dataset.done = 1; const o = { p: 0 }; gsap.to(o, { p: 67, duration: 2, ease: "power3.out", onUpdate: () => { ring.style.setProperty("--p", o.p.toFixed(1)); ringV.textContent = Math.round(o.p) + "%"; } }); });
  const ty = $(".js-dw-type");
  if (ty) {
    const full = ty.dataset.text; let started = false;
    const run = () => { let i = 0; ty.textContent = ""; const t = setInterval(() => { ty.textContent = full.slice(0, ++i); if (i >= full.length) { clearInterval(t); setTimeout(run, 3800); } }, 38); };
    onView(ty, (x) => { if (x && !started) { started = true; run(); } });
  }
});

/* =========================================================
   ENGINE: cinema — player expands to full-bleed on scroll
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function cinema() {
  const { $, $$, reduce } = window.AGAPE_V4;
  const sec = $(".cine"), frame = $(".cine__frame");
  if (!sec || !frame || reduce) return;
  const mob = innerWidth < 900;
  const small = mob ? "inset(40% 5% 14% 5% round 28px)" : "inset(38% 24% 8% 24% round 40px)";
  const ui = $$(".player__top, .player__bottom, .cine__chat", frame);
  const FULL = "inset(0% 0% 0% 0% round 0px)";
  gsap.set(ui, { opacity: 0, y: 30 });
  gsap.set($(".player__img", frame), { scale: 1.3 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: "top top", end: "+=" + innerHeight * 1.2, pin: ".cine__pin", scrub: 0.8, anticipatePin: 1 } });
  tl.fromTo(frame, { clipPath: small }, { clipPath: FULL, ease: "power2.inOut", duration: 1, immediateRender: true }, 0)
    .to($(".player__img", frame), { scale: 1.02, ease: "power2.inOut", duration: 1 }, 0)
    .to(".cine__head", { y: -120, opacity: 0, ease: "power2.in", duration: 0.55 }, 0.05)
    .to(".player__play", { scale: 1.15, duration: 1 }, 0)
    .to(ui, { opacity: 1, y: 0, stagger: 0.06, duration: 0.35, ease: "power2.out" }, 0.62);
  gsap.from(".cine__head > *", { y: 50, opacity: 0, stagger: 0.1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: sec, start: "top 75%", once: true } });
});

/* =========================================================
   ENGINE: sermon library — convex 3D cylinder with inertia
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function library() {
  const { $, $$, reduce, isTouch, onView } = window.AGAPE_V4;
  const stage = $(".lib__stage"), ring = $(".js-lib-ring");
  if (!stage || !ring) return;
  const cards = $$(".lcard", ring), n = cards.length;
  const S = { rot: 0, vel: reduce ? 0 : 0.06, auto: reduce ? 0 : 0.06, drag: false, tilt: -5, R: 600, vis: false, target: null };
  const layout = () => {
    const mob = innerWidth < 900;
    const cw = mob ? 190 : Math.max(210, Math.min(270, innerWidth * 0.17)), ch = Math.round(cw * 1.36);
    ring.style.setProperty("--cw", cw + "px"); ring.style.setProperty("--ch", ch + "px");
    S.R = (n * (cw + (mob ? 18 : 30))) / (2 * Math.PI);
    cards.forEach((c, i) => { c.dataset.a = (360 / n) * i; c.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${S.R}px)`; });
  };
  layout(); addEventListener("resize", layout);
  onView(stage, (v) => (S.vis = v), "100px");
  let lx = 0, lt = 0, moved = 0;
  stage.addEventListener("pointerdown", (e) => { S.drag = true; S.target = null; moved = 0; lx = e.clientX; lt = performance.now(); stage.classList.add("is-drag"); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", (e) => {
    if (!isTouch) S.tilt = ((e.clientY - stage.getBoundingClientRect().top) / stage.clientHeight - 0.5) * -8;
    if (!S.drag) return;
    const dx = e.clientX - lx, now = performance.now();
    moved += Math.abs(dx);
    S.rot -= dx * 0.16; S.vel = (-dx * 0.16) / Math.max(1, (now - lt) / 16.7);
    lx = e.clientX; lt = now;
  });
  const end = () => { S.drag = false; stage.classList.remove("is-drag"); };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  stage.addEventListener("click", (e) => { const c = e.target.closest(".lcard"); if (!c) return; e.preventDefault(); if (moved > 8) return; const url = (window.AGAPE_SITE && window.AGAPE_SITE.church.youtube) || "#"; window.open(url, "_blank", "noopener"); }, true);
  let boost = 0;
  ScrollTrigger.create({ trigger: stage, start: "top bottom", end: "bottom top", onUpdate: (s) => (boost = s.getVelocity() / 1400) });
  const norm = (a) => ((a % 360) + 540) % 360 - 180;
  gsap.ticker.add(() => {
    if (!S.vis || document.hidden) return;
    if (S.target != null && !S.drag) {
      const d = norm(S.target - S.rot);
      S.rot += d * 0.08; S.vel = 0;
      if (Math.abs(d) < 0.2) { S.target = null; S.vel = 0; }
    } else if (!S.drag) {
      S.vel += (S.auto + boost * 0.4 - S.vel) * 0.025; S.rot += S.vel;
    }
    boost *= 0.9;
    ring.style.transform = `translateZ(${-S.R}px) rotateX(${S.tilt}deg) rotateY(${-S.rot}deg)`;
    cards.forEach((c) => {
      const a = norm(+c.dataset.a - S.rot);
      const k = Math.cos((a * Math.PI) / 180);
      c.style.opacity = k < -0.1 ? 0 : Math.min(1, 0.25 + k * 0.9).toFixed(3);
    });
  });
  // filters rotate to first match
  $$(".lib__chips .fchip").forEach((chip) => chip.addEventListener("click", () => {
    $$(".lib__chips .fchip").forEach((c) => c.classList.toggle("is-on", c === chip));
    const q = chip.textContent.trim().toLowerCase();
    let first = null;
    cards.forEach((c) => { const m = q === "all" || c.dataset.book === q; c.classList.toggle("is-dim", !m); if (m && first == null) first = +c.dataset.a; });
    if (q !== "all" && first != null) { S.target = first; S.auto = 0; setTimeout(() => (S.auto = reduce ? 0 : 0.06), 4000); }
  }));
  gsap.from(".lib__head > *", { y: 50, opacity: 0, stagger: 0.1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".lib", start: "top 75%", once: true } });
  gsap.from(stage, { scale: 0.8, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: stage, start: "top 85%", once: true } });
});

/* ENGINE: ride map cursor light */
window.AGAPE_V4_ENGINES.push(function rideLight() {
  const { $, isTouch } = window.AGAPE_V4;
  const m = $(".rides--full .map-card");
  if (!m || isTouch) return;
  $(".rides--full").addEventListener("pointermove", (e) => { const r = m.getBoundingClientRect(); m.style.setProperty("--mx", e.clientX - r.left + "px"); m.style.setProperty("--my", e.clientY - r.top + "px"); });
});

/* =========================================================
   ENGINE: Verse Match — drag word tiles into the blanks
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function dragGame() {
  const { $, $$, reduce } = window.AGAPE_V4;
  const opts = $(".js-opts"), verse = $(".js-verse");
  if (!opts || !verse || !window.Draggable) return;
  gsap.registerPlugin(Draggable, InertiaPlugin);
  const arm = () => {
    $$("button", opts).forEach((b) => {
      if (b._drag) return;
      b._drag = Draggable.create(b, {
        type: "x,y", dragClickables: true, zIndexBoost: true, minimumMovement: 6,
        onPress() { gsap.killTweensOf(b); },
        onDragStart() { b.classList.add("is-dragging"); },
        onDrag() { const t = $(".blank.is-next", verse); if (t) t.classList.toggle("is-hot", this.hitTest(t, "30%")); },
        onDragEnd() {
          b.classList.remove("is-dragging");
          const t = $(".blank.is-next", verse);
          const hit = t && this.hitTest(t, "30%");
          if (t) t.classList.remove("is-hot");
          gsap.to(b, { x: 0, y: 0, duration: hit ? 0.01 : 0.6, ease: "elastic.out(1,0.6)" });
          if (hit) b.click();
        },
      })[0];
    });
  };
  new MutationObserver(arm).observe(opts, { childList: true });
  arm();
  // underline draw on the headline
  const em = $(".games--v4 .h2 em");
  if (em && !reduce) gsap.fromTo(em, { "--ul": 0 }, { "--ul": 1, duration: 1.2, ease: "expo.inOut", scrollTrigger: { trigger: em, start: "top 80%", once: true } });
  // throwable stickers
  const sec = $(".games--v4");
  $$(".games--v4 .gs").forEach((g) => Draggable.create(g, { type: "x,y", inertia: true, bounds: sec, edgeResistance: 0.8, onPress() { gsap.to(g, { scale: 1.12, duration: 0.2 }); }, onRelease() { gsap.to(g, { scale: 1, duration: 0.4, ease: "back.out(3)" }); } }));
});

/* =========================================================
   ENGINE: giving jars — sloshing liquid fill (canvas)
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function jars() {
  const { $$, reduce, isTouch } = window.AGAPE_V4;
  const list = $$(".jar");
  if (!list.length) return;
  const hexA = (hex, a) => { const h = hex.replace("#", ""); const v = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
  list.forEach((jar) => {
    const cv = jar.querySelector(".jar__cv"), ctx = cv.getContext("2d"), pctEl = jar.querySelector(".jar__pct b");
    const color = getComputedStyle(jar).getPropertyValue("--c").trim() || "#FF5A1F";
    const target = parseFloat(jar.dataset.p) || 0;
    const S = { level: 0, tilt: 0, tiltT: 0, amp: 1, vis: false, t: 0 };
    let W = 0, H = 0, dpr = 1;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener("resize", size);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      S.vis = e.isIntersecting;
      if (e.isIntersecting && !jar.dataset.filled) {
        jar.dataset.filled = 1;
        gsap.to(S, { level: target / 100, duration: reduce ? 0 : 2.6, ease: "power2.out", onUpdate: () => (pctEl.textContent = Math.round(S.level * 100)) });
        S.amp = 3; gsap.to(S, { amp: 1, duration: 3, ease: "power2.out" });
      }
    }), { rootMargin: "0px 0px -10% 0px" });
    io.observe(jar);
    // slosh with the cursor
    let lx = null;
    if (!isTouch) jar.addEventListener("pointermove", (e) => { if (lx != null) { S.tiltT = Math.max(-0.35, Math.min(0.35, S.tiltT + (e.clientX - lx) * 0.01)); S.amp = Math.min(3, S.amp + Math.abs(e.clientX - lx) * 0.02); } lx = e.clientX; });
    jar.addEventListener("pointerleave", () => { lx = null; S.tiltT = 0; });
    jar.addEventListener("click", () => { S.amp = 3.2; S.tiltT = (Math.random() - 0.5) * 0.5; setTimeout(() => (S.tiltT = 0), 500); });
    gsap.ticker.add((time, dt) => {
      if (!S.vis || !W) return;
      S.t += dt / 1000;
      S.tilt += (S.tiltT - S.tilt) * 0.06; S.tiltT *= 0.97; S.amp += (1 - S.amp) * 0.02;
      ctx.clearRect(0, 0, W, H);
      const base = H * (1 - S.level);
      const wave = (off, speed, a, col) => {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
          const y = base + Math.sin(x * 0.035 + S.t * speed + off) * a * S.amp + (x - W / 2) * S.tilt;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      };
      if (S.level > 0.001) {
        wave(2, 1.6, 6, hexA(color, 0.45));
        const g = ctx.createLinearGradient(0, base, 0, H);
        g.addColorStop(0, hexA(color, 1)); g.addColorStop(1, hexA(color, 0.75));
        wave(0, 2.2, 5, g);
        // bubbles
        ctx.fillStyle = "rgba(255,255,255,.35)";
        for (let i = 0; i < 6; i++) { const bx = ((i * 97 + 30) % W), by = H - ((S.t * (18 + i * 5) + i * 60) % Math.max(1, H - base)); if (by > base + 8) { ctx.beginPath(); ctx.arc(bx, by, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill(); } }
      }
    });
  });
});

/* =========================================================
   ENGINE: gallery image trail (cursor, or auto-path on touch)
   ========================================================= */
window.AGAPE_V4_ENGINES.push(function imageTrail() {
  const { $, $$, reduce, isTouch, onView } = window.AGAPE_V4;
  const stage = $(".trail"), box = $(".js-trail");
  if (!stage || !box) return;
  const srcs = [...new Set($$(".gallery .gphoto img").map((i) => i.getAttribute("src")).filter(Boolean))];
  if (!srcs.length) return;
  const POOL = 14;
  const imgs = Array.from({ length: POOL }, (_, i) => { const im = document.createElement("img"); im.className = "trail__img"; im.alt = ""; im.decoding = "async"; im.src = srcs[i % srcs.length]; box.appendChild(im); return im; });
  let k = 0, z = 1, lx = null, ly = null, vis = false;
  const spawn = (x, y, dx = 0, dy = 0) => {
    const im = imgs[k % POOL]; k++;
    im.src = srcs[k % srcs.length];
    const w = im.offsetWidth || 220, h = im.offsetHeight || 290;
    gsap.killTweensOf(im);
    gsap.set(im, { x: x - w / 2, y: y - h / 2, zIndex: z++, opacity: 1, scale: 0.5, rotation: (Math.random() - 0.5) * 18 });
    gsap.timeline()
      .to(im, { scale: 1, x: x - w / 2 + dx * 0.4, y: y - h / 2 + dy * 0.4, duration: 0.6, ease: "expo.out" })
      .to(im, { opacity: 0, scale: 0.3, y: `+=${80 + Math.random() * 60}`, duration: 0.9, ease: "power3.in" }, 0.55);
  };
  const TH = innerWidth < 900 ? 70 : 95;
  if (!isTouch && !reduce) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (lx == null) { lx = x; ly = y; return; }
      const d = Math.hypot(x - lx, y - ly);
      if (d > TH) { spawn(x, y, x - lx, y - ly); lx = x; ly = y; }
    });
    stage.addEventListener("pointerleave", () => (lx = null));
  } else if (!reduce) {
    const hint = $(".js-trail-hint"); if (hint) hint.textContent = "Tap anywhere";
    onView(stage, (v) => (vis = v));
    let t = 0, last = { x: 0, y: 0 };
    setInterval(() => {
      if (!vis || document.hidden) return;
      t += 0.16;
      const W = stage.clientWidth, H = stage.clientHeight;
      const x = W / 2 + Math.cos(t * 0.8) * W * 0.4, y = H / 2 + Math.sin(t * 0.8) * H * 0.4;
      spawn(x, y, x - last.x, y - last.y); last = { x, y };
    }, 420);
    stage.addEventListener("click", (e) => { const r = stage.getBoundingClientRect(); for (let i = 0; i < 4; i++) setTimeout(() => spawn(e.clientX - r.left + (Math.random() - 0.5) * 120, e.clientY - r.top + (Math.random() - 0.5) * 120), i * 70); });
  }
  gsap.from(".trail__h > *", { yPercent: 100, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: stage, start: "top 60%", once: true } });
});
