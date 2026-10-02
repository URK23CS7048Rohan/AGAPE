/* =========================================================
   AGAPE INTERNATIONAL — Interactions & motion
   GSAP 3 (ScrollTrigger, ScrollSmoother, SplitText)
   ========================================================= */
window.AgapeBoot = (SITE) => {
  "use strict";
  if (window.__agapeBooted) return;
  window.__agapeBooted = true;

  /* ---------- Church config (comes from content / admin) ---------- */
  const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const p2 = (n) => String(n).padStart(2, "0");
  const CONFIG = {
    youtubeChannelId: SITE.church.youtubeChannelId,
    youtubeUrl: SITE.church.youtube,
    tzOffsetHours: Number(SITE.church.tzOffsetHours) || 0,
    services: (SITE.services || []).map((sv) => ({ day: +sv.day, h: +sv.h, m: +sv.m, label: `${sv.label} · ${sv.time}`, name: sv.label, short: `${SHORT[+sv.day]} ${p2(sv.h)}:${p2(sv.m)}` })),
    serviceLengthMin: 90,
    currency: SITE.church.currency,
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const isDesktop = () => innerWidth > 900;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  document.documentElement.classList.add("js");
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  gsap.config({ nullTargetWarn: false });

  /* In-view helper: runs cb(true/false) as element enters/leaves */
  const watch = (el, cb, margin = "0px") => {
    if (!el) return;
    const io = new IntersectionObserver((ents) => ents.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin });
    io.observe(el);
  };

  /* =======================================================
     SMOOTH SCROLL
     ======================================================= */

  let smoother = null;
  if (!reduce && !isTouch && isDesktop()) {
    smoother = ScrollSmoother.create({ wrapper: "#smooth-wrapper", content: "#smooth-content", smooth: 1.15, effects: true });
  }

  const scrollToTarget = (hash) => {
    const t = hash === "#top" ? document.body : $(hash);
    if (!t) return;
    if (smoother) smoother.scrollTo(hash === "#top" ? 0 : t, true, "top 90px");
    else if (hash === "#top") scrollTo({ top: 0, behavior: "smooth" });
    else scrollTo({ top: t.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    if (hash.length < 2) { e.preventDefault(); return; }
    e.preventDefault();
    document.body.classList.remove("menu-open");
    scrollToTarget(hash);
  });

  /* =======================================================
     NAV + MENU
     ======================================================= */
  const nav = $(".nav");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      if (document.body.classList.contains("menu-open")) return;
      nav.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 240);
      nav.classList.toggle("is-solid", self.scroll() > 40);
    },
  });
  $(".nav__burger").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $(".nav__burger").setAttribute("aria-expanded", open);
    $(".menu").setAttribute("aria-hidden", !open);
    if (smoother) smoother.paused(open);
  });

  /* =======================================================
     CURSOR + MAGNETIC
     ======================================================= */
  if (!isTouch) {
    const cur = $(".cursor"), label = $(".cursor__label");
    const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
    gsap.set(cur, { opacity: 0 });
    let shown = false;
    addEventListener("mousemove", (e) => { if (!shown) { shown = true; gsap.set(cur, { x: e.clientX, y: e.clientY }); gsap.to(cur, { opacity: 1, duration: 0.3 }); } xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener("mouseover", (e) => {
      const big = e.target.closest("[data-cursor]");
      const link = e.target.closest("a,button,input,textarea,label");
      if (big && !link) { cur.classList.add("is-big"); cur.classList.remove("is-link"); label.textContent = big.dataset.cursor; }
      else if (link) { cur.classList.add("is-link"); cur.classList.remove("is-big"); }
      else cur.classList.remove("is-big", "is-link");
    });
    document.addEventListener("mouseleave", () => gsap.to(cur, { opacity: 0 }));
    document.addEventListener("mouseenter", () => gsap.to(cur, { opacity: 1 }));

    $$("[data-magnetic]").forEach((el) => {
      const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1,0.4)" });
      const my = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1,0.4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.22);
        my((e.clientY - r.top - r.height / 2) * 0.32);
      });
      el.addEventListener("mouseleave", () => { mx(0); my(0); });
    });
  }

  /* =======================================================
     HERO v4 — WebGL poster: liquid cursor lens, RGB split,
     noise-displacement slideshow, variable-font proximity type
     ======================================================= */
  const heroEl = $(".hx");
  const hxImgs = $$(".js-hero-slides img");
  const slideCaps = hxImgs.map((im) => im.dataset.caption || im.alt || "");
  const HX = { idx: 0, n: Math.max(1, hxImgs.length), gl: null, timer: null, prog: 0 };
  const hxIdxEl = $(".js-hx-idx"), hxTotEl = $(".js-hx-total");
  if (hxTotEl) hxTotEl.textContent = String(HX.n).padStart(2, "0");

  // thumbnails
  const thumbsWrap = $(".js-hx-thumbs");
  if (thumbsWrap && hxImgs.length > 1) {
    thumbsWrap.innerHTML = `<span class="hx__cap js-hx-cap"></span>` + hxImgs.map((im, i) => `<button class="hxt" data-i="${i}" aria-label="Show photo ${i + 1}"><img src="${im.getAttribute("src")}" alt="" /><span class="hxt__bar"><i></i></span></button>`).join("");
  }
  const thumbs = $$(".hxt");
  const capEl = $(".js-hx-cap");

  const hxShow = (i) => {
    HX.idx = i;
    if (hxIdxEl) hxIdxEl.textContent = String(i + 1).padStart(2, "0");
    thumbs.forEach((t, k) => t.classList.toggle("is-on", k === i));
    if (capEl) capEl.textContent = slideCaps[i] || "";
    if (!HX.gl) hxImgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
  };
  const SLIDE_MS = 6500;
  let slideT0 = performance.now(), slidePaused = false, heroVis = true;
  const nextSlide = (to) => {
    const target = to == null ? (HX.idx + 1) % HX.n : to;
    if (target === HX.idx) return;
    if (HX.gl) HX.gl.go(target); else hxShow(target);
    hxShow(target);
    slideT0 = performance.now();
  };
  thumbs.forEach((t) => t.addEventListener("click", () => nextSlide(+t.dataset.i)));
  gsap.ticker.add(() => {
    if (HX.n < 2 || !heroVis || document.hidden || slidePaused) { slideT0 += gsap.ticker.deltaRatio() * 16.67; return; }
    const p = Math.min(1, (performance.now() - slideT0) / SLIDE_MS);
    heroEl.style.setProperty("--hxp", p.toFixed(3));
    const bar = thumbs[HX.idx] && thumbs[HX.idx].querySelector("i");
    if (bar) bar.style.transform = `scaleX(${p})`;
    thumbs.forEach((t, k) => { if (k !== HX.idx) t.querySelector("i").style.transform = "scaleX(0)"; });
    if (p >= 1) nextSlide();
  });
  watch(heroEl, (v) => (heroVis = v));

  // ---------- WebGL ----------
  const startHeroGL = () => {
    const cv = $(".hx__gl");
    if (!cv || reduce || !hxImgs.length) return null;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl) return null;
    const vs = "attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    const fs = `precision highp float;
varying vec2 vUv;
uniform sampler2D uA,uB;
uniform vec2 uR,uSA,uSB,uM;
uniform float uP,uT,uV,uH,uZ;
vec2 cover(vec2 uv,vec2 img){float rs=uR.x/uR.y,ri=img.x/img.y;vec2 s=rs<ri?vec2(rs/ri,1.):vec2(1.,ri/rs);return clamp((uv-.5)*s+.5,.001,.999);}
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
vec3 samp(sampler2D t,vec2 uv,vec2 sz,vec2 s){return vec3(texture2D(t,cover(uv+s,sz)).r,texture2D(t,cover(uv,sz)).g,texture2D(t,cover(uv-s,sz)).b);}
void main(){
  vec2 uv=vUv;
  vec2 asp=vec2(uR.x/uR.y,1.);
  vec2 d=(uv-uM)*asp;
  float dist=length(d);
  vec2 dir=dist>1e-4?d/dist:vec2(0.);
  float lens=exp(-dist*dist*22.)*uH;
  float ring=sin(dist*34.-uT*5.5)*exp(-dist*6.)*uV;
  vec2 off=dir/asp*(-lens*.028+ring*.012);
  vec2 liquid=vec2(fbm(uv*2.2+uT*.05),fbm(uv*2.2-uT*.045+7.3))-.5;
  off+=liquid*.012;
  vec2 z=(uv-.5)/uZ+.5+off;
  vec2 rgb=dir/asp*(lens*.003+uV*.009)*(1.-exp(-dist*9.))+vec2(.0012,0.)*uV;
  float nn=fbm(uv*3.1+1.7);
  float m=smoothstep(nn-.18,nn+.18,uP*1.36-.18);
  vec2 za=z+liquid*uP*.35+vec2(0.,uP*.05);
  vec2 zb=z-liquid*(1.-uP)*.35-vec2(0.,(1.-uP)*.05);
  vec3 ca=samp(uA,za,uSA,rgb);
  vec3 cb=samp(uB,zb,uSB,rgb);
  vec3 c=mix(ca,cb,m);
  float seam=smoothstep(.0,.5,m)*smoothstep(1.,.5,m);
  c+=vec3(1.,.42,.18)*seam*.55*step(.001,uP)*step(uP,.999);
  c=mix(c,c*vec3(1.06,.98,.94),.6);
  c=(c-.5)*1.06+.5;
  c+=vec3(1.,.55,.3)*lens*.06;
  float vig=smoothstep(1.25,.35,length((uv-.5)*vec2(1.1,1.3)));
  c*=mix(.72,1.,vig);
  c+=(h(gl_FragCoord.xy+fract(uT)*91.)-.5)*.035;
  gl_FragColor=vec4(c,1.);
}`;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(o)); return null; } return o; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ["uA", "uB", "uR", "uSA", "uSB", "uM", "uP", "uT", "uV", "uH", "uZ"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);
    const tex = hxImgs.map(() => ({ t: gl.createTexture(), w: 1, h: 1, ok: false }));
    const upload = (i) => {
      const im = hxImgs[i], T = tex[i];
      if (!im.complete || !im.naturalWidth) return false;
      gl.bindTexture(gl.TEXTURE_2D, T.t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); } catch (e) { return false; }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      T.w = im.naturalWidth; T.h = im.naturalHeight; T.ok = true;
      return true;
    };
    hxImgs.forEach((im, i) => { im.decoding = "sync"; if (!upload(i)) { im.addEventListener("load", () => upload(i), { once: true }); } });
    const DPR = Math.min(devicePixelRatio || 1, innerWidth < 900 ? 1.25 : 1.5);
    const size = () => { cv.width = Math.max(2, Math.round(cv.clientWidth * DPR)); cv.height = Math.max(2, Math.round(cv.clientHeight * DPR)); gl.viewport(0, 0, cv.width, cv.height); };
    size(); addEventListener("resize", size);
    const st = { a: 0, b: 0, p: 0, mx: 0.5, my: 0.45, tx: 0.5, ty: 0.45, vel: 0, hov: 0, thov: 0, zoom: 1.08, scroll: 0 };
    let lx = 0, ly = 0, lt = performance.now();
    heroEl.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      st.tx = (e.clientX - r.left) / r.width; st.ty = 1 - (e.clientY - r.top) / r.height;
      const now = performance.now(), dt = Math.max(8, now - lt);
      const sp = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;
      st.vel = Math.min(1, st.vel + sp * 0.12); lx = e.clientX; ly = e.clientY; lt = now;
      st.thov = 1;
    });
    heroEl.addEventListener("pointerleave", () => (st.thov = 0));
    heroEl.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); st.tx = st.mx = (e.clientX - r.left) / r.width; st.ty = st.my = 1 - (e.clientY - r.top) / r.height; st.vel = 1; });
    const go = (to) => {
      if (!tex[to] || !tex[to].ok) upload(to);
      gsap.killTweensOf(st, "p");
      if (st.p > 0) { st.a = st.b; }
      st.b = to; st.p = 0;
      gsap.to(st, { p: 1, duration: 1.9, ease: "power2.inOut", onComplete: () => { st.a = st.b; st.p = 0; } });
    };
    const t0 = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!heroVis || document.hidden) return;
      st.mx += (st.tx - st.mx) * 0.08; st.my += (st.ty - st.my) * 0.08;
      st.hov += (st.thov - st.hov) * 0.05; st.vel *= 0.955;
      const A = tex[st.a], B = tex[st.b];
      if (!A.ok) return;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (B.ok ? B : A).t);
      gl.uniform2f(U.uR, cv.width, cv.height);
      gl.uniform2f(U.uSA, A.w, A.h); gl.uniform2f(U.uSB, (B.ok ? B : A).w, (B.ok ? B : A).h);
      gl.uniform2f(U.uM, st.mx, st.my);
      gl.uniform1f(U.uP, B.ok ? st.p : 0);
      gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.uniform1f(U.uV, st.vel);
      gl.uniform1f(U.uH, st.hov);
      gl.uniform1f(U.uZ, st.zoom + Math.sin((now - t0) / 9000) * 0.02 - st.scroll * 0.06);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!heroEl.classList.contains("gl-on")) heroEl.classList.add("gl-on");
    };
    requestAnimationFrame(loop);
    return { go, st };
  };
  HX.gl = startHeroGL();
  hxShow(0);

  // ---------- variable-font proximity headline ----------
  const l1 = $(".hx__l1");
  let proxLetters = [];
  if (l1) {
    const txt = l1.textContent;
    l1.setAttribute("aria-label", txt);
    l1.innerHTML = [...txt].map((c) => `<span class="pl-mask" aria-hidden="true"><span class="pl">${c === " " ? "&nbsp;" : c}</span></span>`).join("");
    proxLetters = $$(".pl", l1).map((el) => ({ el, w: 75, g: 800, y: 0 }));
    let px = -9999, py = -9999, active = false;
    if (!isTouch) {
      heroEl.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; active = true; });
      heroEl.addEventListener("pointerleave", () => { active = false; });
    }
    const t0 = performance.now();
    gsap.ticker.add(() => {
      if (!heroVis || reduce) return;
      const fs = parseFloat(getComputedStyle(l1).fontSize) || 100;
      const R = fs * 1.6;
      const now = (performance.now() - t0) / 1000;
      proxLetters.forEach((L, i) => {
        let k = 0;
        if (active) {
          const r = L.el.getBoundingClientRect();
          const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
          k = Math.max(0, 1 - d / R); k = k * k * (3 - 2 * k);
        } else if (isTouch) {
          k = Math.max(0, Math.sin(now * 1.6 - i * 0.55)) ** 3 * 0.8;
        }
        const tw = 75 + k * 25, tg = 800 - k * 0 , ty = k * 0.05;
        L.w += (tw - L.w) * 0.14; L.g += (tg - L.g) * 0.14; L.y += (ty - L.y) * 0.14;
        L.el.style.setProperty("--w", L.w.toFixed(2)); L.el.style.setProperty("--y", L.y.toFixed(3));
      });
    });
  }

  // ---------- rotating word ----------
  const wordEl = $(".js-hero-word");
  let WORDS = ["shows up."];
  try { WORDS = JSON.parse(wordEl.dataset.words || "[]").filter(Boolean); if (!WORDS.length) WORDS = ["shows up."]; } catch (e) {}
  let wi = 0;
  const cycleWord = () => {
    wi = (wi + 1) % WORDS.length;
    gsap.to(wordEl, { yPercent: -40, opacity: 0, filter: "blur(12px)", duration: 0.45, ease: "power2.in", onComplete: () => {
      wordEl.textContent = WORDS[wi];
      gsap.fromTo(wordEl, { yPercent: 50, opacity: 0, filter: "blur(12px)", rotate: 3 }, { yPercent: 0, opacity: 1, filter: "blur(0px)", rotate: 0, duration: 0.9, ease: "expo.out" });
    } });
  };

  // seal text follows the announcement
  const sealT = $(".js-seal-text");
  if (sealT && SITE.announcement && SITE.announcement.title) {
    const base = `${SITE.announcement.title} · ${SITE.announcement.cta || "Watch now"} · `.toUpperCase();
    let t = base; while ((t + base).length <= 44) t += base;
    sealT.textContent = t;
  }

  // ---------- nav hover highlight ----------
  const nl = $(".nav__links");
  if (nl && !isTouch) {
    const hl = document.createElement("span"); hl.className = "nav__hl"; nl.prepend(hl);
    const HL = ["#FFC23D", "#FF7AA8", "#2ED3A0", "#B7A5FF", "#FF5A1F", "#8FD8FF"];
    $$("a", nl).forEach((a, i) => a.addEventListener("mouseenter", () => { hl.style.setProperty("--hl", HL[i % HL.length]); hl.style.width = a.offsetWidth + "px"; hl.style.transform = `translateX(${a.offsetLeft}px)`; hl.style.opacity = 1; }));
    nl.addEventListener("mouseleave", () => (hl.style.opacity = 0));
  }

  // ---------- intro + scroll: the arcade ----------
  const arcs = $$(".arc__a").sort((x, y) => (+x.dataset.d || 0) - (+y.dataset.d || 0));
  const door = $(".arc__door");
  gsap.set(".hx .pl", { yPercent: 110 });
  gsap.set(".hx__word, .hx__kicker, .hx__lead, .hx__verse, .hx__ctas > *, .hx__ann, .arc__heaven", { opacity: 0, y: 30 });
  gsap.set(".hx__word", { filter: "blur(14px)" });
  if (!reduce) gsap.set(arcs, { yPercent: 104 });
  const heroIntro = () => {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" }, onComplete: () => { if (WORDS.length > 1 && !reduce) setInterval(() => !document.hidden && heroVis && cycleWord(), 3000); } });
    // the arches rise out of the floor, the great door first, then outward
    tl.to(arcs, { yPercent: 0, duration: 1.6, stagger: { each: 0.1 } }, 0)
      .to(".arc__heaven", { opacity: 1, y: 0, duration: 1.6 }, 0.45)
      .to(".hx__ann, .hx__kicker", { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.5)
      .to(".hx .pl", { yPercent: 0, duration: 1.3, stagger: 0.045 }, 0.6)
      .to(".hx__word", { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4 }, 0.9)
      .to(".hx__lead, .hx__verse", { opacity: 1, y: 0, duration: 1.1 }, 1)
      .to(".hx__ctas > *", { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 1.1)
      .add(() => heroEl.classList.add("is-in"), 2.2)
      .add(() => $$(".hx [data-count]").forEach((el) => {
        const target = parseFloat(el.dataset.count) || 0, suf = el.dataset.suffix || "", o = { v: 0 };
        gsap.to(o, { v: target, duration: 2.2, ease: "power3.out", onUpdate: () => (el.textContent = fmt(o.v) + suf) });
      }), 1);
    return tl;
  };
  // ---------- scripture: a new verse every few seconds ----------
  (() => {
    const V = ((SITE && SITE.verses) || []).filter((v) => v && v.text && v.text.length < 170);
    const qs = $$(".js-hv-q"), rs = $$(".js-hv-ref"), bar = $(".js-hv-bar");
    if (!V.length || !qs.length) return;
    let i = Math.floor(Date.now() / 864e5) % V.length;
    const DUR = 8;
    const show = (first) => {
      const v = V[i];
      const swap = () => { qs.forEach((q) => (q.textContent = `“${v.text}”`)); rs.forEach((r) => (r.textContent = v.ref)); };
      if (first || reduce) swap();
      else gsap.timeline().to([...qs, ...rs], { opacity: 0, y: -12, duration: 0.45, ease: "power2.in", onComplete: swap })
        .fromTo([...qs, ...rs], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 });
      if (bar && !reduce) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DUR, ease: "none" });
    };
    show(true);
    if (!reduce && V.length > 1) setInterval(() => { if (document.hidden || !heroVis) return; i = (i + 1) % V.length; show(false); }, DUR * 1000);
  })();

  if (!reduce && door) {
    // scrolling walks you through the great door: the side arches part, the door swallows the screen
    const cover = () => { const r = door.getBoundingClientRect(); return Math.max(innerWidth / r.width, innerHeight / r.height) * 2.4; };
    const side = (dir) => arcs.filter((a) => a.classList.contains(`arc__a--${a.dataset.d}${dir}`));
    const st = gsap.timeline({ scrollTrigger: { trigger: heroEl, start: "top top", end: "+=150%", pin: true, scrub: 0.8, refreshPriority: 10, invalidateOnRefresh: true } });
    st.to(".hx--arc .hx__main", { y: () => -innerHeight * 0.12, opacity: 0, ease: "power1.in", duration: 0.35 }, 0)
      .to(".arc__heaven", { y: () => -innerHeight * 0.1, opacity: 0, duration: 0.4 }, 0)
      .to(side("l"), { xPercent: (i, el) => -(80 + el.dataset.d * 60), y: (i, el) => innerHeight * 0.05 * el.dataset.d, ease: "power2.in", duration: 0.75 }, 0)
      .to(side("r"), { xPercent: (i, el) => 80 + el.dataset.d * 60, y: (i, el) => innerHeight * 0.05 * el.dataset.d, ease: "power2.in", duration: 0.75 }, 0)
      .to(door, { scale: cover, transformOrigin: "50% 62%", ease: "power2.in", duration: 1 }, 0.05)
      // the name over the door: rises in as the gold fills the screen, holds, then lets you through
      .fromTo(".hx__brand", { opacity: 0, scale: 0.86, y: 40 }, { opacity: 1, scale: 1, y: 0, ease: "power3.out", duration: 0.3 }, 0.38)
      .fromTo(".hx__brand-mark", { rotate: -25, scale: 0.6 }, { rotate: 0, scale: 1, ease: "back.out(1.6)", duration: 0.35 }, 0.38)
      .to(".hx__brand", { scale: 1.06, ease: "none", duration: 0.5 }, 0.9);   // hold the name, then it scrolls away with the gold
    // the arcade leans toward the pointer
    if (!isTouch) {
      const movers = arcs.map((a) => ({ d: +a.dataset.d || 0, a, qx: gsap.quickTo(a, "x", { duration: 1.1, ease: "power3.out" }) }));
      heroEl.addEventListener("pointermove", (e) => {
        const nx = e.clientX / innerWidth - 0.5;
        movers.forEach((m) => m.qx(-nx * (m.d ? 10 + m.d * 12 : 8)));
      });
      $$(".arc__a:not(.arc__door)").forEach((a) => {
        a.addEventListener("mouseenter", () => gsap.to(a, { scale: 1.04, duration: 0.6, ease: "back.out(2)" }));
        a.addEventListener("mouseleave", () => gsap.to(a, { scale: 1, duration: 0.6, ease: "power3.out" }));
      });
    }
  }

  const runLoader = () => {
    const loader = $(".loader");
    const count = $(".js-count");
    const letters = $$(".loader__word span");
    const done = () => { document.body.classList.remove("is-loading"); ScrollTrigger.refresh(); };
    if (reduce) { loader.remove(); done(); heroIntro().progress(1); return; }
    if (window.AGAPE_PREVIEW || /[?&]preview=1/.test(location.search)) { loader.remove(); done(); heroIntro().progress(1); return; }
    const c = { v: 0 };
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1600))]);
    const firstImg = hxImgs[0] ? new Promise((r) => (hxImgs[0].complete ? r() : (hxImgs[0].onload = hxImgs[0].onerror = r))) : Promise.resolve();
    const tl = gsap.timeline();
    tl.to(letters, { yPercent: 0, y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "expo.out" })
      .to(".loader__meaning", { opacity: 1, duration: 0.5 }, 0.3)
      .to(c, { v: 100, duration: 1.1, ease: "power2.inOut", onUpdate: () => (count.textContent = String(Math.round(c.v)).padStart(3, "0")) }, 0);
    Promise.all([fontsReady, Promise.race([firstImg, new Promise((r) => setTimeout(r, 2500))]), new Promise((r) => tl.eventCallback("onComplete", r))]).then(() => {
      gsap.timeline({ onComplete: () => loader.remove() })
        .to(letters, { yPercent: -110, opacity: 0, duration: 0.5, stagger: 0.03, ease: "power3.in" })
        .to(".loader__meaning, .loader__count", { opacity: 0, duration: 0.3 }, 0)
        .to(loader, { opacity: 0, duration: 0.7, ease: "power2.inOut" }, 0.3)
        .add(() => { done(); heroIntro(); }, 0.35);
    });
  };
  gsap.set(".loader__word span", { yPercent: 110 });
  runLoader();

  /* =======================================================
     TEXT REVEALS
     ======================================================= */
  const splitReveal = () => {
    $$("[data-split]").forEach((el) => {
      SplitText.create(el, {
        type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, { yPercent: 110, duration: 1.15, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        },
      });
    });
    // series headline (no autoSplit because it's pinned)
    const sh = $(".series .h2");
    if (sh) gsap.from(sh, { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".series", start: "top 70%", once: true } });
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(splitReveal);

  // generic reveals
  const revealSel = ".step__tags, .map-card, .vm, .board, .ai__chat, .pform, .camp, .gbox, .erow, .vcard, .time, .acc__item, .store, .section-sub, .rides__stats, .ride-steps, .ticks";
  $$(revealSel).forEach((el) => el.classList.add("reveal"));
  // IntersectionObserver-based (independent of ScrollTrigger refresh order / pin spacing)
  const revealIO = new IntersectionObserver((ents) => {
    const vis = ents.filter((e) => e.isIntersecting).map((e) => e.target);
    vis.forEach((el) => revealIO.unobserve(el));
    if (vis.length) gsap.to(vis, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, overwrite: true });
  }, { rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => revealIO.observe(el));

  // counters
  $$("[data-count]").forEach((el) => {
    if (el.closest(".hx")) return;
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || 0), suf = el.dataset.suffix || "";
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 92%", once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 2.2, ease: "power3.out", onUpdate: () => (el.textContent = (dec ? o.v.toFixed(dec) : fmt(o.v)) + suf) }),
    });
  });

  /* =======================================================
     MARQUEES (velocity-reactive)
     ======================================================= */
  const marquee = (el, speed) => {
    const track = el.firstElementChild;
    const html = track.innerHTML;
    let sets = 1;
    const fill = () => { while (track.scrollWidth < el.offsetWidth * 2.4 && sets < 12) { track.insertAdjacentHTML("beforeend", html); sets++; } };
    fill();
    let setW = 0;
    const measure = () => { const gap = parseFloat(getComputedStyle(track).columnGap) || 0; setW = (track.scrollWidth + gap) / sets; };
    measure(); addEventListener("resize", () => { fill(); measure(); });
    let x = 0, boost = 0, active = true, sign = 1;
    const dir = parseFloat(el.dataset.dir || -1);
    watch(el, (v) => (active = v), "200px");
    ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onUpdate: (s) => { boost = Math.min(Math.abs(s.getVelocity()) / 90, 22); sign = s.direction; } });
    gsap.ticker.add((t, dt) => {
      if (!active || !setW) return;
      x += dir * sign * (speed + boost) * (dt / 16.67);
      boost *= 0.93;
      if (x <= -setW) x += setW;
      if (x > 0) x -= setW;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  };
  if (!reduce) {
    $$(".mq").forEach((m) => marquee(m, 1.1));
    $$(".tq").forEach((m) => marquee(m, 0.7));
    $$(".gq").forEach((m) => marquee(m, 0.8));
  }

  /* =======================================================
     PROMO SLIDER (scroll-snap + autoplay + drag)
     ======================================================= */
  (() => {
    const track = $(".promos__track");
    if (!track) return;
    const cards = $$(".promo", track);
    const bars = $(".promos__bars");
    cards.forEach((_, i) => { const s = document.createElement("span"); s.innerHTML = "<i></i>"; s.addEventListener("click", () => go(i)); bars.appendChild(s); });
    const barEls = $$("span", bars);
    let idx = 0, fillTween, paused = false, inView = false;
    const pad = () => parseFloat(getComputedStyle(track).paddingLeft);
    const go = (i) => { idx = (i + cards.length) % cards.length; track.scrollTo({ left: cards[idx].offsetLeft - pad(), behavior: "smooth" }); startBar(); };
    const startBar = () => {
      fillTween?.kill();
      barEls.forEach((b, j) => { b.classList.toggle("is-done", j < idx); gsap.set(b.firstChild, { width: j < idx ? "100%" : "0%" }); });
      fillTween = gsap.to(barEls[idx].firstChild, { width: "100%", duration: 6, ease: "none", paused: paused || !inView, onComplete: () => go(idx + 1) });
    };
    const nearest = () => { let best = 0, d = 1e9; cards.forEach((c, i) => { const dd = Math.abs(c.offsetLeft - pad() - track.scrollLeft); if (dd < d) { d = dd; best = i; } }); return best; };
    let st;
    track.addEventListener("scroll", () => { clearTimeout(st); st = setTimeout(() => { const n = nearest(); if (n !== idx) { idx = n; startBar(); } }, 120); }, { passive: true });
    $(".js-prev").addEventListener("click", () => go(idx - 1));
    $(".js-next").addEventListener("click", () => go(idx + 1));
    track.addEventListener("mouseenter", () => { paused = true; fillTween?.pause(); });
    track.addEventListener("mouseleave", () => { paused = false; if (inView) fillTween?.resume(); });
    watch(track, (v) => { inView = v; v && !paused ? fillTween?.resume() : fillTween?.pause(); });
    // mouse drag
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-dragging"); } track.scrollLeft = sl - dx; });
    addEventListener("pointerup", () => { if (!down) return; down = false; track.classList.remove("is-dragging"); if (moved) go(nearest()); });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    startBar();
    // entrance
    gsap.from(cards, { x: 160, opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: track, start: "top 85%", once: true } });
  })();

  /* =======================================================
     LIVE: viewers, chat, hearts, countdown
     ======================================================= */
  (() => {
    const live = $("#watch");
    let on = false;
    watch(live, (v) => (on = v));
    // viewers
    const vEl = $(".js-viewers"), cEl = $(".js-chatters");
    let viewers = 1248, chatters = 312;
    setInterval(() => {
      if (!on) return;
      viewers = Math.max(900, viewers + Math.round(rand(-6, 14)));
      chatters = Math.max(200, chatters + Math.round(rand(-3, 5)));
      if (vEl) vEl.textContent = fmt(viewers);
      if (cEl) cEl.textContent = chatters;
    }, 1800);
    // chat
    const people = [["Grace", "#FF5A1F"], ["Daniel", "#6E4BFF"], ["Mariam", "#2ED3A0"], ["Joel", "#FFC23D"], ["Anita", "#FF3D7F"], ["Samuel", "#4CC3FF"], ["Ruth", "#FF5A1F"], ["Thomas", "#6E4BFF"], ["Esther", "#2ED3A0"], ["Kevin", "#FF3D7F"]];
    const lines = ["Amen! 🙌", "Watching from Salmiya, good morning family!", "That worship set though 🔥", "Grace upon grace. Needed this today.", "Praying for everyone watching from hospital today ❤️", "Hi from Fahaheel! 👋", "Romans 5:20 hits different", "Can't wait for Revival Nights!", "Hallelujah!", "Sharing this with my brother right now", "“Grace meets me before I clean up.” Wow.", "Joining from Chennai 🇮🇳", "Thank you Ps. John 🙏", "Kids are dancing in the living room 😂"];
    const list = $(".js-chat");
    let lastN = "", lastL = "";
    const add = () => {
      let n, c, line;
      do { [n, c] = pick(people); } while (n === lastN);
      do { line = pick(lines); } while (line === lastL);
      lastN = n; lastL = line;
      const m = document.createElement("div");
      m.className = "cmsg";
      m.innerHTML = `<span class="cmsg__ava" style="--c:${c}">${n[0]}</span><div><b>${n}</b><p>${line}</p></div>`;
      list.appendChild(m);
      gsap.from(m, { y: 24, opacity: 0, duration: 0.6, ease: "expo.out" });
      while (list.children.length > 9) list.firstElementChild.remove();
    };
    for (let i = 0; i < 8; i++) add();
    const loop = () => { if (on) add(); setTimeout(loop, rand(1300, 2800)); };
    loop();
    // hearts
    const hearts = $(".hearts");
    const heart = () => {
      const h = document.createElement("span");
      h.className = "heart";
      h.style.color = pick(["#FF3D7F", "#FF5A1F", "#FFC23D", "#fff"]);
      h.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-heart"/></svg>';
      hearts.appendChild(h);
      gsap.fromTo(h, { y: 0, x: 0, scale: 0.4, opacity: 1 }, { y: -rand(200, 290), x: rand(-40, 30), scale: rand(0.9, 1.5), opacity: 0, rotate: rand(-30, 30), duration: rand(2.2, 3.2), ease: "power1.out", onComplete: () => h.remove() });
    };
    setInterval(() => on && !document.hidden && heart(), 700);
    $(".js-heart").addEventListener("click", () => { for (let i = 0; i < 6; i++) setTimeout(heart, i * 80); });
    // Play: embed the channel's latest uploads (uploads playlist = "UU" + channel id minus "UC")
    const player = $(".player");
    player.addEventListener("click", (e) => {
      if (e.target.closest("a") || player.querySelector("iframe")) return;
      const list = "UU" + CONFIG.youtubeChannelId.slice(2);
      const f = document.createElement("iframe");
      f.src = `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1&rel=0&modestbranding=1`;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      player.appendChild(f);
      gsap.from(f, { opacity: 0, scale: 0.96, duration: 0.6, ease: "expo.out" });
      player.removeAttribute("data-cursor");
    });

    // countdown
    const d = $(".js-cd-d"), h = $(".js-cd-h"), m = $(".js-cd-m"), s = $(".js-cd-s"), lbl = $(".js-next-label"), navLbl = $(".js-live-label");
    const pad2 = (n) => String(n).padStart(2, "0");
    const tick = () => {
      if (!CONFIG.services.length) return;
      const now = Date.now() + CONFIG.tzOffsetHours * 3600e3; // "church-local" as UTC fields
      const nd = new Date(now);
      let best = null, liveNow = null;
      CONFIG.services.forEach((sv) => {
        const diff = (sv.day - nd.getUTCDay() + 7) % 7;
        let t = Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate() + diff, sv.h, sv.m);
        if (t - CONFIG.serviceLengthMin * 60e3 <= now && now < t + CONFIG.serviceLengthMin * 60e3 && t <= now) liveNow = sv;
        if (t <= now) t += 7 * 864e5;
        if (!best || t < best.t) best = { t, sv };
      });
      const r = Math.max(0, best.t - now);
      const flip = (el, v) => { if (el.textContent === v) return; el.textContent = v; if (on && !reduce) gsap.fromTo(el, { yPercent: -45, opacity: 0, rotateX: 70 }, { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.55, ease: "back.out(2)" }); };
      flip(d, pad2(Math.floor(r / 864e5)));
      flip(h, pad2(Math.floor((r % 864e5) / 36e5)));
      flip(m, pad2(Math.floor((r % 36e5) / 6e4)));
      flip(s, pad2(Math.floor((r % 6e4) / 1e3)));
      lbl.textContent = best.sv.label;
      const hd = $(".js-h-d");
      if (hd) {
        hd.textContent = d.textContent; $(".js-h-h").textContent = h.textContent; $(".js-h-m").textContent = m.textContent; $(".js-h-s").textContent = s.textContent;
        $(".js-hero-next").textContent = liveNow ? `Live now · ${liveNow.name}` : best.sv.label;
      }
      navLbl.textContent = liveNow ? "Live now" : `Live ${best.sv.short}`;
      const l2 = $(".js-live-label2"); if (l2) l2.textContent = navLbl.textContent;
    };
    tick(); setInterval(tick, 1000);
  })();

  const mm = gsap.matchMedia();

  /* =======================================================
     MAP RENDERER (procedural "dark mode" city + live route)
     ======================================================= */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function makeMap(canvas, opt) {
    const o = Object.assign({ seed: 7, cell: [44, 92], region: [0.12, 0.22, 0.86, 0.78], route: [[0.1, 0.95], [0.1, 0.62], [0.46, 0.62], [0.46, 0.3], [0.9, 0.3], [0.9, 0.05]], water: "tr", labels: true, duration: 15, onProgress: null }, opt);
    const ctx = canvas.getContext("2d");
    const base = document.createElement("canvas"), bctx = base.getContext("2d");
    let W, H, dpr, pts = [], segs = [], total = 0, p = 0, running = false, visible = false, last = 0, hold = 0;

    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = base.width = W * dpr; canvas.height = base.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = mulberry(o.seed);
      const xs = [], ys = [];
      for (let x = -30; x < W + 60; x += o.cell[0] + r() * (o.cell[1] - o.cell[0])) xs.push(x);
      for (let y = -30; y < H + 60; y += o.cell[0] + r() * (o.cell[1] - o.cell[0])) ys.push(y);
      const [rx0, ry0, rx1, ry1] = o.region;
      const snap = (arr, v) => arr.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
      pts = o.route.map(([nx, ny]) => [snap(xs, (rx0 + nx * (rx1 - rx0)) * W), snap(ys, (ry0 + ny * (ry1 - ry0)) * H)]);
      segs = []; total = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (l) { segs.push({ a: pts[i - 1], b: pts[i], l, s: total }); total += l; } }

      // --- static base layer ---
      const b = bctx;
      b.fillStyle = "#141018"; b.fillRect(0, 0, W, H);
      // blocks
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
        const x = xs[i] + 5, y = ys[j] + 5, w = xs[i + 1] - xs[i] - 10, h = ys[j + 1] - ys[j] - 10;
        const k = r();
        b.fillStyle = k < 0.08 ? "#16261F" : k < 0.5 ? "#1C1723" : "#1F1A27";
        b.beginPath(); b.roundRect(x, y, w, h, 7); b.fill();
        if (k > 0.55 && w > 40 && h > 40) { // building footprints
          b.fillStyle = "rgba(255,255,255,.028)";
          const n = 2 + Math.floor(r() * 3);
          for (let q = 0; q < n; q++) { const bw = w * (0.25 + r() * 0.3), bh = h * (0.25 + r() * 0.3); b.beginPath(); b.roundRect(x + 5 + r() * (w - bw - 10), y + 5 + r() * (h - bh - 10), bw, bh, 3); b.fill(); }
        }
      }
      // water
      b.save();
      const g = b.createLinearGradient(W, 0, W * 0.6, H * 0.5);
      g.addColorStop(0, "#0E2233"); g.addColorStop(1, "#112A3D");
      b.fillStyle = g; b.beginPath();
      if (o.water === "tr") { b.moveTo(W * 0.66, -10); b.bezierCurveTo(W * 0.74, H * 0.12, W * 0.9, H * 0.14, W * 0.94, H * 0.3); b.bezierCurveTo(W * 0.98, H * 0.42, W + 10, H * 0.46, W + 10, H * 0.5); b.lineTo(W + 10, -10); }
      else { b.moveTo(-10, H * 0.02); b.bezierCurveTo(W * 0.3, H * 0.04, W * 0.5, H * 0.09, W + 10, H * 0.06); b.lineTo(W + 10, -10); b.lineTo(-10, -10); }
      b.closePath(); b.fill();
      b.strokeStyle = "rgba(76,195,255,.25)"; b.lineWidth = 1.5; b.stroke();
      b.restore();
      // expressways
      const road = (fn, w1, w2, c1, c2) => { b.lineCap = "round"; b.lineJoin = "round"; b.strokeStyle = c1; b.lineWidth = w1; b.beginPath(); fn(); b.stroke(); b.strokeStyle = c2; b.lineWidth = w2; b.beginPath(); fn(); b.stroke(); };
      road(() => { b.moveTo(-20, H * 0.18); b.bezierCurveTo(W * 0.3, H * 0.28, W * 0.55, H * 0.7, W + 20, H * 0.78); }, 13, 7, "#2A2432", "#3A3244");
      road(() => { b.moveTo(W * 0.22, H + 20); b.bezierCurveTo(W * 0.3, H * 0.6, W * 0.62, H * 0.35, W * 0.7, -20); }, 11, 5, "#262030", "#342D3E");
      // labels
      if (o.labels) {
        b.fillStyle = "rgba(244,238,228,.22)"; b.font = "600 10px Geist, sans-serif";
        b.save(); b.translate(W * 0.2, H * 0.24); b.rotate(0.3); b.fillText("GULF RD", 0, 0); b.restore();
        b.save(); b.translate(W * 0.27, H * 0.93); b.rotate(-1.3); b.fillText("FOURTH RING RD", 0, 0); b.restore();
        b.fillStyle = "rgba(76,195,255,.35)"; b.font = "italic 13px 'Instrument Serif', serif";
        o.water === "tr" ? b.fillText("Arabian Gulf", W * 0.8, H * 0.12) : b.fillText("Arabian Gulf", W * 0.35, H * 0.035);
      }
      // route road under-glow
      b.strokeStyle = "#2D2737"; b.lineWidth = 11; b.lineCap = "round"; b.lineJoin = "round";
      b.beginPath(); pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.stroke();
    };

    const posAt = (d) => {
      d = Math.max(0, Math.min(total, d));
      const s = segs.find((sg) => d <= sg.s + sg.l) || segs[segs.length - 1];
      const t = (d - s.s) / s.l;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, ang: Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]), seg: s };
    };

    const draw = (time) => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0, W, H);
      const d = p * total, car = posAt(d);
      // travelled (dim)
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(46,211,160,.28)"; ctx.lineWidth = 5; ctx.setLineDash([2, 9]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const s of segs) { if (s.s + s.l < d) ctx.lineTo(s.b[0], s.b[1]); else break; }
      ctx.lineTo(car.x, car.y); ctx.stroke(); ctx.setLineDash([]);
      // remaining (bright gradient + glow)
      const g = ctx.createLinearGradient(car.x, car.y, pts[pts.length - 1][0], pts[pts.length - 1][1]);
      g.addColorStop(0, "#2ED3A0"); g.addColorStop(1, "#4CC3FF");
      ctx.save(); ctx.shadowColor = "rgba(46,211,160,.8)"; ctx.shadowBlur = 16;
      ctx.strokeStyle = g; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(car.x, car.y);
      let started = false;
      for (const s of segs) { if (s.s + s.l > d) { if (started || true) ctx.lineTo(s.b[0], s.b[1]); started = true; } }
      ctx.stroke(); ctx.restore();
      // moving dashes on remaining route
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 14]); ctx.lineDashOffset = -time / 40;
      ctx.beginPath(); ctx.moveTo(car.x, car.y); for (const s of segs) if (s.s + s.l > d) ctx.lineTo(s.b[0], s.b[1]); ctx.stroke(); ctx.setLineDash([]);
      // pickup
      ctx.fillStyle = "#141018"; ctx.strokeStyle = "#2ED3A0"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // destination (church pin)
      const [dx, dy] = pts[pts.length - 1];
      const pulse = (time / 1400) % 1;
      ctx.strokeStyle = `rgba(255,90,31,${1 - pulse})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dx, dy, 12 + pulse * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#FF5A1F"; ctx.beginPath(); ctx.arc(dx, dy, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(dx, dy - 7); ctx.lineTo(dx, dy + 7); ctx.moveTo(dx - 5, dy - 2.5); ctx.lineTo(dx + 5, dy - 2.5); ctx.stroke();
      // label bubble
      if (o.labels) {
        const txt = "Agape International"; ctx.font = "600 12px Geist, sans-serif";
        const tw = ctx.measureText(txt).width + 22, bx = Math.min(W - tw - 8, dx - tw / 2), by = dy - 46;
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(bx, by, tw, 26, 13); ctx.fill();
        ctx.fillStyle = "#0F0B12"; ctx.fillText(txt, bx + 11, by + 17);
      }
      // car: heading beam + dot
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.ang);
      const beam = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
      beam.addColorStop(0, "rgba(46,211,160,.45)"); beam.addColorStop(1, "rgba(46,211,160,0)");
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 46, -0.55, 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
      const cp = (time / 1100) % 1;
      ctx.fillStyle = `rgba(46,211,160,${0.35 * (1 - cp)})`; ctx.beginPath(); ctx.arc(car.x, car.y, 10 + cp * 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(car.x, car.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2ED3A0"; ctx.beginPath(); ctx.arc(car.x, car.y, 7.5, 0, Math.PI * 2); ctx.fill();
    };

    const frame = (t) => {
      if (!running) return;
      const dt = last ? Math.min(64, t - last) : 16; last = t;
      if (hold > 0) hold -= dt;
      else { p += dt / (o.duration * 1000); if (p >= 1) { p = 1; hold = 2600; } }
      if (p >= 1 && hold <= 0) p = 0;
      o.onProgress && o.onProgress(p);
      draw(t);
      requestAnimationFrame(frame);
    };
    const start = () => { if (running) return; running = true; last = 0; requestAnimationFrame(frame); };
    const stop = () => { running = false; };
    build();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(performance.now()); }, 150); });
    watch(canvas, (v) => { visible = v; v ? start() : stop(); });
    return { build, start, stop, draw, setVisible: (v) => (v && visible ? start() : !v && stop()) };
  }

  // big ride map + ride steps
  (() => {
    const cv = $(".big-map");
    if (!cv) return;
    const steps = $$(".ride-steps li"), eta = $(".js-eta");
    let lastStep = -1, lastEta = "";
    makeMap(cv, {
      seed: 11, region: innerWidth > 900 ? [0.54, 0.18, 0.93, 0.8] : [0.12, 0.5, 0.9, 0.9], water: innerWidth > 900 ? "tr" : "top",
      onProgress: (p) => {
        const s = p < 0.08 ? 0 : p < 0.2 ? 1 : p < 0.99 ? 2 : 3;
        if (s !== lastStep) { steps.forEach((li, i) => li.classList.toggle("is-on", i <= s)); lastStep = s; }
        const e = p >= 0.99 ? "Arrived" : `${Math.max(1, Math.ceil((1 - p) * 7))} min`;
        if (e !== lastEta) { eta.textContent = e; lastEta = e; }
      },
    });
  })();

  /* =======================================================
     APP SHOWCASE
     ======================================================= */
  (() => {
    const sec = $(".showcase");
    const phone = $(".phone");
    const screens = $$(".scr", phone);
    const steps = $$(".step");
    const glowColors = ["#FF8A5B", "#FF7A59", "#9B84FF", "#FFC23D", "#6FC8FF", "#2ED3A0"];
    let cur = -1;

    // mini map inside phone
    const miniEta = $(".js-mini-eta");
    const mini = makeMap($(".mini-map"), {
      seed: 3, cell: [40, 70], region: [0.1, 0.24, 0.9, 0.5], route: [[0.05, 1], [0.05, 0.55], [0.55, 0.55], [0.55, 0.1], [0.95, 0.1]], water: "top", labels: false, duration: 12,
      onProgress: (p) => (miniEta.textContent = p >= 0.99 ? "Arrived" : `${Math.max(1, Math.ceil((1 - p) * 5))} min`),
    });
    mini.setVisible(false);

    // typing
    const typeEl = $(".js-type");
    let typeTimer;
    const typeIt = () => {
      clearInterval(typeTimer);
      const full = typeEl.dataset.text; let i = 0; typeEl.textContent = "";
      typeTimer = setInterval(() => { typeEl.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(typeTimer); }, 34);
    };
    const gameFill = () => {
      const b = $(".g-blank--2");
      b.classList.remove("is-in"); b.textContent = "";
      setTimeout(() => { b.textContent = "light"; b.classList.add("is-in"); gsap.from(b, { scale: 0.5, duration: 0.5, ease: "back.out(3)" }); }, 900);
    };

    const setStep = (i) => {
      if (i === cur) return;
      cur = i;
      screens.forEach((s, j) => s.classList.toggle("is-active", j === i));
      steps.forEach((s, j) => s.classList.toggle("is-active", j === i));
      sec.style.setProperty("--showcase-bg", steps[i].dataset.bg);
      sec.style.setProperty("--glow", glowColors[i]);
      phone.classList.toggle("status-light", i === 1 || i === 5);
      $$(".tabbar span", phone).forEach((t, j) => t.classList.toggle("on", j === [0, 0, 1, 3, 3, 0][i]));
      if (i === 1) typeIt();
      if (i === 3) gameFill();
      mini.setVisible(i === 5);
    };
    setStep(0);

    mm.add("(min-width: 901px)", () => {
      ScrollTrigger.create({ trigger: ".showcase__grid", start: "top top", end: "bottom bottom", pin: ".showcase__phone-wrap", pinSpacing: false });
      steps.forEach((st, i) => ScrollTrigger.create({ trigger: st, start: "top 60%", end: "bottom 60%", onToggle: (self) => self.isActive && setStep(i) }));
      gsap.fromTo(phone, { rotateX: 18, y: 120, scale: 0.9 }, { rotateX: 0, y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".showcase", start: "top 80%", end: "top 10%", scrub: true } });
    });
    mm.add("(max-width: 900px)", () => {
      let t, vis = false;
      watch(phone, (v) => (vis = v));
      t = setInterval(() => vis && setStep((cur + 1) % screens.length), 3400);
      steps.forEach((st, i) => st.addEventListener("click", () => setStep(i)));
      return () => clearInterval(t);
    });
    // 3D tilt
    if (!isTouch) {
      gsap.set(".showcase__phone-wrap", { perspective: 1400 });
      const rx = gsap.quickTo(phone, "rotationY", { duration: 1.2, ease: "power3" });
      const ry = gsap.quickTo(phone, "rotationX", { duration: 1.2, ease: "power3" });
      sec.addEventListener("mousemove", (e) => { rx((e.clientX / innerWidth - 0.5) * 16); ry(-(e.clientY / innerHeight - 0.5) * 10); });
      sec.addEventListener("mouseleave", () => { rx(0); ry(0); });
    }
    phone.addEventListener("click", () => setStep((cur + 1) % screens.length));
  })();

  /* =======================================================
     CONFETTI
     ======================================================= */
  function confetti(canvas) {
    const ctx = canvas.getContext("2d");
    let parts = [], raf = null;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener("resize", size);
    const colors = ["#FF5A1F", "#FFC23D", "#FF3D7F", "#6E4BFF", "#2ED3A0", "#4CC3FF", "#fff"];
    const tick = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      parts = parts.filter((p) => p.life > 0);
      for (const p of parts) {
        p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 1;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 30); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.s) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      raf = parts.length ? requestAnimationFrame(tick) : null;
    };
    return (x, y, n = 60, power = 9) => {
      for (let i = 0; i < n; i++) {
        const a = rand(-Math.PI, 0), v = rand(power * 0.4, power);
        parts.push({ x, y, vx: Math.cos(a) * v * rand(0.6, 1.3), vy: Math.sin(a) * v - 2, r: rand(0, 6), vr: rand(-0.3, 0.3), w: rand(6, 11), h: rand(8, 14), c: pick(colors), s: Math.random() < 0.3, life: rand(70, 120) });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
  }

  /* =======================================================
     BIBLE GAME — Verse Match
     ======================================================= */
  (() => {
    const verses = [
      { t: "For God so loved the ___ that he gave his one and only ___.", a: ["world", "Son"], x: ["law", "heart", "nations"], r: "John 3:16" },
      { t: "The Lord is my ___; I shall not ___.", a: ["shepherd", "want"], x: ["king", "fear", "rock"], r: "Psalm 23:1" },
      { t: "Your word is a ___ to my feet and a ___ to my path.", a: ["lamp", "light"], x: ["song", "sword", "shield"], r: "Psalm 119:105" },
      { t: "Be still, and ___ that I am ___.", a: ["know", "God"], x: ["pray", "King", "wait"], r: "Psalm 46:10" },
      { t: "I can do all things through ___ who ___ me.", a: ["Christ", "strengthens"], x: ["faith", "loves", "angels"], r: "Philippians 4:13" },
    ];
    const vEl = $(".js-verse"), rEl = $(".js-ref"), oEl = $(".js-opts"), hint = $(".js-hint"), scoreEl = $(".js-score"), prog = $(".js-vm-prog");
    const boom = confetti($(".vm .confetti"));
    const vm = $(".vm");
    let vi = 0, next = 0, score = 0, streak = 0, locked = false;

    const board = $(".js-board");
    const players = [
      { n: "Daniel J.", c: "#6E4BFF", p: 1240 }, { n: "Sarah M.", c: "#FF3D7F", p: 1180 }, { n: "Michael T.", c: "#2ED3A0", p: 1120 },
      { n: "Grace A.", c: "#FF5A1F", p: 960 }, { n: "You", c: "#0F0B12", p: 0, you: true },
    ];
    const renderBoard = () => {
      const sorted = [...players].sort((a, b) => b.p - a.p);
      const max = Math.max(...players.map((p) => p.p), 1);
      board.innerHTML = sorted.map((p, i) => `<div class="brow ${p.you ? "is-you" : ""}"><span class="brow__rank">${i + 1}</span><span class="brow__ava" style="--c:${p.c}">${p.n[0]}</span><div class="brow__mid"><b>${p.n}</b><div class="brow__bar"><i style="--c:${p.c};background:${p.c}" data-w="${(p.p / max) * 100}"></i></div></div><span class="brow__pts">${fmt(p.p)}</span></div>`).join("");
      requestAnimationFrame(() => $$(".brow__bar i", board).forEach((b) => (b.style.width = b.dataset.w + "%")));
    };
    renderBoard();

    const load = () => {
      const v = verses[vi];
      next = 0; locked = false;
      let k = 0;
      vEl.innerHTML = v.t.replace(/___/g, () => `<span class="blank ${k === 0 ? "is-next" : ""}" data-i="${k++}">${v.a[k - 1]}</span>`);
      rEl.textContent = v.r;
      const opts = [...v.a, ...v.x].sort(() => Math.random() - 0.5);
      oEl.innerHTML = opts.map((w) => `<button type="button">${w}</button>`).join("");
      hint.textContent = "Drag the words into the gaps, or tap them in order."; hint.classList.remove("is-win");
      prog.style.width = (vi / verses.length) * 100 + "%";
      gsap.from(vEl, { opacity: 0, y: 20, duration: 0.6, ease: "expo.out" });
      gsap.from($$("button", oEl), { opacity: 0, y: 16, scale: 0.9, duration: 0.5, stagger: 0.05, ease: "back.out(2)" });
    };
    oEl.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || locked) return;
      const v = verses[vi];
      if (b.textContent === v.a[next]) {
        const blank = $(`.blank[data-i="${next}"]`, vEl);
        blank.classList.remove("is-next"); blank.classList.add("is-filled");
        b.classList.add("is-used");
        streak++; score += 100 + (streak - 1) * 20;
        scoreEl.textContent = fmt(score);
        players.find((p) => p.you).p = score; renderBoard();
        const vr = vm.getBoundingClientRect(), br = blank.getBoundingClientRect();
        boom(br.left - vr.left + br.width / 2, br.top - vr.top + br.height / 2, 26, 7);
        next++;
        const nb = $(`.blank[data-i="${next}"]`, vEl);
        if (nb) nb.classList.add("is-next");
        else {
          locked = true;
          hint.textContent = streak >= 4 ? `Streak ×${streak}! Next verse…` : "Beautiful. Next verse…"; hint.classList.add("is-win");
          boom(vr.width / 2, vr.height * 0.55, 110, 12);
          prog.style.width = ((vi + 1) / verses.length) * 100 + "%";
          setTimeout(() => { vi = (vi + 1) % verses.length; load(); }, 1900);
        }
      } else {
        streak = 0;
        b.classList.remove("is-wrong"); void b.offsetWidth; b.classList.add("is-wrong");
        setTimeout(() => b.classList.remove("is-wrong"), 600);
        hint.textContent = "Not quite. Try another word.";
      }
    });
    load();
  })();

  /* =======================================================
     AI ASSISTANT DEMO (streams canned answers)
     ======================================================= */
  (() => {
    const box = $(".js-ai"), sugg = $(".js-ai-sugg");
    const answers = {
      "What does Romans 8:28 mean?": `Romans 8:28 says God works in <b>all things</b> for the good of those who love Him. It doesn't promise that everything will <i>feel</i> good. It promises that nothing is wasted, and that even the hard chapters can become part of His purpose for you.<br/><span class="ref">Read Romans 8:28–30</span> <span class="ref">Watch: Unshakeable · Pt 3</span>`,
      "Give me a devotional on anxiety": `Here's a two-minute devotional.<br/><b>Read:</b> Philippians 4:6–7.<br/><b>Reflect:</b> What are you carrying today that you haven't named to God?<br/><b>Pray:</b> “Lord, I hand you ___. Guard my heart and mind with your peace.”<br/><span class="ref">Add to my reading plan</span>`,
      "Where's the verse about “be still”?": `That's <b>Psalm 46:10</b>: “Be still, and know that I am God.” It was written to a nation surrounded by chaos. Stillness there doesn't mean doing nothing. It means trusting God in the middle of everything.<br/><span class="ref">Open Psalm 46</span>`,
      "Summarize Sunday's sermon": `<b>The Power of Grace</b> (Ps. John Mathew):<br/>1. Grace finds us <i>before</i> we clean up (Rom 5:8).<br/>2. Grace is a teacher, not a loophole (Titus 2:11–12).<br/>3. Grace we receive becomes grace we give.<br/><span class="ref">Send notes to my app</span>`,
    };
    const addMsg = (html, me) => {
      const m = document.createElement("div");
      m.className = "amsg " + (me ? "amsg--me" : "amsg--bot");
      m.innerHTML = html; box.appendChild(m);
      gsap.from(m, { y: 16, opacity: 0, scale: 0.96, transformOrigin: me ? "right bottom" : "left bottom", duration: 0.5, ease: "expo.out" });
      box.scrollTop = box.scrollHeight;
      return m;
    };
    const stream = (el, html, done) => {
      el.innerHTML = html;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push([walker.currentNode, walker.currentNode.textContent]);
      nodes.forEach(([n]) => (n.textContent = ""));
      const refs = $$(".ref", el); refs.forEach((r) => (r.style.visibility = "hidden"));
      let ni = 0, ci = 0;
      const step = () => {
        if (ni >= nodes.length) { refs.forEach((r) => { r.style.visibility = ""; gsap.from(r, { scale: 0.8, opacity: 0, duration: 0.4, ease: "back.out(2)" }); }); done && done(); return; }
        const [n, full] = nodes[ni];
        if (n.parentElement.classList.contains("ref")) { n.textContent = full; ni++; return step(); }
        ci = Math.min(full.length, ci + Math.ceil(rand(2, 6)));
        n.textContent = full.slice(0, ci);
        if (ci >= full.length) { ni++; ci = 0; }
        box.scrollTop = box.scrollHeight;
        setTimeout(step, rand(14, 34));
      };
      step();
    };
    let busy = false;
    const ask = (q) => {
      if (busy) return; busy = true;
      $$("button", sugg).forEach((b) => (b.disabled = true));
      addMsg(q, true);
      const t = addMsg('<span class="typing"><i></i><i></i><i></i></span>', false);
      t.style.padding = "0";
      setTimeout(() => { t.style.padding = ""; stream(t, answers[q] || "Great question! Let me look into that.", () => { busy = false; $$("button", sugg).forEach((b) => (b.disabled = false)); }); }, 900);
    };
    sugg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent.trim()); });
    addMsg("Hi! I'm Ask Agape. Ask me about the Bible, a verse, or this week's sermon.", false);
    let played = false;
    watch(box, (v) => { if (v && !played) { played = true; setTimeout(() => ask("What does Romans 8:28 mean?"), 700); } }, "-20% 0px");
  })();

  /* =======================================================
     PRAYER WALL
     ======================================================= */
  (() => {
    const reqs = [
      ["Anonymous", "Please pray for my mom's surgery on Thursday. For steady hands and a quick recovery.", 42, "#FF3D7F"],
      ["Joseph A.", "New job starts Monday. I'm praying for favor and for the courage to be a light there.", 28, "#6E4BFF"],
      ["Anonymous", "For peace in our home. We've been arguing a lot lately.", 61, "#FF5A1F"],
      ["Mariam K.", "My visa renewal is pending. Trusting God with the timing.", 37, "#2ED3A0"],
      ["Anonymous", "Struggling with anxiety at night. Pray for rest.", 88, "#4CC3FF"],
      ["Priya R.", "Thank you church! My dad is home from the ICU. Keep praying for full healing 🙏", 214, "#FFC23D"],
      ["Samuel T.", "Exams this week. Pray for focus and calm.", 19, "#FF3D7F"],
      ["Anonymous", "For my brother, who has walked away from faith. Bring him home, Lord.", 73, "#6E4BFF"],
      ["Ruth & Ben", "We're expecting our first baby in December! Pray for a healthy pregnancy.", 96, "#2ED3A0"],
      ["Anonymous", "Lost my job last month. Pray for provision for our family.", 57, "#FF5A1F"],
      ["Grace L.", "Our small group is starting a food drive. Pray it reaches the families who need it most.", 33, "#4CC3FF"],
      ["Anonymous", "Healing from a long illness. Some days are hard.", 49, "#FFC23D"],
    ];
    const PAPER = ["#FFE680", "#FFC2D8", "#BDF3DC", "#D9CCFF", "#FFD2B8", "#C7E9FF"];
    const board = $(".pnotes");
    const note = ([who, txt, n, c], i, isNew) => {
      const el = document.createElement("article");
      el.className = "pnote" + (isNew ? " is-new" : "");
      el.style.setProperty("--paper", PAPER[i % PAPER.length]);
      el.innerHTML = `<span class="pnote__tape"></span><div class="pnote__who"><span style="--c:${c}">${who[0]}</span>${who}</div><p>${txt}</p><button class="pray-btn" data-n="${n}"><svg class="ic"><use href="#i-hand-heart"/></svg><span>Praying · ${n}</span></button>`;
      return el;
    };
    const notes = [];
    const place = () => {
      const W = board.clientWidth, H = board.clientHeight, mob = innerWidth < 700;
      const cols = mob ? 2 : 3, rows = Math.ceil(notes.length / cols);
      notes.forEach((el, i) => {
        const nw = el.offsetWidth, nh = el.offsetHeight;
        const c = i % cols, r = Math.floor(i / cols);
        const cx = ((c + 0.5) / cols) * W, cy = ((r + 0.5) / rows) * H;
        const x = Math.max(0, Math.min(W - nw, cx - nw / 2 + (Math.random() - 0.5) * (W / cols) * 0.35));
        const y = Math.max(0, Math.min(H - nh, cy - nh / 2 + (Math.random() - 0.5) * (H / rows) * 0.5));
        el._pos = { x, y, r: (Math.random() - 0.5) * 16 };
        gsap.set(el, { x, y, rotation: el._pos.r });
      });
    };
    const makeDrag = (el) => {
      if (!window.Draggable) return;
      let lastX = 0;
      Draggable.create(el, {
        type: "x,y", bounds: board, inertia: true, edgeResistance: 0.75, zIndexBoost: true, throwResistance: 1800,
        onPress() { lastX = this.x; gsap.to(el, { scale: 1.06, boxShadow: "0 40px 70px -20px rgba(0,0,0,.6)", duration: 0.25 }); },
        onDrag() { const v = this.x - lastX; lastX = this.x; gsap.to(el, { rotation: Math.max(-22, Math.min(22, v * 1.6)), duration: 0.4, overwrite: "auto" }); },
        onRelease() { gsap.to(el, { scale: 1, boxShadow: "0 18px 40px -18px rgba(0,0,0,.55)", duration: 0.5 }); },
        onThrowComplete() { gsap.to(el, { rotation: (Math.random() - 0.5) * 12, duration: 0.8, ease: "elastic.out(1,0.5)" }); },
      });
    };
    const count = innerWidth < 700 ? 7 : 9;
    reqs.slice(0, count).forEach((r, i) => { const el = note(r, i); board.appendChild(el); notes.push(el); });
    gsap.registerPlugin(Draggable, InertiaPlugin);
    let dropped = reduce;
    const init = () => {
      place(); notes.forEach(makeDrag);
      if (!dropped) gsap.set(notes, { opacity: 0 });
    };
    requestAnimationFrame(init);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(place, 200); });
    // notes fall onto the board the first time it scrolls into view
    const dropIO = new IntersectionObserver((ents) => {
      if (dropped || !ents.some((e) => e.isIntersecting)) return;
      dropped = true; dropIO.disconnect();
      notes.forEach((el, i) => {
        const p = el._pos || { x: 0, y: 0, r: 0 };
        gsap.fromTo(el, { opacity: 0, y: p.y - 520, rotation: (Math.random() - 0.5) * 70 }, { opacity: 1, y: p.y, rotation: p.r, duration: 1.3, ease: "bounce.out", delay: Math.random() * 0.6 });
      });
    }, { rootMargin: "0px 0px -25% 0px" });
    dropIO.observe(board);
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".pray-btn");
      if (!b) return;
      const on = b.classList.toggle("is-on");
      const n = parseInt(b.dataset.n) + (on ? 1 : 0);
      $("span", b).textContent = on ? `You're praying · ${n}` : `Praying · ${n}`;
      if (on) for (let i = 0; i < 10; i++) {
        const d = document.createElement("i"); d.className = "burst"; b.appendChild(d);
        const a = (i / 10) * Math.PI * 2;
        gsap.fromTo(d, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * 34, y: Math.sin(a) * 26, scale: 0, opacity: 0, duration: 0.7, ease: "expo.out", onComplete: () => d.remove() });
      }
      gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
    });
    $(".js-pform").addEventListener("submit", (e) => {
      e.preventDefault();
      const ta = $("textarea", e.target), anon = $("input", e.target).checked;
      const txt = ta.value.trim(); if (!txt) return;
      const el = note([anon ? "Anonymous" : "You", txt.replace(/</g, "&lt;"), 1, "#FF3D7F"], Math.floor(Math.random() * 6), true);
      board.appendChild(el); notes.push(el);
      const W = board.clientWidth;
      gsap.set(el, { x: W / 2 - el.offsetWidth / 2, y: 20, zIndex: 999 });
      gsap.from(el, { y: -400, rotation: -30, duration: 1.2, ease: "bounce.out" });
      makeDrag(el);
      ta.value = "";
      const btn = $("button[type=submit] span", e.target), orig = btn.textContent;
      btn.textContent = "Posted. We're praying with you"; setTimeout(() => (btn.textContent = orig), 2600);
    });
  })();

  /* =======================================================
     GIVING
     ======================================================= */
  (() => {
    $$(".dial").forEach((d) => {
      const p = parseFloat(d.dataset.p), v = $(".dial__v", d), o = { p: 0 };
      ScrollTrigger.create({ trigger: d, start: "top 90%", once: true, onEnter: () => gsap.to(o, { p, duration: 2.2, ease: "power3.out", onUpdate: () => { d.style.setProperty("--p", o.p); v.textContent = Math.round(o.p) + "%"; } }) });
    });
    $$(".promo__progress .bar span").forEach((b) => gsap.from(b, { scaleX: 0, duration: 2, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 95%", once: true } }));
    const form = $(".js-give");
    const seg = $(".gbox__seg"), input = $(".gbox__custom input"), label = $(".js-give-label");
    let freq = "once";
    const upd = () => { const a = parseFloat(input.value) || 0; label.textContent = `Give ${CONFIG.currency} ${a || "—"}${freq === "monthly" ? " / month" : ""}`; };
    $$("button", seg).forEach((b) => b.addEventListener("click", () => { freq = b.dataset.freq; $$("button", seg).forEach((x) => x.classList.toggle("is-on", x === b)); seg.classList.toggle("is-monthly", freq === "monthly"); upd(); }));
    $$(".gbox__amts button").forEach((b) => b.addEventListener("click", () => { $$(".gbox__amts button").forEach((x) => x.classList.toggle("is-on", x === b)); input.value = b.dataset.a; upd(); gsap.fromTo(input, { scale: 1.1 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }); }));
    input.addEventListener("input", () => { $$(".gbox__amts button").forEach((x) => x.classList.toggle("is-on", x.dataset.a === input.value)); upd(); });
    $$(".gbox__funds button").forEach((b) => b.addEventListener("click", () => $$(".gbox__funds button").forEach((x) => x.classList.toggle("is-on", x === b))));
    const cv = document.createElement("canvas"); cv.className = "confetti"; form.style.position = "sticky"; form.appendChild(cv);
    const boom = confetti(cv);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const r = form.getBoundingClientRect();
      boom(r.width / 2, r.height - 60, 90, 11);
      const old = label.textContent; label.textContent = "Thank you! ♥";
      setTimeout(() => (label.textContent = old), 2400);
    });
    upd();
  })();

  /* =======================================================
     EVENTS — image follows cursor
     ======================================================= */
  (() => {
    const hov = $(".ehover");
    if (!hov || isTouch) return;
    document.body.appendChild(hov);
    const img = $("img", hov);
    const xTo = gsap.quickTo(hov, "x", { duration: 0.6, ease: "power3" }), yTo = gsap.quickTo(hov, "y", { duration: 0.6, ease: "power3" });
    const rTo = gsap.quickTo(hov, "rotation", { duration: 0.8, ease: "power3" });
    let lx = 0, mx = -1, my = -1, active = null, raf = 0;
    const show = (row) => { active = row; img.src = row.dataset.img; gsap.to(hov, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" }); };
    const hide = () => { if (!active) return; active = null; gsap.to(hov, { opacity: 0, scale: 0.6, duration: 0.4, overwrite: "auto" }); };
    $$(".erow").forEach((row) => {
      row.addEventListener("mouseenter", () => show(row));
      row.addEventListener("mouseleave", hide);
      row.addEventListener("mousemove", (e) => { xTo(e.clientX - 140 + 180); yTo(e.clientY - 180); rTo(Math.max(-12, Math.min(12, (e.clientX - lx) * 0.6))); lx = e.clientX; });
    });
    // Smooth scrolling moves the rows under a still cursor without firing mouseleave,
    // so while a photo is showing, re-check each frame what is actually under the cursor.
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const recheck = () => {
      raf = 0;
      if (!active || mx < 0) return;
      const row = document.elementFromPoint(mx, my)?.closest(".erow");
      if (!row) hide();
      else if (row !== active) show(row);
    };
    gsap.ticker.add(() => { if (active && !raf) raf = requestAnimationFrame(recheck); });
    document.addEventListener("mouseleave", hide);
    addEventListener("blur", hide);
  })();

  /* =======================================================
     VERSES — auto-playing scripture carousel + share card
     ======================================================= */
  (() => {
    const sec = $("#verse");
    const V = ((SITE && SITE.verses) || []).filter((v) => v && v.text);
    if (!sec || !V.length) return;
    const q = $(".js-verse-q"), bgs = $$(".js-vbg img"), chips = $$(".vchip"), rail = $(".verse__rail");
    const refEl = $(".js-vref"), trEl = $(".js-vtr"), themeEl = $(".js-vtheme"), numEl = $(".js-vnum"), labelEl = $(".js-vlabel");
    const playBtn = $(".js-vplay");
    const DUR = 9;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Date();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const today = doy % V.length;
    let cur = -1, timer = null, inView = false, userPaused = false, hover = false, token = 0;

    const sizeClass = (t) => (t.length > 115 ? "is-long" : t.length > 70 ? "is-mid" : "is-short");
    const words = (t) => `“${t}”`.split(/\s+/).map((w) => `<span class="vw"><span>${w.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</span></span>`).join(" ");
    const pad = (n) => String(n + 1).padStart(2, "0");

    const tick = () => {
      if (timer) timer.kill();
      const fill = chips[cur] && $(".vchip__fill", chips[cur]);
      if (!fill) return;
      timer = gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: DUR, ease: "none", paused: true, onComplete: () => go(cur + 1, 1) });
      sync();
    };
    const sync = () => {
      const run = inView && !userPaused && !hover && !document.hidden;
      if (timer) run ? timer.play() : timer.pause();
      sec.classList.toggle("is-paused", userPaused);
      playBtn.setAttribute("aria-label", userPaused ? "Play" : "Pause");
    };

    function go(i, dir = 1, instant = false) {
      i = (i + V.length) % V.length;
      if (i === cur) return;
      const v = V[i], my = ++token;
      const prev = cur; cur = i;
      // preload next background
      [i, (i + 1) % V.length].forEach((k) => bgs[k] && bgs[k].setAttribute("loading", "eager"));
      bgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      if (prev > -1 && bgs[prev]) bgs[prev].classList.add("was-on"), setTimeout(() => bgs[prev] && bgs[prev].classList.remove("was-on"), 1600);
      chips.forEach((c, k) => { c.classList.toggle("is-on", k === i); c.setAttribute("aria-selected", k === i); if (k !== i) gsap.set($(".vchip__fill", c), { scaleX: k < i ? 1 : 0 }); });
      if (chips[i] && rail) {
        const c = chips[i];
        rail.scrollTo({ left: c.offsetLeft - rail.clientWidth / 2 + c.offsetWidth / 2, behavior: instant ? "auto" : "smooth" });
      }
      numEl.textContent = pad(i);
      labelEl.textContent = i === today ? "Verse of the day" : "Scripture for you";
      const swapMeta = () => { refEl.textContent = v.ref; trEl.textContent = v.translation || ""; themeEl.textContent = v.theme || ""; };
      const enter = () => {
        if (my !== token) return;
        q.className = `verse__q js-verse-q ${sizeClass(v.text)}`;
        q.innerHTML = words(v.text);
        swapMeta();
        if (reduce || instant) { gsap.set(q.querySelectorAll(".vw > span"), { clearProps: "all" }); return; }
        gsap.fromTo(q.querySelectorAll(".vw > span"), { yPercent: 35 * dir, opacity: 0, filter: "blur(12px)" },
          { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, stagger: 0.045, ease: "expo.out" });
        gsap.fromTo([".verse__ref", ".verse__theme"], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, delay: 0.25, ease: "power3.out" });
      };
      const old = q.querySelectorAll(".vw > span");
      if (instant || reduce || !old.length) enter();
      else gsap.to(old, { yPercent: -30 * dir, opacity: 0, filter: "blur(10px)", duration: 0.42, stagger: 0.012, ease: "power2.in", onComplete: enter });
      tick();
    }

    // controls
    $(".js-vnext").addEventListener("click", () => go(cur + 1, 1));
    $(".js-vprev").addEventListener("click", () => go(cur - 1, -1));
    playBtn.addEventListener("click", () => { userPaused = !userPaused; sync(); });
    chips.forEach((c, k) => c.addEventListener("click", () => go(k, k >= cur ? 1 : -1)));
    const inner = $(".verse__inner");
    inner.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hover = true; sync(); } });
    inner.addEventListener("pointerleave", () => { hover = false; sync(); });
    addEventListener("keydown", (e) => {
      if (!inView || /input|textarea|select/i.test(document.activeElement.tagName)) return;
      if (e.key === "ArrowRight") go(cur + 1, 1);
      else if (e.key === "ArrowLeft") go(cur - 1, -1);
    });
    // swipe (not on the chip rail — it scrolls sideways)
    let sx = 0, sy = 0, st = 0;
    sec.addEventListener("pointerdown", (e) => { if (e.target.closest(".verse__rail, button, a")) { st = 0; return; } sx = e.clientX; sy = e.clientY; st = 1; });
    sec.addEventListener("pointerup", (e) => {
      if (!st) return; st = 0;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    document.addEventListener("visibilitychange", sync);
    ScrollTrigger.create({ trigger: sec, start: "top 70%", end: "bottom 30%", onToggle: (self) => { inView = self.isActive; sync(); } });

    gsap.fromTo(".verse__bg", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".verse", start: "top bottom", end: "bottom top", scrub: true } });
    go(today, 1, true);
    // first reveal when scrolled into view
    if (!reduce) {
      gsap.set(q.querySelectorAll(".vw > span"), { yPercent: 35, opacity: 0, filter: "blur(12px)" });
      ScrollTrigger.create({ trigger: sec, start: "top 60%", once: true, onEnter: () => {
        gsap.to(q.querySelectorAll(".vw > span"), { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, stagger: 0.05, ease: "expo.out" });
      } });
    }

    /* share card — always the verse currently on screen */
    const modal = $(".share-modal"), cv = $(".share-canvas"), ctx = cv.getContext("2d");
    const draw = () => {
      const v = V[cur], bg = bgs[cur];
      const W = 1080, H = 1350;
      ctx.fillStyle = "#0F0B12"; ctx.fillRect(0, 0, W, H);
      try {
        const ir = bg.naturalWidth / bg.naturalHeight, cr = W / H;
        let sw = bg.naturalWidth, sh = bg.naturalHeight, sx = 0, sy = 0;
        if (ir > cr) { sw = sh * cr; sx = (bg.naturalWidth - sw) / 2; } else { sh = sw / cr; sy = (bg.naturalHeight - sh) / 2; }
        ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H);
      } catch (e) {}
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(15,11,18,.4)"); g.addColorStop(1, "rgba(15,11,18,.92)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFC23D"; ctx.font = "500 30px 'Geist Mono', monospace";
      ctx.fillText((cur === today ? "VERSE OF THE DAY" : (v.theme || "SCRIPTURE")).toUpperCase(), 90, 150);
      const size = v.text.length > 115 ? 72 : v.text.length > 70 ? 84 : 100, lh = size * 1.08;
      ctx.fillStyle = "#fff"; ctx.font = `italic ${size}px 'Instrument Serif', serif`;
      let line = "";
      const lines = [];
      `“${v.text}”`.split(" ").forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > 900) { lines.push(line); line = w; } else line = t; });
      lines.push(line);
      let y = H / 2 - (lines.length * lh) / 2 + 40;
      lines.forEach((l) => { ctx.fillText(l, 90, y); y += lh; });
      ctx.font = "500 34px 'Geist Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillText(`${v.ref.toUpperCase()}${v.translation ? "  ·  " + v.translation.toUpperCase() : ""}`, 90, y + 40);
      const logo = $(".footer .logo__img");
      try { if (logo && logo.naturalWidth) { const lh2 = 84, lw = (logo.naturalWidth / logo.naturalHeight) * lh2; ctx.drawImage(logo, 90, H - 168, lw, lh2); } } catch (e) {}
      ctx.fillStyle = "#fff"; ctx.font = "800 40px Bricolage, sans-serif"; ctx.fillText("Agape", 178, H - 124);
      ctx.font = "500 18px 'Geist Mono', monospace"; ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText("INTERNATIONAL MINISTRIES", 180, H - 94);
    };
    let wasPaused = false;
    $(".js-share").addEventListener("click", () => {
      wasPaused = userPaused; userPaused = true; sync();
      const bg = bgs[cur];
      const open = () => { draw(); modal.classList.add("is-open"); smoother && smoother.paused(true); };
      bg && !bg.complete ? (bg.addEventListener("load", open, { once: true }), bg.addEventListener("error", open, { once: true })) : open();
    });
    const close = () => { modal.classList.remove("is-open"); smoother && smoother.paused(false); userPaused = wasPaused; sync(); };
    $(".js-close").addEventListener("click", close);
    modal.addEventListener("click", (e) => e.target === modal && close());
    $(".js-dl").addEventListener("click", () => {
      try { const a = document.createElement("a"); a.download = `agape-${V[cur].ref.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; a.href = cv.toDataURL("image/png"); a.click(); }
      catch (e) { alert("Open the site from a web server to download the card."); }
    });
  })();

  /* =======================================================
     COMMUNITY ACCORDION
     ======================================================= */
  (() => {
    const items = $$(".acc__item");
    const open = (it) => items.forEach((x) => x.classList.toggle("is-open", x === it));
    items.forEach((it) => {
      it.addEventListener("click", () => open(it));
      if (!isTouch) { let t; it.addEventListener("mouseenter", () => { t = setTimeout(() => open(it), 140); }); it.addEventListener("mouseleave", () => clearTimeout(t)); }
    });
  })();

  /* =======================================================
     DOWNLOAD + FOOTER
     ======================================================= */
  gsap.from(".mini-phone", { y: 160, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.12, scrollTrigger: { trigger: ".download", start: "top 70%", once: true } });
  gsap.to(".mini-phone--l", { y: -40, ease: "none", scrollTrigger: { trigger: ".download", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.to(".mini-phone--r", { y: -70, ease: "none", scrollTrigger: { trigger: ".download", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.to(".footer__word span", { backgroundSize: "100% 100%", ease: "none", scrollTrigger: { trigger: ".footer", start: "top 75%", end: "bottom bottom", scrub: true } });

  try { window.AgapeV3 && window.AgapeV3(SITE); } catch (e) { console.warn("[agape v3]", e); }
  try { window.AgapeV4 && window.AgapeV4(SITE); } catch (e) { console.warn("[agape v4]", e); }
  addEventListener("load", () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 1200);
};
