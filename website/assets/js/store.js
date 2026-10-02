/* =========================================================
   AGAPE — content store (shared by the website and /admin)
   • Live mode  : Supabase (REST + Storage), when assets/js/config.js has a URL + anon key
   • Demo mode  : this browser's IndexedDB (great for trying the admin locally)
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.AGAPE_CONFIG || {};
  const URL_ = (CFG.supabaseUrl || "").replace(/\/$/, "");
  const KEY = CFG.supabaseAnonKey || "";
  const LIVE = !!(URL_ && KEY && !URL_.includes("YOUR-PROJECT"));
  const BUCKET = CFG.mediaBucket || "media";
  const SESSION_KEY = "agape-admin-session";

  /* ---------- IndexedDB (demo mode) ---------- */
  const idb = () =>
    new Promise((res, rej) => {
      const r = indexedDB.open("agape-cms", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  const idbGet = async (k) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction("kv").objectStore("kv").get(k);
      t.onsuccess = () => res(t.result);
      t.onerror = () => rej(t.error);
    });
  };
  const idbSet = async (k, v) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(v, k);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  };
  const idbDel = async (k) => {
    const db = await idb();
    return new Promise((res) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete(k); tx.oncomplete = () => res(true); });
  };

  /* ---------- helpers ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
  function merge(base, over) {
    if (!isObj(over)) return base;
    const out = clone(base);
    for (const k of Object.keys(over)) out[k] = isObj(out[k]) && isObj(over[k]) ? merge(out[k], over[k]) : over[k];
    return out;
  }
  const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  function session() {
    try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); return s && s.expires_at * 1000 > Date.now() ? s : null; } catch (e) { return null; }
  }
  const headers = (auth = true, extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${(auth && session()?.access_token) || KEY}`, ...extra });

  async function rest(path, opts = {}) {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { ...opts, headers: { ...headers(), "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!r.ok) throw new Error((await r.text()) || r.statusText);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }

  /* ---------- image processing ---------- */
  function resize(file, max = 1800, quality = 0.84) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error("Please choose an image file."));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const type = file.type === "image/png" && file.size < 600000 ? "image/png" : "image/jpeg";
        c.toBlob((b) => (b ? res({ blob: b, type, w: c.width, h: c.height }) : rej(new Error("Could not process image"))), type, quality);
      };
      img.onerror = () => rej(new Error("Could not read that image."));
      img.src = url;
    });
  }
  const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

  /* ---------- demo seed for community tools ---------- */
  const DEMO_TABLES = {
    prayer_requests: [
      { id: "p1", body: "Please pray for my mom's surgery on Thursday.", author: "Anonymous", anonymous: true, pray_count: 42, answered: false, hidden: false, created_at: "2026-09-28" },
      { id: "p2", body: "Thank you church! My dad is home from the ICU.", author: "Priya R.", anonymous: false, pray_count: 214, answered: true, hidden: false, created_at: "2026-09-26" },
      { id: "p3", body: "New job starts Monday. Praying for favor.", author: "Joseph A.", anonymous: false, pray_count: 28, answered: false, hidden: false, created_at: "2026-09-25" },
      { id: "p4", body: "Struggling with anxiety at night. Pray for rest.", author: "Anonymous", anonymous: true, pray_count: 88, answered: false, hidden: false, created_at: "2026-09-24" },
    ],
    rides: [
      { id: "r1", member: "Mariam K.", pickup_label: "Salmiya Block 4", requested_for: "Sun 9:15 AM", seats: 2, status: "requested", volunteer: "" },
      { id: "r2", member: "Thomas J.", pickup_label: "Hawally, Tunis St", requested_for: "Sun 9:30 AM", seats: 1, status: "accepted", volunteer: "David Kumar" },
      { id: "r3", member: "Esther & kids", pickup_label: "Jabriya Block 1", requested_for: "Sun 5:15 PM", seats: 3, status: "requested", volunteer: "" },
    ],
    profiles: [
      { id: "u1", full_name: "Sarah Mathews", email: "sarah@example.com", role: "member", created_at: "2024-03-02" },
      { id: "u2", full_name: "David Kumar", email: "david@example.com", role: "volunteer", created_at: "2023-11-19" },
      { id: "u3", full_name: "Grace Abraham", email: "grace@example.com", role: "staff", created_at: "2022-06-10" },
      { id: "u4", full_name: "Joel Philip", email: "joel@example.com", role: "member", created_at: "2025-01-14" },
      { id: "u5", full_name: "Anita Varghese", email: "anita@example.com", role: "volunteer", created_at: "2024-08-30" },
    ],
    announcements: [
      { id: "a1", title: "Prayer & Worship this Friday", body: "Join us at 8 PM. Addresses are in the app.", created_at: "2026-09-28" },
      { id: "a2", title: "Foundations course: new batch", body: "Registrations are open for the Agape Institute of Ministry.", created_at: "2026-09-22" },
    ],
  };
  Object.assign(DEMO_TABLES, {
    series: [
      { id: "s1", slug: "romans", title: "Unshake", accent: "able", book: "Romans", speaker: "Ps. John Mathew", cover_url: "assets/img/cross-mountain.jpg", color: "#FF5A1F", position: 1 },
      { id: "s2", slug: "psalms", title: "Psalms", accent: "after dark", book: "Psalms", speaker: "Night worship", cover_url: "assets/img/woman-forest.jpg", color: "#6E4BFF", position: 2 },
    ],
    videos: [
      { id: "v1", series_id: "s1", title: "Nothing", accent: "is wasted", speaker: "Ps. John Mathew", description: "Romans 8:28.", cover_url: "assets/img/cross-mountain.jpg", youtube_id: "", is_live: false, published: true, duration_sec: 3840, views: 9840, published_at: "2026-09-20T10:00:00Z" },
      { id: "v2", series_id: "s2", title: "The shepherd", accent: "who stays", speaker: "Night worship", description: "Psalm 23.", cover_url: "assets/img/woman-forest.jpg", youtube_id: "", is_live: false, published: true, duration_sec: 2760, views: 6010, published_at: "2026-09-13T10:00:00Z" },
    ],
    courses: [{ id: "c1", slug: "foundations", title: "Foundations", accent: "of Christian Living", category: "Bible", description: "Six lessons on what we believe and how to live it.", cover_url: "assets/img/agape-institute.jpg", color: "#6E4BFF", published: true, position: 1, modules: [{ id: "m1", position: 0 }] }],
    lessons: [
      { id: "l1", module_id: "m1", title: "Why we need faith", kind: "video", minutes: 18, position: 1, youtube_id: "", pdf_url: "", body: "Hebrews 11:6.", quiz: null },
      { id: "l2", module_id: "m1", title: "Final reflection", kind: "quiz", minutes: 10, position: 2, quiz: [{ prompt: "Which chapter is the hall of faith?", options: ["Romans 8", "Hebrews 11", "John 3"], answer: 1 }] },
    ],
    documents: [{ id: "d1", title: "Romans study guide", url: "", pages: 24, color: "#FF5A1F", published: true }],
    question_packs: [
      { id: "q1", title: "Bible trivia · starter", game: "trivia", published: true, questions: [{ prompt: "Who built the ark?", options: ["Moses", "Noah", "Abraham", "David"], answer: 1 }] },
      { id: "q2", title: "Verse Match · starter", game: "verse_match", published: true, questions: [{ prompt: "The Lord is my ___; I shall not ___.", options: ["king", "fear"], answer: ["shepherd", "want"], reference: "Psalm 23:1" }] },
    ],
    visitor_cards: [{ id: "vc1", name: "Kevin O.", phone: "+965 5000 0000", needs_ride: true, message: "Bringing kids", status: "new", created_at: "2026-09-28" }],
    care_requests: [{ id: "cr1", member: "Joseph A.", kind: "hospital", details: "My father is in Mubarak hospital, ward 4.", phone: "+965 5000 0001", status: "open", created_at: "2026-09-27" }],
    volunteer_applications: [{ id: "va1", member: "Anita Varghese", teams: ["driving", "welcome"], vehicle: "Kia Carnival · Grey", note: "Free on Sundays", status: "pending", created_at: "2026-09-26" }],
    songs: [
      { id: "so1", slug: "amazing-grace", title: "Amazing Grace", author: "John Newton, 1779", original_key: "G", tempo: 76, time_sig: "3/4", tags: ["hymn", "classic"], body: "{Verse 1}\nA[G]mazing grace! How [G7]sweet the [C]sound\nThat [G]saved a wretch like [D]me!", copyright: "Public domain", published: true, position: 1 },
      { id: "so2", slug: "great-is-thy-faithfulness", title: "Great Is Thy Faithfulness", author: "Thomas O. Chisholm, 1923", original_key: "D", tempo: 76, time_sig: "3/4", tags: ["hymn", "worship"], body: "{Verse 1}\n\"Great is Thy [D]faithfulness,\" [G]O God my [D]Father", copyright: "Public domain", published: true, position: 2 },
    ],
    set_lists: [],
    reading_plans: [
      { id: "rp1", slug: "gospel-of-john", title: "The Gospel of John", subtitle: "21 days with Jesus", audience: "adults", color: "#FF5A1F", image: "assets/img/bible-coffee.jpg", published: true, position: 1, days: [{ title: "The Word became flesh", refs: ["John 1"], devotion: "John begins before the beginning." }] },
      { id: "rp2", slug: "heroes-of-the-bible", title: "Heroes of the Bible", subtitle: "10 days for kids", audience: "kids", color: "#FFC23D", image: "assets/img/agape-kids-hearts.jpg", published: true, position: 2, days: [{ title: "Noah trusts God", refs: ["Genesis 6:9-22"] }] },
    ],
    ministry_posts: [
      { id: "mp1", ministry: "kids", kind: "verse", title: "Memory verse", body: "Be kind to one another.", ref: "Ephesians 4:32", pinned: true, published: true, color: "#FFC23D" },
      { id: "mp2", ministry: "teens", kind: "event", title: "Friday youth night", body: "Games, worship and real talk.", starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), published: true, color: "#4CC3FF" },
      { id: "mp3", ministry: "squad", kind: "post", title: "Practice: Saturdays 4 PM", body: "Bring water and your lyrics.", pinned: true, published: true, color: "#FF3D7F" },
    ],
    testimonies: [
      { id: "t1", title: "A job after eight months", body: "We prayed as a home group every Thursday. Last week I got the offer.", category: "provision", member: "Joseph A.", approved: false, featured: false, amens: 0, created_at: "2026-09-29" },
      { id: "t2", title: "My daughter's fever broke", body: "The whole prayer wall prayed. The doctors were amazed.", category: "healing", member: "Anita V.", approved: true, featured: true, amens: 46, created_at: "2026-09-20" },
    ],
    home_meetings: [
      { id: "hm1", title: "Thursday prayer & worship", kind: "prayer", repeats: "weekly", language: "Malayalam / English", starts_at: new Date(Date.now() + 2 * 864e5).toISOString(), area: "Salmiya, Block 10", host: "Thomas K.", home_meeting_places: { address: "Building 14, Street 12, Flat 6" }, home_meeting_rsvps: [{ guests: 1 }, { guests: 0 }], capacity: 16, cancelled: false },
    ],
    serve_opportunities: [
      { id: "so-1", team: "ushering", title: "Sunday ushers", description: "Welcome people at the door.", starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), location: "Agape Church, Salmiya", slots: 6, published: true, serve_signups: [{ profiles: { full_name: "Sarah Mathews" } }] },
    ],
    checkin_codes: [],
    checkins: [{ id: 1, member: "Sarah Mathews", profiles: { full_name: "Sarah Mathews", member_no: "AGP-24-1001" }, event_key: "sunday-worship", title: "Sunday worship", day: "2026-09-27", method: "self" }],
    push_campaigns: [{ id: "pc1", title: "Prayer & Worship tonight", body: "8 PM in homes across the city. Addresses are in the app.", audience: "everyone", route: "/home-prayer", sent_at: "2026-09-25T15:00:00Z", sent_count: 412 }],
    donations: [
      { id: "g1", donor: "Sarah Mathews", fund: "Tithe", campaign_title: null, amount: 50, currency: "KWD", status: "succeeded", provider: "tap", created_at: "2026-09-28" },
      { id: "g2", donor: "Website visitor", fund: "Building Fund", campaign_title: "Building Fund", amount: 25, currency: "KWD", status: "succeeded", provider: "tap", created_at: "2026-09-27" },
    ],
  });
  const demoTable = async (t) => (await idbGet(`t:${t}`)) || clone(DEMO_TABLES[t] || []);

  /* ---------- public (visitor) calls: always with the anon key ---------- */
  const pubHeaders = (extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...extra });
  async function pub(path, opts = {}) {
    const r = await fetch(`${URL_}${path}`, { ...opts, headers: pubHeaders(opts.headers || {}) });
    const t = await r.text();
    let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = { error: t }; }
    if (!r.ok) throw new Error((j && (j.error || j.message || j.msg)) || r.statusText);
    return j;
  }
  /** Same rule as the app and the database's slugify(): links visitor actions to admin-edited content. */
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  window.AgapeKeys = {
    slug,
    eventKey: (e) => slug(`${e.title || ""} ${e.day || ""} ${e.month || ""}`),
    campaignKey: (c) => slug(`${c.title || ""} ${c.accent || ""}`),
    groupKey: (n) => slug(n),
  };

  /* ---------- public API ---------- */
  const Store = {
    live: LIVE,
    defaults: () => clone(window.AGAPE_DEFAULT || {}),
    session,

    /** Saved overrides only */
    async overrides() {
      if (LIVE) {
        const rows = await fetch(`${URL_}/rest/v1/site_content?key=eq.site&select=data`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then((r) => r.json());
        return (rows && rows[0] && rows[0].data) || {};
      }
      return (await idbGet("site")) || {};
    },
    /** Defaults + saved edits (never blocks the site for more than 2.5s) */
    async load() {
      let o = {};
      try { o = await timeout(this.overrides(), 2500); } catch (e) { console.warn("[agape] using default content:", e.message); }
      return merge(this.defaults(), o);
    },
    /** For the public site: content + live numbers (gifts received, the real prayer wall). */
    async loadPublic() {
      const C = await this.load();
      if (!LIVE) return C;
      const [totals, wall] = await Promise.all([
        timeout(pub("/rest/v1/rpc/giving_totals", { method: "POST", body: "{}" }), 2500).catch(() => []),
        timeout(this.prayerWall(), 2500).catch(() => null),
      ]);
      const t = Object.fromEntries((totals || []).map((r) => [r.campaign_key, Number(r.raised) || 0]));
      (C.campaigns || []).forEach((c) => { c.key = window.AgapeKeys.campaignKey(c); c.raised = (Number(c.raised) || 0) + (t[c.key] || 0); });
      if (wall) C._wall = wall;
      return C;
    },
    /** The approved prayer requests (newest first). */
    async prayerWall(limit = 12) {
      return pub(`/rest/v1/prayer_wall?select=id,body,anonymous,pray_count,answered,author_name&order=created_at.desc&limit=${limit}`);
    },
    /** A visitor's request: held for a pastor to approve before it shows on the wall. */
    async postPrayer(body, anonymous, name) {
      if (!LIVE) return { demo: true };
      await pub("/rest/v1/prayer_requests", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ body, anonymous: !!anonymous, guest_name: anonymous ? null : (name || null) }) });
      return { pending: true };
    },
    async prayAnon(id) {
      if (!LIVE) return null;
      return pub("/rest/v1/rpc/pray_anon", { method: "POST", body: JSON.stringify({ request_id: id }) });
    },
    async visitorCard(row) {
      if (!LIVE) return { demo: true };
      await pub("/rest/v1/visitor_cards", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
      return { ok: true };
    },
    /** Starts a gift: returns the secure payment page URL (Tap: KNET, cards, Apple Pay). */
    async checkout(body) {
      if (!LIVE) return { demo: true };
      return pub("/functions/v1/create-checkout", { method: "POST", body: JSON.stringify(body) });
    },
    async donationStatus(id) {
      return pub(`/functions/v1/payment-webhook?donation=${encodeURIComponent(id)}`);
    },

    async save(content) {
      content = { ...content, updatedAt: new Date().toISOString() };
      if (LIVE) {
        await rest("site_content?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: "site", data: content }) });
      } else await idbSet("site", content);
      return true;
    },
    async reset() {
      if (LIVE) await rest("site_content?key=eq.site", { method: "DELETE" });
      else await idbDel("site");
    },
    async uploadImage(file) {
      const { blob, type } = await resize(file);
      if (!LIVE) return blobToDataURL(blob);
      const name = `site/${Date.now()}-${(file.name || "image").replace(/[^a-z0-9.]+/gi, "-").toLowerCase().replace(/\.(png|jpe?g|webp|heic)$/i, "")}.${type === "image/png" ? "png" : "jpg"}`;
      const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, { method: "POST", headers: headers(true, { "Content-Type": type, "x-upsert": "true" }), body: blob });
      if (!r.ok) throw new Error((await r.text()) || "Upload failed");
      return `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
    },

    /* auth (live mode) */
    async signIn(email, password) {
      if (!LIVE) { localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token: "demo", expires_at: Date.now() / 1000 + 86400 * 7, user: { email: email || "demo@agape" }, demo: true })); return true; }
      const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error_description || j.msg || "Sign-in failed");
      localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token: j.access_token, expires_at: j.expires_at || Date.now() / 1000 + j.expires_in, user: j.user }));
      const me = await rest(`profiles?id=eq.${j.user.id}&select=role,full_name`).catch(() => []);
      if (!me[0] || !["staff", "admin"].includes(me[0].role)) { localStorage.removeItem(SESSION_KEY); throw new Error("This account isn't a staff account. Ask an admin to set your role to staff."); }
      return true;
    },
    signOut() { localStorage.removeItem(SESSION_KEY); },

    /* community tables (dashboard, prayer moderation, rides, members, announcements) */
    async list(table) {
      if (!LIVE) return demoTable(table);
      const q = {
        prayer_requests: "prayer_requests?select=id,body,anonymous,pray_count,answered,hidden,source,guest_name,created_at,profiles!prayer_requests_user_id_fkey(full_name)&order=created_at.desc&limit=300",
        rides: "rides?select=id,pickup_label,requested_for,seats,status,member:profiles!rides_member_id_fkey(full_name),volunteer:profiles!rides_volunteer_id_fkey(full_name)&order=created_at.desc&limit=200",
        profiles: "profiles?select=id,full_name,email,phone,role,member_no,created_at&order=created_at.desc&limit=1000",
        announcements: "announcements?select=id,title,body,created_at&order=created_at.desc&limit=100",
        series: "series?select=*&order=position",
        videos: "videos?select=*&order=published_at.desc&limit=500",
        courses: "courses?select=*,modules(id,position)&order=position",
        lessons: "lessons?select=*&order=position&limit=2000",
        documents: "documents?select=*&order=created_at",
        question_packs: "question_packs?select=*,questions(id,prompt,options,answer,reference)&order=created_at",
        visitor_cards: "visitor_cards?select=*&order=created_at.desc&limit=500",
        care_requests: "care_requests?select=*,profiles(full_name,email,phone)&order=created_at.desc&limit=500",
        volunteer_applications: "volunteer_applications?select=*,profiles(full_name,email,phone)&order=created_at.desc&limit=500",
        donations: "donations?select=*,profiles(full_name,email)&order=created_at.desc&limit=1000",
        songs: "songs?select=*&order=position,title",
        set_lists: "set_lists?select=*&order=service_date.desc.nullslast",
        reading_plans: "reading_plans?select=*&order=position",
        ministry_posts: "ministry_posts?select=*&order=pinned.desc,position,created_at.desc&limit=500",
        testimonies: "testimonies?select=*,profiles!testimonies_user_id_fkey(full_name)&order=created_at.desc&limit=500",
        home_meetings: "home_meetings?select=*,host:profiles!home_meetings_host_id_fkey(full_name),home_meeting_places(address),home_meeting_rsvps(guests)&order=starts_at.desc&limit=300",
        serve_opportunities: "serve_opportunities?select=*,serve_signups(user_id,profiles(full_name))&order=starts_at.desc&limit=300",
        checkin_codes: "checkin_codes?select=*&order=created_at.desc&limit=60",
        checkins: "checkins?select=*,profiles!checkins_user_id_fkey(full_name,member_no)&order=created_at.desc&limit=1000",
        push_campaigns: "push_campaigns?select=*&order=created_at.desc&limit=200",
      }[table];
      const rows = await rest(q || `${table}?select=*`);
      return rows.map((r) => ({
        ...r,
        author: r.anonymous ? "Anonymous" : r.profiles?.full_name || r.guest_name || (r.source === "web" ? "Website visitor" : undefined),
        member: r.member?.full_name ?? r.member ?? r.profiles?.full_name,
        volunteer: r.volunteer?.full_name ?? r.volunteer ?? "",
        donor: r.profiles?.full_name || r.donor_name || "Website visitor",
      }));
    },
    async update(table, id, patch) {
      if (!LIVE) { const rows = await demoTable(table); const i = rows.findIndex((r) => r.id === id); if (i > -1) Object.assign(rows[i], patch); await idbSet(`t:${table}`, rows); return rows; }
      await rest(`${table}?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    },
    /** Insert one row (or several); returns the created row(s). */
    async insert(table, row) {
      if (!LIVE) {
        const rows = await demoTable(table);
        const many = (Array.isArray(row) ? row : [row]).map((r, i) => ({ id: "x" + Date.now() + i, created_at: new Date().toISOString().slice(0, 10), ...r }));
        rows.unshift(...many); await idbSet(`t:${table}`, rows);
        return Array.isArray(row) ? many : many[0];
      }
      const out = await rest(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      return Array.isArray(row) ? out : out && out[0];
    },
    /** Delete every row matching column = value (e.g. all questions of a pack). */
    async removeWhere(table, column, value) {
      if (!LIVE) { const rows = (await demoTable(table)).filter((r) => String(r[column]) !== String(value)); await idbSet(`t:${table}`, rows); return; }
      await rest(`${table}?${column}=eq.${encodeURIComponent(value)}`, { method: "DELETE" });
    },
    /** Upload a PDF (or other document) to the media bucket; returns its public URL. */
    async uploadFile(file) {
      if (!LIVE) return URL.createObjectURL(file);
      const name = `docs/${Date.now()}-${(file.name || "file").replace(/[^a-z0-9.]+/gi, "-").toLowerCase()}`;
      const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, { method: "POST", headers: headers(true, { "Content-Type": file.type || "application/pdf", "x-upsert": "true" }), body: file });
      if (!r.ok) throw new Error((await r.text()) || "Upload failed");
      return `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
    },
    async remove(table, id) {
      if (!LIVE) { const rows = (await demoTable(table)).filter((r) => r.id !== id); await idbSet(`t:${table}`, rows); return rows; }
      await rest(`${table}?id=eq.${id}`, { method: "DELETE" });
    },
    async stats() {
      if (!LIVE) return { members: 2400, new_members: 18, volunteers: 64, active_learners: 312, total_views: 48210, rides_completed: 1286, rides_open: 2, prayers_pending: 1, visitors_new: 1, care_open: 1, applications_pending: 1, giving_this_month: 18450, testimonies_waiting: 1, checkins_week: 214, readers_week: 96, home_meetings_upcoming: 7, serve_upcoming: 23, demo: true };
      const [r, m] = await Promise.all([rest("staff_stats?select=*"), rest("staff_stats_more?select=*").catch(() => [{}])]);
      return { ...(r[0] || {}), ...(m[0] || {}) };
    },
  };
  window.AgapeStore = Store;
})();
