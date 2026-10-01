// Supabase Edge Function: "push"
// Called by the database (pg_net trigger on public.notifications) for every new notification.
// Sends it through Expo's push service to the member's phones (or to everyone for broadcasts),
// then marks the notification as sent and forgets tokens for uninstalled apps.
// Setup: README → "Push notifications". Optional secret: EXPO_ACCESS_TOKEN (if push security is enabled in Expo).
import { admin, cors, json } from "../_shared/http.ts";

const EXPO_URL = Deno.env.get("EXPO_PUSH_URL") ?? "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { notification_id } = await req.json();
    if (!notification_id) return json({ error: "notification_id required" }, 400);
    const db = admin();
    const { data: n } = await db.from("notifications").select("*").eq("id", notification_id).maybeSingle();
    if (!n) return json({ error: "not found" }, 404);
    if (n.sent_at) return json({ sent: 0, already: true });

    // who receives it: one member, or everyone who hasn't switched notifications off
    let q = db.from("push_tokens").select("token, user_id, profiles!inner(settings)");
    if (n.user_id) q = q.eq("user_id", n.user_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    const tokens = (rows ?? []).filter((r: any) => r.profiles?.settings?.notifications !== false).map((r: any) => r.token as string);

    const messages = tokens.map((to) => ({
      to, sound: "default", title: n.title ?? "Agape", body: n.body ?? "",
      data: { route: n.route ?? "/", kind: n.kind, id: n.id, ...(n.payload ?? {}) },
      channelId: "default",
    }));
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const token = Deno.env.get("EXPO_ACCESS_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;

    const dead: string[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const r = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(batch) });
      const out = await r.json().catch(() => ({}));
      (out?.data ?? []).forEach((t: any, k: number) => {
        if (t?.status === "error" && t?.details?.error === "DeviceNotRegistered") dead.push(batch[k].to);
      });
    }
    if (dead.length) await db.from("push_tokens").delete().in("token", dead);
    await db.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
    return json({ sent: messages.length, removed: dead.length });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
