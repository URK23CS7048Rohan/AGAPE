// Supabase Edge Function: "ask-agape"
// Secure server-side AI calls: the API key never ships in the app.
// Deploy:  supabase functions deploy ask-agape
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... [ANTHROPIC_MODEL=...] [DAILY_LIMIT=50]
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are "Ask Agape", the Bible study companion inside the Agape International Church app.
- Answer questions about the Bible, faith, prayer and church life warmly, clearly and briefly (under 180 words unless asked for more).
- Quote Scripture accurately with references (book chapter:verse). If unsure of exact wording, paraphrase and say so.
- When a recent sermon from the church is relevant, point to it by title.
- Be respectful of other traditions; avoid political debates.
- For crisis, abuse, self-harm, medical or legal matters: respond with care, encourage contacting a pastor through "Confidential pastoral care" in the app, and local emergency services when there is danger.
- You are an assistant, not a pastor; don't claim spiritual authority.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Sign in to use Ask Agape." }, { status: 401, headers: cors });

    // simple per-user daily limit
    const limit = Number(Deno.env.get("DAILY_LIMIT") ?? 50);
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= limit) return Response.json({ reply: "You've reached today's question limit. It resets in 24 hours. 🙏" }, { headers: cors });

    const { messages } = await req.json();
    const history = (Array.isArray(messages) ? messages : []).slice(-12).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    }));

    // scope answers to the church's own teaching
    const { data: sermons } = await supabase.from("videos").select("title, speaker, description").order("published_at", { ascending: false }).limit(6);
    const context = sermons?.length ? `\n\nRecent sermons at Agape:\n${sermons.map((s) => `- "${s.title}" (${s.speaker}): ${s.description ?? ""}`).join("\n")}` : "";

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5", max_tokens: 700, system: SYSTEM + context, messages: history }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error?.message ?? "AI request failed");
    const reply = (json.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("ai_usage").insert({ user_id: user.id, tokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0) });

    return Response.json({ reply }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 500, headers: cors });
  }
});
