/**
 * Data access. Uses Supabase when configured, otherwise demo data.
 * Table + function names match /backend/supabase/schema.sql and /backend/supabase/functions.
 */
import { supabase } from "./supabase";
import { PRAYERS, Prayer } from "@/data/mock";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const CANNED: Record<string, string> = {
  romans: "Romans 8:28 says God works in all things for the good of those who love Him. It doesn't promise that everything will feel good. It promises that nothing is wasted, and that even the hard chapters can become part of His purpose for you.\n\nPs. John unpacked this in “Unshakeable · Pt 3”. Want me to open it?",
  anxiety: "Here's a two-minute devotional.\n\nRead: Philippians 4:6–7.\nReflect: What are you carrying today that you haven't named to God?\nPray: “Lord, I hand you ___. Guard my heart and mind with your peace.”",
  still: "That's Psalm 46:10: “Be still, and know that I am God.” It was written to a nation surrounded by chaos. Stillness there doesn't mean doing nothing. It means trusting God in the middle of everything.",
  sermon: "The Power of Grace (Ps. John Mathew):\n1. Grace finds us before we clean up (Rom 5:8).\n2. Grace is a teacher, not a loophole (Titus 2:11–12).\n3. Grace we receive becomes grace we give.\n\nI can send these notes to your Notes tab.",
};

/** Ask the AI assistant. Calls the `ask-agape` Edge Function (server keeps the API key). */
export async function askAgape(history: ChatMsg[]): Promise<string> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke("ask-agape", { body: { messages: history } });
    if (!error && data?.reply) return data.reply as string;
  }
  const q = history[history.length - 1]?.content.toLowerCase() ?? "";
  await new Promise((r) => setTimeout(r, 700));
  if (q.includes("romans") || q.includes("8:28")) return CANNED.romans;
  if (q.includes("anx") || q.includes("devotional") || q.includes("worry")) return CANNED.anxiety;
  if (q.includes("still")) return CANNED.still;
  if (q.includes("sermon") || q.includes("sunday")) return CANNED.sermon;
  return "Great question. In the live app I answer from Scripture and from Agape International Ministries' own teaching. Connect the backend (see README) to enable full answers. Meanwhile, try asking about Romans 8:28, anxiety, or Sunday's sermon.";
}

export async function fetchPrayers(): Promise<Prayer[]> {
  if (supabase) {
    const { data } = await supabase.from("prayer_wall").select("id, body, anonymous, pray_count, answered, author_name").order("created_at", { ascending: false }).limit(50);
    if (data) return data.map((p: any, i: number) => ({ id: p.id, who: p.anonymous ? "Anonymous" : p.author_name ?? "Member", text: p.body, count: p.pray_count, answered: p.answered, anonymous: p.anonymous, color: ["#FF3D7F", "#6E4BFF", "#2ED3A0", "#FFC23D", "#FF5A1F"][i % 5] }));
  }
  return PRAYERS;
}

export async function postPrayer(body: string, anonymous: boolean) {
  if (supabase) await supabase.from("prayer_requests").insert({ body, anonymous });
}

export async function prayFor(id: string) {
  if (supabase) await supabase.rpc("pray_for", { request_id: id });
}

export async function saveNote(sermonId: string, body: string) {
  if (supabase) await supabase.from("sermon_notes").upsert({ video_id: sermonId, body }, { onConflict: "user_id,video_id" });
}

export async function completeLesson(lessonId: string) {
  if (supabase) await supabase.from("lesson_progress").upsert({ lesson_id: lessonId, completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
}

export async function submitScore(game: "verse_match" | "trivia", points: number) {
  if (supabase) await supabase.from("game_scores").insert({ game, points });
}

export async function requestRide(input: { pickup: string; lat: number; lng: number; time: string; seats: number; notes?: string }) {
  if (supabase) {
    const { data } = await supabase.from("rides").insert({ pickup_label: input.pickup, pickup_lat: input.lat, pickup_lng: input.lng, requested_for: input.time, seats: input.seats, notes: input.notes }).select().single();
    return data;
  }
  return { id: "demo-ride" };
}

/** Live location feed for a ride (volunteer → member). Returns an unsubscribe fn. */
export function subscribeRideLocation(rideId: string, onPoint: (lat: number, lng: number) => void) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`ride:${rideId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "ride_locations", filter: `ride_id=eq.${rideId}` }, (p: any) => onPoint(p.new.lat, p.new.lng))
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}

export async function pushRideLocation(rideId: string, lat: number, lng: number, heading?: number) {
  if (supabase) await supabase.from("ride_locations").insert({ ride_id: rideId, lat, lng, heading });
}

export async function rsvp(eventId: string, going: boolean) {
  if (!supabase) return;
  if (going) await supabase.from("event_rsvps").upsert({ event_id: eventId }, { onConflict: "event_id,user_id" });
  else await supabase.from("event_rsvps").delete().eq("event_id", eventId);
}
