/* =========================================================
   AGAPE — renders editable sections from content, then boots motion.
   ========================================================= */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const light = (hex) => {
    const h = String(hex || "#000").replace("#", "");
    const v = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
    const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 150;
  };

  const assets = () => { if (window.AGAPE_ASSETS) return window.AGAPE_ASSETS; try { return parent !== window && parent.AGAPE_ASSETS ? parent.AGAPE_ASSETS : {}; } catch (e) { return {}; } };

  function render(C, base = "") {
    const A = assets();
    const img = (p) => esc(/^(https?:|data:|blob:)/.test(p || "") ? p : A[p] || base + (p || ""));
    const set = (sel, v, attr) => $$(sel).forEach((el) => (attr ? el.setAttribute(attr, v) : (el.textContent = v)));

    /* church + links */
    set(".js-church-name", C.church.name);
    set(".js-church-tagline", C.church.tagline);
    set(".js-church-address", C.church.address);
    set(".js-yt", C.church.youtube, "href");
    set(".js-maps", C.church.mapsUrl, "href");
    set(".js-ig", C.church.instagram || "#", "href");
    set(".js-fb", C.church.facebook || "#", "href");
    set(".js-wa", C.church.whatsapp ? `https://wa.me/${String(C.church.whatsapp).replace(/\D/g, "")}` : "#", "href");
    document.title = C.church.name;

    /* announcement bar */
    const ann = $(".nav__promo");
    if (ann) {
      ann.href = C.announcement.link || "#";
      $(".js-ann", ann).innerHTML = `<b>${esc(C.announcement.title)}</b> · ${esc(C.announcement.text)}`;
      $(".js-ann-cta", ann).textContent = C.announcement.cta || "Learn more";
    }

    /* stats */
    // only real numbers are shown: a stat the church hasn't filled in (0 / empty) hides its block
    $$("[data-stat]").forEach((el) => {
      const v = Number(C.stats[el.dataset.stat]) || 0;
      el.setAttribute("data-count", v);
      const box = el.closest("[data-stat-box]") || el.parentElement;
      if (box) box.hidden = !v;
    });
    $$(".rides__stats").forEach((w) => (w.hidden = ![...w.children].some((c) => !c.hidden)));

    /* services */
    const svc = C.services || [];
    const times = $(".js-times");
    if (times) times.innerHTML = svc.map((s) => `<div class="time"><small>${esc(DAYS[s.day] || "")}</small><b>${esc(s.time)}</b><span>${esc(s.note || s.label)}</span></div>`).join("");
    const mf = $(".menu__foot");
    if (mf) mf.innerHTML = svc.slice(0, 2).map((s) => `<span>${esc(s.label)} ${esc(s.time)}</span>`).join("");

    /* hero */
    const H = C.hero;
    set(".js-hero-kicker", H.kicker);
    set(".js-hero-line1", H.line1);
    set(".js-hero-lead", H.lead);
    set(".js-reveal-title", H.revealTitle);
    set(".js-reveal-accent", H.revealAccent);
    const word = $(".js-hero-word");
    if (word) { word.dataset.words = JSON.stringify(H.words && H.words.length ? H.words : ["shows up."]); word.textContent = (H.words || ["shows up."])[0]; }
    const slides = $(".js-hero-slides");
    if (slides) slides.innerHTML = (H.slides || []).map((s, i) => `<img src="${img(s.image)}" alt="${esc(s.caption)}" data-caption="${esc(s.caption)}" decoding="async" />`).join("");
    const ring = $(".js-ring");
    if (ring) {
      const seen = new Set();
      const pics = [...(H.slides || []), ...(C.gallery || [])].filter((p) => p.image && !seen.has(p.image) && seen.add(p.image));
      const target = pics.length ? Math.max(16, Math.ceil(16 / pics.length) * pics.length) : 0;
      const list = []; for (let i = 0; i < Math.min(target, 24); i++) list.push(pics[i % pics.length]);
      ring.innerHTML = list.map((p) => `<figure class="h3__card"><img src="${img(p.image)}" alt="${esc(p.caption)}" draggable="false" decoding="async" />${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}</figure>`).join("");
    }
    const dots = $(".js-hero-dots");
    if (dots) dots.innerHTML = (H.slides || []).map(() => "<i></i>").join("");

    /* promos — stacked posters */
    const pc = $(".js-pcards");
    const ringText = (unit, max = 40) => { unit = unit + " · "; let out = unit; while ((out + unit).length <= max) out += unit; return out; };
    const seal = (t, id) => `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="${id}" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs><text><textPath href="#${id}" textLength="498" lengthAdjust="spacing">${esc(t)}</textPath></text></svg>`;
    if (pc) pc.innerHTML = C.promos.map((p, i) => {
      const lt = light(p.color);
      const st = `${p.sticker1 || ""} ${p.sticker2 || ""}`.trim().toUpperCase();
      return `
      <article class="poster ${lt ? "is-lt" : "is-dk"}" ${i === 0 ? 'id="worship"' : ""} style="--c:${esc(p.color)};--i:${i}">
        <div class="poster__in">
          <div class="poster__copy">
            <div class="poster__top"><span class="poster__chip">${esc(p.kicker)}</span><span class="poster__idx">${String(i + 1).padStart(2, "0")} / ${String(C.promos.length).padStart(2, "0")}</span></div>
            <span class="poster__big" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
            <h3 class="poster__title"><span>${esc(p.title)}</span><em>${esc(p.accent)}</em></h3>
            <div class="poster__foot">
              <p>${esc(p.body)}</p>
              <a href="${esc(p.link || "#")}" class="xbtn ${lt ? "xbtn--ink" : "xbtn--light"}" data-magnetic><span class="xbtn__t" data-roll>${esc(p.cta || "Learn more")}</span><i>${ic("arrow-right")}</i></a>
            </div>
          </div>
          <div class="poster__art">
            <figure class="poster__photo"><img src="${img(p.image)}" alt="" ${i > 1 ? 'loading="lazy"' : ""} /></figure>
            ${st ? `<div class="poster__seal">${seal(ringText(st), "ps" + i)}<span><b>${esc(p.sticker1)}</b><small>${esc(p.sticker2)}</small></span></div>` : ""}
          </div>
        </div>
        <span class="poster__glare" aria-hidden="true"></span>
      </article>`;
    }).join("");
    const pb = $(".js-pbars"); if (pb) pb.innerHTML = C.promos.map(() => "<i><b></b></i>").join("");
    set(".js-ptot", String(C.promos.length).padStart(2, "0"));

    /* live */
    const L = C.live;
    const pimg = $(".player__img"); if (pimg) pimg.src = img(L.image);
    const pt2 = $(".player__title"); if (pt2) pt2.innerHTML = `${esc(L.title)} <em>${esc(L.accent)}</em>`;
    const yti = $(".ytcard__thumb img"); if (yti) yti.src = img(L.thumb);
    const yth = $(".ytcard__body h3"); if (yth) yth.innerHTML = `${esc(L.thumbTitle)} <em>${esc(L.thumbAccent)}</em>`;

    /* gallery (two rows) */
    const g = C.gallery || [];
    const half = Math.ceil(g.length / 2);
    const gRow = (list) => list.map((p) => `<figure class="gphoto"><img src="${img(p.image)}" alt="${esc(p.caption)}" loading="lazy" />${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}</figure>`).join("");
    const gt = $$(".gq__track");
    if (gt[0]) gt[0].innerHTML = gt.length === 1 ? gRow(g) : gRow(g.slice(0, half));
    if (gt[1]) gt[1].innerHTML = gRow(g.slice(half).length ? g.slice(half) : g.slice(0, half));

    /* events */
    const el = $(".elist");
    if (el) el.innerHTML = C.events.map((e) => `
      <a href="${esc(e.link || "#")}" class="erow" data-img="${img(e.image)}"><div class="erow__date"><b>${esc(e.day)}</b><span>${esc(e.month)}<br/>${esc(e.weekday)}</span></div><div class="erow__main"><h3>${esc(e.title)}</h3><p>${esc(e.meta)}</p></div><div class="erow__tags">${String(e.tags || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("")}</div><span class="erow__go">RSVP ${ic("arrow-up-right")}</span></a>`).join("");

    /* ministries */
    const acc = $(".acc");
    if (acc) acc.innerHTML = C.ministries.map((m, i) => `
      <article class="acc__item ${i === 0 ? "is-open" : ""}" style="--c:${esc(m.color)}"><img src="${img(m.image)}" alt="" loading="lazy" /><div class="acc__shade"></div><div class="acc__txt"><span class="acc__n">${esc(m.name)}</span><div class="acc__more"><p>${esc(m.text)}</p><span class="chip chip--glass">${esc(m.chip)}</span></div></div></article>`).join("");

    /* campaigns */
    const camps = $(".camps");
    if (camps) camps.innerHTML = C.campaigns.map((c) => {
      const p = c.goal ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
      return `<article class="jar" style="--c:${esc(c.color)}" data-p="${p}"><div class="jar__glass"><canvas class="jar__cv"></canvas><span class="jar__pct"><b>0</b>%</span></div><img class="jar__img" src="${img(c.image)}" alt="" loading="lazy" /><h3>${esc(c.title)} <em>${esc(c.accent)}</em></h3><p>${esc(c.body)}</p><div class="jar__nums"><b>${esc(C.church.currency)} ${fmt(c.raised)}</b><small>of ${fmt(c.goal)} goal</small></div></article>`;
    }).join("");
    const funds = $(".gbox__funds");
    if (funds) funds.innerHTML = ["Tithe", ...C.campaigns.map((c) => `${c.title} ${c.accent}`)].map((f, i) => `<button type="button" class="${i ? "" : "is-on"}">${esc(f)}</button>`).join("");
    set(".js-currency", C.church.currency);

    /* testimonies */
    const t = C.testimonies || [];
    const th = Math.ceil(t.length / 2);
    const tRow = (list) => list.map((q) => `<figure class="tcard" style="--c:${esc(q.color)}"><blockquote>“${esc(q.quote)}”</blockquote><figcaption><span style="--c:${esc(q.accent)}">${esc((q.name || "?")[0])}</span><b>${esc(q.name)}</b><small>${esc(q.role)}</small></figcaption></figure>`).join("");
    const tq = $$(".tq__track");
    if (tq.length > 2) {
      // 3D marquee: spread testimonies across columns, doubled for a seamless vertical loop
      const cols = innerWidth <= 900 ? 2 : tq.length;
      tq.forEach((col, ci) => {
        const mine = t.filter((_, i) => i % cols === ci % cols);
        const list = mine.length ? mine : t.slice(0, 2);
        const html = tRow([...list, ...t.filter((_, i) => i % tq.length !== ci).slice(0, Math.max(0, 3 - list.length))]);
        col.innerHTML = html + html;
      });
    } else {
      if (tq[0]) tq[0].innerHTML = tRow(t.slice(0, th));
      if (tq[1]) tq[1].innerHTML = tRow(t.slice(th).length ? t.slice(th) : t.slice(0, th));
    }
    /* bible verses */
    const V = (C.verses || []).filter((v) => v && v.text);
    const vbg = $(".js-vbg");
    if (vbg) vbg.innerHTML = V.map((v, i) => `<img src="${img(v.image || "assets/img/mountain-open-arms.jpg")}" alt="" decoding="async" ${i > 1 ? 'loading="lazy"' : ""} />`).join("");
    const vch = $(".js-vchips");
    if (vch) vch.innerHTML = V.map((v, i) => `<button type="button" class="vchip" role="tab" data-i="${i}" aria-label="${esc(v.ref)}"><i class="vchip__fill"></i><b>${esc(v.ref)}</b><small>${esc(v.theme || v.translation || "")}</small></button>`).join("");
    set(".js-vtotal", String(V.length).padStart(2, "0"));
    if (V[0]) { set(".js-verse-q", `“${V[0].text}”`); set(".js-vref", V[0].ref); set(".js-vtr", V[0].translation || ""); set(".js-vtheme", V[0].theme || ""); }
    const vs = $("#verse"); if (vs) vs.hidden = !V.length;

    const nn = $(".js-nations-n"); if (nn) nn.textContent = Number(C.stats.nations) ? C.stats.nations : "Many";
    const bl = $(".js-bento-live"); if (bl && C.live && C.live.image) bl.src = img(C.live.image);
  }

  window.AgapeRender = render;

  /* ---------- boot the public site ---------- */
  if (document.body.dataset.page === "site") {
    const start = (C) => {
      render(C);
      window.AGAPE_SITE = C;
      if (window.AgapeBoot) window.AgapeBoot(C);
    };
    const inPreview = /[?&]preview=1/.test(location.search) || window.AGAPE_PREVIEW;
    if (inPreview && parent !== window) {
      // Admin live preview: ask the editor for its unsaved draft.
      let done = false;
      addEventListener("message", (e) => {
        if (done || !e.data || e.data.type !== "agape-preview-content") return;
        done = true;
        const d = window.AgapeStore.defaults();
        start(Object.assign(d, e.data.content));
      });
      parent.postMessage({ type: "agape-preview-ready" }, "*");
      setTimeout(() => { if (!done) { done = true; window.AgapeStore.load().then(start); } }, 2000);
    } else {
      window.AgapeStore.load().then(start).catch(() => start(window.AgapeStore.defaults()));
    }
  }
})();
