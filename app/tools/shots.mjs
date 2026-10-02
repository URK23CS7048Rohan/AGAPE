// Takes phone-sized screenshots of every screen of the web build.
// Usage (after `npx expo export --platform web` and serving dist/ on :3000):  node tools/shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const OUT = process.env.SHOT_OUT || "screenshots";
mkdirSync(OUT, { recursive: true });
// Tab screens sit behind sign-in (in-memory), so they're reached by signing in and tapping the tab bar.
const TABS = [["01-home", "Home"], ["02-bible", "Bible"], ["03-watch", "Watch"], ["04-community", "Community"], ["05-me", "Me"]];
const ROUTES = [
  ["06-reader", "/bible/read?b=43&c=3&tr=WEB"], ["07-plans", "/plans"], ["08-plan", "/plans/gospel-of-john"], ["09-plan-day", "/plans/day?slug=gospel-of-john&d=1"],
  ["10-songs", "/songs"], ["11-song", "/songs/amazing-grace"], ["12-games", "/games"], ["13-game-emoji", "/games/emoji"], ["14-game-books", "/games/books_order"], ["15-game-memory", "/games/memory"],
  ["16-kids", "/kids"], ["17-teens", "/ministry/teens"], ["18-squad", "/ministry/squad"], ["19-testimonies", "/testimonies"], ["20-home-prayer", "/home-prayer"],
  ["21-home-meeting", "/home-prayer/m1"], ["22-serve", "/serve"], ["23-checkin", "/checkin"], ["24-getting-started", "/getting-started"], ["25-journal", "/journal"],
  ["26-prayer", "/prayer"], ["27-give", "/give"], ["28-events", "/events"], ["29-assistant", "/assistant"], ["30-rides", "/rides"], ["31-learn", "/learn"],
  ["32-sermon", "/sermon/power-of-grace"], ["33-welcome", "/welcome"],
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// scroll the screen's main scroll view (react-native-web renders it as an overflow div)
const scrollBy = (y) => page.evaluate((dy) => {
  const els = [...document.querySelectorAll("div")].filter((d) => { const s = getComputedStyle(d); return /(auto|scroll)/.test(s.overflowY) && d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 500; });
  const el = els.sort((a, b) => b.clientHeight - a.clientHeight)[0];
  if (el) el.scrollTop += dy;
  return el ? el.scrollTop : -1;
}, y);
// ---- signed-in tab screens
try {
  await page.goto(BASE + "/welcome", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.getByText("Continue with Apple").first().click();
  await page.waitForTimeout(5000);
  for (const [name, label] of TABS) {
    if (label !== "Home") { await page.locator(`[aria-label="${label}"]`).first().click(); await page.waitForTimeout(3500); }
    await page.screenshot({ path: `${OUT}/${name}.png` });
    const pages = label === "Home" ? 8 : 3;
    for (let i = 1; i <= pages; i++) {
      const pos = await scrollBy(720);
      if (pos < 0) break;
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}/${name}-${i}.png` });
    }
    await scrollBy(-99999);
    console.log("✓", name);
  }
} catch (e) { console.log("✗ tabs", e.message); }

for (const [name, route] of ROUTES) {
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    const pages = ["06-reader", "08-plan", "09-plan-day", "11-song", "12-games", "16-kids", "17-teens", "19-testimonies", "22-serve", "26-prayer"].includes(name) ? 2 : 0;
    for (let i = 1; i <= pages; i++) {
      const pos = await scrollBy(700);
      if (pos < 0) break;
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}/${name}-${i}.png` });
    }
    console.log("✓", name);
  } catch (e) {
    console.log("✗", name, e.message);
  }
}
console.log("page errors:", errors.slice(0, 10));
await browser.close();
