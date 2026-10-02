// End-to-end test of the real app (web build) against a real Supabase stack.
// A new member signs up with an e-mailed code, then uses every feature; a volunteer driver
// (scripted with supabase-js) accepts their ride and streams a live location.
// Every step is checked in the database, and screenshots are saved for review.
//
// env: BASE (app URL), API_URL, ANON_KEY, SERVICE_ROLE_KEY, MAIL_URL, OUT
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE || "http://localhost:3000";
const API = process.env.API_URL || "http://127.0.0.1:54321";
const MAIL = process.env.MAIL_URL || "http://127.0.0.1:54324";
const OUT = process.env.OUT || "screenshots-live";
mkdirSync(OUT, { recursive: true });
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(API, process.env.SERVICE_ROLE_KEY, opts);
const stamp = Date.now().toString(36);
const email = `member-${stamp}@agape.test`;
const log = [];
const results = [];
const say = (...a) => { const l = a.join(" "); console.log(l); log.push(l); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 15000, label = "condition") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch {} await sleep(400); }
  throw new Error(`timed out: ${label}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") log.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`); });
page.on("dialog", async (d) => { log.push(`[dialog] ${d.message()}`); await d.accept(); });
let n = 0;
const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${name}.png` }); };
const click = async (text, o = {}) => { await page.getByText(text, { exact: !!o.exact }).first().click({ timeout: o.timeout ?? 15000 }); };
const go = async (route) => { await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 }); await page.waitForTimeout(2500); };

async function step(name, fn) {
  try { await fn(); results.push(["✔", name]); say("✔", name); }
  catch (e) { results.push(["✖", name, e.message]); say("✖", name, "—", e.message.split("\n")[0]); await shot(`FAIL-${name.replace(/\W+/g, "-")}`).catch(() => {}); }
}

let me = null;   // the member's user id
let driver = null;

await step("sign up with an e-mailed code", async () => {
  await go("/welcome");
  await shot("welcome");
  await click("Continue with e-mail");
  await page.getByPlaceholder("you@example.com").fill(email);
  await click("Send my code");
  const code = await waitFor(async () => {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json().catch(() => null);
    const m = list?.messages?.[0];
    if (m) { const full = await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json(); return (full.Text || full.HTML || "").match(/\b(\d{6})\b/)?.[1]; }
    const box = email.split("@")[0];
    const inb = await (await fetch(`${MAIL}/api/v1/mailbox/${box}`)).json().catch(() => null);
    if (Array.isArray(inb) && inb.length) { const full = await (await fetch(`${MAIL}/api/v1/mailbox/${box}/${inb[inb.length - 1].id}`)).json(); return (full.body?.text || "").match(/\b(\d{6})\b/)?.[1]; }
  }, 25000, "sign-in e-mail");
  await page.waitForTimeout(800);
  await shot("code-screen");
  await page.locator('input[maxlength="6"]').first().fill(code);
  await page.getByPlaceholder("Sarah Mathews").waitFor({ timeout: 20000 });
  await shot("onboarding");
  await page.getByPlaceholder("Sarah Mathews").fill("Priya Raman");
  await page.getByPlaceholder("+965 …").fill("+965 5555 0101");
  await click("Let's go");
  await page.waitForTimeout(4000);
  const { data } = await admin.from("profiles").select("id, full_name, member_no, phone").eq("email", email).single();
  if (data?.full_name !== "Priya Raman") throw new Error("profile name not saved");
  me = data.id;
  say("   member", data.member_no);
  await shot("home");
});

await step("me: real member card", async () => {
  await go("/me");
  await page.getByText("Priya Raman").first().waitFor({ timeout: 10000 });
  await page.getByText(/AGP-\d{2}-\d{4}/).first().waitFor({ timeout: 10000 });
  await shot("me");
});

await step("prayer wall: post a request", async () => {
  await go("/prayer");
  await page.getByPlaceholder("What can we pray with you about?").fill(`Pray for my exams next week ${stamp}`);
  await click("Share", { exact: true });
  await waitFor(async () => (await admin.from("prayer_requests").select("id").eq("user_id", me).like("body", `%${stamp}%`)).data?.length, 10000, "prayer saved");
  await page.getByText(`Pray for my exams next week ${stamp}`).first().waitFor({ timeout: 10000 });
  await shot("prayer");
});

await step("community: join a group and chat", async () => {
  await go("/community");
  await click("Groups", { exact: true });
  await page.waitForTimeout(1200);
  await shot("groups");
  await click("Join", { exact: true });
  await page.getByPlaceholder("Message").waitFor({ timeout: 15000 });
  await page.getByPlaceholder("Message").fill(`Hello Agape family ${stamp}`);
  await page.locator('[aria-label="Send"]').last().click();
  const sent = async () => (await admin.from("messages").select("id").eq("sender_id", me).like("body", `%${stamp}%`)).data?.length;
  await waitFor(sent, 10000, "message saved");
  await page.waitForTimeout(1500);
  await shot("chat");
});

await step("events: RSVP and ticket", async () => {
  await go("/events");
  await click("RSVP", { exact: true });
  await waitFor(async () => (await admin.from("event_rsvps").select("event_key").eq("user_id", me)).data?.length, 10000, "rsvp saved");
  await shot("ticket");
});

await step("watch + sermon notes sync", async () => {
  await go("/watch");
  await shot("watch");
  const { data: v } = await admin.from("videos").select("id").eq("slug", "unshakeable-3").single();
  await go(`/sermon/${v.id}`);
  await click("Notes", { exact: true });
  await page.locator("textarea").first().fill(`Nothing is wasted ${stamp}`);
  await waitFor(async () => (await admin.from("sermon_notes").select("body").eq("user_id", me).eq("video_id", v.id)).data?.[0]?.body?.includes(stamp), 10000, "note saved");
  await shot("sermon-notes");
});

await step("courses: complete a lesson", async () => {
  await go("/learn");
  await shot("learn");
  const { data: c } = await admin.from("courses").select("id").eq("slug", "foundations").single();
  await go(`/course/${c.id}`);
  await click("Start course");
  await page.waitForTimeout(2500);
  await shot("lesson");
  await click("Mark as complete");
  await waitFor(async () => (await admin.from("lesson_progress").select("lesson_id").eq("user_id", me)).data?.length, 10000, "progress saved");
});

await step("games: a round of Bible Trivia reaches the leaderboard", async () => {
  await go("/games");
  await shot("games-hub");
  await click("Bible Trivia", { exact: true });
  await page.waitForTimeout(1500);
  // read the question on screen and tap the right answer (from the database)
  const { data: qs } = await admin.from("questions").select("prompt, options, answer");
  for (let k = 0; k < 16; k++) {
    if ((await admin.from("game_scores").select("id").eq("user_id", me)).data?.length) break;
    const shown = await page.evaluate(() => document.body.innerText);
    const q = qs.find((x) => Array.isArray(x.options) && typeof x.answer === "number" && shown.includes(x.prompt));
    if (!q) { await page.waitForTimeout(1200); continue; }
    if (k === 2) await shot("games-trivia");
    await page.getByText(q.options[q.answer], { exact: true }).first().click();
    await page.waitForTimeout(1500);
  }
  await waitFor(async () => (await admin.from("game_scores").select("id").eq("user_id", me).eq("game", "trivia")).data?.length, 12000, "score saved");
  await page.waitForTimeout(1500);
  await shot("games-result");
});

await step("bible: read John 3, highlight a verse", async () => {
  await go("/bible");
  await shot("bible-tab");
  await go("/bible/read?b=43&c=3&tr=WEB");
  await page.getByText(/God so loved the world/).first().waitFor({ timeout: 30000 });
  await page.getByText(/God so loved the world/).first().click();
  await page.waitForTimeout(800);
  await shot("bible-select");
  await page.locator('[aria-label="Highlight"]').first().click();
  await waitFor(async () => (await admin.from("bible_marks").select("verse").eq("user_id", me).eq("kind", "highlight")).data?.some((m) => m.verse === 16), 10000, "highlight saved");
  await page.waitForTimeout(800);
  await shot("bible-highlight");
});

await step("reading plan: start, read day 1, journal, mark complete", async () => {
  await go("/plans/gospel-of-john");
  await shot("plan");
  await click("Start this plan");
  await page.getByPlaceholder("Write a thought or a prayer…").waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await shot("plan-day");
  await page.getByPlaceholder("Write a thought or a prayer…").fill(`The Word became flesh ${stamp}`);
  await click("Mark day 1 complete");
  await waitFor(async () => (await admin.from("plan_progress").select("done").eq("user_id", me)).data?.[0]?.done?.includes(1), 10000, "progress saved");
  await waitFor(async () => (await admin.from("journal_entries").select("id").eq("user_id", me).like("body", `%${stamp}%`)).data?.length, 10000, "journal saved");
});

await step("song book: open a hymn and transpose it", async () => {
  await go("/songs");
  await shot("songs");
  await go("/songs/amazing-grace");
  await page.getByText(/mazing grace/).first().waitFor({ timeout: 15000 });
  await page.locator('[aria-label="Key +"]').first().click();
  await page.locator('[aria-label="Key +"]').first().click();
  await page.getByText("A", { exact: true }).first().waitFor({ timeout: 5000 });
  await shot("song-transposed");
});

await step("testimonies: share one, pastor approves, it's on the wall", async () => {
  await go("/testimonies");
  await click("Share yours");
  await page.getByPlaceholder(/Title — e.g./).fill(`God provided a job ${stamp}`);
  await page.getByPlaceholder("What happened? What did God do?").fill("After eight months of searching, the home group prayed and I got the offer the next week.");
  await shot("testimony-write");
  await click("Send", { exact: true });
  const row = await waitFor(async () => (await admin.from("testimonies").select("id, approved").eq("user_id", me).single()).data, 10000, "testimony saved");
  if (row.approved) throw new Error("should wait for review");
  await admin.from("testimonies").update({ approved: true }).eq("id", row.id);
  await go("/testimonies");
  await page.getByText(`God provided a job ${stamp}`).first().waitFor({ timeout: 10000 });
  await shot("testimonies");
});

await step("home prayer: host a meeting in your home", async () => {
  await go("/home-prayer/host");
  await page.getByPlaceholder(/Title — e.g./).fill(`Friday worship ${stamp}`);
  await page.getByPlaceholder(/Area everyone sees/).fill("Salmiya, Block 12");
  await page.getByPlaceholder(/Full address/).fill("Street 4, Building 9, Flat 11");
  await click("Create meeting");
  await waitFor(async () => (await admin.from("home_meetings").select("id").eq("host_id", me)).data?.length, 10000, "meeting saved");
  await page.waitForTimeout(2500);
  await shot("home-meeting");
  await go("/home-prayer");
  await shot("home-prayer");
});

await step("serve + check-in: sign up for a shift, check in with the church code", async () => {
  await go("/serve");
  await click("Sign up", { exact: true });
  await waitFor(async () => (await admin.from("serve_signups").select("opportunity_id").eq("user_id", me)).data?.length, 10000, "signed up");
  await shot("serve");
  const { data: code } = await admin.from("checkin_codes").insert({ event_key: "sunday-worship", title: "Sunday worship" }).select().single();
  await go("/checkin");
  await shot("checkin-card");
  await click("Scan at church");
  await page.getByPlaceholder(/Code, e.g./).fill(code.code);
  await click("Go", { exact: true });
  await waitFor(async () => (await admin.from("checkins").select("id").eq("user_id", me)).data?.length, 10000, "checked in");
  await page.waitForTimeout(1000);
  await shot("checkin-done");
});

await step("kids mode: a parent PIN keeps the phone in Agape Kids", async () => {
  await go("/kids");
  await shot("kids");
  await click("Turn on Kids mode");
  await page.locator('input[type="password"]').fill("2468");
  await click("Turn on", { exact: true });
  await page.waitForTimeout(1500);
  await go("/");
  await page.getByText("Hello, friend!").first().waitFor({ timeout: 10000 });
  await page.locator('[aria-label="Grown-ups"]').first().click();
  await page.locator('input[type="password"]').fill("2468");
  await click("Unlock", { exact: true });
  await page.waitForTimeout(2500);
  const { data } = await admin.from("profiles").select("settings").eq("id", me).single();
  if (data.settings?.kidsMode) throw new Error("still locked");
});

await step("language: the app switches to Malayalam and back", async () => {
  const ml = JSON.parse(readFileSync(new URL("../src/i18n/ml.json", import.meta.url)));
  await go("/me");
  await click("Language", { exact: true });
  await click("മലയാളം", { exact: true });
  await page.waitForTimeout(2500);
  await go("/");
  await page.getByText(ml["Bible"], { exact: true }).first().waitFor({ timeout: 10000 });
  await shot("home-malayalam");
  await go("/bible");
  await page.waitForTimeout(3000);
  await shot("bible-malayalam");
  const { data } = await admin.from("profiles").select("settings").eq("id", me).single();
  if (data.settings?.language !== "ml") throw new Error("language not saved to the profile");
  await admin.from("profiles").update({ settings: { ...data.settings, language: "en", bible: "WEB" } }).eq("id", me);
  await go("/");
  await page.waitForTimeout(1500);
});

await step("rides: request → driver accepts → live location", async () => {
  // a volunteer driver, scripted
  const { data: u } = await admin.auth.admin.createUser({ email: `driver-${stamp}@agape.test`, password: "Agape-test-2026!", email_confirm: true, user_metadata: { full_name: "David Kumar" } });
  await admin.from("profiles").update({ role: "volunteer", vehicle: "Toyota Innova · White · KW 38 7456", phone: "+965 5555 0199" }).eq("id", u.user.id);
  driver = createClient(API, process.env.ANON_KEY, opts);
  await driver.auth.signInWithPassword({ email: `driver-${stamp}@agape.test`, password: "Agape-test-2026!" });

  await go("/rides");
  await page.waitForTimeout(7000); // street map tiles
  await shot("rides-request");
  await click("Request ride");
  const ride = await waitFor(async () => (await admin.from("rides").select("id, status").eq("member_id", me).single()).data, 10000, "ride saved");
  await page.getByText("Finding a").first().waitFor({ timeout: 10000 });
  await shot("rides-searching");
  const acc = await driver.rpc("accept_ride", { ride_id: ride.id });
  if (acc.error) throw acc.error;
  await page.getByText("David Kumar").first().waitFor({ timeout: 15000 });
  await driver.rpc("set_ride_status", { ride_id: ride.id, new_status: "enroute" });
  for (const [lat, lng] of [[29.3261, 48.0618], [29.3268, 48.0662], [29.3302, 48.0671]]) {
    await driver.from("ride_locations").insert({ ride_id: ride.id, lat, lng, heading: 30 });
    await sleep(900);
  }
  await page.getByText(/min/).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(5000); // let the street map + road route draw
  await shot("rides-enroute");
  await driver.rpc("set_ride_status", { ride_id: ride.id, new_status: "arrived" });
  await page.getByText("Your ride is").first().waitFor({ timeout: 15000 });
  await shot("rides-arrived");
  await driver.rpc("set_ride_status", { ride_id: ride.id, new_status: "completed" });
});

await step("notifications list the ride updates", async () => {
  await go("/notifications");
  await page.getByText("David Kumar is driving you").first().waitFor({ timeout: 10000 });
  await shot("notifications");
});

await step("give: checkout creates a donation, webhook confirms it", async () => {
  await go("/give");
  await shot("give");
  await page.getByText(/^Give KWD/).first().click();
  const d = await waitFor(async () => (await admin.from("donations").select("id, status, amount").eq("user_id", me).single()).data, 15000, "donation created");
  const w = await (await fetch(`${API}/functions/v1/payment-webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test_donation_id: d.id }) })).json();
  if (w.status !== "succeeded") throw new Error("webhook did not confirm");
  await go("/notifications");
  await page.getByText(/Thank you for your gift/).first().waitFor({ timeout: 10000 });
  await shot("gift-thanks");
});

await step("driver view: volunteer sees requests", async () => {
  // sign the browser in as the driver through the same e-mail code flow is covered above; here we check the board via API
  const { data } = await driver.from("rides").select("id").eq("volunteer_id", (await driver.auth.getUser()).data.user.id);
  if (!data?.length) throw new Error("driver has no rides");
});

await step("no JavaScript errors", async () => {
  if (errors.length) throw new Error(errors.slice(0, 5).join(" | "));
});

writeFileSync(`${OUT}/report.txt`, [...results.map((r) => r.join("  ")), "", "---- log", ...log].join("\n"));
await browser.close();
const failed = results.filter((r) => r[0] === "✖").length;
say(`\n${results.length - failed}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
