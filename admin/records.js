/* =========================================================
   AGAPE — Admin: app content + people (database records)
   Sermons, courses & lessons, study guides, Bible games,
   visitor cards, pastoral care, volunteers and giving.
   Loaded by admin.js, which merges these views into its menu.
   ========================================================= */
window.AgapeAdminRecords = function (h) {
  "use strict";
  const { S, $, $$, esc, ic, fmt, toast, intro, imgPicker, src, PALETTE } = h;

  /* ---------------------------------------------------------- helpers */
  const ytId = (s) => {
    s = String(s || "").trim();
    const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : "";
  };
  const day = (d) => String(d || "").slice(0, 10);
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const section = (title, text, right = "") => el(`<section class="card"><div class="card__head"><div><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div>${right}</div><div class="card__body"></div></section>`);

  /** A form for one database row. defs: {k,label,type,options,wide,hint,ph}. Returns {node, read()} */
  function form(defs, row) {
    const g = el(`<div class="grid grid--2"></div>`);
    const readers = [];
    defs.forEach((d) => {
      const v = row[d.k];
      if (d.type === "image") {
        const w = el(`<div class="field ${d.wide ? "span-all" : ""}"><span>${esc(d.label)}</span></div>`);
        let cur = v || "";
        w.appendChild(imgPicker(cur, (nv) => (cur = nv), "imgpick--wide"));
        readers.push(() => [d.k, cur || null]);
        g.appendChild(w); return;
      }
      if (d.type === "file") {
        let cur = v || "";
        const w = el(`<div class="field ${d.wide ? "span-all" : ""}"><span>${esc(d.label)}</span><div style="display:flex;gap:8px;align-items:center"><input type="text" value="${esc(cur)}" placeholder="https://… or upload" style="flex:1" /><button type="button" class="btn btn--ghost btn--sm">${ic("upload")}Upload PDF</button></div>${d.hint ? `<small>${esc(d.hint)}</small>` : ""}</div>`);
        const inp = $("input", w);
        $("button", w).addEventListener("click", () => {
          const f = document.createElement("input"); f.type = "file"; f.accept = "application/pdf";
          f.onchange = async () => { const file = f.files[0]; if (!file) return; toast("Uploading…"); try { inp.value = await S.uploadFile(file); toast("Uploaded"); } catch (e) { toast(e.message, true); } };
          f.click();
        });
        readers.push(() => [d.k, inp.value.trim() || null]);
        g.appendChild(w); return;
      }
      let ctl;
      if (d.type === "textarea") ctl = `<textarea rows="${d.rows || 3}" ${d.mono ? 'style="font-family:ui-monospace,Menlo,monospace;font-size:13.5px"' : ""} placeholder="${esc(d.ph || "")}">${esc(d.fmt ? d.fmt(v) : v ?? "")}</textarea>`;
      else if (d.type === "select") ctl = `<select>${d.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v ?? "") ? "selected" : ""}>${esc(lab)}</option>`).join("")}</select>`;
      else if (d.type === "bool") ctl = `<select><option value="true" ${v ? "selected" : ""}>${esc(d.yes || "Yes")}</option><option value="false" ${!v ? "selected" : ""}>${esc(d.no || "No")}</option></select>`;
      else if (d.type === "color") ctl = `<div class="color-in"><input type="color" value="${esc(v || "#FF5A1F")}" /><input type="text" value="${esc(v || "")}" maxlength="9" /><span class="swatches">${PALETTE.map((c) => `<button type="button" style="background:${c}" data-c="${c}"></button>`).join("")}</span></div>`;
      else ctl = `<input type="${d.type === "number" ? "number" : d.type === "date" ? "date" : d.type === "datetime" ? "datetime-local" : "text"}" value="${esc(d.fmt ? d.fmt(v) : v ?? "")}" placeholder="${esc(d.ph || "")}" ${d.type === "number" ? 'step="any"' : ""} />`;
      const w = el(`<label class="field ${d.wide ? "span-all" : ""}"><span>${esc(d.label)}</span>${ctl}${d.hint ? `<small>${esc(d.hint)}</small>` : ""}</label>`);
      if (d.type === "color") {
        const [c, t] = $$("input", w);
        c.addEventListener("input", () => (t.value = c.value.toUpperCase()));
        $$(".swatches button", w).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); c.value = t.value = b.dataset.c; }));
        readers.push(() => [d.k, t.value || null]);
      } else {
        const inp = $("input,textarea,select", w);
        readers.push(() => {
          let x = inp.value;
          if (d.type === "number") x = x === "" ? null : Number(x);
          else if (d.type === "bool") x = x === "true";
          else if (d.parse) x = d.parse(x);
          else x = x.trim() === "" ? null : x.trim();
          return [d.k, x];
        });
      }
      g.appendChild(w);
    });
    return { node: g, read: () => Object.fromEntries(readers.map((r) => r())) };
  }

  /**
   * A list of rows with an inline editor.
   * cfg: { table, rows, title(r), sub(r), thumb(r), defs, template, onSaved(), filter, extra(r, body) }
   */
  function records(cfg) {
    const root = el(`<div class="list"></div>`);
    let open = null;
    const paint = () => {
      root.innerHTML = "";
      cfg.rows.forEach((r) => {
        const isOpen = open === r;
        const th = cfg.thumb && cfg.thumb(r);
        const it = el(`<div class="item ${isOpen ? "is-open" : ""}"><div class="item__head"><div class="item__thumb">${th ? `<img src="${esc(src(th))}" alt="" />` : `<span>${esc((cfg.title(r) || "?").trim()[0] || "?")}</span>`}</div><div class="item__text"><b>${esc(cfg.title(r) || "Untitled")}</b><small>${esc(cfg.sub ? cfg.sub(r) : "")}</small></div><div class="item__tools">${cfg.badge ? cfg.badge(r) : ""}<button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button></div><span class="icon-btn item__chev">${ic("chevron-down")}</span></div><div class="item__body"></div></div>`);
        $(".item__head", it).addEventListener("click", async (e) => {
          if (e.target.closest('button[data-a="del"]')) {
            e.stopPropagation();
            if (!confirm(`Delete “${cfg.title(r) || "this"}”? This can't be undone.`)) return;
            try { if (r.id) await S.remove(cfg.table, r.id); cfg.rows.splice(cfg.rows.indexOf(r), 1); toast("Deleted"); cfg.onSaved && cfg.onSaved(); paint(); } catch (err) { toast(err.message, true); }
            return;
          }
          open = isOpen ? null : r; paint();
        });
        if (isOpen) {
          const body = $(".item__body", it);
          const f = form(cfg.defs, r);
          body.appendChild(f.node);
          if (cfg.extra) cfg.extra(r, body);
          const bar = el(`<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn--brand btn--sm"><span>${r.id ? "Save" : "Create"}</span><i>${ic("check")}</i></button><button class="btn btn--ghost btn--sm">Cancel</button></div>`);
          const [save, cancel] = $$("button", bar);
          cancel.addEventListener("click", () => { if (!r.id) cfg.rows.splice(cfg.rows.indexOf(r), 1); open = null; paint(); });
          save.addEventListener("click", async () => {
            const patch = f.read();
            if (cfg.beforeSave) Object.assign(patch, (await cfg.beforeSave(patch, r)) || {});
            save.disabled = true;
            try {
              if (r.id) await S.update(cfg.table, r.id, patch);
              else { const created = await S.insert(cfg.table, patch); Object.assign(r, created || {}); if (cfg.afterCreate) await cfg.afterCreate(r); }
              Object.assign(r, patch);
              toast(S.live ? "Saved. Live in the app now." : "Saved (demo)");
              open = null; cfg.onSaved && cfg.onSaved(); paint();
            } catch (err) { toast(err.message, true); save.disabled = false; }
          });
          body.appendChild(bar);
        }
        root.appendChild(it);
      });
      if (cfg.template) {
        const add = el(`<button class="add-row">${ic("plus")}${esc(cfg.addLabel || "Add")}</button>`);
        add.addEventListener("click", () => { const r = JSON.parse(JSON.stringify(cfg.template)); cfg.rows.unshift(r); open = r; paint(); });
        root.prepend(add);
      }
      if (!cfg.rows.length) root.appendChild(el(`<div class="empty">${esc(cfg.empty || "Nothing here yet.")}</div>`));
    };
    paint();
    return root;
  }

  /** Simple read/act table. cols: [[label, (r)=>html]], actions(r) => html with data-a buttons, onAction(a, r) */
  function table(rows, cols, actions, onAction) {
    const t = el(`<div style="overflow:auto"></div>`);
    const paint = () => {
      t.innerHTML = rows.length ? `<table class="table"><thead><tr>${cols.map((c) => `<th>${esc(c[0])}</th>`).join("")}${actions ? "<th></th>" : ""}</tr></thead><tbody>${rows.map((r, i) => `<tr data-i="${i}">${cols.map((c) => `<td>${c[1](r)}</td>`).join("")}${actions ? `<td><div class="row-actions">${actions(r)}</div></td>` : ""}</tr>`).join("")}</tbody></table>` : `<div class="empty">Nothing here yet.</div>`;
    };
    paint();
    t.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      const r = rows[+b.closest("tr").dataset.i];
      try { await onAction(b.dataset.a, r); } catch (err) { toast(err.message, true); }
      paint();
    });
    t.addEventListener("change", async (e) => {
      const s = e.target.closest("select[data-k]"); if (!s) return;
      const r = rows[+s.closest("tr").dataset.i];
      try { await S.update(s.dataset.t, r.id, { [s.dataset.k]: s.value }); r[s.dataset.k] = s.value; toast("Updated"); } catch (err) { toast(err.message, true); }
    });
    return t;
  }
  const statusSel = (tableName, r, k, opts) => `<select data-t="${tableName}" data-k="${k}">${opts.map((o) => `<option ${o === r[k] ? "selected" : ""}>${o}</option>`).join("")}</select>`;

  /* quiz <-> text: "Question? | A | *B | C" (the * marks the right answer) */
  const quizToText = (q) => (Array.isArray(q) ? q.map((x) => [x.prompt, ...x.options.map((o, i) => (i === x.answer ? "*" : "") + o)].join(" | ")).join("\n") : "");
  const textToQuiz = (t) => {
    const out = String(t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [prompt, ...opts] = l.split("|").map((s) => s.trim());
      const answer = Math.max(0, opts.findIndex((o) => o.startsWith("*")));
      return { prompt, options: opts.map((o) => o.replace(/^\*/, "")), answer };
    }).filter((q) => q.prompt && q.options.length >= 2);
    return out.length ? out : null;
  };

  // shared with records2.js (song book, plans, ministries, testimonies, homes, serve, check-in, push)
  h._R = { form, records, table, section, el, day };

  /* ========================================================== VIEWS */
  return {
    /* ---------------------------------------------------------- SERMONS */
    sermons: { title: "Sermons", crumb: "App content", icon: "play", group: "App content", async render(v) {
      const [series, videos] = await Promise.all([S.list("series").catch(() => []), S.list("videos").catch(() => [])]);
      v.innerHTML = intro("", "Sermons on the app's Watch tab. Paste a YouTube link and the video plays right inside the app. Mark one as <b>live</b> to pin it to the top during a service.");
      const seriesOpts = () => [["", "No series"], ...series.map((s) => [s.id, `${s.title}${s.accent || ""}`])];
      const vs = section("Messages", "Newest first.");
      v.appendChild(vs);
      const draw = () => {
        $(".card__body", vs).innerHTML = "";
        $(".card__body", vs).appendChild(records({
          table: "videos", rows: videos, addLabel: "Add a sermon", empty: "No sermons yet.",
          title: (r) => `${r.title || ""} ${r.accent || ""}`.trim(), sub: (r) => [r.speaker, day(r.published_at), r.youtube_id ? "YouTube ✓" : "no video yet"].filter(Boolean).join(" · "),
          thumb: (r) => r.cover_url, badge: (r) => (r.is_live ? `<span class="badge badge--requested">Live</span>` : r.published === false ? `<span class="badge badge--hidden">Draft</span>` : ""),
          template: { title: "New", accent: "message", speaker: "", description: "", youtube_id: "", series_id: "", is_live: false, published: true, published_at: new Date().toISOString(), cover_url: "" },
          defs: [
            { k: "title", label: "Title (bold)" }, { k: "accent", label: "Accent (italic)" },
            { k: "youtube_id", label: "YouTube link or video ID", wide: true, parse: ytId, hint: "e.g. https://www.youtube.com/watch?v=… (leave empty to show the channel's latest uploads)" },
            { k: "speaker", label: "Speaker" }, { k: "series_id", label: "Series", type: "select", options: seriesOpts(), parse: (x) => x || null },
            { k: "published_at", label: "Date", type: "date", fmt: day, parse: (x) => (x ? new Date(x + "T10:00:00").toISOString() : new Date().toISOString()) },
            { k: "duration_sec", label: "Length (minutes)", type: "number", fmt: (x) => (x ? Math.round(x / 60) : "") },
            { k: "is_live", label: "Live now?", type: "bool", yes: "Live (pinned on top)", no: "On demand" }, { k: "published", label: "Visibility", type: "bool", yes: "Published", no: "Draft (hidden)" },
            { k: "description", label: "About this message", type: "textarea", wide: true },
            { k: "cover_url", label: "Cover image", type: "image", wide: true },
          ],
          beforeSave: (p) => ({ duration_sec: p.duration_sec ? Math.round(p.duration_sec * 60) : null }),
        }));
      };
      draw();
      const ss = section("Series", "Sermon series group messages by book or topic on the Watch tab.");
      v.appendChild(ss);
      $(".card__body", ss).appendChild(records({
        table: "series", rows: series, addLabel: "Add a series", title: (r) => `${r.title || ""} ${r.accent || ""}`.trim(), sub: (r) => `${r.book || ""} · ${r.speaker || ""}`, thumb: (r) => r.cover_url,
        template: { title: "New", accent: " series", book: "", speaker: "", color: "#FF5A1F", position: series.length + 1, cover_url: "" },
        defs: [
          { k: "title", label: "Title (bold)" }, { k: "accent", label: "Accent (italic)" }, { k: "book", label: "Book or topic", ph: "Romans" }, { k: "speaker", label: "Speaker / subtitle" },
          { k: "color", label: "Tint colour", type: "color" }, { k: "position", label: "Order", type: "number" }, { k: "cover_url", label: "Cover image", type: "image", wide: true },
        ],
        onSaved: draw,
      }));
    } },

    /* ---------------------------------------------------------- COURSES */
    courses: { title: "Courses", crumb: "App content", icon: "graduation-cap", group: "App content", async render(v) {
      const [courses, lessons] = await Promise.all([S.list("courses").catch(() => []), S.list("lessons").catch(() => [])]);
      v.innerHTML = intro("", "Agape Institute courses on the app's Grow tab. Each lesson can be a <b>video</b> (YouTube link), a <b>study guide</b> (PDF) or a <b>quiz</b>. Members' progress is saved to their account.");
      const cs = section("Courses", "Open a course to edit it and its lessons.");
      v.appendChild(cs);
      $(".card__body", cs).appendChild(records({
        table: "courses", rows: courses, addLabel: "Add a course", empty: "No courses yet.",
        title: (r) => `${r.title || ""} ${r.accent || ""}`, sub: (r) => `${r.category || ""} · ${lessons.filter((l) => (r.modules || []).some((m) => m.id === l.module_id)).length} lessons`, thumb: (r) => r.cover_url,
        badge: (r) => (r.published ? "" : `<span class="badge badge--hidden">Draft</span>`),
        template: { title: "New", accent: "course", category: "Bible", description: "", color: "#6E4BFF", published: false, position: courses.length + 1, cover_url: "", modules: [] },
        defs: [
          { k: "title", label: "Title (bold)" }, { k: "accent", label: "Accent (italic)" }, { k: "category", label: "Category", ph: "Bible, Explore, Leadership…" }, { k: "color", label: "Colour", type: "color" },
          { k: "published", label: "Visibility", type: "bool", yes: "Published", no: "Draft (hidden)" }, { k: "position", label: "Order", type: "number" },
          { k: "description", label: "Description", type: "textarea", wide: true }, { k: "cover_url", label: "Cover image", type: "image", wide: true },
        ],
        afterCreate: async (r) => { const m = await S.insert("modules", { course_id: r.id, title: "Lessons", position: 0 }); r.modules = [m]; },
        extra: (course, body) => {
          if (!course.id) return;
          const mod = (course.modules || [])[0];
          const box = el(`<div style="margin-top:18px"><h3 style="margin:0 0 10px;font-size:15px">Lessons</h3></div>`);
          body.appendChild(box);
          const ensureModule = async () => mod || ((course.modules = [await S.insert("modules", { course_id: course.id, title: "Lessons", position: 0 })]), course.modules[0]);
          const mine = lessons.filter((l) => (course.modules || []).some((m) => m.id === l.module_id)).sort((a, b) => a.position - b.position);
          box.appendChild(records({
            table: "lessons", rows: mine, addLabel: "Add a lesson", empty: "No lessons yet.",
            title: (r) => r.title, sub: (r) => `${r.kind} · ${r.minutes || 0} min${r.kind === "quiz" ? ` · ${(r.quiz || []).length} questions` : ""}`,
            template: { title: "New lesson", kind: "video", minutes: 15, position: mine.length + 1, body: "", youtube_id: "", pdf_url: "", quiz: null },
            defs: [
              { k: "title", label: "Lesson title" }, { k: "kind", label: "Type", type: "select", options: [["video", "Video"], ["pdf", "Study guide (PDF)"], ["quiz", "Quiz"]] },
              { k: "minutes", label: "Minutes", type: "number" }, { k: "position", label: "Order", type: "number" },
              { k: "youtube_id", label: "YouTube link (video lessons)", wide: true, parse: ytId },
              { k: "pdf_url", label: "Study guide PDF", type: "file", wide: true },
              { k: "body", label: "Notes shown under the lesson", type: "textarea", wide: true },
              { k: "quiz", label: "Quiz questions (quiz lessons)", type: "textarea", rows: 5, wide: true, fmt: quizToText, parse: textToQuiz, hint: "One per line: Question? | Option | *Right option | Option   (put * before the right answer)" },
            ],
            // new lessons go into the course's module
            beforeSave: async (p, r) => (r.id ? {} : { module_id: (await ensureModule()).id }),
          }));
        },
      }));
    } },

    /* ---------------------------------------------------------- STUDY GUIDES */
    docs: { title: "Study guides", crumb: "App content", icon: "file-text", group: "App content", async render(v) {
      const rows = await S.list("documents").catch(() => []);
      v.innerHTML = intro("", "PDF study guides on the app's Grow tab. Upload a PDF and it opens on members' phones.");
      v.appendChild(records({
        table: "documents", rows, addLabel: "Add a study guide", title: (r) => r.title, sub: (r) => (r.url ? `${r.pages || "?"} pages · PDF ✓` : "No PDF yet"),
        template: { title: "New study guide", url: "", pages: null, color: "#FF5A1F", published: true },
        defs: [{ k: "title", label: "Title" }, { k: "pages", label: "Pages", type: "number" }, { k: "color", label: "Colour", type: "color" }, { k: "published", label: "Visibility", type: "bool", yes: "Published", no: "Hidden" }, { k: "url", label: "PDF", type: "file", wide: true }],
      }));
    } },

    /* ---------------------------------------------------------- GAMES */
    games: { title: "Bible games", crumb: "App content", icon: "gamepad-2", group: "App content", async render(v) {
      const packs = await S.list("question_packs").catch(() => []);
      v.innerHTML = intro("", "Question packs for the app's Bible games: <b>Trivia</b>, <b>Who Said It?</b>, <b>True or False</b>, <b>Emoji Bible</b> and <b>Verse Match</b> (Books in Order, Memory Match and the Daily Challenge are built from these automatically). Mark a pack <b>Kids</b> to use it in Agape Kids. Scores go to the weekly leaderboards.");
      const GAMES = { trivia: "Trivia", who_said: "Who Said It?", true_false: "True or False", emoji: "Emoji Bible", verse_match: "Verse Match" };
      const toText = (p) => (p.questions || []).map((q) => (p.game !== "verse_match"
        ? [q.prompt, ...(q.options || []).map((o, i) => (i === Number(q.answer) ? "*" : "") + o), ...(q.reference ? ["ref: " + q.reference] : [])].join(" | ")
        : [q.prompt, (q.answer || []).join(", "), (q.options || []).join(", "), q.reference || ""].join(" | "))).join("\n");
      v.appendChild(records({
        table: "question_packs", rows: packs, addLabel: "Add a question pack",
        title: (r) => r.title, sub: (r) => `${GAMES[r.game] || r.game}${r.audience === "kids" ? " · Kids" : ""} · ${(r.questions || []).length} questions`,
        badge: (r) => (r.published ? "" : `<span class="badge badge--hidden">Draft</span>`),
        template: { title: "New pack", game: "trivia", audience: "all", published: true, questions: [] },
        defs: [{ k: "title", label: "Pack name" }, { k: "game", label: "Game", type: "select", options: Object.entries(GAMES) }, { k: "audience", label: "For", type: "select", options: [["all", "Everyone"], ["kids", "Kids"]] }, { k: "published", label: "Visibility", type: "bool", yes: "Live in the app", no: "Draft" }],
        extra: (p, body) => {
          const w = el(`<label class="field" style="margin-top:14px"><span>Questions</span><textarea rows="8">${esc(toText(p))}</textarea><small>${p.game === "verse_match"
            ? "One verse per line: Verse with ___ for each blank | right words, in order | wrong words | Reference.  e.g.  The Lord is my ___ | shepherd | king, rock | Psalm 23:1"
            : p.game === "true_false" ? "One per line: Statement | *True | False | Reference   (put * before the right answer)"
            : p.game === "emoji" ? "One per line: 🌊🚶‍♂️🌊 | Jonah | *Moses crossing the Red Sea | Noah | Reference"
            : "One per line: Question? | Option | *Right option | Option   (optionally end with | ref: John 3:16)"}</small></label>`);
          const btn = el(`<button class="btn btn--ink btn--sm" style="margin-top:10px">Save questions</button>`);
          btn.addEventListener("click", async () => {
            if (!p.id) return toast("Create the pack first", true);
            const lines = $("textarea", w).value.split("\n").map((l) => l.trim()).filter(Boolean);
            const rows = lines.map((l) => {
              const parts = l.split("|").map((s) => s.trim());
              if (p.game === "verse_match") return { pack_id: p.id, prompt: parts[0], answer: (parts[1] || "").split(",").map((s) => s.trim()).filter(Boolean), options: (parts[2] || "").split(",").map((s) => s.trim()).filter(Boolean), reference: parts[3] || null };
              let opts = parts.slice(1), reference = null;
              const last = opts[opts.length - 1] || "";
              if (/^ref:/i.test(last) || (p.game !== "trivia" && opts.length > 2 && /\d+:\d+/.test(last) && !last.startsWith("*"))) { reference = last.replace(/^ref:\s*/i, ""); opts = opts.slice(0, -1); }
              return { pack_id: p.id, prompt: parts[0], options: opts.map((o) => o.replace(/^\*/, "")), answer: Math.max(0, opts.findIndex((o) => o.startsWith("*"))), reference };
            }).filter((q) => q.prompt && (p.game === "verse_match" ? q.answer.length : q.options.length >= 2));
            try {
              await S.removeWhere("questions", "pack_id", p.id);
              if (rows.length) await S.insert("questions", rows);
              p.questions = rows; toast(`${rows.length} questions saved`);
            } catch (e) { toast(e.message, true); }
          });
          body.appendChild(w); body.appendChild(btn);
        },
      }));
    } },

    /* ---------------------------------------------------------- VISITORS */
    visitors: { title: "Visitor cards", crumb: "Community", icon: "hand-helping", group: "Community", async render(v) {
      const rows = await S.list("visitor_cards").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "First-time visitors who filled in the welcome card on the website. Give them a call, and mark them as contacted.");
      v.appendChild(table(rows, [
        ["Name", (r) => `<b>${esc(r.name)}</b>`],
        ["Phone", (r) => (r.phone ? `<a href="https://wa.me/${esc(String(r.phone).replace(/\D/g, ""))}" target="_blank" rel="noopener">${esc(r.phone)}</a>` : "—")],
        ["Needs", (r) => [r.needs_ride ? "🚗 Ride" : "", r.message ? esc(r.message) : ""].filter(Boolean).join(" · ") || "—"],
        ["Sent", (r) => esc(day(r.created_at))],
        ["Status", (r) => statusSel("visitor_cards", r, "status", ["new", "contacted", "visited"])],
      ], () => `<button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button>`, async (a, r) => {
        if (a === "del" && confirm(`Delete ${r.name}'s card?`)) { await S.remove("visitor_cards", r.id); rows.splice(rows.indexOf(r), 1); toast("Deleted"); }
      }));
    } },

    /* ---------------------------------------------------------- CARE */
    care: { title: "Pastoral care", crumb: "Community", icon: "shield-check", group: "Community", async render(v) {
      const rows = await S.list("care_requests").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Confidential requests from the app's <b>Pastoral care</b> page. Only staff can see these. They never appear on the prayer wall.");
      v.appendChild(table(rows, [
        ["Member", (r) => `<b>${esc(r.member || "Member")}</b><div class="muted" style="font-size:12.5px">${esc(r.phone || r.profiles?.phone || r.profiles?.email || "")}</div>`],
        ["Request", (r) => `<span class="badge badge--open">${esc(r.kind)}</span><div style="max-width:420px;margin-top:6px">${esc(r.details || "")}</div>`],
        ["Sent", (r) => esc(day(r.created_at))],
        ["Status", (r) => statusSel("care_requests", r, "status", ["open", "in progress", "closed"])],
      ]));
    } },

    /* ---------------------------------------------------------- VOLUNTEERS */
    volunteers: { title: "Volunteers", crumb: "Community", icon: "users", group: "Community", async render(v) {
      const rows = await S.list("volunteer_applications").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Applications to serve. Approving one makes the member a <b>volunteer</b>: drivers then see ride requests in the app, and they get a notification.");
      v.appendChild(table(rows, [
        ["Member", (r) => `<b>${esc(r.member || "Member")}</b><div class="muted" style="font-size:12.5px">${esc(r.profiles?.phone || r.profiles?.email || "")}</div>`],
        ["Teams", (r) => (r.teams || []).map((t) => `<span class="badge badge--open">${esc(t)}</span>`).join(" ")],
        ["Car & note", (r) => esc([r.vehicle, r.note].filter(Boolean).join(" · ") || "—")],
        ["Status", (r) => `<span class="badge ${r.status === "approved" ? "badge--answered" : r.status === "declined" ? "badge--hidden" : "badge--requested"}">${esc(r.status)}</span>`],
      ], (r) => (r.status === "pending" ? `<button class="btn btn--ghost btn--sm" data-a="ok">Approve</button><button class="icon-btn is-danger" data-a="no" title="Decline">${ic("x")}</button>` : ""), async (a, r) => {
        const status = a === "ok" ? "approved" : "declined";
        await S.update("volunteer_applications", r.id, { status }); r.status = status;
        toast(status === "approved" ? "Approved: they're now a volunteer 🙌" : "Declined");
      }));
    } },

    /* ---------------------------------------------------------- GIVING */
    giving: { title: "Giving", crumb: "Community", icon: "heart", group: "Community", async render(v) {
      const rows = await S.list("donations").catch((e) => (toast(e.message, true), []));
      const ok = rows.filter((r) => r.status === "succeeded");
      const month = ok.filter((r) => String(r.created_at).slice(0, 7) === new Date().toISOString().slice(0, 7));
      const sum = (l) => l.reduce((a, r) => a + Number(r.amount || 0), 0);
      const byFund = {};
      ok.forEach((r) => (byFund[r.campaign_title || r.fund] = (byFund[r.campaign_title || r.fund] || 0) + Number(r.amount || 0)));
      v.innerHTML = intro("", "Gifts made in the app and on the website. A gift only counts once the payment provider confirms it. Campaign jars on the site add these to the starting amount you set under Giving campaigns.");
      v.appendChild(el(`<div class="stats"><div class="stat"><small>This month</small><b>${esc(h.currency())} ${fmt(sum(month))}</b><i>${month.length} gifts</i></div><div class="stat"><small>All time</small><b>${esc(h.currency())} ${fmt(sum(ok))}</b><i>${ok.length} gifts</i></div>${Object.entries(byFund).slice(0, 3).map(([f, n]) => `<div class="stat"><small>${esc(f)}</small><b>${esc(h.currency())} ${fmt(n)}</b><i>received</i></div>`).join("")}</div>`));
      const c = section("Gifts", "Newest first. Pending = the donor didn't finish paying (or the bank hasn't confirmed yet).");
      v.appendChild(c);
      $(".card__body", c).appendChild(table(rows, [
        ["Date", (r) => esc(day(r.created_at))],
        ["Donor", (r) => `<b>${esc(r.donor)}</b><div class="muted" style="font-size:12.5px">${esc(r.profiles?.email || r.donor_email || "")}</div>`],
        ["Fund", (r) => esc(r.campaign_title || r.fund)],
        ["Amount", (r) => `<b>${esc(r.currency)} ${fmt(r.amount)}</b>`],
        ["Status", (r) => `<span class="badge ${r.status === "succeeded" ? "badge--answered" : r.status === "failed" ? "badge--hidden" : "badge--requested"}">${esc(r.status)}</span>`],
        ["Ref", (r) => `<span class="muted" style="font-size:12px">${esc(r.provider || "")} ${esc(r.provider_ref || "")}</span>`],
      ]));
    } },
  };
};
