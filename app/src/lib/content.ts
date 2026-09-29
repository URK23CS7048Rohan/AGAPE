/**
 * Site content edited in the web admin (/admin) → used by the app.
 * Reads the `site_content` row from Supabase; falls back to the same defaults the website uses.
 * Image values can be bundled paths ("assets/img/…"), uploaded Storage URLs, or data URLs.
 */
import { useEffect, useState } from "react";
import { C, IMG } from "@/theme";
import { supabase } from "./supabase";
import { EVENTS, GROUPS, PROMOS, Promo } from "@/data/mock";

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
export function imageSource(p?: string, fallback: any = IMG.homeWorship) {
  if (!p) return fallback;
  if (/^(https?:|data:)/.test(p)) return { uri: p };
  if (BUNDLED[p]) return BUNDLED[p];
  if (SITE_URL) return { uri: `${SITE_URL}/${p}` };
  return fallback;
}

export type HeroContent = { kicker: string; line1: string; words: string[]; slides: { image: any; caption: string }[] };
export type EventItem = (typeof EVENTS)[number];
export type GroupItem = (typeof GROUPS)[number];
export type AppContent = { hero: HeroContent; promos: Promo[]; events: EventItem[]; groups: GroupItem[]; announcement?: { title: string; text: string; link: string }; gallery: { image: any; caption: string }[] };

const DEFAULT: AppContent = {
  hero: {
    kicker: "An international family of faith",
    line1: "Love that",
    words: ["shows up.", "prays.", "sings.", "serves.", "stays."],
    slides: [
      { image: IMG.homeWorship, caption: "Prayer & Worship at home" },
      { image: IMG.squadBand, caption: "Agape Squad leading worship" },
      { image: IMG.familyDay, caption: "Church family day" },
      { image: IMG.kidsChurch, caption: "Kids church" },
      { image: IMG.institute, caption: "Agape Institute graduates" },
    ],
  },
  promos: PROMOS,
  events: EVENTS,
  groups: GROUPS,
  gallery: [],
};

const route = (link?: string) => {
  const l = (link || "").toLowerCase();
  if (l.includes("event")) return "/events";
  if (l.includes("give")) return "/give";
  if (l.includes("app") || l.includes("course")) return "/grow";
  if (l.includes("community") || l.includes("squad")) return "/community";
  if (l.includes("watch") || l.includes("youtube")) return "/watch";
  if (l.includes("ride")) return "/rides";
  if (l.includes("pray")) return "/prayer";
  return "/events";
};

export function mapSite(d: any): AppContent {
  if (!d || typeof d !== "object") return DEFAULT;
  const out: AppContent = { ...DEFAULT };
  if (d.hero) {
    out.hero = {
      kicker: d.hero.kicker || DEFAULT.hero.kicker,
      line1: d.hero.line1 || DEFAULT.hero.line1,
      words: Array.isArray(d.hero.words) && d.hero.words.length ? d.hero.words : DEFAULT.hero.words,
      slides: Array.isArray(d.hero.slides) && d.hero.slides.length ? d.hero.slides.map((s: any) => ({ image: imageSource(s.image), caption: s.caption || "" })) : DEFAULT.hero.slides,
    };
  }
  if (Array.isArray(d.promos) && d.promos.length) {
    out.promos = d.promos.map((p: any, i: number) => ({
      id: `p${i}`, kicker: p.kicker || "", title: p.title || "", accent: p.accent || "", body: p.body || "", cta: p.cta || "Learn more",
      route: route(p.link), image: imageSource(p.image), accentColor: p.color || C.flame,
      sticker: p.sticker1 || p.sticker2 ? [p.sticker1 || "", p.sticker2 || ""] : undefined,
    }));
  }
  if (Array.isArray(d.events) && d.events.length) {
    out.events = d.events.map((e: any, i: number) => ({
      id: `e${i}-${(e.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: e.title || "Event", day: e.day || "", month: String(e.month || "").toUpperCase(), weekday: e.weekday || "",
      time: e.meta || "", place: "", tags: String(e.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean), image: imageSource(e.image), color: [C.flame, C.violet, C.rose, C.sun, C.mint][i % 5],
    }));
  }
  if (Array.isArray(d.ministries) && d.ministries.length) {
    out.groups = d.ministries.map((m: any, i: number) => ({ id: `g${i}`, name: m.name || "", meets: m.chip || "", members: 0, color: m.color || C.flame, image: imageSource(m.image) }));
  }
  if (Array.isArray(d.gallery)) out.gallery = d.gallery.map((g: any) => ({ image: imageSource(g.image), caption: g.caption || "" }));
  if (d.announcement) out.announcement = d.announcement;
  return out;
}

let cache: AppContent | null = null;
const listeners = new Set<(c: AppContent) => void>();

async function fetchContent() {
  if (!supabase) return;
  const { data } = await supabase.from("site_content").select("data").eq("key", "site").maybeSingle();
  if (data?.data) {
    cache = mapSite(data.data);
    listeners.forEach((l) => l(cache!));
  }
}
let subscribed = false;
function ensureLive() {
  if (subscribed || !supabase) return;
  subscribed = true;
  fetchContent().catch(() => {});
  // Staff edits in /admin appear in the app without a reload.
  supabase
    .channel("site-content")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => fetchContent().catch(() => {}))
    .subscribe();
}

/** Admin-managed content with live updates. */
export function useSiteContent(): AppContent {
  const [c, setC] = useState<AppContent>(cache || DEFAULT);
  useEffect(() => {
    listeners.add(setC);
    ensureLive();
    return () => { listeners.delete(setC); };
  }, []);
  return c;
}
