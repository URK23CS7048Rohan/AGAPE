/**
 * Actions (writes) used by the screens. Table + function names match /backend/supabase/migrations.
 * Every function works in demo mode too (no backend): it just resolves without saving.
 */
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase, callFunction } from "./supabase";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const CANNED: Record<string, string> = {
  romans: "Romans 8:28 says God works in all things for the good of those who love Him. It doesn't promise that everything will feel good. It promises that nothing is wasted, and that even the hard chapters can become part of His purpose for you.\n\nPs. John unpacked this in “Unshakeable · Pt 3”. Want me to open it?",
  anxiety: "Here's a two-minute devotional.\n\nRead: Philippians 4:6–7.\nReflect: What are you carrying today that you haven't named to God?\nPray: “Lord, I hand you ___. Guard my heart and mind with your peace.”",
  still: "That's Psalm 46:10: “Be still, and know that I am God.” It was written to a nation surrounded by chaos. Stillness there doesn't mean doing nothing. It means trusting God in the middle of everything.",
  sermon: "The Power of Grace (Ps. John Mathew):\n1. Grace finds us before we clean up (Rom 5:8).\n2. Grace is a teacher, not a loophole (Titus 2:11–12).\n3. Grace we receive becomes grace we give.\n\nI can send these notes to your Notes tab.",
};

const fail = (error: any) => { if (error) throw new Error(error.message || String(error)); };

/** Ask the AI assistant. Calls the `ask-agape` Edge Function (server keeps the API key). */
export async function askAgape(history: ChatMsg[]): Promise<string> {
  if (supabase) {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return "Sign in to ask Agape anything. It's free, and your questions stay private.";
    const { data, error } = await supabase.functions.invoke("ask-agape", { body: { messages: history } });
    if (!error && data?.reply) return data.reply as string;
    if (!error && data?.error) return data.error;
  }
  const q = history[history.length - 1]?.content.toLowerCase() ?? "";
  await new Promise((r) => setTimeout(r, 700));
  if (q.includes("romans") || q.includes("8:28")) return CANNED.romans;
  if (q.includes("anx") || q.includes("devotional") || q.includes("worry")) return CANNED.anxiety;
  if (q.includes("still")) return CANNED.still;
  if (q.includes("sermon") || q.includes("sunday")) return CANNED.sermon;
  return supabase
    ? "Ask Agape isn't switched on yet. The church team can enable it in a few minutes (README → AI assistant). Meanwhile, try the prayer wall or a course."
    : "Great question. In the live app I answer from Scripture and from Agape International Ministries' own teaching. Meanwhile, try asking about Romans 8:28, anxiety, or Sunday's sermon.";
}

// ---------------------------------------------------------------- prayer
export async function postPrayer(body: string, anonymous: boolean) {
  if (!supabase) return;
  fail((await supabase.from("prayer_requests").insert({ body, anonymous })).error);
}
export async function prayFor(id: string) {
  if (!supabase) return;
  fail((await supabase.rpc("pray_for", { request_id: id })).error);
}
export async function markAnswered(id: string, answered: boolean) {
  if (!supabase) return;
  fail((await supabase.from("prayer_requests").update({ answered }).eq("id", id)).error);
}
export async function requestCare(kind: string, details: string, phone?: string) {
  if (!supabase) return;
  fail((await supabase.from("care_requests").insert({ kind, details, phone: phone || null })).error);
}

// ---------------------------------------------------------------- sermons
export async function countView(videoId: string) {
  if (supabase && /^[0-9a-f-]{36}$/.test(videoId)) await supabase.rpc("view_video", { video_id: videoId });
}

// ---------------------------------------------------------------- community
export async function joinGroup(key: string, name: string, color?: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("join_group", { group_key: key, group_name: name, group_color: color ?? null });
  fail(error);
  return data as string;
}
export async function leaveConversation(id: string) {
  if (!supabase) return;
  fail((await supabase.rpc("leave_conversation", { conv: id })).error);
}
export async function startDirect(otherUserId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("start_direct", { other: otherUserId });
  fail(error);
  return data as string;
}
export async function sendMessage(conversationId: string, body: string) {
  if (!supabase) return;
  fail((await supabase.from("messages").insert({ conversation_id: conversationId, body })).error);
}
export async function markRead(conversationId: string) {
  if (supabase) await supabase.rpc("mark_read", { conv: conversationId });
}
export async function markNotificationsSeen() {
  if (supabase) await supabase.rpc("mark_notifications_seen");
}

// ---------------------------------------------------------------- rides
export async function requestRide(input: { pickup: string; lat: number; lng: number; time: string; seats: number; notes?: string }) {
  if (!supabase) return { id: "demo-ride" };
  const { data, error } = await supabase.from("rides").insert({ pickup_label: input.pickup, pickup_lat: input.lat, pickup_lng: input.lng, requested_for: input.time, seats: input.seats, notes: input.notes || null }).select("id").single();
  fail(error);
  return data;
}
export async function acceptRide(id: string) {
  if (!supabase) return;
  fail((await supabase.rpc("accept_ride", { ride_id: id })).error);
}
export async function setRideStatus(id: string, status: "enroute" | "arrived" | "completed" | "cancelled") {
  if (!supabase) return;
  fail((await supabase.rpc("set_ride_status", { ride_id: id, new_status: status })).error);
}
export async function pushRideLocation(rideId: string, lat: number, lng: number, heading?: number) {
  if (supabase) await supabase.from("ride_locations").insert({ ride_id: rideId, lat, lng, heading });
}
export async function applyToVolunteer(teams: string[], vehicle: string, note: string) {
  if (!supabase) return;
  fail((await supabase.from("volunteer_applications").insert({ teams, vehicle: vehicle || null, note: note || null })).error);
}

// ---------------------------------------------------------------- giving
export type GiftResult = { status: "succeeded" | "failed" | "pending" | "cancelled" | "demo"; amount?: number; message?: string };
/**
 * Opens the secure payment page (Tap: KNET, cards, Apple Pay) and waits for the result.
 * The donation is only marked paid by the payment-webhook function after Tap confirms it.
 */
export async function giveOnline(input: { amount: number; currency: string; fund: string; campaignKey?: string; campaignTitle?: string; frequency: "once" | "monthly" }): Promise<GiftResult> {
  if (!supabase) { await new Promise((r) => setTimeout(r, 600)); return { status: "demo" }; }
  const returnUrl = Platform.OS === "web" ? `${window.location.origin}/give` : Linking.createURL("give-complete");
  const out = await callFunction("create-checkout", {
    body: { amount: input.amount, currency: input.currency, fund: input.fund, campaign_key: input.campaignKey, campaign_title: input.campaignTitle, frequency: input.frequency, return_url: returnUrl },
  });
  if (Platform.OS === "web") { window.location.href = out.url; return { status: "pending" }; }
  const res = await WebBrowser.openAuthSessionAsync(out.url, returnUrl);
  // check the result with the server (the webhook may still be on its way)
  for (let i = 0; i < 8; i++) {
    const st = await callFunction("payment-webhook", { query: { donation: out.donation_id } }).catch(() => null);
    if (st?.status === "succeeded" || st?.status === "failed") return { status: st.status, amount: st.amount };
    if (res.type !== "success" && i >= 1) return { status: "cancelled" };
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { status: "pending" };
}
