/* =========================================================
   AGAPE — scripture posters
   Every verse from the admin becomes a designed poster, in one of
   nine styles: a sticky note on a calendar, grainy teal, stickers,
   a fluid gradient, a photo, a retro sign, a rust card,
   hand-lettering and lime minimal. Sizes use container units so a
   poster looks the same in the carousel and as an exported image.
   ========================================================= */
(function () {
  "use strict";
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clean = (t) => String(t || "").replace(/[“”"]/g, "").trim();

  // the short phrase a poster shouts: the first clause when it's short, otherwise the theme
  const phrase = (v) => {
    const t = clean(v.text), first = t.split(/[,;:.!?]/)[0].trim();
    if (first.split(/\s+/).length <= 9 && first.length <= 48) return first;
    return v.theme || first.split(/\s+/).slice(0, 4).join(" ");
  };
  // split into lines of about n words, then size each line so the block is justified
  const lines = (s, per = 2) => { const w = s.split(/\s+/); const out = []; for (let i = 0; i < w.length; i += per) out.push(w.slice(i, i + per).join(" ")); return out; };
  // pick the words-per-line that fills the space without overflowing it (avail = height in cqw)
  const fit = (s, k, max, per, avail = 70) => {
    let best = null;
    for (let p = per; p <= 4; p++) {
      const ls = lines(s, p), sizes = ls.map((l) => Math.min(max, k / Math.max(3, l.length)));
      const h = sizes.reduce((a, b) => a + b * 0.9, 0);
      best = { ls, sizes };
      if (h <= avail) break;
    }
    const h = best.sizes.reduce((a, b) => a + b * 0.9, 0), shrink = h > avail ? avail / h : 1;
    return best.ls.map((l, i) => `<span style="font-size:${(best.sizes[i] * shrink).toFixed(2)}cqw">${esc(l)}</span>`).join("");
  };
  const refNums = (ref) => esc(ref).replace(/(\d+):(\d+)/, '<b>$1</b><i>:</i><b>$2</b>');
  const word = (v) => (v.theme || phrase(v).split(" ")[0] || "Grace").toUpperCase();
  const sparkle = '<svg viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z"/></svg>';
  const burst = '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M50 58V18M50 58 30 22M50 58 70 22M50 58 14 34M50 58 86 34M8 58h84"/></svg>';
  const PHOTOS = ["alps.jpg", "mountain-peaks.jpg", "cross-mountain.jpg", "cross-hill-sunset.jpg", "sunrise-silhouettes.jpg", "white-chapel.jpg", "dandelion.jpg", "beach-hands.jpg"];

  const T = [
    // 0 — sticky note pinned to a calendar
    (v, i) => {
      const days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      let nums = ""; for (let d = 1; d <= 30; d++) nums += `<i>${d}</i>`;
      return `<div class="pz pz--note"><div class="pz__cal"><div class="pz__days">${days.map((d) => `<i>${d}</i>`).join("")}</div><div class="pz__nums">${nums}</div></div>
        <div class="pz__sticky"><span class="pz__pin"></span><span class="pz__pill">Verse of the day</span><p>${esc(clean(v.text))}</p><small>${esc(v.ref)}</small><span class="pz__doodle">${sparkle}${sparkle}</span></div></div>`;
    },
    // 1 — grainy teal, one huge word
    (v) => `<div class="pz pz--grain"><div class="pz__row"><i>all</i><i>things</i><i>work</i><i>together</i></div>
        <span class="pz__burst">${burst}</span><span class="pz__ref">${refNums(v.ref)}</span>
        <h3 class="pz__huge" style="font-size:${Math.min(30, 150 / Math.max(4, word(v).length)).toFixed(1)}cqw">${esc(word(v))}</h3>
        <p class="pz__body">${esc(clean(v.text))}</p><span class="pz__ast">✳</span></div>`,
    // 2 — big black words with reference stickers
    (v) => `<div class="pz pz--stick"><h3 class="pz__words">${fit(phrase(v), 150, 26, 1, 62)}</h3>
        <span class="pz__s pz__s--a">${esc(v.ref)}</span><span class="pz__s pz__s--b">✝</span><span class="pz__s pz__s--c">${esc(v.theme || "Amen")}</span><span class="pz__s pz__s--d">${sparkle}</span>
        <p class="pz__foot">${esc(clean(v.text))}</p></div>`,
    // 3 — fluid gradient, giant white words and a script word over them
    (v) => `<div class="pz pz--flow"><h3 class="pz__words">${fit(phrase(v).toUpperCase(), 118, 30, 1, 88)}</h3>
        <em class="pz__script">${esc((v.theme || "Love").toLowerCase())}</em>
        <div class="pz__bar"><span>${esc(v.ref)}</span><span>✝ ✝ ✝</span><span>${esc(v.translation || "")}</span></div></div>`,
    // 4 — photograph with clean white type
    (v, i) => `<div class="pz pz--photo" style="background-image:url('assets/img/${PHOTOS[i % PHOTOS.length]}')"><span class="pz__tl">${esc(v.theme || "Scripture")}</span>
        <h3 class="pz__words">${fit(phrase(v), 105, 17, 2, 52)}</h3><p class="pz__body">${esc(clean(v.text))}</p><span class="pz__br">${esc(v.ref)}</span></div>`,
    // 5 — retro sign standing in a field
    (v, i) => `<div class="pz pz--sign" style="background-image:url('assets/img/${PHOTOS[(i + 3) % PHOTOS.length]}')"><div class="pz__card"><span class="pz__q">“</span><em class="pz__script">${esc(v.ref)}</em>
        <h3>${esc(word(v))}</h3><p>${esc(clean(v.text))}</p><span class="pz__q pz__q--end">”</span></div></div>`,
    // 6 — rust card with a cream serif
    (v) => `<div class="pz pz--rust"><div class="pz__card"><p>${esc(clean(v.text))}</p><small>${esc(v.ref)}${v.translation ? " · " + esc(v.translation) : ""}</small></div></div>`,
    // 7 — hand-lettering with sparkles
    (v) => {
      const ws = phrase(v).split(/\s+/), cols = ["#2a3a8a", "#d6337a", "#2a3a8a", "#e0a81c", "#d6337a"];
      return `<div class="pz pz--hand"><h3 class="pz__words">${ws.map((w, k) => `<span style="color:${cols[k % cols.length]};font-size:${Math.min(22, 95 / Math.max(3, w.length)).toFixed(1)}cqw;rotate:${(k % 2 ? 3 : -4)}deg">${esc(w)}</span>`).join("")}</h3>
        <span class="pz__sp pz__sp--a">${sparkle}</span><span class="pz__sp pz__sp--b">${sparkle}</span><span class="pz__sp pz__sp--c">+</span><small>${esc(v.ref)}</small></div>`;
    },
    // 8 — lime minimal
    (v) => `<div class="pz pz--lime"><h3 class="pz__words">${fit(phrase(v).toUpperCase(), 130, 22, 2, 60)}</h3><p class="pz__body">${esc(clean(v.text))}</p>
        <span class="pz__box">${esc(v.ref)}</span><span class="pz__rules"><i></i><i></i></span></div>`,
  ];

  // an uploaded poster image (from /admin) is used as-is; stock backgrounds from the old design are ignored
  const own = (v) => v.image && !/^assets\/img\//.test(v.image);
  window.AgapePosters = { render: (v, i) => (own(v) ? `<div class="pz pz--img"><img src="${esc(v.image)}" alt="${esc(v.ref)}" crossorigin="anonymous" /></div>` : T[i % T.length](v, i)), count: T.length };
})();
