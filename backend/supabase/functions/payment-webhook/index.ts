// Supabase Edge Function: "payment-webhook"
// Tap Payments posts here when a charge changes. We never trust the posted body: the charge is
// fetched again from Tap with our secret key, and only then is the donation marked succeeded/failed.
// The database trigger `apply_donation` then adds it to the campaign total, and the donor is thanked.
// Also answers GET ?donation=<id> so the website/app can show the result after the redirect.
import { admin, cors, json } from "../_shared/http.ts";

const TAP = "https://api.tap.company/v2";
const map = (s: string) => (s === "CAPTURED" ? "succeeded" : ["FAILED", "DECLINED", "CANCELLED", "RESTRICTED", "VOID", "TIMEDOUT", "ABANDONED"].includes(s) ? "failed" : "pending");

async function settle(donationId: string, status: string, ref?: string) {
  const db = admin();
  const { data: d } = await db.from("donations").select("*").eq("id", donationId).maybeSingle();
  if (!d) return null;
  if (d.status === "succeeded") return d;  // idempotent
  const { data: upd } = await db.from("donations")
    .update({ status, provider_ref: ref ?? d.provider_ref, paid_at: status === "succeeded" ? new Date().toISOString() : null })
    .eq("id", donationId).select().single();
  if (status === "succeeded" && d.user_id) {
    await db.from("notifications").insert({
      user_id: d.user_id, kind: "giving", title: "Thank you for your gift 💛",
      body: `${d.currency} ${Number(d.amount).toFixed(3)} to ${d.campaign_title ?? d.fund} was received.`, route: "/give",
    });
  }
  return upd;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = admin();
    if (req.method === "GET") {
      const id = new URL(req.url).searchParams.get("donation");
      if (!id) return json({ error: "donation required" }, 400);
      let { data: d } = await db.from("donations").select("id, status, amount, currency, fund, campaign_title, provider, provider_ref").eq("id", id).maybeSingle();
      if (!d) return json({ error: "not found" }, 404);
      // the redirect can beat the webhook: check Tap directly while it's still pending
      const key = Deno.env.get("TAP_SECRET_KEY");
      if (d.status === "pending" && d.provider === "tap" && d.provider_ref && key) {
        const c = await (await fetch(`${TAP}/charges/${d.provider_ref}`, { headers: { Authorization: `Bearer ${key}` } })).json();
        if (c?.status) d = { ...d, ...(await settle(d.id, map(c.status), c.id)) };
      }
      return json({ id: d.id, status: d.status, amount: d.amount, currency: d.currency, fund: d.fund, campaign: d.campaign_title });
    }

    const body = await req.json().catch(() => ({}));
    if (Deno.env.get("PAYMENTS_TEST_MODE") === "1" && body?.test_donation_id) {
      const d = await settle(body.test_donation_id, body.status === "failed" ? "failed" : "succeeded", "test");
      return json({ ok: !!d, status: d?.status });
    }
    const chargeId = body?.id;
    if (!chargeId || !String(chargeId).startsWith("chg_")) return json({ error: "unexpected payload" }, 400);
    const key = Deno.env.get("TAP_SECRET_KEY");
    if (!key) return json({ error: "not configured" }, 503);
    const c = await (await fetch(`${TAP}/charges/${chargeId}`, { headers: { Authorization: `Bearer ${key}` } })).json();
    const donationId = c?.metadata?.donation_id ?? c?.reference?.transaction;
    if (!donationId) return json({ error: "unknown charge" }, 404);
    const d = await settle(donationId, map(c.status), c.id);
    return json({ ok: !!d, status: d?.status });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
