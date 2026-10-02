/* =========================================================
   AGAPE — Admin: everything the app grew in v2
   Song book, reading plans, Kids/Teens/Squad posts, testimonies,
   home prayer meetings, serve board, QR check-in, push campaigns.
   Reuses the form/list helpers from records.js (passed in as `R`).
   ========================================================= */
window.AgapeAdminMore = function (h, R) {
  "use strict";
  const { S, $, esc, ic, fmt, toast, intro } = h;
  const { form, records, table, section, el, day } = R;
  const when = (d) => (d ? new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
  const local = (d) => { if (!d) return ""; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const fromLocal = (s) => (s ? new Date(s).toISOString() : null);
  const ytId = (s) => { s = String(s || "").trim(); const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : null; };
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const dt = (k, label) => ({ k, label, type: "datetime", fmt: local, parse: fromLocal });

  /* plan days <-> text: one day per line  "Title | John 1; Psalm 1 | devotion | journal question" */
  const daysToText = (d) => (Array.isArray(d) ? d.map((x) => [x.title, (x.refs || []).join("; "), x.devotion || "", x.prompt || ""].join(" | ")).join("\n") : "");
  const textToDays = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [title, refs, devotion, prompt] = l.split("|").map((s) => (s || "").trim());
    return { title, refs: (refs || "").split(";").map((s) => s.trim()).filter(Boolean), ...(devotion ? { devotion } : {}), ...(prompt ? { prompt } : {}) };
  }).filter((d) => d.title);

  return {
    /* ---------------------------------------------------------- SONG BOOK */
    songs: { title: "Song book", crumb: "App content", icon: "music", group: "App content", async render(v) {
      const rows = await S.list("songs").catch(() => []);
      v.innerHTML = intro("", "Worship songs in the app's <b>Song book</b>, with chords that musicians can transpose, play with a capo and auto-scroll. Write chords in square brackets right before the syllable: <code>[G]Amazing [C]grace</code>. Put section names on their own line in curly brackets: <code>{Verse 1}</code>, <code>{Chorus}</code>. Only add songs the church has the right to use (public-domain hymns, or songs covered by your CCLI licence).");
      v.appendChild(records({
        table: "songs", rows, addLabel: "Add a song", empty: "No songs yet.",
        title: (r) => r.title, sub: (r) => [r.author, `Key ${r.original_key}`, (r.tags || []).join(", ")].filter(Boolean).join(" · "),
        badge: (r) => (r.published === false ? `<span class="badge badge--hidden">Hidden</span>` : ""),
        template: { title: "New song", slug: "", author: "", original_key: "G", tempo: 80, time_sig: "4/4", tags: ["worship"], body: "{Verse 1}\n[G]Line one with [C]chords\n\n{Chorus}\n[G]…", copyright: "", published: true, position: rows.length + 1 },
        defs: [
          { k: "title", label: "Title" }, { k: "author", label: "Words / music by" },
          { k: "original_key", label: "Key", type: "select", options: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm"].map((k) => [k, k]) },
          { k: "tempo", label: "Tempo (bpm)", type: "number" }, { k: "time_sig", label: "Time", ph: "4/4" },
          { k: "tags", label: "Tags", ph: "hymn, worship, christmas", fmt: (x) => (x || []).join(", "), parse: (x) => x.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) },
          { k: "copyright", label: "Copyright / CCLI", ph: "Public domain" }, { k: "published", label: "Visibility", type: "bool", yes: "In the app", no: "Hidden" },
          { k: "body", label: "Lyrics with chords", type: "textarea", rows: 16, wide: true, mono: true },
        ],
        beforeSave: (p, r) => ({ slug: r.slug || slug(p.title), updated_at: new Date().toISOString() }),
      }));
      const sets = await S.list("set_lists").catch(() => []);
      const shared = sets.filter((s) => s.shared);
      const c = section("Worship-team set lists", "Shared set lists appear for everyone in the app's Song book. Pick songs and keys here, or let the worship leader build one in the app.");
      v.appendChild(c);
      $(".card__body", c).appendChild(records({
        table: "set_lists", rows: shared, addLabel: "New shared set list", empty: "No shared set lists.",
        title: (r) => r.title, sub: (r) => `${(r.items || []).length} songs${r.service_date ? " · " + r.service_date : ""}`,
        template: { title: "Sunday worship", service_date: new Date().toISOString().slice(0, 10), items: [], shared: true },
        defs: [
          { k: "title", label: "Name" }, { k: "service_date", label: "Date", type: "date", fmt: day },
          { k: "items", label: "Songs, one per line:  song-slug | key", type: "textarea", rows: 6, wide: true, fmt: (x) => (x || []).map((i) => `${i.song}${i.key ? " | " + i.key : ""}`).join("\n"),
            parse: (t) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [song, key] = l.split("|").map((s) => s.trim()); return key ? { song: slug(song), key } : { song: slug(song) }; }),
            hint: "Song slugs: " + rows.slice(0, 40).map((s) => s.slug).join(", ") },
        ],
        beforeSave: () => ({ shared: true, updated_at: new Date().toISOString() }),
      }));
    } },

    /* ---------------------------------------------------------- READING PLANS */
    plans: { title: "Reading plans", crumb: "App content", icon: "book-open", group: "App content", async render(v) {
      const rows = await S.list("reading_plans").catch(() => []);
      v.innerHTML = intro("", "Bible reading plans for adults, teens and kids. Members get a daily reminder, a streak, and a private journal for each day. Bible text is read from free public-domain translations in the member's language.");
      v.appendChild(records({
        table: "reading_plans", rows, addLabel: "Add a plan", empty: "No plans yet.",
        title: (r) => r.title, sub: (r) => `${r.audience} · ${(r.days || []).length} days`, thumb: (r) => r.image,
        badge: (r) => (r.published === false ? `<span class="badge badge--hidden">Hidden</span>` : `<span class="badge badge--open">${esc(r.audience)}</span>`),
        template: { title: "New plan", subtitle: "", description: "", audience: "adults", color: "#FF5A1F", image: "", days: [], published: true, position: rows.length + 1 },
        defs: [
          { k: "title", label: "Title" }, { k: "subtitle", label: "Subtitle" },
          { k: "audience", label: "For", type: "select", options: [["adults", "Adults"], ["teens", "Teens"], ["kids", "Kids"]] }, { k: "color", label: "Colour", type: "color" },
          { k: "published", label: "Visibility", type: "bool", yes: "In the app", no: "Hidden" }, { k: "position", label: "Order", type: "number" },
          { k: "description", label: "Description", type: "textarea", wide: true }, { k: "image", label: "Cover image", type: "image", wide: true },
          { k: "days", label: "Days", type: "textarea", rows: 12, wide: true, fmt: daysToText, parse: textToDays, hint: "One day per line:  Title | John 1; Psalm 1 | Devotion (a few sentences) | Journal question" },
        ],
        beforeSave: (p, r) => (r.slug ? {} : { slug: slug(p.title) }),
      }));
    } },

    /* ---------------------------------------------------------- KIDS / TEENS / SQUAD */
    ministry: { title: "Kids, Teens & Squad", crumb: "App content", icon: "baby", group: "App content", async render(v) {
      const rows = await S.list("ministry_posts").catch(() => []);
      v.innerHTML = intro("", "Posts in the app's <b>Agape Kids</b> (kid-safe: no chat, no prayer wall), <b>Agape Teens</b> and <b>Agape Squad</b> sections: the memory verse, Bible stories (the app can read them aloud), YouTube videos, events, challenges and activities.");
      ["kids", "teens", "squad"].forEach((m) => {
        const mine = rows.filter((r) => r.ministry === m);
        const c = section({ kids: "Agape Kids", teens: "Agape Teens", squad: "Agape Squad" }[m], `${mine.length} posts`);
        v.appendChild(c);
        $(".card__body", c).appendChild(records({
          table: "ministry_posts", rows: mine, addLabel: "Add a post", empty: "No posts yet.",
          title: (r) => r.title, sub: (r) => `${r.kind}${r.starts_at ? " · " + when(r.starts_at) : ""}${r.youtube_id ? " · video ✓" : ""}`, thumb: (r) => r.image,
          badge: (r) => (r.pinned ? `<span class="badge badge--requested">Pinned</span>` : r.published === false ? `<span class="badge badge--hidden">Hidden</span>` : ""),
          template: { ministry: m, kind: m === "kids" ? "story" : "post", title: "", body: "", ref: "", youtube_id: "", image: "", color: "#FF5A1F", starts_at: null, pinned: false, published: true, position: 0 },
          defs: [
            { k: "title", label: "Title" }, { k: "kind", label: "Type", type: "select", options: [["verse", "Memory verse"], ["story", "Bible story"], ["video", "Video"], ["event", "Event"], ["challenge", "Challenge"], ["activity", "Activity / craft"], ["post", "Update"]] },
            { k: "ref", label: "Bible reference", ph: "Psalm 23:1" }, { k: "youtube_id", label: "YouTube link (videos)", parse: ytId },
            dt("starts_at", "Date & time (events)"), { k: "color", label: "Colour", type: "color" },
            { k: "pinned", label: "Pinned to top?", type: "bool", yes: "Pinned", no: "Normal" }, { k: "published", label: "Visibility", type: "bool", yes: "In the app", no: "Hidden" },
            { k: "body", label: "Text (story, verse, details)", type: "textarea", rows: 6, wide: true }, { k: "image", label: "Image", type: "image", wide: true },
          ],
        }));
      });
    } },

    /* ---------------------------------------------------------- TESTIMONIES (moderation) */
    stories: { title: "Testimonies", crumb: "Community", icon: "sun", group: "Community", async render(v) {
      const rows = await S.list("testimonies").catch((e) => (toast(e.message, true), []));
      const waiting = rows.filter((r) => !r.approved);
      v.innerHTML = intro("", "Stories members share in the app. Nothing appears until you approve it; the member gets a notification when it's live. <b>Feature</b> one to pin it to the top.");
      const draw = (title, list, text) => {
        const c = section(title, text);
        v.appendChild(c);
        $(".card__body", c).appendChild(table(list, [
          ["Story", (r) => `<b>${esc(r.title)}</b><div style="max-width:520px;margin-top:6px;white-space:pre-wrap">${esc(r.body)}</div>`],
          ["By", (r) => `${esc(r.anonymous ? "Anonymous" : r.member || r.author_name || "Member")}<div class="muted" style="font-size:12px">${esc(r.category)} · ${esc(day(r.created_at))}</div>`],
          ["", (r) => (r.approved ? `<span class="badge badge--answered">Live · ${fmt(r.amens)} amen</span>${r.featured ? ` <span class="badge badge--requested">Featured</span>` : ""}` : `<span class="badge badge--requested">Waiting</span>`)],
        ], (r) => (r.approved ? `<button class="btn btn--ghost btn--sm" data-a="feat">${r.featured ? "Unfeature" : "Feature"}</button><button class="btn btn--ghost btn--sm" data-a="hide">Hide</button>` : `<button class="btn btn--ghost btn--sm" data-a="ok">Approve</button>`) + `<button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button>`,
        async (a, r) => {
          if (a === "ok") { await S.update("testimonies", r.id, { approved: true }); r.approved = true; toast("Approved — it's live in the app"); }
          if (a === "hide") { await S.update("testimonies", r.id, { approved: false, featured: false }); r.approved = false; r.featured = false; toast("Hidden"); }
          if (a === "feat") { await S.update("testimonies", r.id, { featured: !r.featured }); r.featured = !r.featured; toast(r.featured ? "Featured" : "Unfeatured"); }
          if (a === "del" && confirm("Delete this testimony?")) { await S.remove("testimonies", r.id); list.splice(list.indexOf(r), 1); toast("Deleted"); }
        }));
      };
      draw("Waiting for approval", waiting, `${waiting.length} to read`);
      draw("Live in the app", rows.filter((r) => r.approved), "");
    } },

    /* ---------------------------------------------------------- HOME PRAYER MEETINGS */
    homes: { title: "Home prayer meetings", crumb: "Community", icon: "map-pin", group: "Community", async render(v) {
      const rows = await S.list("home_meetings").catch((e) => (toast(e.message, true), []));
      v.innerHTML = intro("", "Prayer meetings, Bible studies and worship nights members host in their homes. Members see the area; the exact address is shared only with people who RSVP. You can cancel a meeting — everyone who RSVP'd is told.");
      v.appendChild(table(rows, [
        ["Meeting", (r) => `<b>${esc(r.title)}</b><div class="muted" style="font-size:12.5px">${esc(r.kind)}${r.repeats ? " · weekly" : ""}${r.language ? " · " + esc(r.language) : ""}</div>`],
        ["When", (r) => esc(when(r.starts_at))],
        ["Where", (r) => `${esc(r.area)}<div class="muted" style="font-size:12px">${esc(r.home_meeting_places?.address || "")}</div>`],
        ["Host", (r) => esc(r.host?.full_name || r.host || "Member")],
        ["Going", (r) => `${fmt((r.home_meeting_rsvps || []).reduce((a, x) => a + 1 + (x.guests || 0), 0))}${r.capacity ? " / " + r.capacity : ""}`],
        ["", (r) => (r.cancelled ? `<span class="badge badge--hidden">Cancelled</span>` : new Date(r.starts_at) < new Date() ? `<span class="badge">Past</span>` : `<span class="badge badge--answered">Upcoming</span>`)],
      ], (r) => (!r.cancelled ? `<button class="btn btn--ghost btn--sm" data-a="cancel">Cancel</button>` : "") + `<button class="icon-btn is-danger" data-a="del" title="Delete">${ic("trash")}</button>`,
      async (a, r) => {
        if (a === "cancel" && confirm(`Cancel “${r.title}”? Everyone who RSVP'd gets a notification.`)) { await S.update("home_meetings", r.id, { cancelled: true }); r.cancelled = true; toast("Cancelled"); }
        if (a === "del" && confirm("Delete this meeting?")) { await S.remove("home_meetings", r.id); rows.splice(rows.indexOf(r), 1); toast("Deleted"); }
      }));
    } },

    /* ---------------------------------------------------------- SERVE BOARD */
    serve: { title: "Serve board", crumb: "Community", icon: "hand-helping", group: "Community", async render(v) {
      const rows = await S.list("serve_opportunities").catch(() => []);
      v.innerHTML = intro("", "Volunteer shifts members can sign up for in the app (ushering, kids, tech, worship, hospitality, driving, prayer…). Their phone reminds them two hours before. Open a shift to see who's coming.");
      v.appendChild(records({
        table: "serve_opportunities", rows, addLabel: "Add a shift", empty: "No shifts yet.",
        title: (r) => r.title, sub: (r) => `${r.team} · ${when(r.starts_at)} · ${(r.serve_signups || []).length}/${r.slots} signed up`,
        template: { team: "ushering", title: "Sunday ushers", description: "", starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), ends_at: null, location: "Agape Church, Salmiya", slots: 6, published: true },
        defs: [
          { k: "title", label: "Title" }, { k: "team", label: "Team", type: "select", options: ["ushering", "kids", "tech", "worship", "hospitality", "driving", "prayer", "cleanup"].map((x) => [x, x[0].toUpperCase() + x.slice(1)]) },
          dt("starts_at", "Starts"), dt("ends_at", "Ends"), { k: "location", label: "Where" }, { k: "slots", label: "People needed", type: "number" },
          { k: "published", label: "Visibility", type: "bool", yes: "In the app", no: "Hidden" }, { k: "description", label: "What to do / bring", type: "textarea", wide: true },
        ],
        extra: (r, body) => { if (!r.id) return; const n = r.serve_signups || []; body.appendChild(el(`<div style="margin-top:12px"><b style="font-size:14px">Signed up (${n.length})</b><div class="muted" style="font-size:14px;margin-top:4px">${n.map((s) => esc(s.profiles?.full_name || "Member")).join(", ") || "Nobody yet"}</div></div>`)); },
      }));
    } },

    /* ---------------------------------------------------------- CHECK-IN */
    checkin: { title: "Check-in", crumb: "Community", icon: "qr-code", group: "Community", async render(v) {
      const [codes, ins] = await Promise.all([S.list("checkin_codes").catch(() => []), S.list("checkins").catch(() => [])]);
      v.innerHTML = intro("", "Make today's check-in code and put it on the screen at church: members scan it with the app (Me → Check in). The welcome team can also scan members' cards. Codes only work on the day they're made for.");
      const c = section("Today's code", "", `<button class="btn btn--brand btn--sm js-new"><span>New code</span><i>${ic("plus")}</i></button>`);
      v.appendChild(c);
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuwait" });
      const show = (code) => {
        const body = $(".card__body", c);
        if (!code) { body.innerHTML = `<div class="empty">No code for today yet. Make one before the service.</div>`; return; }
        body.innerHTML = `<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div class="js-qr" style="background:#fff;padding:14px;border-radius:14px;line-height:0"></div><div><div class="muted">${esc(code.title)} · ${esc(code.valid_on)}</div><div style="font:700 44px/1.1 ui-monospace,monospace;letter-spacing:4px;margin:8px 0">${esc(code.code)}</div><p class="muted">People can also type this code into the app.</p><button class="btn btn--ghost btn--sm js-full">Show full screen</button></div></div>`;
        const draw = (n, size) => { const qr = window.qrcode(0, "M"); qr.addData(`AGAPE:CHECKIN:${code.code}`); qr.make(); return qr.createSvgTag({ cellSize: size, margin: 0 }); };
        const paint = () => ($(".js-qr", body).innerHTML = window.qrcode ? draw(code, 6) : `<b>${esc(code.code)}</b>`);
        if (window.qrcode) paint(); else { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"; s.onload = paint; document.head.appendChild(s); }
        $(".js-full", body).addEventListener("click", () => {
          const w = window.open("", "_blank");
          w.document.write(`<title>Check in · Agape</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0F0B12;color:#fff;font-family:system-ui;text-align:center"><div><h1 style="font-weight:600">Check in with the Agape app</h1><div style="background:#fff;padding:24px;border-radius:24px;display:inline-block;line-height:0">${window.qrcode ? draw(code, 12) : ""}</div><p style="font:700 56px ui-monospace,monospace;letter-spacing:8px">${esc(code.code)}</p><p style="opacity:.7">Me → Check in → Scan at church</p></div></body>`);
        });
      };
      show(codes.find((x) => x.valid_on === today));
      $(".js-new", c).addEventListener("click", async () => {
        const title = prompt("What is this for?", "Sunday worship") || "Sunday worship";
        try { const row = await S.insert("checkin_codes", { title, event_key: slug(title), valid_on: today, code: Math.random().toString(16).slice(2, 10).toUpperCase() }); codes.unshift(row); show(row); toast("Code ready"); } catch (e) { toast(e.message, true); }
      });
      const byDay = {};
      ins.forEach((r) => (byDay[r.day] = (byDay[r.day] || 0) + 1));
      const s = section("Attendance", Object.entries(byDay).slice(0, 6).map(([d, n]) => `${d}: <b>${n}</b>`).join(" · ") || "No check-ins yet.");
      v.appendChild(s);
      $(".card__body", s).appendChild(table(ins.slice(0, 200), [
        ["Member", (r) => `<b>${esc(r.profiles?.full_name || r.member || "Member")}</b><div class="muted" style="font-size:12px">${esc(r.profiles?.member_no || "")}</div>`],
        ["Service", (r) => esc(r.title || r.event_key)], ["Day", (r) => esc(r.day)], ["How", (r) => esc(r.method === "staff" ? "Scanned by welcome team" : "Scanned the code")],
      ]));
    } },

    /* ---------------------------------------------------------- PUSH CAMPAIGNS */
    push: { title: "Push notifications", crumb: "Community", icon: "send", group: "Community", async render(v) {
      const rows = await S.list("push_campaigns").catch(() => []);
      const C = (h.content && h.content()) || {};
      const groups = (C.ministries || []).map((m) => [`group:${slug(m.name)}`, `Group: ${m.name}`]);
      v.innerHTML = intro("", "Send a notification to members' phones — everyone, a group, a ministry or a language. e.g. “Your small group starts in 1 hour”. Schedule it, or send it now.");
      const c = section("New notification", "");
      v.appendChild(c);
      const f = form([
        { k: "title", label: "Title", ph: "Small group starts in 1 hour" }, { k: "route", label: "Opens in the app", type: "select", options: [["/", "Home"], ["/bible", "Bible"], ["/events", "Events"], ["/prayer", "Prayer wall"], ["/testimonies", "Testimonies"], ["/serve", "Serve board"], ["/home-prayer", "Home meetings"], ["/watch", "Watch"], ["/give", "Give"], ["/kids", "Agape Kids"], ["/ministry/teens", "Agape Teens"], ["/ministry/squad", "Agape Squad"]] },
        { k: "audience", label: "Who gets it", type: "select", options: [["everyone", "Everyone"], ["volunteers", "Volunteers"], ["staff", "Staff"], ["ministry:teens", "Teens chat"], ["ministry:squad", "Agape Squad"], ["ministry:kids", "Kids' parents / Kids mode"], ...groups, ["language:hi", "Hindi speakers"], ["language:ml", "Malayalam speakers"], ["language:ta", "Tamil speakers"], ["language:ar", "Arabic speakers"]] },
        dt("send_at", "Send at (leave empty to send now)"),
        { k: "body", label: "Message", type: "textarea", wide: true },
      ], { title: "", route: "/", audience: "everyone", send_at: null, body: "" });
      $(".card__body", c).appendChild(f.node);
      const btn = el(`<button class="btn btn--brand btn--sm" style="margin-top:14px"><span>Send</span><i>${ic("send")}</i></button>`);
      $(".card__body", c).appendChild(btn);
      btn.addEventListener("click", async () => {
        const p = f.read();
        if (!p.title || !p.body) return toast("Add a title and a message", true);
        btn.disabled = true;
        try {
          const row = await S.insert("push_campaigns", p);
          const fresh = (await S.list("push_campaigns").catch(() => [])).find((x) => x.id === row.id) || row;
          toast(p.send_at ? `Scheduled for ${when(p.send_at)}` : `Sent to ${fmt(fresh.sent_count || 0)} people`);
          h.go && h.go("push");
        } catch (e) { toast(e.message, true); btn.disabled = false; }
      });
      const s = section("Sent & scheduled", "");
      v.appendChild(s);
      $(".card__body", s).appendChild(table(rows, [
        ["Notification", (r) => `<b>${esc(r.title)}</b><div class="muted" style="font-size:13px">${esc(r.body)}</div>`],
        ["To", (r) => esc(r.audience)], ["When", (r) => esc(when(r.sent_at || r.send_at || r.created_at))],
        ["", (r) => (r.sent_at ? `<span class="badge badge--answered">Sent · ${fmt(r.sent_count)}</span>` : `<span class="badge badge--requested">Scheduled</span>`)],
      ], (r) => (!r.sent_at ? `<button class="icon-btn is-danger" data-a="del" title="Cancel">${ic("trash")}</button>` : ""), async (a, r) => {
        if (a === "del") { await S.remove("push_campaigns", r.id); rows.splice(rows.indexOf(r), 1); toast("Cancelled"); }
      }));
    } },
  };
};
