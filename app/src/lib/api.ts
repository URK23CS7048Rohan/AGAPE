/**
 * Every read and write the app makes. Table and function names match
 * backend/supabase/migrations. Row-level security decides what each member may see or change.
 */
import { lang } from "./i18n";
import { supabase } from "./supabase";
import { invalidate } from "./query";

const uid = async () => (await supabase.auth.getSession()).data.session?.user.id ?? null;
function ok<T>(r: { data: T; error: any }): T {
  if (r.error) throw new Error(r.error.message || "Something went wrong");
  return r.data;
}

/* ------------------------------------------------------------------ AI */
export type ChatMsg = { role: "user" | "assistant"; content: string };

/** Ask the AI assistant via the `ask-agape` Edge Function (the API key stays on the server). */
export async function askAgape(history: ChatMsg[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ask-agape", { body: { messages: history, language: lang() } });
  if (error) {
    const body = await (error as any).context?.json?.().catch(() => null);
    throw new Error(body?.error || "Ask Agape isn't available right now. Please try again in a moment.");
  }
  if (!data?.reply) throw new Error(data?.error || "No answer came back. Please try again.");
  return data.reply as string;
}

/* ------------------------------------------------------------------ Sermons */
export type Series = { id: string; title: string; book: string | null; topic: string | null; cover_url: string | null; color: string | null; videos: number };
export type Video = {
  id: string; title: string; speaker: string | null; description: string | null; youtube_id: string | null; is_live: boolean;
  duration_sec: number | null; views: number; published_at: string | null; cover_url: string | null; series_id: string | null;
  series?: { title: string; book: string | null; color: string | null; cover_url: string | null } | null;
};
const VIDEO_COLS = "id, title, speaker, description, youtube_id, is_live, duration_sec, views, published_at, cover_url, series_id, series:series(title, book, color, cover_url)";

export async function listSeries(): Promise<Series[]> {
  const rows = ok(await supabase.from("series").select("id, title, book, topic, cover_url, color, videos(count)").order("position").order("created_at", { ascending: false }));
  return (rows as any[]).map((s) => ({ ...s, videos: s.videos?.[0]?.count ?? 0 }));
}
export async function listVideos(): Promise<Video[]> {
  return ok(await supabase.from("videos").select(VIDEO_COLS).order("is_live", { ascending: false }).order("published_at", { ascending: false }).limit(200)) as any;
}
export async function getVideo(id: string): Promise<Video | null> {
  return ok(await supabase.from("videos").select(VIDEO_COLS).eq("id", id).maybeSingle()) as any;
}
export async function countView(id: string) { await supabase.rpc("count_view", { video: id }); }
/** Best image for a sermon: its own cover, the YouTube thumbnail, then the series cover. */
export const videoThumb = (v: Pick<Video, "cover_url" | "youtube_id" | "series">) =>
  v.cover_url || (v.youtube_id ? `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg` : null) || v.series?.cover_url || null;

export async function savedVideoIds(): Promise<Set<string>> {
  const rows = ok(await supabase.from("saved_videos").select("video_id"));
  return new Set((rows as any[]).map((r) => r.video_id));
}
export async function setSaved(videoId: string, on: boolean) {
  if (on) ok(await supabase.from("saved_videos").upsert({ video_id: videoId }, { onConflict: "user_id,video_id" }));
  else ok(await supabase.from("saved_videos").delete().eq("video_id", videoId));
  invalidate("saved");
}

export async function getNote(videoId: string): Promise<string> {
  const r = ok(await supabase.from("sermon_notes").select("body").eq("video_id", videoId).maybeSingle());
  return (r as any)?.body ?? "";
}
export async function saveNote(videoId: string, body: string) {
  ok(await supabase.from("sermon_notes").upsert({ video_id: videoId, body, updated_at: new Date().toISOString() }, { onConflict: "user_id,video_id" }));
}

export type LiveLine = { id: number; body: string; created_at: string; user_id: string; name: string };
export async function liveChat(videoId: string): Promise<LiveLine[]> {
  const rows = ok(await supabase.from("live_chat").select("id, body, created_at, user_id, profiles(full_name)").eq("video_id", videoId).order("created_at", { ascending: false }).limit(50));
  return (rows as any[]).reverse().map((r) => ({ ...r, name: r.profiles?.full_name || "Member" }));
}
export function subscribeLiveChat(videoId: string, onLine: () => void) {
  const ch = supabase.channel(`live:${videoId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `video_id=eq.${videoId}` }, onLine)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
export async function postLiveChat(videoId: string, body: string) {
  ok(await supabase.from("live_chat").insert({ video_id: videoId, body: body.slice(0, 300) }));
}

/* ------------------------------------------------------------------ Courses */
export type Lesson = { id: string; title: string; kind: "video" | "pdf" | "quiz"; minutes: number | null; position: number; url: string | null; body: string | null };
export type Course = { id: string; title: string; description: string | null; category: string | null; cover_url: string | null; color: string | null; lessons: Lesson[] };

export async function listCourses(): Promise<Course[]> {
  const rows = ok(await supabase.from("courses").select("id, title, description, category, cover_url, color, lessons(id, title, kind, minutes, position, url, body)").eq("published", true).order("position").order("created_at"));
  return (rows as any[]).map((c) => ({ ...c, lessons: [...(c.lessons || [])].sort((a, b) => a.position - b.position) }));
}
export async function completedLessons(): Promise<Set<string>> {
  const rows = ok(await supabase.from("lesson_progress").select("lesson_id, completed_at"));
  return new Set((rows as any[]).map((r) => r.lesson_id));
}
/** Days (yyyy-mm-dd, local) on which the member finished a lesson, for the week strip. */
export async function learningDays(): Promise<Set<string>> {
  const since = new Date(Date.now() - 8 * 864e5).toISOString();
  const rows = ok(await supabase.from("lesson_progress").select("completed_at").gte("completed_at", since));
  return new Set((rows as any[]).map((r) => new Date(r.completed_at).toLocaleDateString("en-CA")));
}
export async function completeLesson(lessonId: string) {
  ok(await supabase.from("lesson_progress").upsert({ lesson_id: lessonId, completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" }));
  invalidate("progress");
}

export type StudyGuide = { id: string; title: string; url: string | null; pages: number | null; color: string | null };
export async function listGuides(): Promise<StudyGuide[]> {
  return ok(await supabase.from("documents").select("id, title, url, pages, color").not("url", "is", null).order("position").order("created_at", { ascending: false })) as any;
}

/* ------------------------------------------------------------------ Games */
export type Trivia = { id: string; prompt: string; options: string[]; answer: number; reference: string | null };
export type VerseQ = { id: string; prompt: string; options: string[]; answer: string[]; reference: string | null };
export async function listQuestions(game: "trivia" | "verse_match") {
  const rows = ok(await supabase.from("questions").select("id, prompt, options, answer, reference, question_packs!inner(game, published)").eq("question_packs.game", game).eq("question_packs.published", true));
  return rows as any[] as (Trivia | VerseQ)[];
}
export async function submitScore(game: "verse_match" | "trivia", points: number) {
  ok(await supabase.from("game_scores").insert({ game, points: Math.max(0, Math.min(1000, Math.round(points))) }));
  invalidate("points");
}
export type Leader = { user_id: string; full_name: string | null; points: number };
export async function leaderboard(): Promise<Leader[]> {
  return ok(await supabase.from("leaderboard_weekly").select("user_id, full_name, points").limit(10)) as any;
}
export async function myPoints(): Promise<number> {
  const r = ok(await supabase.from("my_points").select("points").maybeSingle());
  return (r as any)?.points ?? 0;
}

/* ------------------------------------------------------------------ Events */
export async function myRsvps(): Promise<Set<string>> {
  const rows = ok(await supabase.from("rsvps").select("event_key"));
  return new Set((rows as any[]).map((r) => r.event_key));
}
export async function rsvpCounts(): Promise<Record<string, number>> {
  const rows = ok(await supabase.from("rsvp_counts").select("event_key, going"));
  return Object.fromEntries((rows as any[]).map((r) => [r.event_key, r.going]));
}
export async function setRsvp(eventKey: string, title: string, going: boolean) {
  if (going) ok(await supabase.from("rsvps").upsert({ event_key: eventKey, event_title: title }, { onConflict: "event_key,user_id" }));
  else ok(await supabase.from("rsvps").delete().eq("event_key", eventKey).eq("user_id", (await uid())!));
  invalidate("rsvp");
}

/* ------------------------------------------------------------------ Prayer */
export type Prayer = { id: string; text: string; who: string; count: number; answered: boolean; anonymous: boolean; mine: boolean; praying: boolean; created_at: string };
export async function fetchPrayers(): Promise<Prayer[]> {
  const [wall, mine] = await Promise.all([
    supabase.from("prayer_wall").select("id, body, anonymous, pray_count, answered, author_name, mine, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("prayer_reactions").select("request_id"),
  ]);
  const praying = new Set(((ok(mine) as any[]) || []).map((r) => r.request_id));
  return (ok(wall) as any[]).map((p) => ({
    id: p.id, text: p.body, who: p.anonymous ? "Anonymous" : p.author_name || "Member", count: p.pray_count, answered: p.answered,
    anonymous: p.anonymous, mine: !!p.mine, praying: praying.has(p.id), created_at: p.created_at,
  }));
}
export async function postPrayer(body: string, anonymous: boolean) {
  ok(await supabase.from("prayer_requests").insert({ body: body.slice(0, 500), anonymous }));
  invalidate("prayers");
}
export async function setPraying(id: string, on: boolean) {
  ok(await supabase.rpc(on ? "pray_for" : "unpray", { request_id: id }));
}
export async function markAnswered(id: string, answered: boolean) {
  ok(await supabase.from("prayer_requests").update({ answered }).eq("id", id));
  invalidate("prayers");
}
export async function deletePrayer(id: string) {
  ok(await supabase.from("prayer_requests").delete().eq("id", id));
  invalidate("prayers");
}

/* ------------------------------------------------------------------ Pastoral care */
export async function requestCare(kind: string, details: string) {
  ok(await supabase.from("care_requests").insert({ kind, details: details.slice(0, 2000) }));
}

/* ------------------------------------------------------------------ Community */
export type ChatRow = { id: string; kind: "direct" | "group" | "announcement"; name: string; ministry_id: string | null; last_body: string | null; last_at: string | null; last_sender: string | null; unread: number; members: number };
export async function myChats(): Promise<ChatRow[]> {
  return ok(await supabase.rpc("my_chats")) as any;
}
export type Group = { id: string; name: string; description: string | null; color: string | null; meets: string | null; cover_url: string | null; members: number; joined: boolean };
export async function listGroups(): Promise<Group[]> {
  const me = await uid();
  const [g, counts, mine] = await Promise.all([
    supabase.from("ministries").select("id, name, description, color, meets, cover_url").order("position").order("name"),
    supabase.from("ministry_counts").select("ministry_id, members"),
    me ? supabase.from("ministry_members").select("ministry_id").eq("user_id", me) : Promise.resolve({ data: [], error: null }),
  ]);
  const c = Object.fromEntries((ok(counts) as any[]).map((r) => [r.ministry_id, r.members]));
  const j = new Set((ok(mine as any) as any[]).map((r) => r.ministry_id));
  return (ok(g) as any[]).map((x) => ({ ...x, members: c[x.id] ?? 0, joined: j.has(x.id) }));
}
export async function joinGroup(id: string, join: boolean) {
  ok(await supabase.rpc(join ? "join_group" : "leave_group", { ministry: id }));
  invalidate("groups"); invalidate("chats");
}
export async function startDirect(otherId: string): Promise<string> {
  const id = ok(await supabase.rpc("start_direct", { other: otherId }));
  invalidate("chats");
  return id as any;
}
export type Person = { id: string; full_name: string | null; role: string };
export async function searchMembers(q: string): Promise<Person[]> {
  const me = await uid();
  let req = supabase.from("profiles").select("id, full_name, role").order("full_name").limit(40);
  if (me) req = req.neq("id", me);
  if (q.trim()) req = req.ilike("full_name", `%${q.trim().replace(/[%_]/g, "")}%`);
  return ok(await req) as any;
}
export type Conversation = { id: string; kind: "direct" | "group" | "announcement"; name: string | null; members: number };
export async function getConversation(id: string): Promise<Conversation | null> {
  const chats = await myChats();
  const c = chats.find((x) => x.id === id);
  return c ? { id: c.id, kind: c.kind, name: c.name, members: c.members } : null;
}
export type Message = { id: string; body: string; created_at: string; sender_id: string; sender: string };
export async function listMessages(conv: string): Promise<Message[]> {
  const rows = ok(await supabase.from("messages").select("id, body, created_at, sender_id, profiles(full_name)").eq("conversation_id", conv).order("created_at", { ascending: false }).limit(100));
  return (rows as any[]).reverse().map((m) => ({ id: m.id, body: m.body, created_at: m.created_at, sender_id: m.sender_id, sender: m.profiles?.full_name || "Member" }));
}
export function subscribeMessages(conv: string, onNew: () => void) {
  const ch = supabase.channel(`msgs:${conv}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv}` }, onNew)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
export async function sendMessage(conv: string, body: string) {
  ok(await supabase.from("messages").insert({ conversation_id: conv, body: body.slice(0, 4000) }));
}
export async function markRead(conv: string) { await supabase.rpc("mark_read", { conv }); invalidate("chats"); }

export type Announcement = { id: string; title: string; body: string | null; created_at: string };
export async function listAnnouncements(): Promise<Announcement[]> {
  return ok(await supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(50)) as any;
}

/* ------------------------------------------------------------------ Rides */
export type RideStatus = "requested" | "accepted" | "enroute" | "arrived" | "completed" | "cancelled";
export type Ride = {
  id: string; status: RideStatus; pickup_label: string; pickup_lat: number; pickup_lng: number; requested_for: string; seats: number; notes: string | null; created_at: string;
  member_id: string; volunteer_id: string | null;
  member?: { full_name: string | null } | null; volunteer?: { full_name: string | null; car: string | null } | null;
};
const RIDE_COLS = "id, status, pickup_label, pickup_lat, pickup_lng, requested_for, seats, notes, created_at, member_id, volunteer_id, member:profiles!rides_member_id_fkey(full_name), volunteer:profiles!rides_volunteer_id_fkey(full_name, car)";
const ACTIVE: RideStatus[] = ["requested", "accepted", "enroute", "arrived"];

export async function myActiveRide(): Promise<Ride | null> {
  const me = await uid();
  if (!me) return null;
  const r = ok(await supabase.from("rides").select(RIDE_COLS).eq("member_id", me).in("status", ACTIVE).order("created_at", { ascending: false }).limit(1));
  return ((r as any[])[0] as Ride) ?? null;
}
export async function requestRide(input: { pickup: string; lat: number; lng: number; time: string; seats: number; notes?: string }) {
  ok(await supabase.from("rides").insert({ pickup_label: input.pickup, pickup_lat: input.lat, pickup_lng: input.lng, requested_for: input.time, seats: input.seats, notes: input.notes || null }));
  invalidate("ride");
}
export async function setRideStatus(id: string, status: RideStatus, extra: Record<string, any> = {}) {
  ok(await supabase.from("rides").update({ status, ...extra }).eq("id", id));
  invalidate("ride");
}
export async function acceptRide(id: string) {
  const me = await uid();
  const r = ok(await supabase.from("rides").update({ status: "accepted", volunteer_id: me }).eq("id", id).eq("status", "requested").select("id"));
  if (!(r as any[]).length) throw new Error("Someone else already accepted this ride.");
  invalidate("ride");
}
export async function openRides(): Promise<Ride[]> {
  return ok(await supabase.from("rides").select(RIDE_COLS).eq("status", "requested").order("created_at")) as any;
}
export async function myDrives(): Promise<Ride[]> {
  const me = await uid();
  return ok(await supabase.from("rides").select(RIDE_COLS).eq("volunteer_id", me!).in("status", ["accepted", "enroute", "arrived"]).order("created_at")) as any;
}
export function subscribeRides(onChange: () => void) {
  const ch = supabase.channel(`rides:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
export async function lastRideLocation(rideId: string) {
  const r = ok(await supabase.from("ride_locations").select("lat, lng, heading, recorded_at").eq("ride_id", rideId).order("recorded_at", { ascending: false }).limit(1));
  return ((r as any[])[0] as { lat: number; lng: number; heading: number | null; recorded_at: string }) ?? null;
}
/** Live location feed for a ride (volunteer → member). Returns an unsubscribe fn. */
export function subscribeRideLocation(rideId: string, onPoint: (p: { lat: number; lng: number; heading: number | null }) => void) {
  const ch = supabase.channel(`ride:${rideId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_locations", filter: `ride_id=eq.${rideId}` }, (p: any) => onPoint(p.new))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
export async function pushRideLocation(rideId: string, lat: number, lng: number, heading?: number) {
  await supabase.from("ride_locations").insert({ ride_id: rideId, lat, lng, heading });
}
export async function ridePhone(rideId: string): Promise<string | null> {
  return (ok(await supabase.rpc("ride_phone", { ride: rideId })) as any) || null;
}

/* ------------------------------------------------------------------ Me */
export async function myContact(): Promise<{ email: string | null; phone: string | null }> {
  const r = ok(await supabase.rpc("my_contact"));
  return ((r as any[])[0] as any) ?? { email: null, phone: null };
}
export async function updateProfile(patch: { full_name?: string; phone?: string | null; car?: string | null }) {
  const me = await uid();
  ok(await supabase.from("profiles").update(patch).eq("id", me!));
}
export async function deleteAccount() {
  ok(await supabase.rpc("delete_my_account"));
  await supabase.auth.signOut().catch(() => {});
}
export async function myStats() {
  const [saved, lessons, points] = await Promise.all([
    supabase.from("saved_videos").select("video_id", { count: "exact", head: true }),
    supabase.from("lesson_progress").select("lesson_id", { count: "exact", head: true }),
    myPoints(),
  ]);
  return { saved: saved.count ?? 0, lessons: lessons.count ?? 0, points };
}

/* ------------------------------------------------------------------ Staff (in-app tools) */
export type StaffPrayer = { id: string; body: string; anonymous: boolean; pray_count: number; answered: boolean; hidden: boolean; created_at: string; author: string };
export async function staffPrayers(): Promise<StaffPrayer[]> {
  const rows = ok(await supabase.from("prayer_requests").select("id, body, anonymous, pray_count, answered, hidden, created_at, profiles!prayer_requests_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(100));
  return (rows as any[]).map((r) => ({ ...r, author: r.anonymous ? `Anonymous (${r.profiles?.full_name || "member"})` : r.profiles?.full_name || "Member" }));
}
export async function staffUpdatePrayer(id: string, patch: { hidden?: boolean; answered?: boolean }) {
  ok(await supabase.from("prayer_requests").update(patch).eq("id", id));
  invalidate("prayers"); invalidate("staff");
}
export type StaffCare = { id: string; kind: string; details: string | null; status: string; created_at: string; full_name: string | null; email: string | null; phone: string | null };
export async function staffCare(): Promise<StaffCare[]> {
  return ok(await supabase.rpc("staff_care")) as any;
}
export async function staffSetCare(id: string, status: string) {
  ok(await supabase.from("care_requests").update({ status }).eq("id", id));
  invalidate("staff");
}
export type StaffRide = { id: string; pickup_label: string; requested_for: string; seats: number; notes: string | null; status: RideStatus; created_at: string; member: string | null; member_phone: string | null; volunteer: string | null };
export async function staffRides(): Promise<StaffRide[]> {
  return ok(await supabase.rpc("staff_rides")) as any;
}
export async function postAnnouncement(title: string, body: string) {
  ok(await supabase.from("announcements").insert({ title, body }));
  invalidate("news");
}
export async function deleteAnnouncement(id: string) {
  ok(await supabase.from("announcements").delete().eq("id", id));
  invalidate("news");
}
export async function staffStats() {
  const r = ok(await supabase.from("staff_stats").select("*").maybeSingle());
  return (r as any) ?? {};
}
