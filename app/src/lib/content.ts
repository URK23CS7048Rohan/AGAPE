/**
 * Church content edited in /admin (the `site_content` row), shared with the website.
 * Until staff publish their first edit, the app shows the website's own defaults
 * (src/data/site-defaults.json, synced from website/assets/js/content.js).
 * Image values can be bundled paths ("assets/img/…"), uploaded Storage URLs, or data URLs.
 */
import { useEffect, useState } from "react";
import { C, IMG } from "@/theme";
import { supabase, isConfigured } from "./supabase";
import DEFAULTS from "@/data/site-defaults.json";

const BUNDLED: Record<string, any> = {
  "assets/img/agape-families.jpg": require("../../assets/images/agape-families.jpg"),
  "assets/img/agape-family-day.jpg": require("../../assets/images/agape-family-day.jpg"),
  "assets/img/agape-home-worship.jpg": require("../../assets/images/agape-home-worship.jpg"),
  "assets/img/agape-institute.jpg": require("../../assets/images/agape-institute.jpg"),
  "assets/img/agape-kids-church.jpg": require("../../assets/images/agape-kids-church.jpg"),
  "assets/img/agape-kids-hearts.jpg": require("../../assets/images/agape-kids-hearts.jpg"),
  "assets/img/agape-prayer-worship.jpg": require("../../assets/images/agape-prayer-worship.jpg"),
  "assets/img/agape-squad-band.jpg": require("../../assets/images/agape-squad-band.jpg"),
  "assets/img/agape-squad-healer.jpg": require("../../assets/images/agape-squad-healer.jpg"),
  "assets/img/alps.jpg": require("../../assets/images/alps.jpg"),
  "assets/img/bricks.jpg": require("../../assets/images/bricks.jpg"),
  "assets/img/hands-together.jpg": require("../../assets/images/hands-together.jpg"),
  "assets/img/phone-hand.jpg": require("../../assets/images/phone-hand.jpg"),
};
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "").replace(/\/$/, "");

/** Turns a stored image value into an expo-image source. */
export function imageSource(p?: string | null, fallback: any = IMG.homeWorship) {
  if (!p) return fallback;
  if (/^(https?:|data:)/.test(p)) return { uri: p };
  if (BUNDLED[p]) return BUNDLED[p];
  if (SITE_URL) return { uri: `${SITE_URL}/${p}` };
  return fallback;
}

export type Service = { day: number; h: number; m: number; label: string; time: string; note?: string };
export type Church = {
  name: string; short: string; address: string; mapsUrl: string; phone: string; whatsapp: string; email: string;
  youtube: string; youtubeChannelId: string; tzOffsetHours: number; currency: string;
  givingUrl?: string; lat?: number | null; lng?: number | null;
};
export type HeroContent = { kicker: string; line1: string; words: string[]; slides: { image: any; caption: string }[] };
export type Promo = { id: string; kicker: string; title: string; accent: string; body: string; cta: string; route: string; url?: string; image: any; accentColor: string; sticker?: [string, string] };
export type EventItem = { key: string; title: string; day: string; month: string; weekday: string; time: string; tags: string[]; image: any; color: string; link: string };
export type Campaign = { id: string; title: string; accent: string; body: string; raised: number; goal: number; image: any; color: string };
export type AppContent = {
  church: Church; services: Service[]; stats: Record<string, number>; hero: HeroContent; promos: Promo[]; events: EventItem[]; campaigns: Campaign[];
  announcement?: { title: string; text: string; cta?: string; link?: string };
};

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
/** Stable id for an event published in /admin; RSVPs are stored against it. */
export const eventKey = (e: { title?: string; day?: string; month?: string }) => slug(`${e.title || "event"}-${e.day || ""}-${e.month || ""}`);

/** Maps a website link (#events, #give, https://…) to an app screen or an external URL. */
function linkTarget(link?: string): { route: string; url?: string } {
  const l = (link || "").trim();
  if (/^https?:/i.test(l)) return { route: "", url: l };
  const k = l.toLowerCase();
  if (k.includes("event")) return { route: "/events" };
  if (k.includes("give")) return { route: "/give" };
  if (k.includes("course") || k.includes("app") || k.includes("institute")) return { route: "/grow" };
  if (k.includes("community") || k.includes("squad") || k.includes("ministr")) return { route: "/community" };
  if (k.includes("watch") || k.includes("youtube") || k.includes("live")) return { route: "/watch" };
  if (k.includes("ride")) return { route: "/rides" };
  if (k.includes("pray")) return { route: "/prayer" };
  return { route: "/events" };
}

const EVENT_COLORS = [C.flame, C.violet, C.rose, C.sun, C.mint];

export function mapSite(d: any): AppContent {
  const D: any = DEFAULTS;
  const pick = (k: string) => (d && d[k] !== undefined ? d[k] : D[k]);
  const hero = { ...D.hero, ...(pick("hero") || {}) };
  return {
    church: { ...D.church, ...(pick("church") || {}) },
    services: Array.isArray(pick("services")) ? pick("services") : [],
    stats: pick("stats") || {},
    hero: {
      kicker: hero.kicker || "",
      line1: hero.line1 || "",
      words: Array.isArray(hero.words) && hero.words.length ? hero.words : [""],
      slides: (Array.isArray(hero.slides) ? hero.slides : []).map((s: any) => ({ image: imageSource(s.image), caption: s.caption || "" })),
    },
    promos: (pick("promos") || []).map((p: any, i: number) => ({
      id: `p${i}`, kicker: p.kicker || "", title: p.title || "", accent: p.accent || "", body: p.body || "", cta: p.cta || "Learn more",
      ...linkTarget(p.link), image: imageSource(p.image), accentColor: p.color || C.flame,
      sticker: p.sticker1 || p.sticker2 ? [p.sticker1 || "", p.sticker2 || ""] : undefined,
    })),
    events: (pick("events") || []).map((e: any, i: number) => ({
      key: eventKey(e), title: e.title || "Event", day: String(e.day || ""), month: String(e.month || "").toUpperCase(), weekday: e.weekday || "",
      time: e.meta || "", tags: String(e.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean), image: imageSource(e.image),
      color: EVENT_COLORS[i % EVENT_COLORS.length], link: e.link || "",
    })),
    campaigns: (pick("campaigns") || []).map((c: any, i: number) => ({
      id: `c${i}`, title: c.title || "", accent: c.accent || "", body: c.body || "", raised: Number(c.raised) || 0, goal: Number(c.goal) || 0,
      image: imageSource(c.image, IMG.handsTogether), color: c.color || C.flame,
    })),
    announcement: pick("announcement"),
  };
}

const DEFAULT = mapSite(null);
let cache: AppContent = DEFAULT;
const listeners = new Set<(c: AppContent) => void>();

async function fetchContent() {
  const { data, error } = await supabase.from("site_content").select("data").eq("key", "site").maybeSingle();
  if (error) throw error;
  cache = mapSite(data?.data ?? null);
  listeners.forEach((l) => l(cache));
}
let subscribed = false;
function ensureLive() {
  if (subscribed || !isConfigured) return;
  subscribed = true;
  fetchContent().catch(() => {});
  // Staff edits in /admin appear in the app without a reload.
  supabase
    .channel("site-content")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => fetchContent().catch(() => {}))
    .subscribe();
}

/** Admin-managed church content with live updates. */
export function useSiteContent(): AppContent {
  const [c, setC] = useState<AppContent>(cache);
  useEffect(() => {
    listeners.add(setC);
    ensureLive();
    return () => { listeners.delete(setC); };
  }, []);
  return c;
}
