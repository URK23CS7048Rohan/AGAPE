/* =========================================================
   AGAPE — Admin panel
   ========================================================= */
(function () {
  "use strict";
  const S = window.AgapeStore;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PALETTE = ["#FF5A1F", "#FFC23D", "#FF3D7F", "#6E4BFF", "#2ED3A0", "#4CC3FF", "#B7A5FF", "#0F0B12"];
  const SOFT = ["#FFE3D6", "#FFF0B8", "#FFE0EC", "#E6DEFF", "#D5F5E8", "#DDF1FF"];

  /** Resolve a stored image path for display inside /admin */
  const src = (p) => {
    if (!p) return "";
    if (/^(https?:|data:|blob:)/.test(p)) return p;
    const A = window.AGAPE_ASSETS || {};
    return A[p] || "../" + p;
  };

  let C = null; // working copy of content
  let saved = ""; // JSON of last saved state
  let route = "dashboard";

  /* ================= toasts ================= */
  function toast(msg, err) {
    const t = document.createElement("div");
    t.className = "toast" + (err ? " is-err" : "");
    t.innerHTML = `${ic(err ? "x" : "check")}<span>${esc(msg)}</span>`;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .4s, transform .4s"; t.style.opacity = 0; t.style.transform = "translateY(10px)"; }, 2600);
    setTimeout(() => t.remove(), 3100);
  }

  /* ================= dirty state ================= */
  function markDirty() {
    const d = JSON.stringify(C) !== saved;
    $("#dirty").classList.toggle("is-on", d);
    $("#saveBtn").disabled = !d;
    schedulePreview();
  }
  async function save() {
    const btn = $("#saveBtn");
    btn.disabled = true;
    btn.querySelector("span").textContent = "Saving…";
    try {
      await S.save(C);
      saved = JSON.stringify(C);
      toast("Published. The website and app are updated.");
    } catch (e) {
      toast("Couldn't save: " + e.message, true);
    }
    btn.querySelector("span").textContent = "Save & publish";
    markDirty();
  }

  /* ================= image picking ================= */
  const pick = (multi) =>
    new Promise((res) => {
      const input = multi ? $("#filePickMulti") : $("#filePick");
      input.value = "";
      input.onchange = () => res([...input.files]);
      input.click();
    });
  async function uploadInto(el, file) {
    el.classList.add("is-busy");
    try { return await S.uploadImage(file); }
    catch (e) { toast(e.message, true); return null; }
    finally { el.classList.remove("is-busy"); }
  }
  /** Renders an image picker. onChange(newPath) */
  function imgPicker(value, onChange, shape = "") {
    const el = document.createElement("div");
    el.className = "imgpick " + shape;
    el.tabIndex = 0;
    const paint = (v) => {
      el.innerHTML = (v ? `<img src="${esc(src(v))}" alt="" />` : `<div class="imgpick__empty">${ic("image")}Add image</div>`) +
        `<div class="imgpick__over"><button type="button" data-a="up">${ic("upload")}Replace</button><span style="display:flex;gap:6px"><button type="button" class="round" data-a="url" title="Use image URL">${ic("link")}</button>${v ? `<button type="button" class="round" data-a="rm" title="Remove">${ic("trash")}</button>` : ""}</span></div>`;
    };
    paint(value);
    const set = (v) => { value = v; paint(v); onChange(v); };
    el.addEventListener("click", async (e) => {
      const a = e.target.closest("button")?.dataset.a || (value ? null : "up");
      if (!a) { if (!e.target.closest("button")) { const [f] = await pick(); if (f) { const u = await uploadInto(el, f); if (u) set(u); } } return; }
      e.stopPropagation();
      if (a === "up") { const [f] = await pick(); if (f) { const u = await uploadInto(el, f); if (u) set(u); } }
      if (a === "url") { const u = prompt("Paste an image URL (https://…)", /^https?:/.test(value || "") ? value : ""); if (u) set(u.trim()); }
      if (a === "rm") set("");
    });
    el.addEventListener("dragover", (e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); el.classList.add("is-drag"); } });
    el.addEventListener("dragleave", () => el.classList.remove("is-drag"));
    el.addEventListener("drop", async (e) => {
      el.classList.remove("is-drag");
      const f = [...(e.dataTransfer.files || [])].find((x) => x.type.startsWith("image/"));
      if (!f) return;
      e.preventDefault();
      const u = await uploadInto(el, f);
      if (u) set(u);
    });
    el.addEventListener("paste", async (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
      if (f) { const u = await uploadInto(el, f); if (u) set(u); }
    });
    return el;
  }

  /* ================= generic field ================= */
  function field(def, obj, onChange) {
    const wrap = document.createElement("label");
    wrap.className = "field" + (def.wide ? " span-all" : "");
    const v = obj[def.k];
    const done = (val) => { obj[def.k] = val; onChange && onChange(); if (!def.db) markDirty(); };
    let control = "";
    if (def.type === "bool") { def = { ...def, type: "select", options: [["true", "Yes"], ["false", "No"]], bool: true }; }
    if (def.type === "date") control = `<input type="datetime-local" value="${esc(v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")}" />`;
    else if (def.type === "textarea") control = `<textarea rows="${def.rows || 3}"${def.mono ? ' class="mono" spellcheck="false"' : ""}>${esc(v)}</textarea>`;
    else if (def.type === "select") control = `<select>${def.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`;
    else if (def.type === "color") control = `<div class="color-in"><input type="color" value="${esc(v || "#FF5A1F")}" /><input type="text" value="${esc(v)}" maxlength="9" /><span class="swatches">${(def.soft ? SOFT : PALETTE).map((c) => `<button type="button" style="background:${c}" data-c="${c}" title="${c}"></button>`).join("")}</span></div>`;
    else if (def.type === "tags") control = `<div class="tags">${(v || []).map((t, i) => `<span>${esc(t)}<button type="button" data-i="${i}">${ic("x")}</button></span>`).join("")}<input placeholder="${esc(def.ph || "Type and press Enter")}" /></div>`;
    else if (def.type !== "date") control = `<input type="${def.type === "number" ? "number" : "text"}" value="${esc(v)}" placeholder="${esc(def.ph || "")}" ${def.type === "number" ? 'step="any"' : ""} />`;
    wrap.innerHTML = `<span>${esc(def.label)}</span>${control}${def.hint ? `<small>${esc(def.hint)}</small>` : ""}`;
    if (def.type === "color") {
      const [c, t] = $$("input", wrap);
      c.addEventListener("input", () => { t.value = c.value.toUpperCase(); done(t.value); });
      t.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { c.value = t.value; done(t.value); } });
      $$(".swatches button", wrap).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); c.value = b.dataset.c; t.value = b.dataset.c; done(b.dataset.c); }));
    } else if (def.type === "tags") {
      const input = $("input", wrap);
      const rerender = () => { const n = field(def, obj, onChange); wrap.replaceWith(n); $("input", n).focus(); };
      input.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === ",") && input.value.trim()) { e.preventDefault(); obj[def.k] = [...(obj[def.k] || []), input.value.trim()]; if (!def.db) markDirty(); onChange && onChange(); rerender(); }
        if (e.key === "Backspace" && !input.value && (obj[def.k] || []).length) { obj[def.k] = obj[def.k].slice(0, -1); if (!def.db) markDirty(); onChange && onChange(); rerender(); }
      });
      $$(".tags span button", wrap).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); obj[def.k].splice(+b.dataset.i, 1); if (!def.db) markDirty(); onChange && onChange(); rerender(); }));
    } else {
      const inp = $("input,textarea,select", wrap);
      inp.addEventListener("input", () => done(def.type === "number" ? (inp.value === "" ? (def.nullable ? null : 0) : Number(inp.value)) : def.type === "date" ? (inp.value ? new Date(inp.value).toISOString() : null) : def.bool ? inp.value === "true" : def.type === "select" && def.num ? Number(inp.value) : inp.value));
    }
    return wrap;
  }

  /* ================= list editor ================= */
  function listEditor({ items, fields, image, title, sub, thumbColor, template, addLabel, imageShape, max }) {
    const root = document.createElement("div");
    root.className = "list";
    let openIdx = -1;
    let dragFrom = null;
    const render = () => {
      root.innerHTML = "";
      items.forEach((it, i) => {
        const el = document.createElement("div");
        el.className = "item" + (i === openIdx ? " is-open" : "");
        el.draggable = false;
        const th = image && it[image] ? `<img src="${esc(src(it[image]))}" alt="" />` : `<span style="color:${esc(thumbColor ? thumbColor(it) : "#999")}">${esc((title(it) || "?").trim()[0] || "?")}</span>`;
        el.innerHTML = `<div class="item__head"><span class="item__grip" title="Drag to reorder">${ic("grip-vertical")}</span><div class="item__thumb" style="${thumbColor && !(image && it[image]) ? `background:${esc(thumbColor(it))}22` : ""}">${th}</div><div class="item__text"><b>${esc(title(it) || "Untitled")}</b><small>${esc(sub ? sub(it) : "")}</small></div><div class="item__tools"><button class="icon-btn" data-a="up" title="Move up" ${i === 0 ? "disabled" : ""}>${ic("arrow-up")}</button><button class="icon-btn" data-a="down" title="Move down" ${i === items.length - 1 ? "disabled" : ""}>${ic("arrow-down")}</button><button class="icon-btn" data-a="dup" title="Duplicate">${ic("copy")}</button><button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button></div><span class="icon-btn item__chev">${ic("chevron-down")}</span></div><div class="item__body"></div>`;
        const head = $(".item__head", el);
        head.addEventListener("click", (e) => {
          const b = e.target.closest("button[data-a]");
          if (b) {
            e.stopPropagation();
            const a = b.dataset.a;
            if (a === "up" && i > 0) { [items[i - 1], items[i]] = [items[i], items[i - 1]]; if (openIdx === i) openIdx--; }
            if (a === "down" && i < items.length - 1) { [items[i + 1], items[i]] = [items[i], items[i + 1]]; if (openIdx === i) openIdx++; }
            if (a === "dup") { if (max && items.length >= max) return toast(`Maximum of ${max} items`, true); items.splice(i + 1, 0, clone(it)); openIdx = i + 1; }
            if (a === "del") { if (!confirm(`Delete “${title(it) || "this item"}”?`)) return; items.splice(i, 1); openIdx = -1; }
            markDirty(); render(); return;
          }
          openIdx = openIdx === i ? -1 : i;
          render();
        });
        // drag to reorder (via grip)
        const grip = $(".item__grip", el);
        grip.addEventListener("mousedown", () => (el.draggable = true));
        grip.addEventListener("touchstart", () => (el.draggable = true), { passive: true });
        el.addEventListener("dragstart", (e) => { dragFrom = i; el.classList.add("is-dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); });
        el.addEventListener("dragend", () => { el.draggable = false; el.classList.remove("is-dragging"); $$(".item", root).forEach((x) => x.classList.remove("drop-before", "drop-after")); });
        el.addEventListener("dragover", (e) => {
          if (dragFrom === null) return;
          e.preventDefault();
          const r = el.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
          el.classList.toggle("drop-after", after); el.classList.toggle("drop-before", !after);
        });
        el.addEventListener("dragleave", () => el.classList.remove("drop-before", "drop-after"));
        el.addEventListener("drop", (e) => {
          if (dragFrom === null) return;
          e.preventDefault();
          const r = el.getBoundingClientRect(); let to = e.clientY > r.top + r.height / 2 ? i + 1 : i;
          const [m] = items.splice(dragFrom, 1); if (dragFrom < to) to--; items.splice(to, 0, m);
          dragFrom = null; openIdx = -1; markDirty(); render();
        });
        if (i === openIdx) {
          const body = $(".item__body", el);
          const refreshHead = () => { $(".item__text b", el).textContent = title(it) || "Untitled"; $(".item__text small", el).textContent = sub ? sub(it) : ""; };
          const fwrap = document.createElement("div");
          fwrap.className = "item__fields";
          fields.forEach((f) => fwrap.appendChild(field(f, it, refreshHead)));
          if (image) {
            const g = document.createElement("div"); g.className = "grid";
            const iw = document.createElement("div");
            iw.appendChild(imgPicker(it[image], (v) => { it[image] = v; markDirty(); const t = $(".item__thumb", el); t.innerHTML = v ? `<img src="${esc(src(v))}" alt="" />` : ""; }, imageShape || ""));
            const note = document.createElement("small"); note.className = "muted"; note.style.cssText = "display:block;margin-top:8px;font-size:12px"; note.textContent = "Click, drag a photo here, or paste.";
            iw.appendChild(note);
            g.appendChild(iw); g.appendChild(fwrap); body.appendChild(g);
          } else body.appendChild(fwrap);
        }
        root.appendChild(el);
      });
      const add = document.createElement("button");
      add.className = "add-row";
      add.innerHTML = `${ic("plus")}${esc(addLabel || "Add item")}`;
      add.addEventListener("click", () => { if (max && items.length >= max) return toast(`Maximum of ${max} items`, true); items.push(clone(template)); openIdx = items.length - 1; markDirty(); render(); setTimeout(() => root.lastElementChild.previousElementSibling?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); });
      root.appendChild(add);
    };
    render();
    return root;
  }

  /* ================= database list editor (app content: sermons, courses, groups…) ================= */
  const COLORS = [["#FF5A1F", "Flame"], ["#FFD23F", "Sun"], ["#FF7AB6", "Rose"], ["#9B7BFF", "Violet"], ["#3C8D5E", "Green"], ["#8FA4FF", "Sky"], ["#FFB547", "Orange"], ["#141414", "Ink"]];
  /** YouTube link or id → id */
  const ytId = (v) => {
    const s = String(v || "").trim();
    const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : s ? null : "";
  };
  /**
   * Rows of a Supabase table as an accordion list. Each row saves on its own (Save button),
   * so these edits never mix with the website's "Save & publish".
   */
  function dbEditor({ table, query, fields, image, imageShape, title, sub, thumbColor, thumb, template, addLabel, positions, beforeSave, toForm, extra, empty }) {
    const root = document.createElement("div");
    root.className = "list";
    let rows = [];
    let openKey = null;
    const keyOf = (r) => r.id || r._new;
    const load = async () => {
      root.innerHTML = `<div class="empty">Loading…</div>`;
      try { rows = (await S.select(query)).map((r) => (toForm ? toForm(r) : r)); render(); }
      catch (e) { root.innerHTML = `<div class="empty">Couldn't load: ${esc(e.message)}</div>`; }
    };
    const clean = (r) => {
      const out = {};
      fields.forEach((f) => { if (f.k in r) out[f.k] = r[f.k]; });
      if (image) out[image] = r[image] || null;
      Object.keys(template || {}).forEach((k) => { if (!(k in out) && k in r) out[k] = r[k]; });
      if (positions && !r.id) out.position = r.position ?? rows.length;
      return beforeSave ? beforeSave(out, r) : out;
    };
    const save = async (r, btn) => {
      let data;
      try { data = clean(r); } catch (e) { return toast(e.message, true); }
      btn.disabled = true;
      try {
        if (r.id) Object.assign(r, toForm ? toForm(await S.updateRow(table, { id: r.id }, data)) : await S.updateRow(table, { id: r.id }, data));
        else { const saved = await S.insertRow(table, data); delete r._new; Object.assign(r, toForm ? toForm(saved) : saved); openKey = r.id; }
        r._dirty = false;
        toast("Saved. It's live in the app.");
        render();
      } catch (e) { toast(e.message, true); btn.disabled = false; }
    };
    const swap = async (i, j) => {
      [rows[i], rows[j]] = [rows[j], rows[i]];
      render();
      if (!positions) return;
      try { await Promise.all(rows.map((r, k) => (r.id && r.position !== k ? S.updateRow(table, { id: r.id }, { position: k }).then(() => (r.position = k)) : null))); }
      catch (e) { toast(e.message, true); }
    };
    function render() {
      root.innerHTML = "";
      if (!rows.length && empty) { const e = document.createElement("div"); e.className = "empty"; e.textContent = empty; root.appendChild(e); }
      rows.forEach((it, i) => {
        const k = keyOf(it);
        const el = document.createElement("div");
        el.className = "item" + (k === openKey ? " is-open" : "");
        const pic = (image && it[image]) || (thumb && thumb(it));
        const letter = [...String(title(it) || "?").replace(/^[^\p{L}\p{N}]+/u, "")][0] || "?";
        const th = pic ? `<img src="${esc(src(pic))}" alt="" />` : `<span style="color:${esc(thumbColor ? thumbColor(it) : "#999")}">${esc(letter)}</span>`;
        el.innerHTML = `<div class="item__head"><div class="item__thumb" style="${thumbColor && !pic ? `background:${esc(thumbColor(it))}22` : ""}">${th}</div><div class="item__text"><b>${esc(title(it) || "Untitled")}${it.id ? "" : ` <span class="badge badge--requested">new</span>`}${it._dirty ? ` <span class="badge badge--open">unsaved</span>` : ""}</b><small>${esc(sub ? sub(it) : "")}</small></div><div class="item__tools">${positions ? `<button class="icon-btn" data-a="up" title="Move up" ${i === 0 ? "disabled" : ""}>${ic("arrow-up")}</button><button class="icon-btn" data-a="down" title="Move down" ${i === rows.length - 1 ? "disabled" : ""}>${ic("arrow-down")}</button>` : ""}<button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button></div><span class="icon-btn item__chev">${ic("chevron-down")}</span></div><div class="item__body"></div>`;
        $(".item__head", el).addEventListener("click", async (e) => {
          const b = e.target.closest("button[data-a]");
          if (b) {
            e.stopPropagation();
            if (b.dataset.a === "up") return swap(i, i - 1);
            if (b.dataset.a === "down") return swap(i, i + 1);
            if (b.dataset.a === "del") {
              if (!confirm(`Delete “${title(it) || "this item"}”? This can't be undone.`)) return;
              try { if (it.id) await S.deleteRow(table, { id: it.id }); rows.splice(i, 1); toast("Deleted"); render(); } catch (err) { toast(err.message, true); }
            }
            return;
          }
          openKey = openKey === k ? null : k;
          render();
        });
        if (k === openKey) {
          const body = $(".item__body", el);
          const touch = () => { if (!it._dirty) { it._dirty = true; $(".item__text b", el).insertAdjacentHTML("beforeend", ` <span class="badge badge--open">unsaved</span>`); } $(".item__text small", el).textContent = sub ? sub(it) : ""; };
          const fwrap = document.createElement("div");
          fwrap.className = "item__fields";
          fields.forEach((f) => fwrap.appendChild(field({ ...f, db: true }, it, touch)));
          if (image) {
            const g = document.createElement("div"); g.className = "grid";
            const iw = document.createElement("div");
            iw.appendChild(imgPicker(it[image], (v) => { it[image] = v; touch(); const t = $(".item__thumb", el); t.innerHTML = v ? `<img src="${esc(src(v))}" alt="" />` : ""; }, imageShape || ""));
            g.appendChild(iw); g.appendChild(fwrap); body.appendChild(g);
          } else body.appendChild(fwrap);
          const bar = document.createElement("div");
          bar.style.cssText = "display:flex;gap:10px;margin-top:14px;align-items:center";
          bar.innerHTML = `<button class="btn btn--brand btn--sm"><span>${it.id ? "Save changes" : "Save"}</span><i>${ic("check")}</i></button><small class="muted">Saves straight to the app.</small>`;
          $("button", bar).addEventListener("click", (e) => save(it, e.currentTarget));
          body.appendChild(bar);
          if (extra && it.id) { const x = extra(it); if (x) body.appendChild(x); }
        }
        root.appendChild(el);
      });
      if (addLabel === null) return;
      const add = document.createElement("button");
      add.className = "add-row";
      add.innerHTML = `${ic("plus")}${esc(addLabel || "Add")}`;
      add.addEventListener("click", () => {
        const r = { ...clone(template || {}), _new: "n" + Date.now(), position: rows.length };
        rows.push(r); openKey = r._new; render();
        setTimeout(() => root.querySelector(".item.is-open")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      });
      root.appendChild(add);
    }
    load();
    root.reload = load;
    return root;
  }
  const subCard = (title, text, body) => { const c = document.createElement("div"); c.style.cssText = "margin-top:18px;padding-top:16px;border-top:1px dashed var(--line)"; c.innerHTML = `<h3 style="margin:0 0 4px;font-size:16px">${esc(title)}</h3>${text ? `<p class="muted" style="margin:0 0 12px;font-size:13.5px">${text}</p>` : ""}`; c.appendChild(body); return c; };

  /* ================= views ================= */
  const intro = (title, text, right = "") => `<div class="section-intro"><p>${text}</p>${right}</div>`;
  const card = (title, text, body) => { const c = document.createElement("section"); c.className = "card"; c.innerHTML = `<div class="card__head"><div><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div></div>`; if (body) c.appendChild(body); return c; };
  const fieldsGrid = (defs, obj, cols = 2) => { const g = document.createElement("div"); g.className = `grid grid--${cols}`; defs.forEach((d) => g.appendChild(field(d, obj))); return g; };

  const IMAGE_SLOTS = () => [
    { group: "Hero slideshow", items: C.hero.slides.map((s, i) => ({ label: s.caption || `Slide ${i + 1}`, get: () => s.image, set: (v) => (s.image = v) })) },
    { group: "Promotions", items: C.promos.map((p) => ({ label: `${p.title} ${p.accent}`, get: () => p.image, set: (v) => (p.image = v) })) },
    { group: "Watch / YouTube", items: [{ label: "Live player background", get: () => C.live.image, set: (v) => (C.live.image = v) }, { label: "YouTube card thumbnail", get: () => C.live.thumb, set: (v) => (C.live.thumb = v) }] },
    { group: "Life at Agape gallery", items: C.gallery.map((g, i) => ({ label: g.caption || `Photo ${i + 1}`, get: () => g.image, set: (v) => (g.image = v) })) },
    { group: "Events", items: C.events.map((e) => ({ label: e.title, get: () => e.image, set: (v) => (e.image = v) })) },
    { group: "Ministries", items: C.ministries.map((m) => ({ label: m.name, get: () => m.image, set: (v) => (m.image = v) })) },
    { group: "Bible verse posters (optional, 4:5)", items: (C.verses || []).map((x) => ({ label: x.ref, get: () => x.image, set: (v) => (x.image = v) })) },
    { group: "Giving campaigns", items: C.campaigns.map((c) => ({ label: `${c.title} ${c.accent}`, get: () => c.image, set: (v) => (c.image = v) })) },
  ];

  const VIEWS = {
    /* ---------------------------------------------------------- DASHBOARD */
    dashboard: { title: "Dashboard", crumb: "Overview", icon: "layout-dashboard", group: "Overview", async render(v) {
      const st = await S.stats().catch(() => ({}));
      const prayers = await S.list("prayer_requests").catch(() => []);
      const rides = await S.list("rides").catch(() => []);
      const h = new Date().getHours();
      v.innerHTML = `
        <div class="hello"><img src="${esc(src(C.hero.slides[0]?.image))}" alt="" /><div><span class="eyebrow" style="color:rgba(255,255,255,.75)">${esc(C.church.name)}</span><h2>Good ${h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}, <em>${esc((S.session()?.user?.email || "friend").split("@")[0])}.</em></h2><p>Everything on the website and in the app is managed here: photos, promotions, events, giving, prayer, rides and members.</p></div></div>
        <div class="stats">
          <div class="stat"><small>Members</small><b>${fmt(st.members)}</b><i>+${fmt(st.new_members)} this month</i></div>
          <div class="stat"><small>Active learners</small><b>${fmt(st.active_learners)}</b><i>last 30 days</i></div>
          <div class="stat"><small>Sermon views</small><b>${fmt(st.total_views)}</b><i>in the app</i></div>
          <div class="stat"><small>Rides</small><b>${fmt(st.rides_waiting)}</b><i>waiting · ${fmt(st.rides_completed)} completed</i></div>
          <div class="stat"><small>Pastoral care</small><b>${fmt(st.care_open)}</b><i>open requests</i></div>
        </div>
        <div class="quick">
          <a href="#images"><span class="qi" style="background:var(--brand)">${ic("image")}</span><b>Change photos</b><small>Every image on the site, in one place</small></a>
          <a href="#promos"><span class="qi" style="background:var(--rose)">${ic("megaphone")}</span><b>Promotions</b><small>${C.promos.length} cards in the carousel</small></a>
          <a href="#events"><span class="qi" style="background:var(--violet)">${ic("calendar")}</span><b>Events</b><small>${C.events.length} upcoming</small></a>
          <a href="#sermons"><span class="qi" style="background:var(--mint)">${ic("youtube-play")}</span><b>Sermons</b><small>Add messages to the app</small></a>
        </div>
        <div class="two">
          <section class="card"><div class="card__head"><div><h2>Latest prayer requests</h2><p>Moderate them from the Prayer wall page.</p></div><a class="btn btn--ghost btn--sm" href="#prayer">Open</a></div>
            ${prayers.slice(0, 4).map((p) => `<div style="display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--line)"><span class="avatar" style="width:34px;height:34px;font-size:13px">${esc((p.author || "A")[0])}</span><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(p.author || "Member")}</b><div class="muted" style="font-size:14px">${esc(p.body)}</div></div><span class="badge ${p.hidden ? "badge--hidden" : p.answered ? "badge--answered" : "badge--open"}">${p.hidden ? "Hidden" : p.answered ? "Answered" : `${p.pray_count} praying`}</span></div>`).join("") || `<div class="empty">No requests yet.</div>`}
          </section>
          <section class="card"><div class="card__head"><div><h2>Ride requests</h2><p>Waiting for a volunteer driver.</p></div><a class="btn btn--ghost btn--sm" href="#rides">Open</a></div>
            ${rides.filter((r) => r.status === "requested").slice(0, 4).map((r) => `<div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line)"><span class="avatar" style="width:34px;height:34px;font-size:13px;background:linear-gradient(135deg,var(--mint),var(--sky))">${esc((r.member || "?")[0])}</span><div style="flex:1"><b style="font-size:14px">${esc(r.member)}</b><div class="muted" style="font-size:13px">${esc(r.pickup_label)} · ${esc(r.requested_for)}</div></div><span class="badge badge--requested">${r.seats} seat${r.seats > 1 ? "s" : ""}</span></div>`).join("") || `<div class="empty">All rides are covered 🙌</div>`}
          </section>
        </div>`;
    } },

    /* ---------------------------------------------------------- IMAGES */
    images: { title: "All images", crumb: "Website", icon: "image", group: "Website", render(v) {
      v.innerHTML = intro("", "Every photo on the website and app, grouped by section. Click a photo to replace it, drag a new one onto it, or paste one. Photos are resized automatically.");
      IMAGE_SLOTS().forEach((g) => {
        const sec = document.createElement("div"); sec.className = "lib-group";
        sec.innerHTML = `<h3>${esc(g.group)} <small>${g.items.length} image${g.items.length === 1 ? "" : "s"}</small></h3>`;
        const lib = document.createElement("div"); lib.className = "lib";
        g.items.forEach((it) => {
          const f = document.createElement("figure");
          f.appendChild(imgPicker(it.get(), (val) => { it.set(val); markDirty(); }));
          const cap = document.createElement("figcaption"); cap.innerHTML = `${esc(it.label)}<small>${esc(g.group)}</small>`;
          f.appendChild(cap); lib.appendChild(f);
        });
        sec.appendChild(lib); v.appendChild(sec);
      });
    } },

    /* ---------------------------------------------------------- HERO */
    hero: { title: "Homepage hero", crumb: "Website", icon: "sparkles", group: "Website", render(v) {
      v.innerHTML = intro("", "The website opens with a 3D story (night → dawn → the empty tomb) with three lines of Scripture, then the arch hero with your headline, a rotating verse, a countdown and the watch-live seal.");
      if (!Array.isArray(C.story)) C.story = [];
      v.appendChild(card("Opening story", "Three lines of Scripture shown as the 3D scene moves from night, to dawn at the cross, to the empty tomb. The third is shown huge, with its last word in italics.", listEditor({
        items: C.story, max: 3, addLabel: "Add a line",
        title: (s) => s.ref || "Scripture", sub: (s) => s.text, template: { text: "", ref: "" },
        fields: [{ k: "text", label: "Scripture", type: "textarea", wide: true }, { k: "ref", label: "Reference", ph: "John 3:16" }],
      })));
      v.appendChild(card("Arch hero headline", "“Love that” + a cycling word, e.g. “shows up.”, “prays.” The verse beside it rotates through your Bible verses.", fieldsGrid([
        { k: "kicker", label: "Small label above the headline" },
        { k: "line1", label: "First line" },
        { k: "words", label: "Cycling words (press Enter after each)", type: "tags", wide: true },
        { k: "lead", label: "Intro paragraph", type: "textarea", wide: true },
      ], C.hero)));
      v.appendChild(card("App home slideshow", "Photos that crossfade at the top of the app's home screen. Drag to reorder. Wide, landscape photos look best.", listEditor({
        items: C.hero.slides, image: "image", imageShape: "imgpick--wide", max: 10, addLabel: "Add a slide",
        title: (s) => s.caption, sub: () => "Hero slide", template: { image: "", caption: "New slide" },
        fields: [{ k: "caption", label: "Caption shown on the photo", wide: true }],
      })));
    } },

    /* ---------------------------------------------------------- PROMOS */
    promos: { title: "Promotions", crumb: "Website", icon: "megaphone", group: "Website", render(v) {
      v.innerHTML = intro("", "Big cards in the “Don't miss what's next” carousel. They also appear on the app's home screen. Use them for campaigns, special services, courses and announcements.");
      v.appendChild(listEditor({
        items: C.promos, image: "image", imageShape: "imgpick--tall", addLabel: "Add a promotion", max: 12,
        title: (p) => `${p.title} ${p.accent}`, sub: (p) => p.kicker, thumbColor: (p) => p.color,
        template: { kicker: "New", title: "Big", accent: "announcement", body: "Tell people what's happening and why it matters.", cta: "Learn more", link: "#events", image: "", color: "#FF5A1F", sticker1: "New", sticker2: "" },
        fields: [
          { k: "title", label: "Title (bold)" }, { k: "accent", label: "Accent (italic)" },
          { k: "kicker", label: "Label chip" }, { k: "color", label: "Accent colour", type: "color" },
          { k: "body", label: "Description", type: "textarea", wide: true },
          { k: "cta", label: "Button text" }, { k: "link", label: "Button link", hint: "#events, #give, #app… or any https:// link" },
          { k: "sticker1", label: "Sticker line 1 (optional)", ph: "Oct" }, { k: "sticker2", label: "Sticker line 2", ph: "16–18" },
        ],
      }));
    } },

    /* ---------------------------------------------------------- GALLERY */
    gallery: { title: "Photo gallery", crumb: "Website", icon: "images", group: "Website", render(v) {
      v.innerHTML = intro("", "The moving “Life at Agape” photo rows. Add as many photos as you like, drag to reorder, and type captions right on the card.");
      const drop = document.createElement("div");
      drop.className = "drop";
      drop.innerHTML = `${ic("cloud-upload")}<b>Drop photos here</b><span>or click to choose several at once</span>`;
      v.appendChild(drop);
      const grid = document.createElement("div"); grid.className = "gal"; v.appendChild(grid);
      const addFiles = async (files) => {
        files = files.filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        drop.innerHTML = `${ic("loader")}<b>Uploading ${files.length} photo${files.length > 1 ? "s" : ""}…</b>`;
        for (const f of files) { try { C.gallery.push({ image: await S.uploadImage(f), caption: "" }); } catch (e) { toast(e.message, true); } }
        markDirty(); toast(`${files.length} photo${files.length > 1 ? "s" : ""} added`); VIEWS.gallery.render((v.innerHTML = "", v));
      };
      drop.addEventListener("click", async () => addFiles(await pick(true)));
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("is-drag"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-drag"));
      drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("is-drag"); addFiles([...e.dataTransfer.files]); });
      let from = null;
      const paint = () => {
        grid.innerHTML = "";
        C.gallery.forEach((g, i) => {
          const it = document.createElement("div"); it.className = "gal__item"; it.draggable = true;
          it.appendChild(imgPicker(g.image, (val) => { g.image = val; markDirty(); }));
          const row = document.createElement("div"); row.style.cssText = "display:flex;align-items:center";
          row.innerHTML = `<input value="${esc(g.caption)}" placeholder="Add a caption…" /><button class="icon-btn is-danger" title="Remove">${ic("trash")}</button>`;
          $("input", row).addEventListener("input", (e) => { g.caption = e.target.value; markDirty(); });
          $("button", row).addEventListener("click", () => { C.gallery.splice(i, 1); markDirty(); paint(); });
          it.appendChild(row);
          it.addEventListener("dragstart", (e) => { if (e.target.closest("input")) return e.preventDefault(); from = i; it.classList.add("is-dragging"); e.dataTransfer.setData("text/plain", "g"); });
          it.addEventListener("dragend", () => { it.classList.remove("is-dragging"); from = null; $$(".gal__item", grid).forEach((x) => x.classList.remove("drop-target")); });
          it.addEventListener("dragover", (e) => { if (from === null) return; e.preventDefault(); it.classList.add("drop-target"); });
          it.addEventListener("dragleave", () => it.classList.remove("drop-target"));
          it.addEventListener("drop", (e) => { if (from === null) return; e.preventDefault(); e.stopPropagation(); const [m] = C.gallery.splice(from, 1); C.gallery.splice(i, 0, m); from = null; markDirty(); paint(); });
          grid.appendChild(it);
        });
      };
      paint();
    } },

    /* ---------------------------------------------------------- EVENTS */
    events: { title: "Events", crumb: "Website", icon: "calendar", group: "Website", render(v) {
      v.innerHTML = intro("", "The “What's on” list. When visitors hover an event on a computer, its photo appears beside their cursor.");
      v.appendChild(listEditor({
        items: C.events, image: "image", addLabel: "Add an event",
        title: (e) => e.title, sub: (e) => `${e.weekday} ${e.day} ${e.month} · ${e.meta}`,
        template: { day: "01", month: "Dec", weekday: "Sun", title: "New event", meta: "10:00 AM · Main hall", tags: "Everyone", image: "", link: "#" },
        fields: [
          { k: "title", label: "Event name", wide: true },
          { k: "day", label: "Day (number)", ph: "16" }, { k: "month", label: "Month", ph: "Oct" },
          { k: "weekday", label: "Weekday", ph: "Fri" }, { k: "link", label: "RSVP link", ph: "# or https://…" },
          { k: "meta", label: "Time · place · details", wide: true },
          { k: "tags", label: "Tags (comma separated)", wide: true, ph: "Worship, All ages" },
        ],
      }));
    } },

    /* ---------------------------------------------------------- MINISTRIES */
    ministries: { title: "Ministries", crumb: "Website", icon: "users", group: "Website", render(v) {
      v.innerHTML = intro("", "The expanding panels in “There's a seat with your name on it”. They also appear as groups in the app.");
      v.appendChild(listEditor({
        items: C.ministries, image: "image", imageShape: "imgpick--tall", addLabel: "Add a ministry",
        title: (m) => m.name, sub: (m) => m.chip, thumbColor: (m) => m.color,
        template: { name: "New ministry", text: "What it is and who it's for.", chip: "Weekly", image: "", color: "#FF5A1F" },
        fields: [{ k: "name", label: "Name" }, { k: "color", label: "Colour", type: "color" }, { k: "text", label: "Description", type: "textarea", wide: true }, { k: "chip", label: "When / who (small chip)", wide: true }],
      }));
    } },

    /* ---------------------------------------------------------- GIVING */
    giving: { title: "Giving campaigns", crumb: "Website", icon: "heart", group: "Website", render(v) {
      v.innerHTML = intro("", "Campaigns with live progress dials. Update “raised” as donations come in (once online payments are connected, this updates automatically).");
      v.appendChild(listEditor({
        items: C.campaigns, image: "image", addLabel: "Add a campaign",
        title: (c) => `${c.title} ${c.accent}`, sub: (c) => `${C.church.currency} ${fmt(c.raised)} of ${fmt(c.goal)} · ${c.goal ? Math.round((c.raised / c.goal) * 100) : 0}%`, thumbColor: (c) => c.color,
        template: { title: "New", accent: "campaign", body: "What this campaign will build.", raised: 0, goal: 10000, image: "", color: "#FF5A1F" },
        fields: [{ k: "title", label: "Title" }, { k: "accent", label: "Accent (italic)" }, { k: "body", label: "Description", type: "textarea", wide: true }, { k: "raised", label: "Raised so far", type: "number" }, { k: "goal", label: "Goal", type: "number" }, { k: "color", label: "Colour", type: "color" }],
      }));
    } },

    /* ---------------------------------------------------------- TESTIMONIES */
    testimonies: { title: "Quotes on the website", crumb: "Website", icon: "quote", group: "Website", render(v) {
      v.innerHTML = intro("", "Stories of answered prayer, shown in two moving rows. Always get permission before publishing someone's story.");
      v.appendChild(listEditor({
        items: C.testimonies, addLabel: "Add a testimony",
        title: (t) => t.name, sub: (t) => t.quote, thumbColor: (t) => t.accent,
        template: { quote: "Share what God has done…", name: "Name", role: "Member", color: "#FFE3D6", accent: "#FF5A1F" },
        fields: [{ k: "quote", label: "Testimony", type: "textarea", wide: true }, { k: "name", label: "Name" }, { k: "role", label: "Subtitle", ph: "Member since 2024" }, { k: "color", label: "Card colour", type: "color", soft: true }, { k: "accent", label: "Avatar colour", type: "color" }],
      }));
    } },

    /* ---------------------------------------------------------- BIBLE VERSES */
    verses: { title: "Bible verses", crumb: "Website", icon: "book-open", group: "Website", render(v) {
      if (!Array.isArray(C.verses)) C.verses = [];
      v.innerHTML = intro("", "The Scripture posters on the website and the verse of the day in the app (Bible tab). One verse is picked as “Verse of the day” each day, the same on both, and visitors can tap through the rest. Use a public-domain translation (KJV, WEB) or one you have permission to quote. Each verse is shown as a designed poster; upload your own poster image (4:5, e.g. 1080×1350 from Canva) to use it instead.");
      v.appendChild(listEditor({
        items: C.verses, image: "image", imageShape: "imgpick--wide", addLabel: "Add a verse",
        title: (x) => `${x.ref || "New verse"}${x.translation ? " · " + x.translation : ""}`, sub: (x) => x.text,
        template: { text: "Your word is a lamp to my feet, and a light for my path.", ref: "Psalm 119:105", translation: "WEB", theme: "Guidance", image: "" },
        fields: [{ k: "text", label: "Verse", type: "textarea", wide: true }, { k: "ref", label: "Reference", ph: "John 3:16" }, { k: "translation", label: "Translation", ph: "KJV, WEB, NIV…" }, { k: "theme", label: "Theme (small label)", ph: "Hope" }],
      }));
    } },

    /* ---------------------------------------------------------- WATCH */
    watch: { title: "Watch & YouTube", crumb: "Website", icon: "youtube-play", group: "Website", render(v) {
      v.innerHTML = intro("", "The live player plays the latest uploads from your YouTube channel. Set the channel and the artwork here.");
      v.appendChild(card("App download", "The website's download buttons. The Android link points at the newest APK built by GitHub Actions; add the App Store link once the iPhone app is published.", fieldsGrid([{ k: "androidApk", label: "Android APK link", wide: true }, { k: "iosUrl", label: "App Store link (optional)", wide: true }], C.church)));
      v.appendChild(card("YouTube channel", "Channel ID starts with “UC”. Find it on YouTube under About → Share channel → Copy channel ID.", fieldsGrid([{ k: "youtube", label: "Channel link" }, { k: "youtubeChannelId", label: "Channel ID" }], C.church)));
      const g = document.createElement("div"); g.className = "grid grid--2";
      const a = document.createElement("div"); a.innerHTML = `<div class="field"><span>Player background</span></div>`; a.appendChild(imgPicker(C.live.image, (x) => { C.live.image = x; markDirty(); }, "imgpick--wide"));
      const b = document.createElement("div"); b.innerHTML = `<div class="field"><span>YouTube card thumbnail</span></div>`; b.appendChild(imgPicker(C.live.thumb, (x) => { C.live.thumb = x; markDirty(); }, "imgpick--wide"));
      g.appendChild(a); g.appendChild(b);
      const c2 = card("Artwork & titles", "", g);
      c2.appendChild(Object.assign(fieldsGrid([{ k: "title", label: "Player title" }, { k: "accent", label: "…italic accent" }, { k: "thumbTitle", label: "Card title" }, { k: "thumbAccent", label: "…italic accent" }], C.live, 4), { style: "margin-top:16px" }));
      v.appendChild(c2);
    } },

    /* ---------------------------------------------------------- CHURCH INFO */
    /* ---------------------------------------------------------- APP: SERMONS */
    sermons: { title: "Sermons", crumb: "App", icon: "youtube-play", group: "App", async render(v) {
      v.innerHTML = intro("", "Messages in the app's Watch tab. Paste a YouTube link for each one. Mark a message as <b>Live</b> while you're streaming and it appears at the top with live chat.");
      let series = [];
      try { series = await S.select("series?select=id,title&order=position,created_at.desc"); } catch (e) { toast(e.message, true); }
      v.appendChild(card("Series", "Group messages into series (by book of the Bible or by topic).", dbEditor({
        table: "series", query: "series?select=id,title,book,topic,color,cover_url,position&order=position,created_at.desc", positions: true,
        image: "cover_url", imageShape: "imgpick--wide", addLabel: "Add a series", empty: "No series yet.",
        title: (s) => s.title, sub: (s) => [s.book, s.topic].filter(Boolean).join(" · "), thumbColor: (s) => s.color || "#9B7BFF",
        template: { title: "New series", book: "", topic: "", color: "#9B7BFF", cover_url: "" },
        fields: [{ k: "title", label: "Series title", wide: true }, { k: "book", label: "Book of the Bible", ph: "Romans" }, { k: "topic", label: "…or topic", ph: "Faith" }, { k: "color", label: "Card colour", type: "color" }],
      })));
      v.appendChild(card("Messages", "Newest first. The thumbnail comes from YouTube unless you add your own photo.", dbEditor({
        table: "videos", query: "videos?select=id,title,speaker,series_id,youtube_id,description,is_live,published_at,duration_sec,cover_url,views&order=published_at.desc.nullslast&limit=300",
        image: "cover_url", imageShape: "imgpick--wide", addLabel: "Add a message", empty: "No messages yet.",
        title: (m) => (m.is_live ? "🔴 " : "") + (m.title || ""), sub: (m) => [m.speaker, m.published_at ? String(m.published_at).slice(0, 10) : "", m.views ? `${fmt(m.views)} views` : ""].filter(Boolean).join(" · "),
        thumbColor: () => "#FF5A1F", thumb: (m) => (m.youtube_id ? `https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg` : null),
        template: { title: "New message", speaker: "", series_id: "", youtube: "", description: "", is_live: false, published_at: new Date().toISOString(), minutes: null, cover_url: "" },
        toForm: (r) => ({ ...r, series_id: r.series_id || "", youtube: r.youtube_id ? `https://youtu.be/${r.youtube_id}` : "", minutes: r.duration_sec ? Math.round(r.duration_sec / 60) : null }),
        beforeSave: (out, r) => {
          const id = ytId(r.youtube);
          if (id === null) throw new Error("That doesn't look like a YouTube link.");
          out.youtube_id = id || null; delete out.youtube;
          out.duration_sec = r.minutes ? Math.round(r.minutes * 60) : null; delete out.minutes;
          out.series_id = r.series_id || null;
          return out;
        },
        fields: [
          { k: "title", label: "Title", wide: true }, { k: "speaker", label: "Speaker", ph: "Ps. John Mathew" },
          { k: "series_id", label: "Series", type: "select", options: [["", "No series"], ...series.map((s) => [s.id, s.title])] },
          { k: "youtube", label: "YouTube link", wide: true, ph: "https://youtu.be/…", hint: "Leave empty for a live service: the app then plays the channel's live stream." },
          { k: "published_at", label: "Date", type: "date" }, { k: "minutes", label: "Length (minutes)", type: "number", nullable: true },
          { k: "is_live", label: "Live now?", type: "bool" },
          { k: "description", label: "Description", type: "textarea", wide: true },
        ],
      })));
    } },

    /* ---------------------------------------------------------- APP: COURSES */
    courses: { title: "Courses", crumb: "App", icon: "graduation-cap", group: "App", render(v) {
      v.innerHTML = intro("", "Courses in the app's Grow tab. Open a course to add its lessons. Members tick off lessons in order, and their progress is saved. Only <b>published</b> courses are shown.");
      v.appendChild(card("Courses", "", dbEditor({
        table: "courses", query: "courses?select=id,title,category,description,color,cover_url,published,position&order=position,created_at", positions: true,
        image: "cover_url", imageShape: "imgpick--wide", addLabel: "Add a course", empty: "No courses yet.",
        title: (c) => c.title, sub: (c) => `${c.published ? "Published" : "Draft"}${c.category ? ` · ${c.category}` : ""}`, thumbColor: (c) => c.color || "#9B7BFF",
        template: { title: "New course", category: "Bible", description: "", color: "#9B7BFF", cover_url: "", published: false },
        fields: [{ k: "title", label: "Course title", wide: true }, { k: "category", label: "Category", ph: "Bible, Explore, Leadership" }, { k: "published", label: "Published in the app?", type: "bool" }, { k: "color", label: "Colour", type: "color" }, { k: "description", label: "Description", type: "textarea", wide: true }],
        extra: (c) => subCard("Lessons", "Each lesson can link to a YouTube video, a PDF or any page, and have notes to read.", dbEditor({
          table: "lessons", query: `lessons?select=id,title,kind,minutes,url,body,position,course_id&course_id=eq.${c.id}&order=position`, positions: true,
          addLabel: "Add a lesson", empty: "No lessons yet.",
          title: (l) => l.title, sub: (l) => [l.kind, l.minutes ? `${l.minutes} min` : ""].filter(Boolean).join(" · "), thumbColor: () => c.color || "#9B7BFF",
          template: { title: "New lesson", kind: "video", minutes: 15, url: "", body: "", course_id: c.id },
          beforeSave: (out, r) => ({ ...out, course_id: c.id, position: r.position ?? 0, url: out.url || null, body: out.body || null }),
          fields: [{ k: "title", label: "Lesson title", wide: true }, { k: "kind", label: "Type", type: "select", options: [["video", "Video"], ["pdf", "PDF / reading"], ["quiz", "Quiz / reflection"]] }, { k: "minutes", label: "Minutes", type: "number", nullable: true }, { k: "url", label: "Link (YouTube, PDF or page)", wide: true, ph: "https://…" }, { k: "body", label: "Notes shown in the app", type: "textarea", wide: true }],
        })),
      })));
    } },

    /* ---------------------------------------------------------- APP: STUDY GUIDES */
    guides: { title: "Study guides", crumb: "App", icon: "file-text", group: "App", render(v) {
      v.innerHTML = intro("", "PDFs shown under Grow → Study guides. Upload the PDF anywhere public (Google Drive “anyone with the link”, Supabase Storage, your website) and paste the link.");
      v.appendChild(card("Study guides", "", dbEditor({
        table: "documents", query: "documents?select=id,title,url,pages,color,position&order=position,created_at.desc", positions: true,
        addLabel: "Add a study guide", empty: "No study guides yet.",
        title: (d) => d.title, sub: (d) => [d.pages ? `${d.pages} pages` : "", d.url].filter(Boolean).join(" · "), thumbColor: (d) => d.color || "#FF5A1F",
        template: { title: "New study guide", url: "", pages: null, color: "#FF5A1F" },
        beforeSave: (out) => { if (!/^https?:\/\//.test(out.url || "")) throw new Error("Add the PDF link (https://…)."); return out; },
        fields: [{ k: "title", label: "Title", wide: true }, { k: "url", label: "PDF link", wide: true, ph: "https://…" }, { k: "pages", label: "Pages", type: "number", nullable: true }, { k: "color", label: "Colour", type: "color" }],
      })));
    } },

    /* ---------------------------------------------------------- APP: SONGS */
    songs: { title: "Song book", crumb: "App", icon: "music", group: "App", render(v) {
      v.innerHTML = intro("", "Lyrics and chords in the app's song book. Write each section on its own with a heading in curly brackets, and put chords in square brackets right before the syllable they land on. Members can change the key, add a capo or hide the chords.");
      v.appendChild(card("How to write a song", "", (() => { const d = document.createElement("pre"); d.className = "codehint"; d.textContent = "{Verse 1}\nA[G]mazing grace! How [G7]sweet the [C]sound\nThat [G]saved a wretch like [D]me!\n\n{Chorus}\n…"; return d; })()));
      v.appendChild(card("Songs", "", dbEditor({
        table: "songs", query: "songs?select=id,slug,title,author,original_key,tempo,time_sig,tags,body,copyright,published,position&order=position,title", positions: true,
        addLabel: "Add a song", empty: "No songs yet.",
        title: (d) => d.title, sub: (d) => [d.author, d.original_key ? `Key ${d.original_key}` : "", d.published === false ? "hidden" : ""].filter(Boolean).join(" · "), thumbColor: () => "#3C8D5E",
        template: { title: "New song", slug: "", author: "", original_key: "G", tempo: null, time_sig: "4/4", tags: [], body: "{Verse 1}\n[G]First line of the song", copyright: "", published: true },
        beforeSave: (out) => {
          if (!out.title || !String(out.title).trim()) throw new Error("Give the song a title.");
          if (!out.body || !/\S/.test(out.body)) throw new Error("Add the lyrics.");
          out.slug = (out.slug && String(out.slug).trim()) || String(out.title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          if (out.original_key && !/^[A-G][#b]?m?$/.test(out.original_key)) throw new Error("Key should look like G, Bb, F#m…");
          return out;
        },
        fields: [
          { k: "title", label: "Title", wide: true }, { k: "author", label: "Writer / credit" }, { k: "original_key", label: "Key", ph: "G" },
          { k: "tempo", label: "Tempo (bpm)", type: "number", nullable: true }, { k: "time_sig", label: "Time", ph: "4/4" },
          { k: "tags", label: "Tags (press Enter after each)", type: "tags", wide: true },
          { k: "body", label: "Lyrics with chords", type: "textarea", wide: true, rows: 16, mono: true },
          { k: "copyright", label: "Copyright line", wide: true, ph: "Public domain, or CCLI song # / licence" },
          { k: "published", label: "Show in the app", type: "bool" },
        ],
      })));
    } },

    /* ---------------------------------------------------------- APP: READING PLANS */
    plans: { title: "Reading plans", crumb: "App", icon: "book-open", group: "App", render(v) {
      v.innerHTML = intro("", "Plans under Bible → Reading plans in the app. Write the days in the box below: each day starts with ## and its title, then the Bible references on one line (separated by ;), then the devotion, and a reflection question starting with ?.");
      v.appendChild(card("How to write the days", "", (() => { const d = document.createElement("pre"); d.className = "codehint"; d.textContent = "## The Word became flesh\nJohn 1; Psalm 19\nJohn begins before the beginning…\n? Where do I most need to remember that Jesus came close?\n\n## Water into wine\nJohn 2\n…"; return d; })()));
      const toText = (days) => (days || []).map((d) => [`## ${d.title || ""}`, (d.refs || []).join("; "), d.devotion || "", d.prompt ? `? ${d.prompt}` : ""].filter((x, i) => i < 2 || x).join("\n")).join("\n\n");
      const fromText = (t) => String(t || "").split(/^##\s*/m).map((b) => b.trim()).filter(Boolean).map((b) => {
        const lines = b.split("\n"); const title = lines.shift().trim(); const refs = (lines.shift() || "").split(/;/).map((x) => x.trim()).filter(Boolean);
        const prompt = lines.filter((l) => /^\?\s*/.test(l)).map((l) => l.replace(/^\?\s*/, "")).join(" ").trim();
        const devotion = lines.filter((l) => !/^\?\s*/.test(l)).join("\n").trim();
        return { title, refs, ...(devotion ? { devotion } : {}), ...(prompt ? { prompt } : {}) };
      });
      v.appendChild(card("Plans", "", dbEditor({
        table: "reading_plans", query: "reading_plans?select=id,slug,title,subtitle,description,audience,image,color,days,published,position&order=position,created_at", positions: true,
        image: "image", imageShape: "imgpick--wide", addLabel: "Add a plan", empty: "No reading plans yet.",
        title: (d) => d.title, sub: (d) => [`${(d.days || []).length} days`, { adults: "Adults", teens: "Teens", kids: "Kids" }[d.audience], d.published === false ? "hidden" : ""].filter(Boolean).join(" · "), thumbColor: (d) => d.color || "#6E4BFF",
        toForm: (r) => ({ ...r, days_text: toText(r.days) }),
        template: { title: "New plan", slug: "", subtitle: "", description: "", audience: "adults", color: "#6E4BFF", days_text: "## Day one\nJohn 1\nA short devotion.\n? A question to reflect on.", published: true },
        beforeSave: (out) => {
          if (!out.title || !String(out.title).trim()) throw new Error("Give the plan a title.");
          out.days = fromText(out.days_text); delete out.days_text;
          if (!out.days.length) throw new Error("Add at least one day (a line starting with ##).");
          if (out.days.some((d) => !d.refs.length)) throw new Error("Every day needs a Bible reference on the line after its title.");
          out.slug = (out.slug && String(out.slug).trim()) || String(out.title).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          return out;
        },
        fields: [
          { k: "title", label: "Title", wide: true }, { k: "subtitle", label: "Subtitle", ph: "21 days with Jesus" },
          { k: "audience", label: "For", type: "select", options: [["adults", "Adults"], ["teens", "Teens"], ["kids", "Kids"]] },
          { k: "description", label: "About this plan", type: "textarea", wide: true }, { k: "color", label: "Colour", type: "color" },
          { k: "published", label: "Show in the app", type: "bool" },
          { k: "days_text", label: "Days", type: "textarea", wide: true, rows: 18, mono: true },
        ],
      })));
    } },

    /* ---------------------------------------------------------- APP: KIDS / TEENS / SQUAD */
    ministryposts: { title: "Kids, Teens & Squad", crumb: "App", icon: "star", group: "App", render(v) {
      v.innerHTML = intro("", "What families see on the Kids, Teens and Agape Squad pages in the app: memory verses, Bible stories (with read-aloud), activities, challenges, posts and upcoming events. Pinned posts show first.");
      ["kids", "teens", "squad"].forEach((m) => {
        v.appendChild(card({ kids: "Kids", teens: "Teens", squad: "Agape Squad" }[m], "", dbEditor({
          table: "ministry_posts", query: `ministry_posts?select=id,ministry,kind,title,body,ref,youtube_id,image,color,starts_at,link,pinned,published,position&ministry=eq.${m}&order=pinned.desc,position,created_at.desc`, positions: true,
          image: "image", imageShape: "imgpick--wide", addLabel: "Add a post", empty: "Nothing posted yet.",
          title: (d) => d.title, sub: (d) => [{ verse: "Memory verse", story: "Bible story", activity: "Make & do", challenge: "Challenge", post: "Post", event: "Event", video: "Video" }[d.kind] || d.kind, d.ref, d.pinned ? "pinned" : "", d.published === false ? "hidden" : ""].filter(Boolean).join(" · "), thumbColor: (d) => d.color || "#FFC23D",
          template: { ministry: m, kind: "post", title: "New post", body: "", ref: "", youtube_id: "", color: "", starts_at: null, link: "", pinned: false, published: true },
          beforeSave: (out) => { out.ministry = m; if (!String(out.title || "").trim()) throw new Error("Add a title."); if (out.youtube_id) out.youtube_id = String(out.youtube_id).replace(/^.*(?:v=|youtu\.be\/|shorts\/)([\w-]{11}).*$/, "$1"); ["ref", "youtube_id", "link", "color"].forEach((k) => { if (!out[k]) out[k] = null; }); return out; },
          fields: [
            { k: "title", label: "Title", wide: true },
            { k: "kind", label: "Type", type: "select", options: [["verse", "Memory verse"], ["story", "Bible story"], ["activity", "Make & do"], ["challenge", "Challenge"], ["post", "Post"], ["event", "Event"], ["video", "Video"]] },
            { k: "ref", label: "Bible reference", ph: "John 3:16" },
            { k: "body", label: "Text", type: "textarea", wide: true, rows: 6 },
            { k: "starts_at", label: "Date & time (events)", type: "date" }, { k: "youtube_id", label: "YouTube link (videos)" },
            { k: "link", label: "Button link (optional)", ph: "https://… or /events" }, { k: "color", label: "Colour", type: "color" },
            { k: "pinned", label: "Pin to the top", type: "bool" }, { k: "published", label: "Show in the app", type: "bool" },
          ],
        })));
      });
    } },

    /* ---------------------------------------------------------- APP: TESTIMONIES */
    testimonies2: { title: "Testimony wall", crumb: "App", icon: "star", group: "App", render(v) {
      v.innerHTML = intro("", "Stories members share from the app. Nothing appears until you set Approved to Yes. Feature the best ones to pin them to the top. You can also add a story someone told you (put their name in “Name”).");
      v.appendChild(card("Testimonies", "", dbEditor({
        table: "testimonies", query: "testimonies?select=id,title,body,category,anonymous,approved,featured,amens,author_name,created_at&order=approved.asc,created_at.desc",
        addLabel: "Add a testimony", empty: "No testimonies yet.",
        title: (d) => d.title, sub: (d) => [d.approved ? "Approved" : "Waiting for approval", d.featured ? "featured" : "", d.amens ? `${d.amens} amens` : "", d.anonymous ? "anonymous" : d.author_name || ""].filter(Boolean).join(" · "), thumbColor: (d) => (d.approved ? "#2ED3A0" : "#FF5A1F"),
        template: { title: "", body: "", category: "answered prayer", anonymous: false, approved: true, featured: false, author_name: "" },
        beforeSave: (out) => { delete out.amens; if (String(out.title || "").trim().length < 2 || String(out.body || "").trim().length < 10) throw new Error("Add a title and a few sentences."); return out; },
        fields: [
          { k: "title", label: "Title", wide: true }, { k: "body", label: "Story", type: "textarea", wide: true, rows: 8 },
          { k: "category", label: "Category", type: "select", options: ["answered prayer", "healing", "provision", "salvation", "family", "work & studies", "other"].map((c) => [c, c[0].toUpperCase() + c.slice(1)]) },
          { k: "author_name", label: "Name (for stories you add)" },
          { k: "approved", label: "Approved (shown in the app)", type: "bool" }, { k: "featured", label: "Featured", type: "bool" }, { k: "anonymous", label: "Hide the name", type: "bool" },
        ],
      })));
    } },

    /* ---------------------------------------------------------- APP: SERVE */
    serve: { title: "Serving teams", crumb: "App", icon: "heart", group: "App", async render(v) {
      v.innerHTML = intro("", "Openings on the Serve page in the app. Members sign up until the spots are full; you see who's coming below.");
      const TEAMS = ["ushering", "kids", "tech", "worship", "hospitality", "driving", "prayer", "cleanup"].map((t) => [t, t[0].toUpperCase() + t.slice(1)]);
      v.appendChild(card("Openings", "", dbEditor({
        table: "serve_opportunities", query: "serve_opportunities?select=id,team,title,description,starts_at,ends_at,location,slots,published&order=starts_at.desc",
        addLabel: "Add an opening", empty: "No openings yet.",
        title: (d) => d.title, sub: (d) => [d.team, d.starts_at ? new Date(d.starts_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "", `${d.slots} spots`].filter(Boolean).join(" · "), thumbColor: () => "#FF8A3D",
        template: { team: "ushering", title: "New opening", description: "", starts_at: new Date(Date.now() + 7 * 864e5).toISOString(), ends_at: null, location: "", slots: 4, published: true },
        beforeSave: (out) => { if (!out.starts_at) throw new Error("Pick when it starts."); if (!out.ends_at) out.ends_at = null; return out; },
        fields: [
          { k: "title", label: "Title", wide: true }, { k: "team", label: "Team", type: "select", options: TEAMS },
          { k: "slots", label: "How many people", type: "number" }, { k: "starts_at", label: "Starts", type: "date" }, { k: "ends_at", label: "Ends (optional)", type: "date" },
          { k: "location", label: "Where" }, { k: "description", label: "What they'll do", type: "textarea", wide: true }, { k: "published", label: "Show in the app", type: "bool" },
        ],
      })));
      const rows = await S.rpc("staff_serve_signups").catch(() => []);
      const ops = await S.select("serve_opportunities?select=id,title,starts_at&order=starts_at.desc").catch(() => []);
      const by = {}; rows.forEach((r) => (by[r.opportunity_id] = by[r.opportunity_id] || []).push(r));
      const c = document.createElement("section"); c.className = "card";
      c.innerHTML = `<div class="card__head"><div><h2>Who signed up</h2></div></div>` + (rows.length ? ops.filter((o) => by[o.id]).map((o) => `<h3 style="margin:16px 0 6px">${esc(o.title)} <small class="muted">· ${by[o.id].length}</small></h3><table class="table"><tbody>${by[o.id].map((r) => `<tr><td>${esc(r.full_name || "Member")}</td><td>${esc(r.phone || "")}</td><td class="muted">${new Date(r.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>`).join("") : `<div class="empty">No sign-ups yet.</div>`);
      v.appendChild(c);
    } },

    /* ---------------------------------------------------------- APP: CHECK-IN */
    checkin: { title: "Check-in & attendance", crumb: "App", icon: "check", group: "App", async render(v) {
      v.innerHTML = intro("", "Make a code for today's service and show it on the screen (staff can also open Check in in the app to show it as a QR code). Members scan it or type it in the app, and they appear in the attendance list. A code only works on the day it's made for.");
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuwait" });
      const codes = await S.select(`checkin_codes?select=code,title,valid_on&valid_on=eq.${today}&order=created_at.desc`).catch(() => []);
      const mk = document.createElement("div");
      mk.innerHTML = `${codes.map((c) => `<div class="bigcode"><b>${esc(c.code)}</b><span>${esc(c.title)} · today</span></div>`).join("")}<div class="row" style="display:flex;gap:10px;margin-top:12px"><input id="ciTitle" class="input" placeholder="Service name, e.g. Sunday Celebration" value="Sunday Celebration" style="flex:1"/><button class="btn btn--brand btn--sm" id="ciMake"><span>Make today's code</span></button></div>`;
      v.appendChild(card("Today's code", codes.length ? "Show this on the screen at church." : "No code yet for today.", mk));
      $("#ciMake", mk).addEventListener("click", async () => { try { await S.insertRow("checkin_codes", { title: $("#ciTitle", mk).value.trim() || "Sunday service" }); toast("Code ready"); VIEWS.checkin.render(v); } catch (e) { toast(e.message, true); } });
      const rows = await S.rpc("staff_checkins", {}).catch(() => []);
      const days = {}; rows.forEach((r) => (days[r.day] = days[r.day] || []).push(r));
      const c = document.createElement("div");
      c.innerHTML = rows.length ? Object.entries(days).map(([d, list]) => `<h3 style="margin:16px 0 6px">${new Date(d).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })} <small class="muted">· ${list.length} people</small></h3><table class="table"><tbody>${list.map((r) => `<tr><td>${esc(r.full_name || "Member")}</td><td class="muted">${esc(r.title || "")}</td><td class="muted">${new Date(r.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td></tr>`).join("")}</tbody></table>`).join("") : `<div class="empty">No check-ins yet.</div>`;
      v.appendChild(card("Attendance", "", c));
    } },

    /* ---------------------------------------------------------- APP: HOME MEETINGS */
    meetings: { title: "Home prayer meetings", crumb: "App", icon: "map-pin", group: "App", render(v) {
      v.innerHTML = intro("", "Meetings members host from the app. You can edit or cancel any of them (people who RSVP'd are told when a meeting is cancelled).");
      v.appendChild(card("Meetings", "", dbEditor({
        table: "home_meetings", query: "home_meetings?select=id,title,about,kind,starts_at,area,capacity,cancelled&order=starts_at.desc",
        addLabel: null, empty: "No home meetings yet. Members host them from the app.",
        title: (d) => d.title, sub: (d) => [d.cancelled ? "Cancelled" : "", d.area, d.starts_at ? new Date(d.starts_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""].filter(Boolean).join(" · "), thumbColor: (d) => (d.cancelled ? "#999" : "#2ED3A0"),
        template: {},
        fields: [{ k: "title", label: "Title", wide: true }, { k: "area", label: "Area" }, { k: "starts_at", label: "When", type: "date" }, { k: "capacity", label: "Max people", type: "number", nullable: true }, { k: "about", label: "About", type: "textarea", wide: true }, { k: "cancelled", label: "Cancelled", type: "bool" }],
      })));
    } },

    /* ---------------------------------------------------------- APP: NEXT STEPS */
    nextsteps: { title: "Next steps", crumb: "App", icon: "arrow-up-right", group: "App", async render(v) {
      const rows = await S.select("next_steps?select=id,kind,name,phone,details,status,created_at,profiles:profiles!next_steps_user_id_fkey(full_name)&order=created_at.desc").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Requests from Next steps in the app: people who decided to follow Jesus, want baptism or membership, a child dedication, counselling, a wedding or a home visit. Follow up, then update the status.");
      const K = { salvation: "Decided to follow Jesus", baptism: "Baptism", membership: "Membership", dedication: "Child dedication", counselling: "Talk to a pastor", wedding: "Wedding", visit: "Home visit" };
      const c = document.createElement("section"); c.className = "card"; v.appendChild(c);
      c.innerHTML = rows.length ? `<table class="table"><thead><tr><th>Who</th><th>Step</th><th>Details</th><th>When</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-id="${esc(r.id)}"><td><b>${esc(r.profiles?.full_name || r.name || "Member")}</b><br/><small class="muted">${esc(r.phone || "")}</small></td><td>${esc(K[r.kind] || r.kind)}</td><td>${esc(r.details || "")}</td><td class="muted">${new Date(r.created_at).toLocaleDateString()}</td><td><select>${["new", "contacted", "done"].map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No requests yet.</div>`;
      c.addEventListener("change", async (e) => { const sel = e.target.closest("select"); if (!sel) return; try { await S.update("next_steps", sel.closest("tr").dataset.id, { status: sel.value }); toast("Updated"); } catch (err) { toast(err.message, true); } });
    } },

    /* ---------------------------------------------------------- APP: GAMES */
    games: { title: "Bible games", crumb: "App", icon: "gamepad-2", group: "App", render(v) {
      v.innerHTML = intro("", "Question packs for <b>Trivia</b> and <b>Verse Match</b>. Open a pack to edit its questions. Only <b>published</b> packs are played in the app.");
      v.appendChild(card("Packs", "", dbEditor({
        table: "question_packs", query: "question_packs?select=id,title,game,published&order=created_at",
        addLabel: "Add a pack", empty: "No packs yet.",
        title: (p) => p.title, sub: (p) => `${p.game === "trivia" ? "Trivia" : "Verse Match"} · ${p.published ? "Published" : "Draft"}`, thumbColor: (p) => (p.game === "trivia" ? "#8FA4FF" : "#9B7BFF"),
        template: { title: "New pack", game: "trivia", published: false },
        fields: [{ k: "title", label: "Pack name" }, { k: "game", label: "Game", type: "select", options: [["trivia", "Trivia"], ["verse_match", "Verse Match"]] }, { k: "published", label: "Published?", type: "bool" }],
        extra: (p) => p.game === "trivia"
          ? subCard("Questions", "Add the answers, then say which one is right (1 = the first answer).", dbEditor({
              table: "questions", query: `questions?select=id,prompt,options,answer,reference&pack_id=eq.${p.id}&order=id`,
              addLabel: "Add a question", empty: "No questions yet.",
              title: (q) => q.prompt, sub: (q) => (q.options || []).join(" · "), thumbColor: () => "#8FA4FF",
              template: { prompt: "New question?", options: [], correct: 1, reference: "" },
              toForm: (r) => ({ ...r, correct: Number(r.answer) + 1 }),
              beforeSave: (out, r) => {
                if ((r.options || []).length < 2) throw new Error("Add at least two answers.");
                const n = Number(r.correct);
                if (!(n >= 1 && n <= r.options.length)) throw new Error(`The right answer must be a number from 1 to ${r.options.length}.`);
                return { prompt: r.prompt, options: r.options, answer: n - 1, reference: r.reference || null, pack_id: p.id };
              },
              fields: [{ k: "prompt", label: "Question", wide: true }, { k: "options", label: "Answers (press Enter after each)", type: "tags", wide: true }, { k: "correct", label: "Right answer number", type: "number" }, { k: "reference", label: "Bible reference (optional)", ph: "Genesis 6" }],
            }))
          : subCard("Verses", "Write the verse with ___ for each missing word, then list the missing words in order, and a few wrong words to mix in.", dbEditor({
              table: "questions", query: `questions?select=id,prompt,options,answer,reference&pack_id=eq.${p.id}&order=id`,
              addLabel: "Add a verse", empty: "No verses yet.",
              title: (q) => q.prompt, sub: (q) => q.reference || "", thumbColor: () => "#9B7BFF",
              template: { prompt: "The Lord is my ___.", answer: ["shepherd"], options: ["king", "rock"], reference: "" },
              beforeSave: (out, r) => {
                const blanks = (String(r.prompt).match(/___/g) || []).length;
                if (!blanks) throw new Error("Put ___ where each missing word goes.");
                if ((r.answer || []).length !== blanks) throw new Error(`The verse has ${blanks} blank${blanks > 1 ? "s" : ""}, so list exactly ${blanks} missing word${blanks > 1 ? "s" : ""}.`);
                return { prompt: r.prompt, answer: r.answer, options: r.options || [], reference: r.reference || null, pack_id: p.id };
              },
              fields: [{ k: "prompt", label: "Verse with ___ blanks", wide: true }, { k: "answer", label: "Missing words, in order", type: "tags", wide: true }, { k: "options", label: "Wrong words to mix in", type: "tags", wide: true }, { k: "reference", label: "Reference", ph: "Psalm 23:1" }],
            })),
      })));
    } },

    /* ---------------------------------------------------------- APP: GROUPS */
    groups: { title: "Groups & chats", crumb: "App", icon: "users", group: "App", render(v) {
      v.innerHTML = intro("", "Groups in the app's Family tab. Every group gets its own group chat; members join from the app. (The Ministries page above is the website's showcase.)");
      v.appendChild(card("Groups", "", dbEditor({
        table: "ministries", query: "ministries?select=id,name,meets,description,color,cover_url,position&order=position,name", positions: true,
        image: "cover_url", addLabel: "Add a group", empty: "No groups yet.",
        title: (g) => g.name, sub: (g) => g.meets || "", thumbColor: (g) => g.color || "#FF7AB6",
        template: { name: "New group", meets: "Weekly", description: "", color: "#FF7AB6", cover_url: "" },
        fields: [{ k: "name", label: "Group name" }, { k: "meets", label: "When / who", ph: "Fridays · Youth" }, { k: "color", label: "Colour", type: "color" }, { k: "description", label: "Description", type: "textarea", wide: true }],
      })));
    } },

    /* ---------------------------------------------------------- APP: RSVPS */
    rsvps: { title: "RSVPs & check-in", crumb: "App", icon: "calendar", group: "App", async render(v) {
      const rows = await S.rpc("staff_rsvps").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Who's coming to each event (RSVPs from the app). Tick people off as they arrive.");
      const groups = {};
      rows.forEach((r) => (groups[r.event_key] = groups[r.event_key] || { title: r.event_title || r.event_key, list: [] }).list.push(r));
      if (!rows.length) { v.appendChild(card("No RSVPs yet", "They appear here when members tap RSVP in the app.", null)); return; }
      Object.entries(groups).forEach(([key, g]) => {
        const c = card(`${esc(g.title)} <small class="muted">· ${g.list.length} going · ${g.list.filter((r) => r.checked_in_at).length} checked in</small>`, "", null);
        const t = document.createElement("div");
        t.innerHTML = `<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>RSVP'd</th><th>Checked in</th></tr></thead><tbody>${g.list.map((r) => `<tr data-u="${esc(r.user_id)}"><td><div class="who"><span class="avatar">${esc((r.full_name || "?")[0])}</span>${esc(r.full_name || "Member")}</div></td><td class="muted">${esc(r.email || "—")}</td><td class="muted">${esc(r.phone || "—")}</td><td class="muted">${esc(String(r.created_at).slice(0, 10))}</td><td><input type="checkbox" ${r.checked_in_at ? "checked" : ""} /></td></tr>`).join("")}</tbody></table>`;
        t.addEventListener("change", async (e) => {
          const box = e.target.closest("input"); if (!box) return;
          try { await S.updateRow("rsvps", { event_key: key, user_id: box.closest("tr").dataset.u }, { checked_in_at: box.checked ? new Date().toISOString() : null }); toast(box.checked ? "Checked in" : "Check-in removed"); }
          catch (err) { box.checked = !box.checked; toast(err.message, true); }
        });
        c.appendChild(t); v.appendChild(c);
      });
    } },

    /* ---------------------------------------------------------- APP: PASTORAL CARE */
    care: { title: "Pastoral care", crumb: "App", icon: "shield-check", group: "App", async render(v) {
      const rows = await S.rpc("staff_care").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Private requests from Me → Pastoral care in the app. Only staff can see these.");
      const c = document.createElement("section"); c.className = "card"; v.appendChild(c);
      c.innerHTML = rows.length ? `<table class="table"><thead><tr><th>Member</th><th>Request</th><th>Contact</th><th>When</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-id="${esc(r.id)}"><td><div class="who"><span class="avatar">${esc((r.full_name || "?")[0])}</span><b>${esc(r.full_name || "Member")}</b></div></td><td style="max-width:380px"><b>${esc(r.kind)}</b><div class="muted">${esc(r.details || "")}</div></td><td class="muted">${esc(r.email || "")}<br>${esc(r.phone || "")}</td><td class="muted">${esc(String(r.created_at).slice(0, 10))}</td><td><select>${["open", "in progress", "closed"].map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No requests. 🙏</div>`;
      c.addEventListener("change", async (e) => {
        const sel = e.target.closest("select"); if (!sel) return;
        try { await S.update("care_requests", sel.closest("tr").dataset.id, { status: sel.value }); toast("Updated"); } catch (err) { toast(err.message, true); }
      });
    } },

    church: { title: "Church info", crumb: "Settings", icon: "church", group: "Settings", render(v) {
      v.innerHTML = intro("", "Name, contact details, service times, the announcement bar and the numbers shown around the site.");
      v.appendChild(card("Announcement bar", "The thin strip at the very top of every page.", fieldsGrid([{ k: "title", label: "Bold text" }, { k: "text", label: "Message" }, { k: "cta", label: "Link text" }, { k: "link", label: "Link" }], C.announcement, 4)));
      v.appendChild(card("Church details", "", fieldsGrid([
        { k: "name", label: "Church name" }, { k: "tagline", label: "Footer tagline" },
        { k: "address", label: "Address" }, { k: "mapsUrl", label: "Google Maps link" },
        { k: "phone", label: "Phone" }, { k: "whatsapp", label: "WhatsApp number", ph: "+965…" },
        { k: "email", label: "Email" }, { k: "instagram", label: "Instagram link" },
        { k: "facebook", label: "Facebook link" }, { k: "currency", label: "Currency", ph: "KWD" },
        { k: "tzOffsetHours", label: "Time zone (hours from UTC)", type: "number", hint: "Kuwait = 3. Used by the live countdown." },
        { k: "givingUrl", label: "Online giving page", ph: "https://…", hint: "The app's Give button opens this page with the amount and fund. Leave empty to show “coming soon”." },
        { k: "lat", label: "Church latitude", type: "number", nullable: true, hint: "For the ride map. In Google Maps, right-click the church → copy the numbers." },
        { k: "lng", label: "Church longitude", type: "number", nullable: true },
      ], C.church)));
      v.appendChild(card("Service times", "Shown in the “Plan a visit” section and used for the live countdown.", listEditor({
        items: C.services, addLabel: "Add a service",
        title: (s) => `${s.label} · ${s.time}`, sub: (s) => `${DAYS[s.day]} · ${s.note || ""}`, thumbColor: () => "#FF5A1F",
        template: { day: 0, h: 10, m: 0, label: "New service", time: "10:00 AM", note: "" },
        fields: [
          { k: "label", label: "Name" }, { k: "day", label: "Day", type: "select", num: true, options: DAYS.map((d, i) => [i, d]) },
          { k: "h", label: "Hour (24h)", type: "number" }, { k: "m", label: "Minute", type: "number" },
          { k: "time", label: "Time as shown", ph: "10:00 AM" }, { k: "note", label: "Short note", ph: "Celebration · English" },
        ],
      })));
      v.appendChild(card("Numbers", "Real counts shown around the site. Leave a number at 0 to hide it.", fieldsGrid([{ k: "members", label: "Members", type: "number" }, { k: "nations", label: "Nations", type: "number" }, { k: "prayers", label: "Prayers this year", type: "number" }, { k: "rides", label: "Rides given", type: "number" }, { k: "drivers", label: "Volunteer drivers", type: "number" }, { k: "rating", label: "Ride rating", type: "number" }], C.stats, 3)));
      const danger = card("Reset", "Throw away all edits and go back to the original content.", null);
      const rb = document.createElement("button"); rb.className = "btn btn--danger"; rb.textContent = "Reset all content";
      rb.addEventListener("click", async () => { if (!confirm("Reset every section to the original content? This can't be undone.")) return; await S.reset(); C = S.defaults(); saved = JSON.stringify(C); markDirty(); toast("Content reset"); go(route); });
      danger.appendChild(rb); v.appendChild(danger);
    } },

    /* ---------------------------------------------------------- PRAYER */
    prayer: { title: "Prayer wall", crumb: "Community", icon: "hand-heart", group: "Community", async render(v) {
      let rows = await S.list("prayer_requests").catch((e) => (toast(e.message, true), []));
      let filter = "all";
      v.innerHTML = intro("", "Requests posted from the app and website. Hide anything inappropriate, and mark prayers as answered to celebrate them.", `<div class="seg" id="pf"><button class="is-on" data-f="all">All</button><button data-f="open">Open</button><button data-f="answered">Answered</button><button data-f="hidden">Hidden</button></div>`);
      const c = document.createElement("section"); c.className = "card"; v.appendChild(c);
      const paint = () => {
        const list = rows.filter((r) => filter === "all" || (filter === "hidden" ? r.hidden : filter === "answered" ? r.answered && !r.hidden : !r.answered && !r.hidden));
        c.innerHTML = list.length ? `<table class="table"><thead><tr><th>Request</th><th>From</th><th>Praying</th><th>Status</th><th></th></tr></thead><tbody>${list.map((r) => `<tr data-id="${esc(r.id)}"><td style="max-width:420px">${esc(r.body)}</td><td><div class="who"><span class="avatar">${esc((r.author || "A")[0])}</span>${esc(r.author || "Member")}</div></td><td><b>${fmt(r.pray_count)}</b></td><td><span class="badge ${r.hidden ? "badge--hidden" : r.answered ? "badge--answered" : "badge--open"}">${r.hidden ? "Hidden" : r.answered ? "Answered" : "Open"}</span></td><td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-a="ans">${r.answered ? "Mark open" : "Answered"}</button><button class="icon-btn" data-a="hide" title="${r.hidden ? "Show" : "Hide"}">${ic(r.hidden ? "eye" : "eye-off")}</button><button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Nothing here.</div>`;
      };
      paint();
      $("#pf").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; $$("#pf button").forEach((x) => x.classList.toggle("is-on", x === b)); paint(); });
      c.addEventListener("click", async (e) => {
        const b = e.target.closest("button[data-a]"); if (!b) return;
        const id = b.closest("tr").dataset.id; const r = rows.find((x) => String(x.id) === id);
        try {
          if (b.dataset.a === "ans") { await S.update("prayer_requests", r.id, { answered: !r.answered }); r.answered = !r.answered; toast(r.answered ? "Marked as answered 🙏" : "Marked open"); }
          if (b.dataset.a === "hide") { await S.update("prayer_requests", r.id, { hidden: !r.hidden }); r.hidden = !r.hidden; toast(r.hidden ? "Hidden from the wall" : "Visible again"); }
          if (b.dataset.a === "del") { if (!confirm("Delete this request permanently?")) return; await S.remove("prayer_requests", r.id); rows = rows.filter((x) => x !== r); toast("Deleted"); }
        } catch (err) { toast(err.message, true); }
        paint();
      });
    } },

    /* ---------------------------------------------------------- RIDES */
    rides: { title: "Ride ministry", crumb: "Community", icon: "car", group: "Community", async render(v) {
      const rows = await S.list("rides").catch((e) => (toast(e.message, true), []));
      const drivers = (await S.list("profiles").catch(() => [])).filter((p) => p.role !== "member");
      v.innerHTML = intro("", "Every ride request. Volunteers accept rides in the app; you can also assign a driver or change a status here.");
      const c = document.createElement("section"); c.className = "card"; v.appendChild(c);
      const STAT = ["requested", "accepted", "enroute", "arrived", "completed", "cancelled"];
      c.innerHTML = rows.length ? `<table class="table"><thead><tr><th>Member</th><th>Phone</th><th>Pickup</th><th>When</th><th>Seats</th><th>Driver</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr data-id="${esc(r.id)}"><td><div class="who"><span class="avatar" style="background:linear-gradient(135deg,var(--mint),var(--sky))">${esc((r.member || "?")[0])}</span>${esc(r.member)}</div></td><td class="muted">${esc(r.member_phone || "—")}</td><td>${esc(r.pickup_label)}${r.notes ? `<div class="muted" style="font-size:12px">${esc(r.notes)}</div>` : ""}</td><td>${esc(r.requested_for)}</td><td>${esc(r.seats)}</td><td><select data-k="volunteer_id"><option value="">Unassigned</option>${drivers.map((d) => `<option value="${esc(d.id)}" ${d.id === r.volunteer_id ? "selected" : ""}>${esc(d.full_name)}</option>`).join("")}</select></td><td><select data-k="status">${STAT.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No rides yet.</div>`;
      c.addEventListener("change", async (e) => {
        const sel = e.target.closest("select"); if (!sel) return;
        const id = sel.closest("tr").dataset.id;
        const patch = sel.dataset.k === "volunteer_id" ? { volunteer_id: sel.value || null, ...(sel.value ? { status: "accepted" } : { status: "requested" }) } : { status: sel.value };
        try { await S.update("rides", id, patch); toast("Ride updated"); go("rides"); } catch (err) { toast(err.message, true); }
      });
    } },

    /* ---------------------------------------------------------- MEMBERS */
    members: { title: "Members & roles", crumb: "Community", icon: "user-cog", group: "Community", async render(v) {
      const rows = await S.list("profiles").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "People who've signed up in the app. <b>Volunteers</b> can accept rides. <b>Staff</b> can use this admin. Only an <b>admin</b> can make or remove admins.", `<label class="search">${ic("search")}<input placeholder="Search members" id="msearch" /></label>`);
      const c = document.createElement("section"); c.className = "card"; v.appendChild(c);
      const paint = (q = "") => {
        const list = rows.filter((r) => `${r.full_name} ${r.email || ""}`.toLowerCase().includes(q.toLowerCase()));
        c.innerHTML = list.length ? `<table class="table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead><tbody>${list.map((r) => `<tr data-id="${esc(r.id)}"><td><div class="who"><span class="avatar">${esc((r.full_name || "?")[0])}</span><b>${esc(r.full_name)}</b></div></td><td class="muted">${esc(r.email || "—")}</td><td class="muted">${esc(String(r.created_at || "").slice(0, 10))}</td><td><select>${["member", "volunteer", "staff", "admin"].map((x) => `<option ${x === r.role ? "selected" : ""}>${x}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No members found.</div>`;
      };
      paint();
      $("#msearch").addEventListener("input", (e) => paint(e.target.value));
      c.addEventListener("change", async (e) => {
        const sel = e.target.closest("select"); if (!sel) return;
        const id = sel.closest("tr").dataset.id;
        try { await S.update("profiles", id, { role: sel.value }); rows.find((r) => String(r.id) === id).role = sel.value; toast("Role updated"); } catch (err) { toast(err.message, true); }
      });
    } },

    /* ---------------------------------------------------------- ANNOUNCEMENTS */
    announcements: { title: "Announcements", crumb: "Community", icon: "bell", group: "Community", async render(v) {
      let rows = await S.list("announcements").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Posts that appear in the app's Community → News tab. Once push notifications are connected, they're also sent to members' phones.");
      const form = document.createElement("section"); form.className = "card";
      form.innerHTML = `<div class="card__head"><div><h2>New announcement</h2></div></div><div class="grid"><label class="field"><span>Title</span><input id="anT" placeholder="Prayer & Worship this Friday" /></label><label class="field"><span>Message</span><textarea id="anB" rows="3" placeholder="Join us at 8 PM…"></textarea></label><div><button class="btn btn--brand" id="anGo"><span>Post announcement</span><i>${ic("send")}</i></button></div></div>`;
      v.appendChild(form);
      const list = document.createElement("section"); list.className = "card"; v.appendChild(list);
      const paint = () => {
        list.innerHTML = `<div class="card__head"><div><h2>Posted</h2></div></div>` + (rows.map((a) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-top:1px solid var(--line)" data-id="${esc(a.id)}"><span class="qi" style="width:40px;height:40px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;flex:none">${ic("bell")}</span><div style="flex:1"><b>${esc(a.title)}</b><div class="muted">${esc(a.body)}</div><small class="muted">${esc(String(a.created_at || "").slice(0, 10))}</small></div><button class="icon-btn is-danger" title="Delete">${ic("trash")}</button></div>`).join("") || `<div class="empty">No announcements yet.</div>`);
      };
      paint();
      $("#anGo").addEventListener("click", async () => {
        const title = $("#anT").value.trim(), body = $("#anB").value.trim();
        if (!title) return toast("Add a title first", true);
        try { await S.insert("announcements", { title, body }); rows = await S.list("announcements"); $("#anT").value = ""; $("#anB").value = ""; paint(); toast("Announcement posted"); } catch (e) { toast(e.message, true); }
      });
      list.addEventListener("click", async (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const id = b.closest("[data-id]").dataset.id;
        if (!confirm("Delete this announcement?")) return;
        try { await S.remove("announcements", id); rows = rows.filter((r) => String(r.id) !== id); paint(); toast("Deleted"); } catch (err) { toast(err.message, true); }
      });
    } },
  };

  /* ================= navigation ================= */
  function buildNav() {
    const groups = {};
    Object.entries(VIEWS).forEach(([k, v]) => (groups[v.group] = groups[v.group] || []).push([k, v]));
    $("#sideNav").innerHTML = Object.entries(groups).map(([g, list]) => `<div class="side__group">${esc(g)}</div>` + list.map(([k, v]) => `<a href="#${k}" data-k="${k}">${ic(v.icon)}<span>${esc(v.title)}</span>${k === "gallery" ? `<span class="count">${C.gallery.length}</span>` : ""}</a>`).join("")).join("");
  }
  async function go(k) {
    if (!VIEWS[k]) k = "dashboard";
    route = k;
    const V = VIEWS[k];
    $$("#sideNav a").forEach((a) => a.classList.toggle("is-on", a.dataset.k === k));
    $(".js-title").textContent = V.title;
    $(".js-crumb").textContent = V.crumb;
    const view = $("#view");
    const fresh = view.cloneNode(false);
    view.replaceWith(fresh);
    await V.render(fresh);
    $("#app").classList.remove("nav-open");
    scrollTo({ top: 0 });
  }
  addEventListener("hashchange", () => go(location.hash.slice(1)));

  /* ================= live preview ================= */
  let pvTimer = null, pvOn = false;
  const frame = () => $("#frame");
  function sitePreviewSrc() { return window.AGAPE_SITE_HTML ? null : "../index.html?preview=1"; }
  function loadPreview() {
    if (!pvOn) return;
    const f = frame();
    if (window.AGAPE_SITE_HTML) f.srcdoc = window.AGAPE_SITE_HTML;
    else f.src = sitePreviewSrc() + "&t=" + Date.now();
  }
  let lastPv = "";
  function schedulePreview() {
    if (!pvOn) return;
    const j = JSON.stringify(C);
    if (j === lastPv) return;
    clearTimeout(pvTimer);
    pvTimer = setTimeout(() => { lastPv = JSON.stringify(C); loadPreview(); }, 900);
  }
  addEventListener("message", (e) => {
    if (e.data && e.data.type === "agape-preview-ready" && e.source === frame().contentWindow) {
      frame().contentWindow.postMessage({ type: "agape-preview-content", content: C }, "*");
    }
  });
  function setDevice(w) {
    const wrap = $("#frameWrap");
    const stage = $(".preview__stage").getBoundingClientRect();
    const h = w > 600 ? 800 : 780;
    wrap.style.width = w + "px"; wrap.style.height = h + "px";
    const k = Math.min(1, (stage.width - 32) / w, (stage.height - 32) / h);
    wrap.style.transform = `translate(-50%,-50%) scale(${k})`;
    wrap.classList.toggle("is-desktop", w > 600);
  }

  /* ================= login slideshow ================= */
  function loginArt() {
    const box = $(".login__slides");
    const D = S.defaults();
    box.innerHTML = D.hero.slides.map((s, i) => `<img src="${esc(src(s.image))}" alt="" class="${i ? "" : "is-on"}" />`).join("");
    let i = 0;
    const imgs = $$("img", box);
    setInterval(() => { imgs[i].classList.remove("is-on"); i = (i + 1) % imgs.length; imgs[i].classList.add("is-on"); }, 4000);
  }

  /* ================= boot ================= */
  async function enter() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    C = await S.load();
    saved = JSON.stringify(C);
    const email = S.session()?.user?.email || "staff";
    $(".js-user-name").textContent = email;
    $(".js-user-initial").textContent = email[0].toUpperCase();
    $(".js-mode-label").textContent = S.session()?.role === "admin" ? "Admin" : "Staff";
    if (window.AGAPE_SITE_HTML) { $(".js-view-site").hidden = true; }
    buildNav();
    go(location.hash.slice(1) || "dashboard");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loginArt();
    $(".js-login-mode").textContent = S.live ? "Sign in with your staff account: Google, or the same email and password as the app." : "Not connected yet: add the Supabase project URL and anon key to assets/js/config.js.";
    if (!S.live) $$("#loginForm input, #loginForm button, #googleBtn").forEach((x) => (x.disabled = true));
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const btn = $("button[type=submit] span", e.target);
      btn.textContent = "Signing in…";
      $("#loginErr").textContent = "";
      try { await S.signIn(fd.get("email"), fd.get("password")); await enter(); }
      catch (err) { $("#loginErr").textContent = err.message; }
      btn.textContent = "Sign in";
    });
    $("#signOut").addEventListener("click", () => { if (JSON.stringify(C) !== saved && !confirm("You have unsaved changes. Sign out anyway?")) return; S.signOut(); location.hash = ""; location.reload(); });
    $("#saveBtn").addEventListener("click", save);
    addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (!$("#saveBtn").disabled) save(); } });
    addEventListener("beforeunload", (e) => { if (C && JSON.stringify(C) !== saved) { e.preventDefault(); e.returnValue = ""; } });
    $("#menuBtn").addEventListener("click", (e) => { e.stopPropagation(); $("#app").classList.toggle("nav-open"); });
    document.addEventListener("click", (e) => { if ($("#app").classList.contains("nav-open") && !e.target.closest(".side")) $("#app").classList.remove("nav-open"); });
    $("#previewBtn").addEventListener("click", () => {
      pvOn = !$("#app").classList.contains("has-preview");
      $("#app").classList.toggle("has-preview", pvOn);
      if (pvOn) { requestAnimationFrame(() => setDevice(+$("#deviceSeg .is-on").dataset.w)); lastPv = JSON.stringify(C); loadPreview(); }
    });
    $("#closePreview").addEventListener("click", () => { pvOn = false; $("#app").classList.remove("has-preview"); });
    $("#deviceSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#deviceSeg button").forEach((x) => x.classList.toggle("is-on", x === b)); setDevice(+b.dataset.w); loadPreview(); });
    addEventListener("resize", () => pvOn && setDevice(+$("#deviceSeg .is-on").dataset.w));
    $("#googleBtn").addEventListener("click", () => { if (S.live) location.href = S.googleUrl(); });
    S.fromRedirect()
      .then((ok) => (ok ? true : S.restore()))
      .then((ok) => ok && enter())
      .catch((err) => { $("#loginErr").textContent = err.message; });
  });
})();
