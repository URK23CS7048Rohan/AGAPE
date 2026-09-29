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
    $$("[data-stat]").forEach((el) => { el.setAttribute("data-count", C.stats[el.dataset.stat] ?? 0); });

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
    const dots = $(".js-hero-dots");
    if (dots) dots.innerHTML = (H.slides || []).map(() => "<i></i>").join("");

    /* promos */
    const pt = $(".promos__track");
    if (pt) pt.innerHTML = C.promos.map((p, i) => `
      <article class="promo" ${i === 0 ? 'id="worship"' : ""} style="--accent:${esc(p.color)}">
        <img src="${img(p.image)}" alt="" class="promo__img" ${i > 1 ? 'loading="lazy"' : ""} />
        <div class="promo__shade"></div>
        ${p.sticker1 || p.sticker2 ? `<div class="promo__sticker" style="background:${esc(p.color)};color:${light(p.color) ? "#0F0B12" : "#fff"}"><b>${esc(p.sticker1)}</b><span>${esc(p.sticker2)}</span></div>` : ""}
        <div class="promo__body">
          <span class="chip chip--solid" style="color:${light(p.color) ? "#0F0B12" : "#fff"}">${esc(p.kicker)}</span>
          <h3 class="promo__title">${esc(p.title)}<br/><em>${esc(p.accent)}</em></h3>
          <p>${esc(p.body)}</p>
          <a href="${esc(p.link || "#")}" class="btn btn--light" data-magnetic><span>${esc(p.cta || "Learn more")}</span><i>${ic("arrow-right")}</i></a>
        </div>
      </article>`).join("");

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
    if (gt[0]) gt[0].innerHTML = gRow(g.slice(0, half));
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
      return `<article class="camp" style="--c:${esc(c.color)}"><div class="camp__img"><img src="${img(c.image)}" alt="" loading="lazy" /></div><div class="camp__body"><h3>${esc(c.title)} <em>${esc(c.accent)}</em></h3><p>${esc(c.body)}</p><div class="camp__meter"><div class="dial" data-p="${p}"><span class="dial__v">0%</span></div><div><b>${esc(C.church.currency)} ${fmt(c.raised)}</b><small>of ${fmt(c.goal)} goal</small></div></div></div></article>`;
    }).join("");
    const funds = $(".gbox__funds");
    if (funds) funds.innerHTML = ["Tithe", ...C.campaigns.map((c) => `${c.title} ${c.accent}`)].map((f, i) => `<button type="button" class="${i ? "" : "is-on"}">${esc(f)}</button>`).join("");
    set(".js-currency", C.church.currency);

    /* testimonies */
    const t = C.testimonies || [];
    const th = Math.ceil(t.length / 2);
    const tRow = (list) => list.map((q) => `<figure class="tcard" style="--c:${esc(q.color)}"><blockquote>“${esc(q.quote)}”</blockquote><figcaption><span style="--c:${esc(q.accent)}">${esc((q.name || "?")[0])}</span><b>${esc(q.name)}</b><small>${esc(q.role)}</small></figcaption></figure>`).join("");
    const tq = $$(".tq__track");
    if (tq[0]) tq[0].innerHTML = tRow(t.slice(0, th));
    if (tq[1]) tq[1].innerHTML = tRow(t.slice(th).length ? t.slice(th) : t.slice(0, th));
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
