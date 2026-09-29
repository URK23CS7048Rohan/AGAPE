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
  const demoTable = async (t) => (await idbGet(`t:${t}`)) || clone(DEMO_TABLES[t] || []);

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
        prayer_requests: "prayer_requests?select=id,body,anonymous,pray_count,answered,hidden,created_at,profiles(full_name)&order=created_at.desc&limit=200",
        rides: "rides?select=id,pickup_label,requested_for,seats,status,member:profiles!rides_member_id_fkey(full_name),volunteer:profiles!rides_volunteer_id_fkey(full_name)&order=created_at.desc&limit=200",
        profiles: "profiles?select=id,full_name,role,created_at&order=created_at.desc&limit=500",
        announcements: "announcements?select=id,title,body,created_at&order=created_at.desc&limit=100",
      }[table];
      const rows = await rest(q);
      return rows.map((r) => ({ ...r, author: r.anonymous ? "Anonymous" : r.profiles?.full_name, member: r.member?.full_name ?? r.member, volunteer: r.volunteer?.full_name ?? r.volunteer ?? "" }));
    },
    async update(table, id, patch) {
      if (!LIVE) { const rows = await demoTable(table); const i = rows.findIndex((r) => r.id === id); if (i > -1) Object.assign(rows[i], patch); await idbSet(`t:${table}`, rows); return rows; }
      await rest(`${table}?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    },
    async insert(table, row) {
      if (!LIVE) { const rows = await demoTable(table); rows.unshift({ id: "x" + Date.now(), created_at: new Date().toISOString().slice(0, 10), ...row }); await idbSet(`t:${table}`, rows); return rows; }
      await rest(table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    },
    async remove(table, id) {
      if (!LIVE) { const rows = (await demoTable(table)).filter((r) => r.id !== id); await idbSet(`t:${table}`, rows); return rows; }
      await rest(`${table}?id=eq.${id}`, { method: "DELETE" });
    },
    async stats() {
      if (!LIVE) return { members: 2400, active_learners: 312, total_views: 48210, rides_completed: 1286, giving_this_month: 18450, demo: true };
      const r = await rest("staff_stats?select=*");
      return r[0] || {};
    },
  };
  window.AgapeStore = Store;
})();
