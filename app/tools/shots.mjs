// Takes phone-sized screenshots of every screen of the web build.
// Usage (after `npx expo export --platform web` and serving dist/ on :3000):  node tools/shots.mjs
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.SHOT_BASE || "http://localhost:3000";
const OUT = process.env.SHOT_OUT || "screenshots";
mkdirSync(OUT, { recursive: true });
// Tab screens sit behind sign-in (in-memory), so they're reached by signing in and tapping the tab bar.
const TABS = [["01-home", "Home"], ["02-watch", "Watch"], ["03-grow", "Grow"], ["04-community", "Family"], ["05-me", "Me"]];
const ROUTES = [
  ["06-prayer", "/prayer"], ["07-give", "/give"], ["08-games", "/games"], ["09-events", "/events"], ["10-assistant", "/assistant"],
  ["11-rides", "/rides"], ["12-welcome", "/welcome"], ["13-sermon", "/sermon/power-of-grace"], ["14-course", "/course/foundations"],
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
    const pages = label === "Home" ? 7 : 2;
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
    const pages = ["06-prayer", "07-give", "08-games", "09-events"].includes(name) ? 2 : 0;
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
