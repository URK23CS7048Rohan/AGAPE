// Supabase Edge Function: "create-checkout"
// Starts a gift: records a pending donation, creates a hosted payment page with Tap Payments
// (KNET, Visa/Mastercard, Apple Pay) and returns its URL. The payment-webhook function marks it paid.
// Secrets: TAP_SECRET_KEY (sk_live_… or sk_test_…), optional TAP_SOURCE (default "src_all", or "src_kw.knet").
// For automated tests only: PAYMENTS_TEST_MODE=1 skips Tap and returns a local confirmation URL.
import { admin, cors, json, userFrom } from "../_shared/http.ts";

const TAP = "https://api.tap.company/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const b = await req.json();
    const amount = Math.round(Number(b.amount) * 1000) / 1000;
    if (!isFinite(amount) || amount < 1 || amount > 10000) return json({ error: "Please choose an amount between 1 and 10,000." }, 400);
    const currency = String(b.currency || "KWD").toUpperCase().slice(0, 3);
    const fund = String(b.fund || "Tithe").slice(0, 60);
    const returnUrl = String(b.return_url || "");
    if (!/^(https?:\/\/|agape:\/\/|exp:\/\/)/.test(returnUrl)) return json({ error: "return_url required" }, 400);

    const user = await userFrom(req);
    const db = admin();
    let name = String(b.name || "").slice(0, 80), email = String(b.email || "").slice(0, 120);
    if (user) {
      const { data: p } = await db.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
      name = name || p?.full_name || ""; email = email || p?.email || user.email || "";
    }

    const { data: d, error } = await db.from("donations").insert({
      user_id: user?.id ?? null, fund, amount, currency, frequency: b.frequency === "monthly" ? "monthly" : "once",
      campaign_key: b.campaign_key ? String(b.campaign_key).slice(0, 120) : null,
      campaign_title: b.campaign_title ? String(b.campaign_title).slice(0, 120) : null,
      donor_name: name || null, donor_email: email || null, status: "pending",
    }).select().single();
    if (error) throw error;

    // add ?donation=<id> before any #fragment
    const [base, frag] = returnUrl.split("#");
    const back = `${base}${base.includes("?") ? "&" : "?"}donation=${d.id}${frag !== undefined ? `#${frag}` : ""}`;

    if (Deno.env.get("PAYMENTS_TEST_MODE") === "1") {
      await db.from("donations").update({ provider: "test", checkout_url: back }).eq("id", d.id);
      return json({ donation_id: d.id, url: back, provider: "test" });
    }

    const key = Deno.env.get("TAP_SECRET_KEY");
    if (!key) return json({ error: "Online giving isn't switched on yet. Please give at church or by bank transfer for now.", donation_id: d.id }, 503);

    const [first, ...rest] = (name || "Friend of Agape").split(" ");
    const webhook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;
    const r = await fetch(`${TAP}/charges`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount, currency, threeDSecure: true, save_card: false,
        description: `${fund}${d.campaign_title ? ` · ${d.campaign_title}` : ""} · Agape International Ministries`,
        customer: { first_name: first, last_name: rest.join(" ") || undefined, email: email || undefined },
        source: { id: Deno.env.get("TAP_SOURCE") ?? "src_all" },
        reference: { transaction: d.id, order: d.id },
        metadata: { donation_id: d.id },
        post: { url: webhook },
        redirect: { url: back },
      }),
    });
    const charge = await r.json();
    if (!r.ok || !charge?.transaction?.url) {
      await db.from("donations").update({ status: "failed" }).eq("id", d.id);
      return json({ error: charge?.errors?.[0]?.description ?? "Couldn't start the payment. Please try again." }, 502);
    }
    await db.from("donations").update({ provider: "tap", provider_ref: charge.id, checkout_url: charge.transaction.url }).eq("id", d.id);
    return json({ donation_id: d.id, url: charge.transaction.url, provider: "tap" });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
