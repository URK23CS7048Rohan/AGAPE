// End-to-end test of the website + admin against a real Supabase stack.
// A visitor posts a prayer request, fills in the welcome card and gives; a staff member signs in to
// /admin, approves the prayer (it appears on the public wall), adds a sermon and publishes an edit.
// env: SITE (website URL), API_URL, ANON_KEY, SERVICE_ROLE_KEY, OUT
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.SITE || "http://localhost:8080";
const API = process.env.API_URL || "http://127.0.0.1:54321";
const OUT = process.env.OUT || "screenshots-site";
mkdirSync(OUT, { recursive: true });
const admin = createClient(API, process.env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stamp = Date.now().toString(36);
const results = [], log = [];
const say = (...a) => { const l = a.join(" "); console.log(l); log.push(l); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 15000, label = "condition") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch {} await sleep(400); }
  throw new Error(`timed out: ${label}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") log.push(`[console.error] ${m.text().slice(0, 300)}`); });
page.on("dialog", (d) => d.accept());
let n = 0;
const shot = async (name, full) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${name}.png`, fullPage: !!full }); };
const scrollTo = async (sel) => { await page.evaluate((s) => { const el = document.querySelector(s); const sm = window.ScrollSmoother && ScrollSmoother.get(); if (sm) sm.scrollTo(el, false, "top 80px"); else el.scrollIntoView(); }, sel); await page.waitForTimeout(1500); };
async function step(name, fn) {
  try { await fn(); results.push(["✔", name]); say("✔", name); }
  catch (e) { results.push(["✖", name, e.message]); say("✖", name, "—", e.message.split("\n")[0]); await shot(`FAIL-${name.replace(/\W+/g, "-")}`).catch(() => {}); }
}

await step("website loads in live mode", async () => {
  await page.goto(SITE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
  const live = await page.evaluate(() => window.AgapeStore && window.AgapeStore.live);
  if (!live) throw new Error("site is not connected to the backend");
  await shot("home");
});

await step("rides section shows a real street map", async () => {
  await scrollTo("#rides");
  await page.waitForSelector(".map-card.is-real", { timeout: 30000 });
  await page.waitForTimeout(6000);
  await shot("rides-real-map");
});

await step("download section: Android APK + iPhone install", async () => {
  await scrollTo("#download");
  const href = await page.getAttribute(".js-dl-android", "href");
  if (!/\.apk$/.test(href || "")) throw new Error("no APK link: " + href);
  await shot("download");
  await page.evaluate(() => document.querySelector(".js-dl-ios").click());
  await page.waitForTimeout(800);
  await shot("download-iphone-sheet");
  await page.evaluate(() => document.querySelector(".dl-sheet__x").click());
});

await step("visitor posts a prayer request (held for review)", async () => {
  await scrollTo("#prayer");
  await page.evaluate((txt) => {
    const f = document.querySelector(".js-pform");
    f.querySelector("textarea").value = txt;
    const cb = f.querySelector('input[type="checkbox"]'); cb.checked = false; cb.dispatchEvent(new Event("change"));
    f.querySelector(".pform__name").value = "Grace Visitor";
    f.requestSubmit();
  }, `Please pray for my family ${stamp}`);
  const row = await waitFor(async () => (await admin.from("prayer_requests").select("id, hidden, source, guest_name").like("body", `%${stamp}%`).single()).data, 10000, "prayer saved");
  if (!row.hidden || row.source !== "web" || row.guest_name !== "Grace Visitor") throw new Error("not held for review: " + JSON.stringify(row));
  await shot("prayer-posted");
});

await step("visitor fills in the welcome card", async () => {
  await scrollTo("#visit");
  await page.evaluate((name) => {
    const f = document.querySelector(".js-vform");
    f.name.value = name; f.phone.value = "+965 5555 0102"; f.ride.checked = true; f.kids.checked = true;
    f.requestSubmit();
  }, `Kevin ${stamp}`);
  await waitFor(async () => (await admin.from("visitor_cards").select("id").eq("name", `Kevin ${stamp}`)).data?.length, 10000, "visitor card saved");
  await page.waitForSelector(".js-vform.is-sent", { timeout: 5000 });
  await shot("welcome-card");
});

await step("visitor gives online (checkout → confirmed)", async () => {
  await scrollTo("#give");
  await page.evaluate(() => document.querySelector(".js-give").requestSubmit());
  await page.waitForURL(/donation=/, { timeout: 15000 });
  const id = new URL(page.url()).searchParams.get("donation");
  const w = await (await fetch(`${API}/functions/v1/payment-webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test_donation_id: id }) })).json();
  if (w.status !== "succeeded") throw new Error("webhook didn't confirm");
  await page.goto(`${SITE}/?donation=${id}#give`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await scrollTo("#give");
  await waitFor(async () => (await page.textContent(".gbox__note")).includes("Received with thanks"), 15000, "thank-you message");
  await shot("gift-received");
});

const staffEmail = `pastor-${stamp}@agape.test`;
await step("staff signs in to the admin", async () => {
  const { data } = await admin.auth.admin.createUser({ email: staffEmail, password: "Agape-staff-2026!", email_confirm: true, user_metadata: { full_name: "Pastor John" } });
  await admin.from("profiles").update({ role: "staff" }).eq("id", data.user.id);
  await page.goto(SITE + "/admin/", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", staffEmail);
  await page.fill("input[name=password]", "Agape-staff-2026!");
  await page.click("button[type=submit]");
  await page.waitForSelector("#sideNav a", { timeout: 15000 });
  await page.waitForTimeout(2500);
  await shot("admin-dashboard", true);
});

await step("admin approves the prayer → it's on the public wall", async () => {
  await page.evaluate(() => (location.hash = "prayer"));
  await page.waitForTimeout(2500);
  await shot("admin-prayer-review");
  await page.locator("tr", { hasText: stamp }).getByText("Approve").click();
  await waitFor(async () => (await admin.from("prayer_requests").select("hidden").like("body", `%${stamp}%`).single()).data?.hidden === false, 10000, "approved");
  const wall = await (await fetch(`${API}/rest/v1/prayer_wall?select=body,author_name&body=like.*${stamp}*`, { headers: { apikey: process.env.ANON_KEY } })).json();
  if (wall[0]?.author_name !== "Grace V.") throw new Error("not on the public wall: " + JSON.stringify(wall));
});

await step("admin adds a sermon with a YouTube link", async () => {
  await page.evaluate(() => (location.hash = "sermons"));
  await page.waitForTimeout(2500);
  await page.getByText("Add a sermon").click();
  const f = page.locator(".item.is-open");
  await f.locator(".field").nth(0).locator("input").fill(`Test ${stamp}`);
  await f.locator(".field").nth(2).locator("input").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await f.getByText("Create").click();
  await waitFor(async () => (await admin.from("videos").select("youtube_id").eq("title", `Test ${stamp}`).single()).data?.youtube_id === "dQw4w9WgXcQ", 10000, "sermon saved");
  await shot("admin-sermons");
});

await step("admin sees visitor cards and gifts", async () => {
  await page.evaluate(() => (location.hash = "visitors"));
  await page.waitForTimeout(2000);
  await page.getByText(`Kevin ${stamp}`).waitFor({ timeout: 8000 });
  await shot("admin-visitors");
  await page.evaluate(() => (location.hash = "giving"));
  await page.waitForTimeout(2000);
  await page.getByText("succeeded").first().waitFor({ timeout: 8000 });
  await shot("admin-giving");
});

await step("admin publishes a website edit", async () => {
  await page.evaluate(() => (location.hash = "hero"));
  await page.waitForTimeout(1500);
  await page.locator(".card .field").nth(1).locator("input").fill("Grace that");
  await page.click("#saveBtn");
  await waitFor(async () => (await admin.from("site_content").select("data").eq("key", "site").single()).data?.data?.hero?.line1 === "Grace that", 10000, "content published");
});

await step("public wall shows the approved prayer", async () => {
  await page.goto(SITE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  await scrollTo("#prayer");
  await page.waitForTimeout(2500);
  const txt = await page.textContent(".pnotes");
  if (!txt.includes(stamp)) throw new Error("approved prayer not on the wall");
  await shot("public-wall");
});

await step("no JavaScript errors", async () => { if (errors.length) throw new Error(errors.slice(0, 5).join(" | ")); });

writeFileSync(`${OUT}/report.txt`, [...results.map((r) => r.join("  ")), "", "---- log", ...log].join("\n"));
await browser.close();
const failed = results.filter((r) => r[0] === "✖").length;
say(`\n${results.length - failed}/${results.length} steps passed`);
process.exit(failed ? 1 : 0);
