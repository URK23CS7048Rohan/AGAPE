/**
 * Church life: reading plans + journal, prayer list, testimonies, home prayer meetings,
 * Kids / Teens / Squad, serving, check-in, next steps, set lists and notifications.
 * Tables and functions: backend/supabase/migrations/20261004000000_church_life.sql
 */
import { supabase } from "./supabase";
import { invalidate } from "./query";
import { C } from "@/theme";

export const KIND_COLORS: Record<string, string> = { prayer: C.rose, "bible study": C.violet, worship: C.sun, fellowship: C.mint };
export const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function ok<T>(r: { data: T; error: any }): T {
  if (r.error) throw new Error(r.error.message || "Something went wrong");
  return r.data;
}
const pretty = (e: any) => String(e?.message || e || "").replace(/^.*?:\s*/, "");

/* ---------------------------------------------------------------- reading plans */
export type PlanDay = { title: string; refs: string[]; devotion?: string; prompt?: string };
export type Plan = { id: string; slug: string; title: string; subtitle: string | null; description: string | null; audience: "adults" | "kids" | "teens"; image: string | null; color: string | null; days: PlanDay[] };
export type Progress = { plan_id: string; started_at: string; done: number[] };

export async function listPlans(): Promise<Plan[]> {
  return ok(await supabase.from("reading_plans").select("id, slug, title, subtitle, description, audience, image, color, days").eq("published", true).order("position").order("created_at")) as Plan[];
}
export async function getPlan(slug: string): Promise<Plan | null> {
  return ok(await supabase.from("reading_plans").select("id, slug, title, subtitle, description, audience, image, color, days").eq("slug", slug).maybeSingle()) as Plan | null;
}
export async function myProgress(): Promise<Record<string, Progress>> {
  const rows = ok(await supabase.from("plan_progress").select("plan_id, started_at, done")) as Progress[];
  return Object.fromEntries(rows.map((r) => [r.plan_id, r]));
}
export async function planCounts(): Promise<Record<string, number>> {
  const rows = (ok(await supabase.rpc("plan_counts")) as any[]) || [];
  return Object.fromEntries(rows.map((r) => [r.plan_id, r.readers]));
}
export async function startPlan(planId: string) {
  ok(await supabase.from("plan_progress").upsert({ plan_id: planId, done: [] }, { onConflict: "user_id,plan_id", ignoreDuplicates: true }));
  invalidate("plans");
}
export async function setDayDone(planId: string, day: number, done: boolean, current: number[]) {
  const next = done ? Array.from(new Set([...current, day])).sort((a, b) => a - b) : current.filter((d) => d !== day);
  ok(await supabase.from("plan_progress").upsert({ plan_id: planId, done: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,plan_id" }));
  invalidate("plans");
  return next;
}
export async function leavePlan(planId: string) {
  ok(await supabase.from("plan_progress").delete().eq("plan_id", planId));
  invalidate("plans");
}

/* ---------------------------------------------------------------- journal */
export type Entry = { id: string; plan_id: string | null; day: number | null; ref: string | null; title: string | null; body: string; created_at: string; updated_at: string };
export async function listJournal(): Promise<Entry[]> {
  return ok(await supabase.from("journal_entries").select("id, plan_id, day, ref, title, body, created_at, updated_at").order("created_at", { ascending: false })) as Entry[];
}
export async function saveEntry(e: Partial<Entry> & { body: string }) {
  const row = { plan_id: e.plan_id ?? null, day: e.day ?? null, ref: e.ref ?? null, title: e.title ?? null, body: e.body, updated_at: new Date().toISOString() };
  if (e.id) ok(await supabase.from("journal_entries").update(row).eq("id", e.id));
  else ok(await supabase.from("journal_entries").insert(row));
  invalidate("journal");
}
export async function deleteEntry(id: string) { ok(await supabase.from("journal_entries").delete().eq("id", id)); invalidate("journal"); }

/* ---------------------------------------------------------------- prayer list */
export type PrayerItem = { id: string; title: string; details: string | null; person: string | null; answered_at: string | null; answer_note: string | null; created_at: string };
export async function listPrayerItems(): Promise<PrayerItem[]> {
  return ok(await supabase.from("prayer_items").select("id, title, details, person, answered_at, answer_note, created_at").order("created_at", { ascending: false })) as PrayerItem[];
}
export async function addPrayerItem(p: { title: string; details?: string; person?: string }) { ok(await supabase.from("prayer_items").insert(p)); invalidate("prayeritems"); }
export async function answerPrayerItem(id: string, answered: boolean, note?: string) {
  ok(await supabase.from("prayer_items").update({ answered_at: answered ? new Date().toISOString() : null, answer_note: answered ? note || null : null }).eq("id", id));
  invalidate("prayeritems");
}
export async function deletePrayerItem(id: string) { ok(await supabase.from("prayer_items").delete().eq("id", id)); invalidate("prayeritems"); }

/* ---------------------------------------------------------------- testimonies */
export type Testimony = { id: string; title: string; body: string; category: string; featured: boolean; amens: number; created_at: string; anonymous: boolean; author_name: string | null; mine: boolean; amened: boolean };
export async function listTestimonies(): Promise<Testimony[]> {
  return ok(await supabase.from("testimony_wall").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(200)) as Testimony[];
}
export async function shareTestimony(t: { title: string; body: string; category: string; anonymous: boolean }) {
  try { ok(await supabase.from("testimonies").insert(t)); } catch (e) { throw new Error(pretty(e)); }
  invalidate("testimonies");
}
export async function sayAmen(id: string): Promise<number> { const n = ok(await supabase.rpc("amen", { t: id })) as number; invalidate("testimonies"); return n; }

/* ---------------------------------------------------------------- home prayer meetings */
export type Meeting = { id: string; title: string; about: string | null; kind: string; starts_at: string; repeats: string | null; area: string; capacity: number | null; language: string | null; women_only: boolean; cancelled: boolean; host_name: string | null; going: number; is_host: boolean; joined: boolean };
export type Place = { address: string; lat: number | null; lng: number | null; notes: string | null };
export async function listMeetings(): Promise<Meeting[]> {
  return ok(await supabase.from("home_meeting_list").select("*").eq("cancelled", false).gte("starts_at", new Date(Date.now() - 3 * 3600e3).toISOString()).order("starts_at")) as Meeting[];
}
export async function getMeeting(id: string): Promise<{ m: Meeting | null; place: Place | null }> {
  const m = ok(await supabase.from("home_meeting_list").select("*").eq("id", id).maybeSingle()) as Meeting | null;
  const place = ok(await supabase.from("home_meeting_places").select("address, lat, lng, notes").eq("meeting_id", id).maybeSingle()) as Place | null;
  return { m, place };
}
export async function hostMeeting(p: { title: string; kind: string; starts_at: string; area: string; address: string; about?: string; repeats?: string | null; capacity?: number | null; notes?: string }): Promise<string> {
  try {
    const id = ok(await supabase.rpc("host_home_meeting", { p_title: p.title, p_kind: p.kind, p_starts_at: p.starts_at, p_area: p.area, p_address: p.address, p_about: p.about || null, p_repeats: p.repeats || null, p_capacity: p.capacity || null, p_notes: p.notes || null })) as string;
    invalidate("meetings"); return id;
  } catch (e) { throw new Error(pretty(e)); }
}
export async function joinMeeting(id: string, guests = 0): Promise<Place> {
  try { const r = ok(await supabase.rpc("join_home_meeting", { m: id, p_guests: guests })) as Place; invalidate("meetings"); return r; } catch (e) { throw new Error(pretty(e)); }
}
export async function leaveMeeting(id: string) {
  const uid = (await supabase.auth.getSession()).data.session?.user.id;
  ok(await supabase.from("home_meeting_rsvps").delete().eq("meeting_id", id).eq("user_id", uid!));
  invalidate("meetings");
}
export async function cancelMeeting(id: string) { ok(await supabase.from("home_meetings").update({ cancelled: true }).eq("id", id)); invalidate("meetings"); }

/* ---------------------------------------------------------------- Kids / Teens / Squad */
export type MinistryKey = "kids" | "teens" | "squad";
export type Post = { id: string; ministry: MinistryKey; kind: string; title: string; body: string | null; ref: string | null; youtube_id: string | null; image: string | null; color: string | null; starts_at: string | null; link: string | null; pinned: boolean };
export async function listPosts(ministry: MinistryKey): Promise<Post[]> {
  return ok(await supabase.from("ministry_posts").select("id, ministry, kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned").eq("ministry", ministry).eq("published", true).order("pinned", { ascending: false }).order("position").order("created_at", { ascending: false })) as Post[];
}

/* ---------------------------------------------------------------- serving */
export type Opportunity = { id: string; team: string; title: string; description: string | null; starts_at: string; ends_at: string | null; location: string | null; slots: number; taken: number; mine: boolean };
export async function listServe(): Promise<Opportunity[]> {
  return ok(await supabase.from("serve_board").select("*").order("starts_at")) as Opportunity[];
}
export async function serveSignUp(id: string) { try { ok(await supabase.rpc("serve_sign_up", { o: id })); invalidate("serve"); } catch (e) { throw new Error(pretty(e)); } }
export async function serveCancel(id: string) {
  const uid = (await supabase.auth.getSession()).data.session?.user.id;
  ok(await supabase.from("serve_signups").delete().eq("opportunity_id", id).eq("user_id", uid!)); invalidate("serve");
}

/* ---------------------------------------------------------------- check-in */
export async function checkIn(code: string): Promise<{ title: string; already: boolean }> {
  try { const r = ok(await supabase.rpc("check_in_self", { p_code: code })) as any; invalidate("checkins"); return r; } catch (e) { throw new Error(pretty(e)); }
}
export async function myCheckins(): Promise<{ day: string; title: string | null }[]> {
  return ok(await supabase.from("checkins").select("day, title").order("day", { ascending: false }).limit(100)) as any[];
}
export async function todaysCode(): Promise<{ code: string; title: string } | null> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuwait" });
  const rows = ok(await supabase.from("checkin_codes").select("code, title").eq("valid_on", today).order("created_at", { ascending: false }).limit(1)) as any[];
  return rows[0] || null;
}
export async function makeCode(title: string): Promise<{ code: string; title: string }> {
  const r = ok(await supabase.from("checkin_codes").insert({ title }).select("code, title").single()) as any; return r;
}

/* ---------------------------------------------------------------- next steps */
export type StepKind = "salvation" | "baptism" | "membership" | "dedication" | "counselling" | "wedding" | "visit";
export async function requestStep(s: { kind: StepKind; name?: string; phone?: string; details?: string }) {
  try { ok(await supabase.from("next_steps").insert(s)); invalidate("steps"); } catch (e) { throw new Error(pretty(e)); }
}
export async function mySteps(): Promise<{ kind: StepKind; status: string; created_at: string }[]> {
  return ok(await supabase.from("next_steps").select("kind, status, created_at").order("created_at", { ascending: false })) as any[];
}

/* ---------------------------------------------------------------- set lists (worship) */
export type SetItem = { song: string; key?: string };
export type SetList = { id: string; owner_id: string; title: string; service_date: string | null; items: SetItem[]; shared: boolean };
export async function listSets(): Promise<SetList[]> {
  return ok(await supabase.from("set_lists").select("id, owner_id, title, service_date, items, shared").order("service_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })) as SetList[];
}
export async function saveSet(s: Partial<SetList> & { title: string; items: SetItem[] }): Promise<string> {
  const row = { title: s.title, items: s.items, service_date: s.service_date ?? null, shared: !!s.shared, updated_at: new Date().toISOString() };
  const r = s.id ? ok(await supabase.from("set_lists").update(row).eq("id", s.id).select("id").single()) : ok(await supabase.from("set_lists").insert(row).select("id").single());
  invalidate("sets"); return (r as any).id;
}
export async function deleteSet(id: string) { ok(await supabase.from("set_lists").delete().eq("id", id)); invalidate("sets"); }

/* ---------------------------------------------------------------- notifications */
export type Note = { id: string; kind: string; payload: { title?: string; body?: string; route?: string }; created_at: string; read_at: string | null; user_id: string | null };
export async function listNotes(): Promise<Note[]> {
  return ok(await supabase.from("notifications").select("id, kind, payload, created_at, read_at, user_id").order("created_at", { ascending: false }).limit(100)) as Note[];
}
export async function markNotesRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  invalidate("notes");
}
