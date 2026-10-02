/**
 * Data + actions for the v5 features: reading plans, journal, Bible highlights/bookmarks, song book, set lists,
 * testimonies, home prayer meetings, Kids/Teens/Squad posts, the serve board, check-in, the welcome checklist
 * and the extra games.
 *
 * Signed-in members read and write Supabase. Without a backend (demo build) or as a guest, everything still
 * works: content comes from the bundled copy of the church's seed data and personal things are kept on the phone.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useQuery, colorFor } from "./data";
import { useStore } from "./store";
import { imageSource } from "./content";
import SEED from "@/data/seed.json";

const S: any = SEED;
const must = <T,>(r: { data: T | null; error: any }): T => { if (r.error) throw new Error(r.error.message || String(r.error)); return (r.data ?? []) as T; };
const uuid = () => "l-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
/** Bundled dates were "next Friday" when exported — keep them upcoming in the demo by moving them on by whole weeks. */
const upcoming = (iso?: string | null) => { if (!iso) return iso; let t = new Date(iso).getTime(); while (t < Date.now() - 3 * 3600e3) t += 7 * 864e5; return new Date(t).toISOString(); };
const useUid = () => { const { session } = useStore(); return session?.user.id ?? null; };

/* ---------------------------------------------------------------- tiny on-device table store (demo + guests) */
const LKEY = "agape.local.tables.v1";
let local: Record<string, any> = {};
let loaded: Promise<void> | null = null;
const subs = new Set<() => void>();
const loadLocal = () => loaded || (loaded = AsyncStorage.getItem(LKEY).then((r) => { local = r ? JSON.parse(r) : {}; }).catch(() => {}).then(() => subs.forEach((f) => f())));
const saveLocal = () => AsyncStorage.setItem(LKEY, JSON.stringify(local)).catch(() => {});
export function useLocal<T>(name: string, initial: T): [T, (fn: (v: T) => T) => void] {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); loadLocal(); return () => { subs.delete(f); }; }, []);
  const value: T = name in local ? local[name] : initial;
  const update = useCallback((fn: (v: T) => T) => { local[name] = fn(name in local ? local[name] : initial); saveLocal(); subs.forEach((f) => f()); }, [name]);
  return [value, update];
}

/* ================================================================ reading plans */
export type PlanDay = { title: string; refs: string[]; devotion?: string; prompt?: string };
export type Plan = { id: string; slug: string; title: string; subtitle?: string; description?: string; audience: "adults" | "kids" | "teens"; image: any; color: string; days: PlanDay[]; readers: number };
const mapPlan = (p: any, counts: Record<string, number> = {}): Plan => ({
  id: p.id, slug: p.slug, title: p.title, subtitle: p.subtitle || undefined, description: p.description || undefined, audience: p.audience || "adults",
  image: imageSource(p.image), color: p.color || colorFor(p.slug), days: Array.isArray(p.days) ? p.days : [], readers: counts[p.id] || 0,
});
const SEED_PLANS: Plan[] = (S.reading_plans || []).map((p: any) => mapPlan(p));
export function usePlans() {
  return useQuery<Plan[]>(supabase ? "plans" : null, async () => {
    const [rows, counts] = await Promise.all([
      supabase!.from("reading_plans").select("*").eq("published", true).order("position"),
      supabase!.rpc("plan_counts"),
    ]);
    const c = Object.fromEntries((counts.data || []).map((r: any) => [r.plan_id, r.readers]));
    const list = must<any[]>(rows).map((p) => mapPlan(p, c));
    return list.length ? list : SEED_PLANS;
  }, { fallback: SEED_PLANS });
}

export type Progress = { plan_id: string; started_at: string; done: number[]; reminder?: string | null };
export function usePlanProgress() {
  const uid = useUid();
  const [mine, setMine] = useLocal<Record<string, Progress>>("plan_progress", {});
  const q = useQuery<Record<string, Progress>>(supabase && uid ? `plan_progress:${uid}` : null, async () => {
    const rows = must<any[]>(await supabase!.from("plan_progress").select("plan_id, started_at, done, reminder"));
    return Object.fromEntries(rows.map((r) => [r.plan_id, { ...r, done: r.done || [] }]));
  }, { fallback: {} });
  const progress = uid ? q.data : mine;
  const write = useCallback(async (planId: string, patch: Partial<Progress> | null) => {
    const cur = progress[planId];
    const next = patch === null ? null : { plan_id: planId, started_at: cur?.started_at || new Date().toISOString().slice(0, 10), done: cur?.done || [], reminder: cur?.reminder ?? null, ...patch };
    if (uid && supabase) {
      q.setData((d) => { const n = { ...d }; if (next) n[planId] = next; else delete n[planId]; return n; });
      const r = next
        ? await supabase.from("plan_progress").upsert({ plan_id: planId, started_at: next.started_at, done: next.done, reminder: next.reminder, updated_at: new Date().toISOString() }, { onConflict: "user_id,plan_id" })
        : await supabase.from("plan_progress").delete().eq("plan_id", planId);
      if (r.error) { q.reload(); throw new Error(r.error.message); }
    } else {
      setMine((d) => { const n = { ...d }; if (next) n[planId] = next; else delete n[planId]; return n; });
    }
  }, [uid, progress]);
  return {
    progress,
    start: (planId: string) => write(planId, { done: [], started_at: new Date().toISOString().slice(0, 10) }),
    stop: (planId: string) => write(planId, null),
    toggleDay: (planId: string, day: number) => {
      const d = progress[planId]?.done || [];
      return write(planId, { done: d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort((a, b) => a - b) });
    },
    setReminder: (planId: string, reminder: string | null) => write(planId, { reminder }),
  };
}
/** Today's day number in a plan = days since you started (capped), but never past the first unfinished day + 1. */
export function planToday(p: Progress | undefined, total: number) {
  if (!p) return 1;
  const started = new Date(p.started_at + "T00:00:00");
  const byDate = Math.floor((Date.now() - started.getTime()) / 864e5) + 1;
  const firstOpen = Array.from({ length: total }, (_, i) => i + 1).find((d) => !p.done.includes(d)) || total;
  return Math.max(1, Math.min(total, Math.min(byDate, firstOpen)));
}
/** Consecutive days with at least one plan day done (based on done counts — good enough for a streak flame). */
export function planStreak(activeDays: string[]) {
  const set = new Set(activeDays);
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    if (set.has(d)) n++; else if (i > 0) break;
  }
  return n;
}

/* ================================================================ journal */
export type Entry = { id: string; plan_id?: string | null; day?: number | null; ref?: string | null; title?: string | null; body: string; created_at: string; updated_at: string };
export function useJournal() {
  const uid = useUid();
  const [mine, setMine] = useLocal<Entry[]>("journal", []);
  const q = useQuery<Entry[]>(supabase && uid ? `journal:${uid}` : null, async () =>
    must<any[]>(await supabase!.from("journal_entries").select("*").order("updated_at", { ascending: false }).limit(300)), { fallback: [] });
  const entries = uid ? q.data : mine;
  const save = useCallback(async (e: Partial<Entry> & { body: string }) => {
    const now = new Date().toISOString();
    if (uid && supabase) {
      const row = { plan_id: e.plan_id ?? null, day: e.day ?? null, ref: e.ref ?? null, title: e.title ?? null, body: e.body, updated_at: now };
      const r = e.id && !e.id.startsWith("l-")
        ? await supabase.from("journal_entries").update(row).eq("id", e.id).select().single()
        : await supabase.from("journal_entries").insert(row).select().single();
      if (r.error) throw new Error(r.error.message);
      q.reload();
      return r.data as Entry;
    }
    const entry: Entry = { id: e.id || uuid(), plan_id: e.plan_id, day: e.day, ref: e.ref, title: e.title, body: e.body, created_at: e.created_at || now, updated_at: now };
    setMine((l) => [entry, ...l.filter((x) => x.id !== entry.id)]);
    return entry;
  }, [uid]);
  const remove = useCallback(async (id: string) => {
    if (uid && supabase) { await supabase.from("journal_entries").delete().eq("id", id); q.reload(); }
    else setMine((l) => l.filter((x) => x.id !== id));
  }, [uid]);
  return { entries, save, remove, loading: uid ? q.loading : false };
}

/* ================================================================ Bible highlights, bookmarks, notes */
export type Mark = { id?: string; kind: "highlight" | "bookmark" | "note"; book: number; chapter: number; verse: number; color?: string | null; note?: string | null; translation?: string | null; verse_text?: string | null; created_at?: string };
const mk = (m: { kind: string; book: number; chapter: number; verse: number }) => `${m.kind}:${m.book}:${m.chapter}:${m.verse}`;
export function useMarks() {
  const uid = useUid();
  const [mine, setMine] = useLocal<Mark[]>("bible_marks", []);
  const q = useQuery<Mark[]>(supabase && uid ? `marks:${uid}` : null, async () =>
    must<any[]>(await supabase!.from("bible_marks").select("*").order("created_at", { ascending: false }).limit(2000)), { fallback: [] });
  const marks = uid ? q.data : mine;
  const index = useMemo(() => new Map(marks.map((m) => [mk(m), m])), [marks]);
  const put = useCallback(async (list: Mark[], remove: boolean) => {
    const keys = new Set(list.map(mk));
    const apply = (l: Mark[]) => (remove ? l.filter((m) => !keys.has(mk(m))) : [...list.map((m) => ({ ...m, created_at: new Date().toISOString() })), ...l.filter((m) => !keys.has(mk(m)))]);
    if (uid && supabase) {
      q.setData(apply);
      if (remove) {
        for (const m of list) await supabase.from("bible_marks").delete().match({ kind: m.kind, book: m.book, chapter: m.chapter, verse: m.verse });
      } else {
        const r = await supabase.from("bible_marks").upsert(list.map(({ id, created_at, ...m }) => m), { onConflict: "user_id,kind,book,chapter,verse" });
        if (r.error) { q.reload(); throw new Error(r.error.message); }
      }
    } else setMine(apply);
  }, [uid]);
  return {
    marks,
    get: (kind: Mark["kind"], b: number, c: number, v: number) => index.get(`${kind}:${b}:${c}:${v}`),
    highlight: (verses: Omit<Mark, "kind">[], color: string | null) => put(verses.map((v) => ({ ...v, kind: "highlight" as const, color })), !color),
    bookmark: (verses: Omit<Mark, "kind">[], on: boolean) => put(verses.map((v) => ({ ...v, kind: "bookmark" as const })), !on),
    note: (v: Omit<Mark, "kind">, note: string) => put([{ ...v, kind: "note", note }], !note.trim()),
  };
}

/* ================================================================ song book */
export type Song = { id: string; slug: string; title: string; author?: string; key: string; tempo?: number; time?: string; tags: string[]; body: string; language: string; youtubeId?: string; copyright?: string };
const mapSong = (s: any): Song => ({ id: s.id || s.slug, slug: s.slug, title: s.title, author: s.author || undefined, key: s.original_key || "G", tempo: s.tempo || undefined, time: s.time_sig || undefined, tags: s.tags || [], body: s.body || "", language: s.language || "en", youtubeId: s.youtube_id || undefined, copyright: s.copyright || undefined });
const SEED_SONGS: Song[] = (S.songs || []).map(mapSong);
export function useSongs() {
  return useQuery<Song[]>(supabase ? "songs" : null, async () => {
    const list = must<any[]>(await supabase!.from("songs").select("*").eq("published", true).order("position").order("title")).map(mapSong);
    return list.length ? list : SEED_SONGS;
  }, { fallback: SEED_SONGS });
}
export type SetItem = { song: string; key?: string };
export type SetList = { id: string; title: string; service_date?: string | null; items: SetItem[]; shared: boolean; mine: boolean; updated_at?: string };
export function useSetLists() {
  const uid = useUid();
  const [mine, setMine] = useLocal<SetList[]>("set_lists", []);
  const q = useQuery<SetList[]>(supabase && uid ? `sets:${uid}` : null, async () =>
    must<any[]>(await supabase!.from("set_lists").select("*").order("service_date", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false }))
      .map((r) => ({ id: r.id, title: r.title, service_date: r.service_date, items: r.items || [], shared: r.shared, mine: r.owner_id === uid, updated_at: r.updated_at })), { fallback: [] });
  const lists = uid ? q.data : mine;
  const save = useCallback(async (l: Partial<SetList> & { title: string; items: SetItem[] }) => {
    if (uid && supabase) {
      const row = { title: l.title, items: l.items, service_date: l.service_date || null, updated_at: new Date().toISOString() };
      const r = l.id && !l.id.startsWith("l-") ? await supabase.from("set_lists").update(row).eq("id", l.id).select().single() : await supabase.from("set_lists").insert(row).select().single();
      if (r.error) throw new Error(r.error.message);
      q.reload();
      return r.data.id as string;
    }
    const id = l.id || uuid();
    setMine((x) => [{ id, title: l.title, items: l.items, service_date: l.service_date, shared: false, mine: true, updated_at: new Date().toISOString() }, ...x.filter((s) => s.id !== id)]);
    return id;
  }, [uid]);
  const remove = useCallback(async (id: string) => {
    if (uid && supabase) { await supabase.from("set_lists").delete().eq("id", id); q.reload(); } else setMine((x) => x.filter((s) => s.id !== id));
  }, [uid]);
  return { lists, save, remove };
}

/* ================================================================ testimonies */
export type Testimony = { id: string; title: string; body: string; category: string; featured: boolean; amens: number; author?: string | null; anonymous: boolean; mine: boolean; amened: boolean; created_at: string; pending?: boolean };
const SEED_TESTIMONIES: Testimony[] = (S.testimonies || []).map((t: any, i: number) => ({ id: t.id || `seed-${i}`, title: t.title, body: t.body, category: t.category, featured: !!t.featured, amens: t.amens || 12 + i * 7, author: t.author_name, anonymous: false, mine: false, amened: false, created_at: t.created_at || new Date(Date.now() - i * 3 * 864e5).toISOString() }));
export function useTestimonies() {
  const uid = useUid();
  const [mine, setMine] = useLocal<{ posted: Testimony[]; amened: string[] }>("testimonies", { posted: [], amened: [] });
  const q = useQuery<Testimony[]>(supabase ? `testimonies:${uid || "anon"}` : null, async () => {
    const wall = must<any[]>(await supabase!.from("testimony_wall").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(100));
    const own = uid ? must<any[]>(await supabase!.from("testimonies").select("*").eq("user_id", uid).eq("approved", false)) : [];
    return [
      ...own.map((t) => ({ id: t.id, title: t.title, body: t.body, category: t.category, featured: false, amens: 0, author: null, anonymous: t.anonymous, mine: true, amened: false, created_at: t.created_at, pending: true })),
      ...wall.map((t) => ({ id: t.id, title: t.title, body: t.body, category: t.category, featured: t.featured, amens: t.amens, author: t.author_name, anonymous: t.anonymous, mine: t.mine, amened: t.amened, created_at: t.created_at })),
    ];
  }, { fallback: SEED_TESTIMONIES, realtime: [{ table: "testimonies" }] });
  const list = supabase ? q.data : [...mine.posted, ...SEED_TESTIMONIES.map((t) => ({ ...t, amened: mine.amened.includes(t.id), amens: t.amens + (mine.amened.includes(t.id) ? 1 : 0) }))];
  return {
    list,
    reload: q.reload,
    share: async (t: { title: string; body: string; category: string; anonymous: boolean }) => {
      if (supabase && uid) {
        const r = await supabase.from("testimonies").insert({ ...t, user_id: uid });
        if (r.error) throw new Error(r.error.message);
        q.reload();
      } else setMine((m) => ({ ...m, posted: [{ id: uuid(), ...t, featured: false, amens: 0, author: null, mine: true, amened: false, created_at: new Date().toISOString(), pending: true }, ...m.posted] }));
    },
    amen: async (id: string) => {
      if (supabase && uid) {
        q.setData((l) => l.map((t) => (t.id === id && !t.amened ? { ...t, amened: true, amens: t.amens + 1 } : t)));
        const r = await supabase.rpc("amen", { t: id });
        if (r.error) q.reload();
      } else setMine((m) => (m.amened.includes(id) ? m : { ...m, amened: [...m.amened, id] }));
    },
  };
}

/* ================================================================ home prayer meetings */
export type Meeting = { id: string; title: string; about?: string; kind: string; starts_at: string; repeats?: string | null; area: string; capacity?: number | null; language?: string | null; host: string; going: number; isHost: boolean; joined: boolean; cancelled: boolean };
export type Place = { address: string; lat?: number | null; lng?: number | null; notes?: string | null };
const inDays = (d: number, h: number) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 30, 0, 0); return x.toISOString(); };
const DEMO_MEETINGS: (Meeting & { place: Place })[] = [
  { id: "m1", title: "Thursday prayer & worship", about: "We pray for the church, our families back home and Kuwait. Tea and snacks after.", kind: "prayer", starts_at: inDays(2, 19), repeats: "weekly", area: "Salmiya, Block 10", capacity: 16, language: "Malayalam / English", host: "Thomas K.", going: 9, isHost: false, joined: false, cancelled: false, place: { address: "Building 14, Street 12, Block 10, Salmiya — Flat 6, 2nd floor", lat: 29.3358, lng: 48.0715, notes: "Ring the bell for flat 6. Parking behind the building." } },
  { id: "m2", title: "Young families Bible study", about: "Going through the Gospel of Mark. Kids welcome — there's a kids' corner.", kind: "bible study", starts_at: inDays(3, 18), repeats: "weekly", area: "Hawally, Block 3", capacity: 20, language: "English", host: "Priya & Sam", going: 12, isHost: false, joined: false, cancelled: false, place: { address: "Al-Muthanna Street, Block 3, Hawally — Villa 21", lat: 29.3382, lng: 48.0283, notes: "Blue gate on the left." } },
  { id: "m3", title: "Ladies' morning prayer", about: "An hour of prayer, a short devotion and coffee.", kind: "prayer", starts_at: inDays(5, 9), repeats: "weekly", area: "Salmiya, Block 12", capacity: 10, language: "Hindi / English", host: "Anita R.", going: 6, isHost: false, joined: false, cancelled: false, place: { address: "Block 12, Street 4, Salmiya — Flat 11", lat: 29.3301, lng: 48.0802 } },
  { id: "m4", title: "Friday night worship", about: "Acoustic worship, testimonies and prayer.", kind: "worship", starts_at: inDays(4, 20), repeats: null, area: "Mangaf", capacity: 30, language: "Tamil / English", host: "Joseph D.", going: 18, isHost: false, joined: false, cancelled: false, place: { address: "Block 4, Mangaf — Building 220, Flat 3", lat: 29.0985, lng: 48.1302 } },
];
export function useHomeMeetings() {
  const uid = useUid();
  const [mine, setMine] = useLocal<{ joined: Record<string, number>; hosted: (Meeting & { place: Place })[] }>("home_meetings", { joined: {}, hosted: [] });
  const q = useQuery<Meeting[]>(supabase && uid ? `meetings:${uid}` : null, async () =>
    must<any[]>(await supabase!.from("home_meeting_list").select("*").eq("cancelled", false).gte("starts_at", new Date(Date.now() - 3 * 3600e3).toISOString()).order("starts_at"))
      .map((m) => ({ id: m.id, title: m.title, about: m.about, kind: m.kind, starts_at: m.starts_at, repeats: m.repeats, area: m.area, capacity: m.capacity, language: m.language, host: m.host_name || "Member", going: m.going, isHost: m.is_host, joined: m.joined, cancelled: m.cancelled })),
    { fallback: [], realtime: [{ table: "home_meeting_rsvps" }] });
  const demo = !(supabase && uid);
  const list: Meeting[] = demo
    ? [...mine.hosted, ...DEMO_MEETINGS].map((m) => ({ ...m, joined: m.id in mine.joined, going: m.going + (m.id in mine.joined ? 1 + mine.joined[m.id] : 0) }))
    : q.data;
  return {
    list,
    live: !demo,
    reload: q.reload,
    place: async (id: string): Promise<Place | null> => {
      if (demo) { const m = [...mine.hosted, ...DEMO_MEETINGS].find((x) => x.id === id); return m && (m.isHost || id in mine.joined) ? m.place : null; }
      const r = await supabase!.from("home_meeting_places").select("address, lat, lng, notes").eq("meeting_id", id).maybeSingle();
      return (r.data as Place) || null;
    },
    join: async (id: string, guests = 0): Promise<Place | null> => {
      if (demo) { setMine((m) => ({ ...m, joined: { ...m.joined, [id]: guests } })); return [...mine.hosted, ...DEMO_MEETINGS].find((x) => x.id === id)?.place || null; }
      const r = await supabase!.rpc("join_home_meeting", { m: id, p_guests: guests });
      if (r.error) throw new Error(r.error.message);
      q.reload();
      return r.data as Place;
    },
    leave: async (id: string) => {
      if (demo) { setMine((m) => { const j = { ...m.joined }; delete j[id]; return { ...m, joined: j }; }); return; }
      await supabase!.from("home_meeting_rsvps").delete().eq("meeting_id", id).eq("user_id", uid);
      q.reload();
    },
    host: async (m: { title: string; kind: string; starts_at: string; area: string; address: string; lat?: number | null; lng?: number | null; about?: string; repeats?: string | null; capacity?: number | null; notes?: string; language?: string }) => {
      if (demo) {
        const id = uuid();
        setMine((x) => ({ ...x, hosted: [{ id, title: m.title, about: m.about, kind: m.kind, starts_at: m.starts_at, repeats: m.repeats, area: m.area, capacity: m.capacity, language: m.language, host: "You", going: 1, isHost: true, joined: false, cancelled: false, place: { address: m.address, lat: m.lat, lng: m.lng, notes: m.notes } }, ...x.hosted] }));
        return id;
      }
      const r = await supabase!.rpc("host_home_meeting", { p_title: m.title, p_kind: m.kind, p_starts_at: m.starts_at, p_area: m.area, p_address: m.address, p_lat: m.lat ?? null, p_lng: m.lng ?? null, p_about: m.about ?? null, p_repeats: m.repeats ?? null, p_capacity: m.capacity ?? null, p_notes: m.notes ?? null, p_language: m.language ?? null });
      if (r.error) throw new Error(r.error.message);
      q.reload();
      return r.data as string;
    },
    cancel: async (id: string) => {
      if (demo) { setMine((x) => ({ ...x, hosted: x.hosted.filter((h) => h.id !== id) })); return; }
      const r = await supabase!.from("home_meetings").update({ cancelled: true }).eq("id", id);
      if (r.error) throw new Error(r.error.message);
      q.reload();
    },
    guests: async (id: string): Promise<{ name: string; guests: number }[]> => {
      if (demo) return [];
      const r = await supabase!.from("home_meeting_rsvps").select("guests, profiles(full_name)").eq("meeting_id", id);
      return (r.data || []).map((x: any) => ({ name: x.profiles?.full_name || "Member", guests: x.guests }));
    },
  };
}

/* ================================================================ Kids / Teens / Squad */
export type MinistryKey = "kids" | "teens" | "squad";
export type Post = { id: string; ministry: MinistryKey; kind: string; title: string; body?: string; ref?: string; youtubeId?: string; image: any; color: string; startsAt?: string | null; link?: string; pinned: boolean };
const mapPost = (p: any): Post => ({ id: p.id || p.title, ministry: p.ministry, kind: p.kind, title: p.title, body: p.body || undefined, ref: p.ref || undefined, youtubeId: p.youtube_id || undefined, image: p.image ? imageSource(p.image) : null, color: p.color || colorFor(p.title), startsAt: p.starts_at, link: p.link || undefined, pinned: !!p.pinned });
const SEED_POSTS: Post[] = (S.ministry_posts || []).map((p: any) => mapPost({ ...p, starts_at: upcoming(p.starts_at) }));
export function useMinistry(m: MinistryKey) {
  const fb = SEED_POSTS.filter((p) => p.ministry === m);
  return useQuery<Post[]>(supabase ? `ministry:${m}` : null, async () => {
    const list = must<any[]>(await supabase!.from("ministry_posts").select("*").eq("ministry", m).eq("published", true).order("pinned", { ascending: false }).order("position").order("created_at", { ascending: false })).map(mapPost);
    return list.length ? list : fb;
  }, { fallback: fb, realtime: [{ table: "ministry_posts" }] });
}

/* ================================================================ serve board */
export type Opportunity = { id: string; team: string; title: string; description?: string; starts_at: string; ends_at?: string | null; location?: string; slots: number; taken: number; mine: boolean };
const SEED_SERVE: Opportunity[] = (S.serve_opportunities || []).map((o: any, i: number) => ({ id: o.id || `s${i}`, team: o.team, title: o.title, description: o.description, starts_at: upcoming(o.starts_at)!, ends_at: upcoming(o.ends_at), location: o.location, slots: o.slots, taken: Math.min(o.slots - 1, (i * 3) % 5), mine: false }));
export function useServeBoard() {
  const uid = useUid();
  const [mine, setMine] = useLocal<string[]>("serve", []);
  const q = useQuery<Opportunity[]>(supabase ? `serve:${uid || "anon"}` : null, async () =>
    must<any[]>(await supabase!.from("serve_board").select("*").order("starts_at")), { fallback: SEED_SERVE, realtime: [{ table: "serve_signups" }] });
  const demo = !(supabase && uid);
  const list = demo ? (supabase ? q.data : SEED_SERVE).map((o) => ({ ...o, mine: mine.includes(o.id), taken: o.taken + (mine.includes(o.id) ? 1 : 0) })) : q.data;
  return {
    list,
    signUp: async (id: string) => {
      if (demo) { setMine((l) => [...new Set([...l, id])]); return; }
      const r = await supabase!.rpc("serve_sign_up", { o: id });
      if (r.error) throw new Error(r.error.message);
      q.reload();
    },
    cancel: async (id: string) => {
      if (demo) { setMine((l) => l.filter((x) => x !== id)); return; }
      await supabase!.from("serve_signups").delete().eq("opportunity_id", id).eq("user_id", uid);
      q.reload();
    },
  };
}

/* ================================================================ check-in */
export type Checkin = { event_key: string; title?: string; day: string; method: string };
export function useCheckins() {
  const uid = useUid();
  const [mine, setMine] = useLocal<Checkin[]>("checkins", []);
  const q = useQuery<Checkin[]>(supabase && uid ? `checkins:${uid}` : null, async () =>
    must<any[]>(await supabase!.from("checkins").select("event_key, title, day, method").eq("user_id", uid).order("day", { ascending: false }).limit(60)), { fallback: [] });
  const demo = !(supabase && uid);
  return {
    list: demo ? mine : q.data,
    /** Scan the code shown at church (e.g. "AGAPE:CHECKIN:7F3A9C21"). */
    selfCheckIn: async (code: string): Promise<{ title: string; already: boolean }> => {
      if (demo) {
        const title = "Sunday worship";
        const day = new Date().toISOString().slice(0, 10);
        const already = mine.some((c) => c.day === day);
        if (!already) setMine((l) => [{ event_key: "sunday", title, day, method: "self" }, ...l]);
        return { title, already };
      }
      const r = await supabase!.rpc("check_in_self", { p_code: code });
      if (r.error) throw new Error(r.error.message);
      q.reload();
      return r.data as any;
    },
    /** Welcome team scans a member's card. */
    checkInMember: async (member: string, eventKey = "sunday", title?: string): Promise<{ name: string; member_no: string; already: boolean }> => {
      if (demo) return { name: "Demo member", member_no: member, already: false };
      const r = await supabase!.rpc("check_in_member", { p_member: member, p_event_key: eventKey, p_title: title ?? null });
      if (r.error) throw new Error(r.error.message);
      return r.data as any;
    },
  };
}

/* ================================================================ welcome checklist */
export type Welcome = { profile: boolean; group: boolean; plan: boolean; visit: boolean; event: boolean; serve: boolean; pastor: boolean };
export function useWelcome() {
  const uid = useUid();
  const { rsvps, profile } = useStore();
  const [plans] = useLocal<Record<string, any>>("plan_progress", {});
  const [checkins] = useLocal<any[]>("checkins", []);
  const [serve] = useLocal<string[]>("serve", []);
  const [manual, setManual] = useLocal<Record<string, boolean>>("welcome", {});
  const q = useQuery<Welcome | null>(supabase && uid ? `welcome:${uid}` : null, async () => {
    const r = await supabase!.rpc("welcome_progress");
    if (r.error) throw new Error(r.error.message);
    return r.data as Welcome;
  }, { fallback: null });
  const local: Welcome = { profile: !!profile?.phone || !!manual.profile, group: !!manual.group, plan: Object.keys(plans).length > 0, visit: checkins.length > 0, event: rsvps.size > 0, serve: serve.length > 0 || !!manual.serve, pastor: !!manual.pastor };
  return { steps: q.data || local, reload: q.reload, tick: (k: keyof Welcome) => setManual((m) => ({ ...m, [k]: true })) };
}

/* ================================================================ games */
export type Q = { prompt: string; options: string[]; answer: number; ref?: string };
export type Packs = { trivia: Q[]; who_said: Q[]; true_false: Q[]; emoji: Q[]; kidsTrivia: Q[]; kidsTF: Q[] };
function packsFrom(rows: any[]): Packs {
  const p: Packs = { trivia: [], who_said: [], true_false: [], emoji: [], kidsTrivia: [], kidsTF: [] };
  rows.forEach((pk) => (pk.questions || []).forEach((x: any) => {
    if (!Array.isArray(x.options) || Array.isArray(x.answer)) return;
    const q: Q = { prompt: x.prompt, options: x.options, answer: Number(x.answer) || 0, ref: x.reference || undefined };
    if (pk.audience === "kids") (pk.game === "true_false" ? p.kidsTF : p.kidsTrivia).push(q);
    else if (pk.game in p) (p as any)[pk.game].push(q);
  }));
  return p;
}
const SEED_PACKS = packsFrom(S.question_packs || []);
export function usePacks() {
  return useQuery<Packs>(supabase ? "packs" : null, async () => {
    const rows = must<any[]>(await supabase!.from("question_packs").select("game, audience, questions(prompt, options, answer, reference)").eq("published", true));
    const p = packsFrom(rows);
    (Object.keys(p) as (keyof Packs)[]).forEach((k) => { if (!p[k].length) p[k] = SEED_PACKS[k]; });
    return p;
  }, { fallback: SEED_PACKS }).data;
}
export type Leader = { id: string; name: string; points: number; me: boolean; color: string };
export function useLeaders(game: string | null, days = 7) {
  return useQuery<Leader[]>(supabase ? `leaders:${game || "all"}:${days}` : null, async () =>
    must<any[]>(await supabase!.rpc("leaderboard", { p_game: game, p_days: days })).map((r) => ({ id: r.user_id, name: r.name || "Member", points: r.points, me: r.me, color: colorFor(r.user_id) })),
    { fallback: [], realtime: [{ table: "game_scores", event: "INSERT" }] });
}

/* ================================================================ push campaigns (staff, from the app) */
export async function sendCampaign(c: { title: string; body: string; route?: string; audience: string }) {
  if (!supabase) return 0;
  const r = await supabase.from("push_campaigns").insert(c).select("sent_count").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.sent_count as number;
}
