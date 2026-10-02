/* =========================================================
   AGAPE — content store (shared by the website and /admin)
   Everything lives in Supabase (REST + Storage), configured in assets/js/config.js.
   The public website falls back to the defaults in content.js when Supabase
   isn't configured or can't be reached; /admin requires Supabase.
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.AGAPE_CONFIG || {};
  const URL_ = (CFG.supabaseUrl || "").replace(/\/$/, "");
  const KEY = CFG.supabaseAnonKey || "";
  const LIVE = !!(URL_ && KEY && !URL_.includes("YOUR-PROJECT"));
  const BUCKET = CFG.mediaBucket || "media";
  const SESSION_KEY = "agape-admin-session";

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

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; }
  }
  function session() {
    const s = readSession();
    return s && s.expires_at * 1000 > Date.now() ? s : null;
  }
  /** Saves a fresh session, then lets it in only if the profile is staff or admin. */
  async function startSession(j) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Date.now() / 1000 + j.expires_in, user: j.user }));
    const me = await rest(`profiles?id=eq.${j.user.id}&select=role,full_name`).catch(() => []);
    if (!me[0] || !["staff", "admin"].includes(me[0].role)) { localStorage.removeItem(SESSION_KEY); throw new Error(`${j.user.email || "This account"} isn't a staff account. Ask an admin to set your role to staff.`); }
    const s = readSession(); s.role = me[0].role; s.name = me[0].full_name; localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return true;
  }

  /** Keeps the staff session alive: refreshes the access token shortly before it expires. */
  async function ensureFresh() {
    const s = readSession();
    if (!s || !s.refresh_token) return;
    if (s.expires_at * 1000 - Date.now() > 120000) return;
    const r = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
    if (!r.ok) { localStorage.removeItem(SESSION_KEY); return; }
    const j = await r.json();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Date.now() / 1000 + j.expires_in }));
  }
  const headers = (auth = true, extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${(auth && session()?.access_token) || KEY}`, ...extra });

  async function rest(path, opts = {}) {
    if (!LIVE) throw new Error("Supabase isn't connected yet (assets/js/config.js).");
    await ensureFresh();
    const r = await fetch(`${URL_}/rest/v1/${path}`, { ...opts, headers: { ...headers(), "Content-Type": "application/json", ...(opts.headers || {}) } });
    const t = await r.text();
    if (!r.ok) {
      let msg = t || r.statusText;
      try { const j = JSON.parse(t); msg = j.message || j.hint || msg; } catch (e) {}
      if (r.status === 401) msg = "Your session has expired. Please sign in again.";
      throw new Error(msg);
    }
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

  /* ---------- public API ---------- */
  const Store = {
    live: LIVE,
    defaults: () => clone(window.AGAPE_DEFAULT || {}),
    session,

    /** Saved edits only */
    async overrides() {
      if (!LIVE) return {};
      const rows = await fetch(`${URL_}/rest/v1/site_content?key=eq.site&select=data`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then((r) => r.json());
      return (rows && rows[0] && rows[0].data) || {};
    },
    /** Defaults + saved edits (never blocks the site for more than 2.5s) */
    async load() {
      let o = {};
      try { o = await timeout(this.overrides(), 2500); } catch (e) { console.warn("[agape] using default content:", e.message); }
      return merge(this.defaults(), o);
    },
    async save(content) {
      content = { ...content, updatedAt: new Date().toISOString() };
      await rest("site_content?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: "site", data: content }) });
      return true;
    },
    async reset() {
      await rest("site_content?key=eq.site", { method: "DELETE" });
    },
    async uploadImage(file, folder = "site") {
      if (!LIVE) throw new Error("Connect Supabase to upload photos.");
      await ensureFresh();
      const { blob, type } = await resize(file);
      const name = `${folder}/${Date.now()}-${(file.name || "image").replace(/[^a-z0-9.]+/gi, "-").toLowerCase().replace(/\.(png|jpe?g|webp|heic)$/i, "")}.${type === "image/png" ? "png" : "jpg"}`;
      const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, { method: "POST", headers: headers(true, { "Content-Type": type, "x-upsert": "true" }), body: blob });
      if (!r.ok) throw new Error((await r.text()) || "Upload failed");
      return `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
    },

    /* auth */
    async signIn(email, password) {
      if (!LIVE) throw new Error("This admin isn't connected to Supabase yet. Add the project URL and anon key to assets/js/config.js.");
      const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error_description || j.msg || "Sign-in failed");
      return startSession(j);
    },
    /** Where the "Continue with Google" button sends the browser; Supabase brings it back here with the tokens in the hash. */
    googleUrl() {
      return `${URL_}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
    },
    /** Finishes a Google sign-in when the page loads with #access_token=… (or #error=…). Returns true when signed in. */
    async fromRedirect() {
      const h = new URLSearchParams(location.hash.slice(1));
      if (!h.get("access_token") && !h.get("error")) return false;
      history.replaceState(null, "", location.pathname + location.search);
      if (h.get("error")) throw new Error(/provider is not enabled/i.test(h.get("error_description") || "") ? "Google sign-in isn't switched on yet (Supabase → Authentication → Providers → Google)." : h.get("error_description") || "Google sign-in failed");
      const access_token = h.get("access_token");
      const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${access_token}` } });
      if (!r.ok) throw new Error("Google sign-in failed. Please try again.");
      return startSession({ access_token, refresh_token: h.get("refresh_token"), expires_at: +h.get("expires_at") || 0, expires_in: +h.get("expires_in") || 3600, user: await r.json() });
    },
    async restore() {
      if (!LIVE) return false;
      try { await ensureFresh(); } catch (e) {}
      return !!session();
    },
    signOut() { localStorage.removeItem(SESSION_KEY); },

    /* generic table access (RLS decides what staff may do) */
    select: (path) => rest(path),
    rpc: (fn, args = {}) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }),
    async insertRow(table, row) {
      const r = await rest(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      return r && r[0];
    },
    async updateRow(table, match, patch) {
      const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
      const r = await rest(`${table}?${q}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
      return r && r[0];
    },
    async deleteRow(table, match) {
      const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
      await rest(`${table}?${q}`, { method: "DELETE" });
    },

    /* community tables (dashboard, prayer moderation, rides, members, announcements) */
    async list(table) {
      if (table === "profiles") return this.rpc("staff_members");
      if (table === "rides") return this.rpc("staff_rides");
      const q = {
        prayer_requests: "prayer_requests?select=id,body,anonymous,pray_count,answered,hidden,created_at,profiles:profiles!prayer_requests_user_id_fkey(full_name)&order=created_at.desc&limit=200",
        announcements: "announcements?select=id,title,body,created_at&order=created_at.desc&limit=100",
      }[table];
      const rows = await rest(q);
      return rows.map((r) => ({ ...r, author: r.anonymous ? `Anonymous (${r.profiles?.full_name || "member"})` : r.profiles?.full_name }));
    },
    async update(table, id, patch) {
      await rest(`${table}?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    },
    async insert(table, row) {
      await rest(table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
    },
    async remove(table, id) {
      await rest(`${table}?id=eq.${id}`, { method: "DELETE" });
    },
    async stats() {
      const r = await rest("staff_stats?select=*");
      return r[0] || {};
    },
  };
  window.AgapeStore = Store;
})();
