/**
 * Live data for every screen. Each hook reads Supabase when it's configured (and refreshes in real time
 * where it matters), and falls back to the built-in demo content otherwise.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { C } from "@/theme";
import { supabase } from "./supabase";
import { imageSource } from "./content";
import { COURSES, LEADERBOARD, PRAYERS, SERIES, SERMONS, STUDY_PDFS, TRIVIA, VERSE_MATCH, ANNOUNCEMENTS, CHATS, Course, Prayer, Series, Sermon } from "@/data/mock";

const PALETTE = [C.flame, C.violet, C.rose, C.mint, C.sky, C.sun];
export const colorFor = (s: string) => PALETTE[Math.abs([...String(s || "?")].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % PALETTE.length];

// ------------------------------------------------------------------ tiny query cache
const cache = new Map<string, any>();
type RT = { table: string; filter?: string; event?: "INSERT" | "UPDATE" | "DELETE" | "*" };

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { fallback: T; realtime?: RT[]; poll?: number }) {
  const [data, setData] = useState<T>(() => (key && cache.has(key) ? cache.get(key) : opts.fallback));
  const [loading, setLoading] = useState(!!key && !cache.has(key));
  const [error, setError] = useState<string | null>(null);
  const f = useRef(fetcher); f.current = fetcher;
  const reload = useCallback(async () => {
    if (!key) return;
    try {
      const d = await f.current();
      cache.set(key, d); setData(d); setError(null);
    } catch (e: any) {
      setError(e?.message || "Couldn't load"); console.warn("[agape]", key, e?.message);
    } finally { setLoading(false); }
  }, [key]);
  useEffect(() => { if (key) { if (cache.has(key)) setData(cache.get(key)); reload(); } else setData(opts.fallback); }, [key]);
  const rt = JSON.stringify(opts.realtime || []);
  useEffect(() => {
    if (!supabase || !key || !opts.realtime?.length) return;
    let t: any;
    const ch = supabase.channel(`q:${key}:${Math.random().toString(36).slice(2, 8)}`);
    opts.realtime.forEach((r) => ch.on("postgres_changes" as any, { event: r.event || "*", schema: "public", table: r.table, ...(r.filter ? { filter: r.filter } : {}) }, () => { clearTimeout(t); t = setTimeout(reload, 250); }));
    ch.subscribe();
    return () => { clearTimeout(t); supabase!.removeChannel(ch); };
  }, [key, rt]);
  // safety net for anything time-critical (rides): re-check every few seconds as well as realtime
  useEffect(() => {
    if (!key || !opts.poll) return;
    const iv = setInterval(reload, opts.poll);
    return () => clearInterval(iv);
  }, [key, opts.poll]);
  return { data, loading, error, reload, setData };
}
const must = <T,>(r: { data: T | null; error: any }): T => { if (r.error) throw r.error; return (r.data ?? []) as T; };

// ------------------------------------------------------------------ formatting
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso?: string | null) => { if (!iso) return ""; const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const duration = (sec?: number | null) => { if (!sec) return ""; const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`; };
export function ago(iso?: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const d = new Date(iso), n = new Date();
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (s < 6 * 86400) return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

// ------------------------------------------------------------------ sermons
export type LiveSermon = Sermon & { slug?: string };
export function useSermons() {
  const q = useQuery<{ series: Series[]; sermons: LiveSermon[] }>(supabase ? "sermons" : null, async () => {
    const [s, v] = await Promise.all([
      supabase!.from("series").select("id, slug, title, accent, book, speaker, cover_url, color, position").order("position"),
      supabase!.from("videos").select("id, slug, series_id, title, accent, speaker, description, cover_url, youtube_id, is_live, duration_sec, views, likes, published_at").eq("published", true).order("is_live", { ascending: false }).order("published_at", { ascending: false }),
    ]);
    const vids = must<any[]>(v), ser = must<any[]>(s);
    const sermons: LiveSermon[] = vids.map((m) => ({
      id: m.id, slug: m.slug, title: m.title, accent: m.accent || "", seriesId: m.series_id || "", speaker: m.speaker || "",
      date: m.is_live ? "Live & on demand" : shortDate(m.published_at), duration: duration(m.duration_sec) || (m.is_live ? "Live" : ""),
      image: imageSource(m.cover_url), youtubeId: m.youtube_id || undefined, live: m.is_live, views: m.views || 0, likes: m.likes || 0, about: m.description || "",
    }));
    const series: Series[] = ser.map((x) => ({
      id: x.id, title: x.title, accent: x.accent || "", book: x.book || x.topic || "Series", speaker: x.speaker || "",
      count: vids.filter((m) => m.series_id === x.id).length, image: imageSource(x.cover_url), tint: x.color || colorFor(x.title),
    }));
    return { series, sermons };
  }, { fallback: { series: SERIES, sermons: SERMONS } });
  return { ...q.data, loading: q.loading, error: q.error, reload: q.reload };
}

// ------------------------------------------------------------------ courses
export type QuizQ = { prompt: string; options: string[]; answer: number };
export type LiveLesson = { id: string; title: string; kind: "video" | "pdf" | "quiz"; minutes: number; body?: string; youtubeId?: string; pdfUrl?: string; quiz?: QuizQ[] };
export type LiveCourse = Omit<Course, "lessons" | "completed"> & { lessons: LiveLesson[] };
const DEMO_QUIZ: QuizQ[] = [
  { prompt: "Which chapter is called the “hall of faith”?", options: ["Romans 8", "Hebrews 11", "John 3", "Psalm 23"], answer: 1 },
  { prompt: "Who left home not knowing where he was going?", options: ["Moses", "David", "Abraham", "Noah"], answer: 2 },
];
const DEMO_COURSES: LiveCourse[] = COURSES.map((c) => ({ ...c, lessons: c.lessons.map((l) => ({ ...l, quiz: l.kind === "quiz" ? DEMO_QUIZ : undefined })) }));

export function useCourses() {
  const q = useQuery<LiveCourse[]>(supabase ? "courses" : null, async () => {
    const rows = must<any[]>(await supabase!.from("courses")
      .select("id, slug, title, accent, category, description, cover_url, color, position, modules(id, position, lessons(id, title, kind, minutes, position, body, youtube_id, pdf_url, quiz))")
      .eq("published", true).order("position"));
    return rows.map((c) => ({
      id: c.id, title: c.title, accent: c.accent || "", category: c.category || "Course", description: c.description || "",
      image: imageSource(c.cover_url), color: c.color || colorFor(c.title),
      lessons: [...(c.modules || [])].sort((a, b) => a.position - b.position).flatMap((m: any) => [...(m.lessons || [])].sort((a, b) => a.position - b.position)).map((l: any) => ({
        id: l.id, title: l.title, kind: l.kind, minutes: l.minutes || 0, body: l.body || undefined, youtubeId: l.youtube_id || undefined, pdfUrl: l.pdf_url || undefined,
        quiz: Array.isArray(l.quiz) ? l.quiz : undefined,
      })),
    }));
  }, { fallback: DEMO_COURSES });
  return { courses: q.data, loading: q.loading, error: q.error, reload: q.reload };
}

export type Doc = { id: string; title: string; pages: number; color: string; url?: string };
export function useDocuments() {
  const q = useQuery<Doc[]>(supabase ? "documents" : null, async () => {
    const rows = must<any[]>(await supabase!.from("documents").select("id, title, url, pages, color").eq("published", true).order("created_at"));
    return rows.map((d) => ({ id: d.id, title: d.title, pages: d.pages || 0, color: d.color || colorFor(d.title), url: d.url || undefined }));
  }, { fallback: STUDY_PDFS });
  return q.data;
}

// ------------------------------------------------------------------ games
export type TriviaQ = { q: string; o: string[]; a: number };
export type VerseQ = { t: string; a: string[]; x: string[]; r: string };
export function useGames() {
  const q = useQuery<{ trivia: TriviaQ[]; verses: VerseQ[] }>(supabase ? "games" : null, async () => {
    const packs = must<any[]>(await supabase!.from("question_packs").select("game, created_at, questions(prompt, options, answer, reference)").eq("published", true).order("created_at"));
    const trivia: TriviaQ[] = [], verses: VerseQ[] = [];
    packs.forEach((p) => (p.questions || []).forEach((x: any) => {
      if (p.game === "trivia" && Array.isArray(x.options)) trivia.push({ q: x.prompt, o: x.options, a: Number(x.answer) || 0 });
      if (p.game === "verse_match" && Array.isArray(x.answer)) verses.push({ t: x.prompt, a: x.answer, x: Array.isArray(x.options) ? x.options : [], r: x.reference || "" });
    }));
    return { trivia: trivia.length ? trivia : TRIVIA, verses: verses.length ? verses : VERSE_MATCH };
  }, { fallback: { trivia: TRIVIA, verses: VERSE_MATCH } });
  return q.data;
}

export type Leader = { id?: string; name: string; points: number; color: string };
export function useLeaderboard() {
  const q = useQuery<Leader[]>(supabase ? "leaderboard" : null, async () => {
    const rows = must<any[]>(await supabase!.from("leaderboard_weekly").select("user_id, full_name, points").limit(10));
    return rows.map((r) => ({ id: r.user_id, name: r.full_name || "Member", points: r.points, color: colorFor(r.user_id) }));
  }, { fallback: LEADERBOARD, realtime: [{ table: "game_scores", event: "INSERT" }] });
  return q;
}

// ------------------------------------------------------------------ prayer wall
export type LivePrayer = Prayer & { prayed?: boolean; mine?: boolean; createdAt?: string };
const PAPERS = [C.rose, C.violet, C.mint, C.sun, C.flame, C.sky];
export function usePrayers() {
  return useQuery<LivePrayer[]>(supabase ? "prayers" : null, async () => {
    const rows = must<any[]>(await supabase!.from("prayer_wall").select("id, body, anonymous, pray_count, answered, author_name, created_at, mine, prayed").order("created_at", { ascending: false }).limit(80));
    return rows.map((p, i) => ({ id: p.id, who: p.anonymous ? "Anonymous" : p.author_name || "Member", text: p.body, count: p.pray_count, answered: p.answered, anonymous: p.anonymous, color: PAPERS[i % PAPERS.length], prayed: p.prayed, mine: p.mine, createdAt: p.created_at }));
  }, { fallback: PRAYERS, realtime: [{ table: "prayer_requests" }] });
}

// ------------------------------------------------------------------ community
export type Announcement = { id: string; title: string; body: string; time: string; color: string };
export function useAnnouncements() {
  return useQuery<Announcement[]>(supabase ? "announcements" : null, async () => {
    const rows = must<any[]>(await supabase!.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(30));
    return rows.map((a, i) => ({ id: a.id, title: a.title, body: a.body || "", time: ago(a.created_at), color: PALETTE[i % PALETTE.length] }));
  }, { fallback: ANNOUNCEMENTS, realtime: [{ table: "announcements" }] }).data;
}

export type Convo = { id: string; name: string; last: string; time: string; unread: number; color: string; group?: boolean; members?: number; topicKey?: string | null };
export function useInbox(uid: string | null) {
  return useQuery<Convo[]>(supabase && uid ? `inbox:${uid}` : null, async () => {
    const rows = must<any[]>(await supabase!.rpc("my_conversations"));
    return rows.map((c) => ({
      id: c.id, name: c.name, group: c.kind !== "direct", members: c.members, unread: c.unread, topicKey: c.topic_key,
      last: c.last_body ? (c.kind !== "direct" && c.last_sender ? `${c.last_sender.split(" ")[0]}: ${c.last_body}` : c.last_body) : "Say hello 👋",
      time: ago(c.last_at), color: c.color || colorFor(c.name),
    }));
  }, { fallback: supabase ? [] : CHATS, realtime: [{ table: "messages", event: "INSERT" }] });
}

export function useCounts(rpc: "rsvp_counts" | "group_member_counts" | "giving_totals") {
  return useQuery<Record<string, number>>(supabase ? `counts:${rpc}` : null, async () => {
    const rows = must<any[]>(await supabase!.rpc(rpc));
    return Object.fromEntries(rows.map((r) => [r.event_key ?? r.topic_key ?? r.campaign_key, Number(r.going ?? r.members ?? r.raised) || 0]));
  }, { fallback: {} });
}

export type Note = { id: string; kind: string; title: string; body: string; route?: string; time: string; createdAt: string };
export function useNotifications(uid: string | null) {
  return useQuery<Note[]>(supabase && uid ? `notes:${uid}` : null, async () => {
    const rows = must<any[]>(await supabase!.from("notifications").select("id, kind, title, body, route, created_at").order("created_at", { ascending: false }).limit(60));
    return rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title || "Agape", body: n.body || "", route: n.route || undefined, time: ago(n.created_at), createdAt: n.created_at }));
  }, { fallback: [], realtime: [{ table: "notifications", event: "INSERT" }] });
}

// ------------------------------------------------------------------ rides
export type Ride = {
  id: string; status: "requested" | "accepted" | "enroute" | "arrived" | "completed" | "cancelled";
  pickup_label: string; pickup_lat: number; pickup_lng: number; dropoff_label: string; requested_for: string; seats: number; notes?: string | null;
  member_id: string; volunteer_id: string | null; created_at: string;
  member?: { full_name: string | null; phone: string | null } | null;
  driver?: { full_name: string | null; phone: string | null; vehicle: string | null } | null;
};
const RIDE_COLS = "id, status, pickup_label, pickup_lat, pickup_lng, dropoff_label, requested_for, seats, notes, member_id, volunteer_id, created_at, member:profiles!rides_member_id_fkey(full_name, phone), driver:profiles!rides_volunteer_id_fkey(full_name, phone, vehicle)";
const ACTIVE = ["requested", "accepted", "enroute", "arrived"];

/** The member's current ride (if any), live. */
export function useMyRide(uid: string | null) {
  return useQuery<Ride | null>(supabase && uid ? `myride:${uid}` : null, async () => {
    const rows = must<any[]>(await supabase!.from("rides").select(RIDE_COLS).eq("member_id", uid!).in("status", ACTIVE).order("created_at", { ascending: false }).limit(1));
    return (rows[0] as Ride) ?? null;
  }, { fallback: null, realtime: uid ? [{ table: "rides", filter: `member_id=eq.${uid}` }] : [], poll: 8000 });
}

/** For volunteer drivers: open requests + the rides they're driving. */
export function useDriverBoard(uid: string | null, enabled: boolean) {
  return useQuery<{ open: Ride[]; mine: Ride[] }>(supabase && uid && enabled ? `driver:${uid}` : null, async () => {
    const [o, m] = await Promise.all([
      supabase!.from("rides").select(RIDE_COLS).eq("status", "requested").neq("member_id", uid!).order("created_at").limit(30),
      supabase!.from("rides").select(RIDE_COLS).eq("volunteer_id", uid!).in("status", ["accepted", "enroute", "arrived"]).order("created_at"),
    ]);
    return { open: must<any[]>(o) as Ride[], mine: must<any[]>(m) as Ride[] };
  }, { fallback: { open: [], mine: [] }, realtime: [{ table: "rides" }], poll: 15000 });
}

/** Last known position of the driver for a ride, updated live. */
export function useRideLocation(rideId: string | null) {
  const [pos, setPos] = useState<{ latitude: number; longitude: number; heading: number } | null>(null);
  useEffect(() => {
    setPos(null);
    if (!supabase || !rideId) return;
    supabase.from("ride_locations").select("lat, lng, heading").eq("ride_id", rideId).order("recorded_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setPos({ latitude: data[0].lat, longitude: data[0].lng, heading: data[0].heading ?? 0 }); });
    const last = () => supabase!.from("ride_locations").select("lat, lng, heading").eq("ride_id", rideId).order("recorded_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setPos({ latitude: data[0].lat, longitude: data[0].lng, heading: data[0].heading ?? 0 }); });
    const iv = setInterval(last, 8000);
    const ch = supabase.channel(`ride-loc:${rideId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_locations", filter: `ride_id=eq.${rideId}` }, (p: any) => setPos({ latitude: p.new.lat, longitude: p.new.lng, heading: p.new.heading ?? 0 }))
      .subscribe();
    return () => { clearInterval(iv); supabase!.removeChannel(ch); };
  }, [rideId]);
  return pos;
}

export const km = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371, dLat = ((b.latitude - a.latitude) * Math.PI) / 180, dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
/** City-driving estimate: ~28 km/h average plus a minute to get going. */
export const etaMinutes = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => Math.max(1, Math.round(km(a, b) / 28 * 60 * 1.3 + 1));
