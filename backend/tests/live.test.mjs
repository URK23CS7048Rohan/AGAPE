// End-to-end tests against a real local Supabase stack (`supabase start`).
// Every flow the website, app and admin rely on is exercised with real accounts and RLS.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.API_URL || "http://127.0.0.1:54321";
const ANON = process.env.ANON_KEY;
const SERVICE = process.env.SERVICE_ROLE_KEY;
const MAIL = process.env.MAIL_URL || "http://127.0.0.1:54324";
const FUNCTIONS = process.env.FUNCTIONS === "1";
const PUSH_LOG = process.env.PUSH_LOG || "/tmp/pushes.jsonl";
assert.ok(ANON && SERVICE, "ANON_KEY and SERVICE_ROLE_KEY must be set");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(URL_, ANON, opts);
const admin = createClient(URL_, SERVICE, opts);
const PW = "Agape-test-2026!";
const stamp = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 10000, label = "condition") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(250); }
  throw new Error(`timed out waiting for ${label}`);
}
const ok = (r, label = "") => { assert.equal(r.error, null, `${label}: ${r.error?.message}`); return r.data; };

async function member(key, name, role) {
  const email = `${key}-${stamp}@agape.test`;
  const r = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: { full_name: name } });
  ok(r, "createUser");
  if (role) ok(await admin.from("profiles").update({ role }).eq("id", r.data.user.id), "set role");
  const c = createClient(URL_, ANON, opts);
  ok(await c.auth.signInWithPassword({ email, password: PW }), "sign in");
  return { c, id: r.data.user.id, email };
}
function channel(c, name, table, filter, onRow) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(`realtime subscribe timed out (${name})`)), 15000);
    const ch = c.channel(name).on("postgres_changes", { event: "INSERT", schema: "public", table, ...(filter ? { filter } : {}) }, (p) => onRow(p.new));
    ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(ch); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(new Error(`realtime ${s}`)); });
  });
}

let ann, bob, sam, eve;   // member, volunteer driver, staff, second member
// close realtime sockets so the test process can exit
after(async () => {
  for (const u of [ann, bob, sam, eve]) {
    if (!u) continue;
    await u.c.removeAllChannels().catch(() => {});
    u.c.realtime.disconnect();
  }
});

test("accounts: sign-up creates a profile, member number and family chat", async () => {
  ann = await member("ann", "Ann Mathews");
  bob = await member("bob", "Bob Kumar", "volunteer");
  sam = await member("sam", "Sam Pastor", "staff");
  eve = await member("eve", "Eve Thomas");
  const p = ok(await ann.c.from("profiles").select("full_name, member_no, role, email").eq("id", ann.id).single());
  assert.equal(p.full_name, "Ann Mathews");
  assert.match(p.member_no, /^AGP-\d{2}-\d{4}$/);
  assert.equal(p.role, "member");
  const inbox = ok(await ann.c.rpc("my_conversations"));
  assert.ok(inbox.some((c) => c.topic_key === "family"), "joined Agape Family chat");
});

test("accounts: members can rename themselves but not promote themselves", async () => {
  ok(await ann.c.from("profiles").update({ full_name: "Ann M. Mathews", role: "admin", settings: { notifications: true } }).eq("id", ann.id));
  const p = ok(await ann.c.from("profiles").select("full_name, role").eq("id", ann.id).single());
  assert.equal(p.full_name, "Ann M. Mathews");
  assert.equal(p.role, "member");
});

test("auth: e-mail one-time code sign-in works end to end", async () => {
  const email = `otp-${stamp}@agape.test`;
  const c = createClient(URL_, ANON, opts);
  ok(await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }), "send code");
  const code = await waitFor(async () => {
    // Mailpit (current CLI) …
    try {
      const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json();
      const m = list?.messages?.[0];
      if (m) {
        const full = await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json();
        return (full.Text || full.HTML || "").match(/\b(\d{6})\b/)?.[1];
      }
    } catch {}
    // … or Inbucket (older CLI)
    try {
      const box = email.split("@")[0];
      const list = await (await fetch(`${MAIL}/api/v1/mailbox/${box}`)).json();
      if (Array.isArray(list) && list.length) {
        const full = await (await fetch(`${MAIL}/api/v1/mailbox/${box}/${list[list.length - 1].id}`)).json();
        return (full.body?.text || full.body?.html || "").match(/\b(\d{6})\b/)?.[1];
      }
    } catch {}
    return null;
  }, 20000, "sign-in e-mail");
  const s = ok(await c.auth.verifyOtp({ email, token: code, type: "email" }), "verify code");
  assert.ok(s.session?.access_token);
  const p = ok(await c.from("profiles").select("member_no, full_name").eq("id", s.user.id).single());
  assert.ok(p.member_no);
  assert.equal(p.full_name, null, "new members are asked for their name");
});

test("content: visitors read sermons, courses and games; can't edit them", async () => {
  const v = ok(await anon.from("videos").select("id, slug, title, series:series(slug, title)").order("published_at", { ascending: false }));
  assert.ok(v.length >= 5);
  assert.ok(v[0].series?.slug);
  const c = ok(await anon.from("courses").select("slug, modules(lessons(id, kind, quiz))").eq("slug", "foundations").single());
  assert.equal(c.modules[0].lessons.length, 6);
  const q = ok(await anon.from("question_packs").select("game, questions(prompt, options, answer)").eq("published", true));
  assert.ok(q.find((p) => p.game === "verse_match")?.questions.length >= 5);
  const r = await anon.from("videos").update({ title: "hacked" }).eq("slug", "acts-2").select();
  assert.equal((r.data || []).length, 0);
  const m = await ann.c.from("courses").insert({ title: "Mine" });
  assert.ok(m.error, "members can't create courses");
});

test("admin: staff publish site content; members and visitors can't", async () => {
  const before = (await anon.from("site_content").select("data").eq("key", "site").maybeSingle()).data;
  const data = { ...(before?.data || {}), hero: { line1: "Test hero" }, ministries: [{ name: "Agape Squad" }, { name: "Prayer" }] };
  ok(await sam.c.from("site_content").upsert({ key: "site", data }), "staff upsert");
  const r = await ann.c.from("site_content").upsert({ key: "site", data: { hacked: true } });
  assert.ok(r.error, "member blocked");
  const r2 = await anon.from("site_content").upsert({ key: "site", data: { hacked: true } });
  assert.ok(r2.error, "visitor blocked");
  const now = ok(await anon.from("site_content").select("data").eq("key", "site").single());
  assert.equal(now.data.hero.line1, "Test hero");
});

test("admin: staff upload images to the media bucket; members can't", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  ok(await sam.c.storage.from("media").upload(`test/${stamp}.png`, png, { contentType: "image/png", upsert: true }), "staff upload");
  const pub = sam.c.storage.from("media").getPublicUrl(`test/${stamp}.png`).data.publicUrl;
  assert.equal((await fetch(pub)).status, 200);
  const r = await ann.c.storage.from("media").upload(`test/${stamp}-m.png`, png, { contentType: "image/png" });
  assert.ok(r.error, "member upload blocked");
});

let guestPrayerId, annPrayerId;
test("prayer: website visitors post requests that wait for review", async () => {
  ok(await anon.from("prayer_requests").insert({ body: `Guest request ${stamp}`, guest_name: "Grace Visitor", pray_count: 500, hidden: false }), "guest insert");
  const wall = ok(await anon.from("prayer_wall").select("id, body"));
  assert.ok(!wall.some((p) => p.body.includes(`Guest request ${stamp}`)), "held for review");
  const pending = ok(await sam.c.from("prayer_requests").select("id, pray_count, hidden, source").eq("body", `Guest request ${stamp}`).single());
  assert.equal(pending.hidden, true); assert.equal(pending.pray_count, 0); assert.equal(pending.source, "web");
  guestPrayerId = pending.id;
  ok(await sam.c.from("prayer_requests").select("id, guest_name, profiles!prayer_requests_user_id_fkey(full_name)").limit(5), "admin moderation query");
  ok(await sam.c.from("prayer_requests").update({ hidden: false }).eq("id", guestPrayerId), "staff approves");
  const w2 = ok(await anon.from("prayer_wall").select("id, author_name").eq("id", guestPrayerId).single());
  assert.equal(w2.author_name, "Grace V.");
});

test("prayer: members post instantly, pray once, and the requester is told", async () => {
  ok(await ann.c.from("prayer_requests").insert({ body: `Ann request ${stamp}`, anonymous: false }));
  const mine = ok(await ann.c.from("prayer_wall").select("id, mine, author_name, pray_count").eq("body", `Ann request ${stamp}`).single());
  assert.equal(mine.mine, true); assert.equal(mine.author_name, "Ann M."); annPrayerId = mine.id;
  assert.equal(ok(await bob.c.rpc("pray_for", { request_id: annPrayerId })), 1);
  assert.equal(ok(await bob.c.rpc("pray_for", { request_id: annPrayerId })), 1, "counted once per member");
  assert.equal(ok(await anon.rpc("pray_anon", { request_id: annPrayerId })), 2, "visitor prays from the website");
  const seen = ok(await bob.c.from("prayer_wall").select("prayed").eq("id", annPrayerId).single());
  assert.equal(seen.prayed, true);
  ok(await bob.c.from("prayer_requests").update({ pray_count: 9999 }).eq("id", annPrayerId));
  ok(await ann.c.from("prayer_requests").update({ pray_count: 9999, answered: true }).eq("id", annPrayerId));
  const after = ok(await anon.from("prayer_wall").select("pray_count, answered").eq("id", annPrayerId).single());
  assert.equal(after.pray_count, 2, "counts can't be forged"); assert.equal(after.answered, true);
  const n = ok(await ann.c.from("notifications").select("kind, title").eq("kind", "prayed"));
  assert.ok(n.length >= 1);
  const r = await anon.rpc("pray_for", { request_id: annPrayerId });
  assert.ok(r.error, "pray_for needs an account");
});

test("rides: request → volunteer accepts → live location → status updates", async () => {
  const ride = ok(await ann.c.from("rides").insert({ pickup_label: "Salmiya Block 10", pickup_lat: 29.3232, pickup_lng: 48.0612, requested_for: "Sun 9:15 AM", seats: 2 }).select().single());
  const forged = await ann.c.from("rides").insert({ pickup_label: "x", pickup_lat: 1, pickup_lng: 1, requested_for: "x", status: "completed" });
  assert.ok(forged.error, "can't insert a completed ride");
  const evesView = ok(await eve.c.from("rides").select("id").eq("id", ride.id));
  assert.equal(evesView.length, 0, "other members can't see it");
  const open = ok(await bob.c.from("rides").select("id, pickup_label, member:profiles!rides_member_id_fkey(full_name)").eq("status", "requested"));
  const mineOpen = open.find((r) => r.id === ride.id);
  assert.ok(mineOpen); assert.equal(mineOpen.member.full_name, "Ann M. Mathews");
  const bobNote = ok(await bob.c.from("notifications").select("kind").eq("kind", "ride_request"));
  assert.ok(bobNote.length >= 1, "volunteers are told about new requests");
  assert.ok((await eve.c.rpc("accept_ride", { ride_id: ride.id })).error, "members can't accept");
  const acc = ok(await bob.c.rpc("accept_ride", { ride_id: ride.id }));
  assert.equal(acc.status, "accepted"); assert.equal(acc.volunteer_id, bob.id);
  assert.ok((await sam.c.rpc("accept_ride", { ride_id: ride.id })).error, "can't be taken twice");

  const points = [];
  const ch = await channel(ann.c, `ride-${stamp}`, "ride_locations", `ride_id=eq.${ride.id}`, (row) => points.push(row));
  // the first realtime subscriber on a fresh stack warms up change capture, so keep sending until one arrives
  await waitFor(async () => {
    ok(await bob.c.from("ride_locations").insert({ ride_id: ride.id, lat: 29.3261, lng: 48.0618, heading: 12 }));
    await sleep(700);
    return points.length >= 1;
  }, 30000, "first live location over realtime");
  ok(await bob.c.from("ride_locations").insert({ ride_id: ride.id, lat: 29.3268, lng: 48.0662, heading: 40 }));
  await waitFor(() => points.some((p) => p.lng === 48.0662), 10000, "next live location over realtime");
  await ann.c.removeChannel(ch);
  assert.ok((await eve.c.from("ride_locations").insert({ ride_id: ride.id, lat: 1, lng: 1 })).error, "only the driver posts");

  assert.equal(ok(await bob.c.rpc("set_ride_status", { ride_id: ride.id, new_status: "enroute" })).status, "enroute");
  assert.equal(ok(await bob.c.rpc("set_ride_status", { ride_id: ride.id, new_status: "arrived" })).status, "arrived");
  assert.ok((await ann.c.rpc("set_ride_status", { ride_id: ride.id, new_status: "completed" })).error, "member can't complete");
  assert.equal(ok(await bob.c.rpc("set_ride_status", { ride_id: ride.id, new_status: "completed" })).status, "completed");
  const titles = ok(await ann.c.from("notifications").select("title").eq("kind", "ride")).map((n) => n.title);
  assert.ok(titles.some((t) => t.includes("is driving you")));
  assert.ok(titles.some((t) => t.includes("has arrived")));

  // driver hands a ride back; member cancels another
  const r2 = ok(await ann.c.from("rides").insert({ pickup_label: "Hawally", pickup_lat: 29.34, pickup_lng: 48.03, requested_for: "Sun 6 PM" }).select().single());
  ok(await bob.c.rpc("accept_ride", { ride_id: r2.id }));
  const back = ok(await bob.c.rpc("set_ride_status", { ride_id: r2.id, new_status: "cancelled" }));
  assert.equal(back.status, "requested"); assert.equal(back.volunteer_id, null);
  assert.equal(ok(await ann.c.rpc("set_ride_status", { ride_id: r2.id, new_status: "cancelled" })).status, "cancelled");
});

test("community: join a group, chat in realtime, unread counts, DMs", async () => {
  const gid = ok(await ann.c.rpc("join_group", { group_key: "Agape Squad", group_name: "Agape Squad", group_color: "#FF3D7F" }));
  assert.ok((await ann.c.rpc("join_group", { group_key: "Not a real group", group_name: "x" })).error, "only groups listed in the admin");
  ok(await eve.c.rpc("join_group", { group_key: "agape-squad", group_name: "Renamed?" }));
  const got = [];
  const ch = await channel(eve.c, `msg-${stamp}`, "messages", `conversation_id=eq.${gid}`, (row) => got.push(row));
  await sleep(500);
  ok(await ann.c.from("messages").insert({ conversation_id: gid, body: "Practice at 4, bring your violin! 🎻" }));
  await waitFor(() => got.length >= 1, 10000, "message over realtime");
  await eve.c.removeChannel(ch);
  const inbox = ok(await eve.c.rpc("my_conversations"));
  const squad = inbox.find((c) => c.id === gid);
  assert.equal(squad.name, "Agape Squad"); assert.equal(squad.unread, 1); assert.equal(squad.members, 2);
  assert.equal(squad.last_sender, "Ann M. Mathews");
  ok(await eve.c.rpc("mark_read", { conv: gid }));
  assert.equal(ok(await eve.c.rpc("my_conversations")).find((c) => c.id === gid).unread, 0);
  const msgs = ok(await eve.c.from("messages").select("body, sender:profiles(full_name)").eq("conversation_id", gid));
  assert.equal(msgs[0].sender.full_name, "Ann M. Mathews");
  assert.ok((await bob.c.from("messages").insert({ conversation_id: gid, body: "not a member" })).error, "non-members can't post");
  const outsiders = ok(await bob.c.from("messages").select("id").eq("conversation_id", gid));
  assert.equal(outsiders.length, 0, "non-members can't read");
  const dm = ok(await eve.c.rpc("start_direct", { other: bob.id }));
  assert.equal(ok(await bob.c.rpc("start_direct", { other: eve.id })), dm, "one DM thread per pair");
  ok(await bob.c.from("messages").insert({ conversation_id: dm, body: "I'll pick you up at 9:15 😊" }));
  const n = ok(await eve.c.from("notifications").select("title, body, route").eq("kind", "message").order("created_at", { ascending: false }).limit(1).single());
  assert.equal(n.title, "Bob Kumar"); assert.equal(n.route, `/chat/${dm}`);
  const counts = ok(await anon.rpc("group_member_counts"));
  assert.equal(counts.find((c) => c.topic_key === "group:agape-squad").members, 2);
});

test("announcements: staff post, everyone is notified", async () => {
  ok(await sam.c.from("announcements").insert({ title: `Revival Nights ${stamp}`, body: "Doors open 6:30 PM" }));
  assert.ok((await ann.c.from("announcements").insert({ title: "nope" })).error);
  const n = ok(await ann.c.from("notifications").select("title").is("user_id", null).eq("kind", "announcement"));
  assert.ok(n.some((x) => x.title === `Revival Nights ${stamp}`));
});

test("events, games, courses, notes, saved sermons", async () => {
  ok(await ann.c.from("event_rsvps").insert({ event_key: "church-family-day-06-nov", event_title: "Church Family Day" }));
  ok(await eve.c.from("event_rsvps").insert({ event_key: "church-family-day-06-nov", event_title: "Church Family Day" }));
  const counts = ok(await anon.rpc("rsvp_counts"));
  assert.equal(counts.find((c) => c.event_key === "church-family-day-06-nov").going, 2);
  ok(await ann.c.from("event_rsvps").delete().eq("event_key", "church-family-day-06-nov"));
  assert.equal(ok(await anon.rpc("rsvp_counts")).find((c) => c.event_key === "church-family-day-06-nov").going, 1);
  assert.equal(ok(await sam.c.from("event_rsvps").select("user_id").eq("event_key", "church-family-day-06-nov")).length, 1, "staff see the guest list");

  ok(await ann.c.from("game_scores").insert({ game: "verse_match", points: 120 }));
  ok(await eve.c.from("game_scores").insert({ game: "trivia", points: 80 }));
  assert.ok((await ann.c.from("game_scores").insert({ game: "trivia", points: 50000 })).error, "score capped");
  const lb = ok(await ann.c.from("leaderboard_weekly").select("full_name, points").limit(10));
  assert.equal(lb[0].full_name, "Ann M. Mathews");

  const lesson = ok(await anon.from("lessons").select("id, modules!inner(courses!inner(slug))").eq("modules.courses.slug", "foundations").order("position").limit(1).single());
  ok(await ann.c.from("lesson_progress").upsert({ lesson_id: lesson.id }, { onConflict: "user_id,lesson_id" }));
  ok(await ann.c.from("lesson_progress").upsert({ lesson_id: lesson.id }, { onConflict: "user_id,lesson_id" }));
  assert.equal(ok(await ann.c.from("lesson_progress").select("lesson_id")).length, 1);
  assert.equal(ok(await eve.c.from("lesson_progress").select("lesson_id")).length, 0, "progress is private");

  const video = ok(await anon.from("videos").select("id, views").eq("slug", "unshakeable-3").single());
  ok(await ann.c.from("sermon_notes").upsert({ video_id: video.id, body: "Nothing is wasted." }, { onConflict: "user_id,video_id" }));
  ok(await ann.c.from("sermon_notes").upsert({ video_id: video.id, body: "Nothing is wasted. Rom 8:28" }, { onConflict: "user_id,video_id" }));
  assert.equal(ok(await ann.c.from("sermon_notes").select("body").eq("video_id", video.id).single()).body, "Nothing is wasted. Rom 8:28");
  ok(await ann.c.from("saved_videos").insert({ video_id: video.id }));
  assert.equal(ok(await ann.c.from("saved_videos").select("video_id")).length, 1);
  ok(await anon.rpc("view_video", { video_id: video.id }));
  assert.equal(ok(await anon.from("videos").select("views").eq("id", video.id).single()).views, video.views + 1);
});

test("care, visitor cards, volunteer applications and the staff dashboard", async () => {
  ok(await anon.from("visitor_cards").insert({ name: "Kevin O.", email: "kevin@example.com", party_size: 3, needs_ride: true, visit_date: "Sun 10 AM" }));
  assert.equal(ok(await anon.from("visitor_cards").select("id")).length, 0, "visitors can't read cards");
  assert.equal(ok(await ann.c.from("visitor_cards").select("id")).length, 0, "members can't read cards");
  assert.ok(ok(await sam.c.from("visitor_cards").select("name")).some((c) => c.name === "Kevin O."));

  ok(await ann.c.from("care_requests").insert({ kind: "visit", details: "Hospital visit for my father", phone: "+965 5000 0000" }));
  assert.equal(ok(await eve.c.from("care_requests").select("id")).length, 0, "care requests are confidential");
  const care = ok(await sam.c.from("care_requests").select("id, details"));
  assert.ok(care.some((c) => c.details.includes("Hospital")));

  ok(await eve.c.from("volunteer_applications").insert({ teams: ["driving"], vehicle: "Kia Carnival · Grey", note: "Free on Sundays" }));
  const app = ok(await sam.c.from("volunteer_applications").select("id").eq("user_id", eve.id).single());
  ok(await sam.c.from("volunteer_applications").update({ status: "approved" }).eq("id", app.id));
  const p = ok(await eve.c.from("profiles").select("role, vehicle").eq("id", eve.id).single());
  assert.equal(p.role, "volunteer"); assert.equal(p.vehicle, "Kia Carnival · Grey");

  const s = ok(await sam.c.from("staff_stats").select("*").single());
  assert.ok(s.members >= 4); assert.ok(s.volunteers >= 3); assert.ok(s.visitors_new >= 1); assert.ok(s.care_open >= 1);
  ok(await sam.c.from("profiles").update({ role: "volunteer" }).eq("id", ann.id));
  assert.equal(ok(await ann.c.from("profiles").select("role").eq("id", ann.id).single()).role, "volunteer", "staff can change roles");
  ok(await sam.c.from("profiles").update({ role: "member" }).eq("id", ann.id));
});

test("functions: giving checkout → webhook → campaign total and thank-you", { skip: !FUNCTIONS }, async () => {
  const r = await fetch(`${URL_}/functions/v1/create-checkout`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${(await ann.c.auth.getSession()).data.session.access_token}` },
    body: JSON.stringify({ amount: 25, fund: "Building Fund", campaign_key: "building-fund", campaign_title: "Building Fund", return_url: "agape://give-complete" }),
  });
  const out = await r.json();
  assert.equal(r.status, 200, JSON.stringify(out));
  assert.match(out.url, /^agape:\/\/give-complete\?donation=/);
  assert.equal(ok(await ann.c.from("donations").select("status").eq("id", out.donation_id).single()).status, "pending");
  const bad = await fetch(`${URL_}/functions/v1/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify({ amount: 0.2, return_url: "https://x" }) });
  assert.equal(bad.status, 400);
  const guest = await (await fetch(`${URL_}/functions/v1/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify({ amount: 10, name: "Website Guest", email: "g@example.com", campaign_key: "building-fund", return_url: "http://127.0.0.1:8080/" }) })).json();
  assert.ok(guest.donation_id, JSON.stringify(guest));
  const hashed = await (await fetch(`${URL_}/functions/v1/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON }, body: JSON.stringify({ amount: 5, return_url: "http://127.0.0.1:8080/#give" }) })).json();
  assert.match(hashed.url, /^http:\/\/127\.0\.0\.1:8080\/\?donation=[0-9a-f-]+#give$/, "donation id goes before the #fragment");

  const w = await fetch(`${URL_}/functions/v1/payment-webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test_donation_id: out.donation_id }) });
  assert.equal((await w.json()).status, "succeeded");
  const st = await (await fetch(`${URL_}/functions/v1/payment-webhook?donation=${out.donation_id}`)).json();
  assert.equal(st.status, "succeeded");
  const totals = ok(await anon.rpc("giving_totals"));
  assert.equal(Number(totals.find((t) => t.campaign_key === "building-fund").raised), 25, "only paid gifts count");
  const thanks = ok(await ann.c.from("notifications").select("title").eq("kind", "giving"));
  assert.equal(thanks.length, 1);
  const forged = await fetch(`${URL_}/functions/v1/payment-webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "nope" }) });
  assert.equal(forged.status, 400);
});

test("functions: notifications reach phones through the push function", { skip: !FUNCTIONS }, async () => {
  const token = `ExponentPushToken[test-${stamp}]`;
  ok(await eve.c.from("push_tokens").upsert({ token, platform: "android" }, { onConflict: "user_id,token" }));
  const dm = ok(await bob.c.rpc("start_direct", { other: eve.id }));
  ok(await bob.c.from("messages").insert({ conversation_id: dm, body: `Ping ${stamp}` }));
  await waitFor(() => fs.existsSync(PUSH_LOG) && fs.readFileSync(PUSH_LOG, "utf8").includes(token), 30000, "push delivered to Expo");
  const line = fs.readFileSync(PUSH_LOG, "utf8").split("\n").find((l) => l.includes(token) && l.includes(`Ping ${stamp}`));
  assert.ok(line, "push carries the message");
  const sent = await waitFor(async () => (await admin.from("notifications").select("sent_at").eq("user_id", eve.id).like("body", `%Ping ${stamp}%`).single()).data?.sent_at, 10000, "marked sent");
  assert.ok(sent);
});

test("functions: Ask Agape requires an account", { skip: !FUNCTIONS }, async () => {
  const r = await fetch(`${URL_}/functions/v1/ask-agape`, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }) });
  assert.equal(r.status, 401);
});

test("v2 content: song book, reading plans, Kids/Teens/Squad posts are public; only staff edit", async () => {
  const songs = ok(await anon.from("songs").select("slug, original_key, body").eq("published", true));
  assert.ok(songs.length >= 20, "hymns seeded");
  assert.ok(songs.every((s) => /\{[^}]+\}/.test(s.body) && /\[[A-G]/.test(s.body)), "chord charts with sections");
  const plans = ok(await anon.from("reading_plans").select("slug, audience, days"));
  assert.ok(plans.some((p) => p.audience === "kids") && plans.some((p) => p.audience === "teens"), "plans for kids and teens");
  assert.ok(plans.every((p) => p.days.length && p.days.every((d) => d.refs.length)), "every day has readings");
  const posts = ok(await anon.from("ministry_posts").select("ministry"));
  assert.deepEqual([...new Set(posts.map((p) => p.ministry))].sort(), ["kids", "squad", "teens"]);
  const bad = await ann.c.from("songs").insert({ slug: `x-${stamp}`, title: "X", body: "{V}\n[G]x" });
  assert.ok(bad.error, "members can't add songs");
  ok(await sam.c.from("songs").insert({ slug: `staff-song-${stamp}`, title: "Staff song", body: "{Verse}\n[G]Hello" }), "staff add songs");
  const packs = ok(await anon.from("question_packs").select("game, audience").eq("published", true));
  for (const g of ["who_said", "true_false", "emoji"]) assert.ok(packs.some((p) => p.game === g), `pack for ${g}`);
  assert.ok(packs.some((p) => p.audience === "kids"), "kids packs");
});

test("v2 Bible: highlights, reading-plan progress and the journal are private", async () => {
  ok(await ann.c.from("bible_marks").insert([{ kind: "highlight", book: 43, chapter: 3, verse: 16, color: "#FFE07A", translation: "WEB" }, { kind: "bookmark", book: 19, chapter: 23, verse: 1 }]));
  const plan = ok(await ann.c.from("reading_plans").select("id, slug").eq("slug", "gospel-of-john").single());
  ok(await ann.c.from("plan_progress").upsert({ plan_id: plan.id, done: [1, 2], reminder: "07:30" }, { onConflict: "user_id,plan_id" }));
  ok(await ann.c.from("journal_entries").insert({ plan_id: plan.id, day: 1, body: `In the beginning was the Word ${stamp}` }));
  assert.equal(ok(await eve.c.from("bible_marks").select("id").eq("user_id", ann.id)).length, 0, "marks are private");
  assert.equal(ok(await eve.c.from("journal_entries").select("id").like("body", `%${stamp}%`)).length, 0, "journal is private");
  assert.equal(ok(await ann.c.from("journal_entries").select("id").like("body", `%${stamp}%`)).length, 1);
  const counts = ok(await anon.rpc("plan_counts"));
  assert.ok(counts.some((c) => c.plan_id === plan.id && c.readers >= 1), "reader counts");
});

test("v2 testimonies: shared → reviewed → live, Amen once, author told", async () => {
  const t = ok(await ann.c.from("testimonies").insert({ user_id: ann.id, title: `Healed ${stamp}`, body: "God healed my back after the church prayed for me.", category: "healing", approved: true, featured: true }).select().single());
  assert.equal(t.approved, false, "members can't self-approve");
  assert.equal(t.featured, false);
  assert.equal(ok(await eve.c.from("testimony_wall").select("id").eq("id", t.id)).length, 0, "hidden until approved");
  ok(await sam.c.from("testimonies").update({ approved: true }).eq("id", t.id));
  await waitFor(async () => ok(await ann.c.from("notifications").select("id").eq("kind", "testimony").eq("body", `Healed ${stamp}`)).length, 8000, "approval notice");
  const wall = ok(await anon.from("testimony_wall").select("author_name").eq("id", t.id).single());
  assert.equal(wall.author_name, "Ann M.");
  assert.equal(ok(await eve.c.rpc("amen", { t: t.id })), 1);
  assert.equal(ok(await eve.c.rpc("amen", { t: t.id })), 1, "one Amen per person");
  await waitFor(async () => ok(await ann.c.from("notifications").select("id").eq("kind", "testimony").like("title", "1 person%")).length, 8000, "amen notice");
});

test("v2 home prayer meetings: address only after RSVP, capacity, host told, cancel notifies", async () => {
  const when = new Date(Date.now() + 2 * 864e5).toISOString();
  const id = ok(await ann.c.rpc("host_home_meeting", { p_title: `Thursday prayer ${stamp}`, p_kind: "prayer", p_starts_at: when, p_area: "Salmiya, Block 10", p_address: "Building 14, Flat 6", p_lat: 29.33, p_lng: 48.07, p_capacity: 2 }));
  const listed = ok(await eve.c.from("home_meeting_list").select("area, host_name, going, joined").eq("id", id).single());
  assert.equal(listed.area, "Salmiya, Block 10");
  assert.equal(listed.host_name, "Ann M.");
  assert.equal(ok(await eve.c.from("home_meeting_places").select("address").eq("meeting_id", id)).length, 0, "address hidden before RSVP");
  assert.equal((await anon.from("home_meeting_list").select("id").eq("id", id)).data?.length || 0, 0, "visitors don't see home meetings");
  const place = ok(await eve.c.rpc("join_home_meeting", { m: id, p_guests: 0 }));
  assert.equal(place.address, "Building 14, Flat 6");
  assert.equal(ok(await eve.c.from("home_meeting_places").select("address").eq("meeting_id", id)).length, 1, "address after RSVP");
  await waitFor(async () => ok(await ann.c.from("notifications").select("id").eq("kind", "meeting").like("title", "Eve T.%")).length, 8000, "host notified");
  const full = await bob.c.rpc("join_home_meeting", { m: id, p_guests: 2 });
  assert.match(full.error?.message || "", /full/);
  ok(await ann.c.from("home_meetings").update({ cancelled: true }).eq("id", id));
  await waitFor(async () => ok(await eve.c.from("notifications").select("id").eq("kind", "meeting").eq("title", "Meeting cancelled")).length, 8000, "guests told");
});

test("v2 serve board, QR check-in and the new-member checklist", async () => {
  const op = ok(await sam.c.from("serve_opportunities").insert({ team: "ushering", title: `Ushers ${stamp}`, starts_at: new Date(Date.now() + 864e5).toISOString(), slots: 1 }).select().single());
  assert.equal(ok(await ann.c.rpc("serve_sign_up", { o: op.id })), 1);
  const taken = await eve.c.rpc("serve_sign_up", { o: op.id });
  assert.match(taken.error?.message || "", /taken/);
  const board = ok(await ann.c.from("serve_board").select("taken, mine").eq("id", op.id).single());
  assert.deepEqual(board, { taken: 1, mine: true });

  const code = ok(await sam.c.from("checkin_codes").insert({ event_key: "sunday-worship", title: "Sunday worship" }).select().single());
  const first = ok(await ann.c.rpc("check_in_self", { p_code: `AGAPE:CHECKIN:${code.code}` }));
  assert.equal(first.already, false);
  assert.equal(ok(await ann.c.rpc("check_in_self", { p_code: code.code })).already, true);
  assert.ok((await ann.c.rpc("check_in_self", { p_code: "NOPE1234" })).error, "bad code rejected");
  assert.ok((await ann.c.from("checkin_codes").insert({ event_key: "x", title: "x" })).error, "members can't make codes");
  const annNo = ok(await ann.c.from("profiles").select("member_no").eq("id", ann.id).single()).member_no;
  const scanned = ok(await bob.c.rpc("check_in_member", { p_member: `AGAPE:MEMBER:${annNo}`, p_event_key: "youth-night" }));
  assert.equal(scanned.name, "Ann M. Mathews");
  assert.ok((await eve.c.rpc("check_in_member", { p_member: annNo, p_event_key: "x" })).error, "members can't check others in");

  const w = ok(await ann.c.rpc("welcome_progress"));
  assert.equal(w.visit, true); assert.equal(w.plan, true); assert.equal(w.serve, true);
  assert.equal(ok(await eve.c.rpc("welcome_progress")).plan, false);
});

test("v2 push campaigns reach the right audience; daily challenge once a day; per-game boards", async () => {
  ok(await eve.c.from("profiles").update({ settings: { language: "ml" } }).eq("id", eve.id));
  assert.ok((await ann.c.from("push_campaigns").insert({ title: "x", body: "x" })).error, "members can't send campaigns");
  const c = ok(await sam.c.from("push_campaigns").insert({ title: `Malayalam service ${stamp}`, body: "7 PM tonight", audience: "language:ml", route: "/events" }).select("id").single());
  await waitFor(async () => ok(await eve.c.from("notifications").select("id").eq("title", `Malayalam service ${stamp}`)).length, 8000, "eve notified");
  assert.equal(ok(await ann.c.from("notifications").select("id").eq("title", `Malayalam service ${stamp}`)).length, 0, "others not");
  const sent = ok(await sam.c.from("push_campaigns").select("sent_count, sent_at").eq("id", c.id).single());
  assert.ok(sent.sent_at && sent.sent_count >= 1);
  const later = ok(await sam.c.from("push_campaigns").insert({ title: "Later", body: "x", send_at: new Date(Date.now() + 3600e3).toISOString() }).select("sent_at").single());
  assert.equal(later.sent_at, null, "scheduled ones wait");

  ok(await eve.c.from("game_scores").insert({ game: "daily", points: 420 }));
  assert.ok((await eve.c.from("game_scores").insert({ game: "daily", points: 500 })).error, "one daily challenge a day");
  ok(await eve.c.from("game_scores").insert({ game: "books_order", points: 610 }));
  const board = ok(await anon.rpc("leaderboard", { p_game: "books_order", p_days: 7 }));
  assert.ok(board.some((r) => r.name === "Eve T." && r.points >= 610));

  const teens = ok(await eve.c.rpc("join_group", { group_key: "teens", group_name: "Agape Teens" }));
  assert.ok(teens, "teens chat can always be joined");
});

test("accounts: members can delete their account (App Store rule)", async () => {
  const tmp = await member("del", "Delete Me");
  ok(await tmp.c.from("prayer_requests").insert({ body: "temp" }));
  ok(await tmp.c.rpc("delete_my_account"));
  const gone = await admin.auth.admin.getUserById(tmp.id);
  assert.ok(gone.error || !gone.data.user, "auth user removed");
  assert.equal((await admin.from("profiles").select("id").eq("id", tmp.id)).data.length, 0);
});
