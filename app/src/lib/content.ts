/**
 * Site content edited in the web admin (/admin) → used by the app.
 * Reads the `site_content` row from Supabase; falls back to the same defaults the website uses.
 * Image values can be bundled paths ("assets/img/…"), uploaded Storage URLs, or data URLs.
 */
import { useEffect, useState } from "react";
import { C, IMG } from "@/theme";
import { supabase } from "./supabase";
import { campaignKey, eventKey, groupKey } from "./keys";
import { CAMPAIGNS, CHURCH, EVENTS, GROUPS, PROMOS, Promo, VERSES, Verse } from "@/data/mock";

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
  "assets/img/bible-coffee.jpg": require("../../assets/images/bible-coffee.jpg"),
  "assets/img/bible-dark.jpg": require("../../assets/images/bible-dark.jpg"),
  "assets/img/bricks.jpg": require("../../assets/images/bricks.jpg"),
  "assets/img/campfire.jpg": require("../../assets/images/campfire.jpg"),
  "assets/img/candle-hands.jpg": require("../../assets/images/candle-hands.jpg"),
  "assets/img/city-night.jpg": require("../../assets/images/city-night.jpg"),
  "assets/img/concert-lights.jpg": require("../../assets/images/concert-lights.jpg"),
  "assets/img/cross-dusk.jpg": require("../../assets/images/cross-dusk.jpg"),
  "assets/img/cross-hill-sunset.jpg": require("../../assets/images/cross-hill-sunset.jpg"),
  "assets/img/cross-mountain.jpg": require("../../assets/images/cross-mountain.jpg"),
  "assets/img/dove.jpg": require("../../assets/images/dove.jpg"),
  "assets/img/friends-teal.jpg": require("../../assets/images/friends-teal.jpg"),
  "assets/img/girl-praying-light.jpg": require("../../assets/images/girl-praying-light.jpg"),
  "assets/img/hand-sunset.jpg": require("../../assets/images/hand-sunset.jpg"),
  "assets/img/hands-stack.jpg": require("../../assets/images/hands-stack.jpg"),
  "assets/img/hands-together.jpg": require("../../assets/images/hands-together.jpg"),
  "assets/img/kids-play.jpg": require("../../assets/images/kids-play.jpg"),
  "assets/img/man-reading.jpg": require("../../assets/images/man-reading.jpg"),
  "assets/img/microphone.jpg": require("../../assets/images/microphone.jpg"),
  "assets/img/mountain-open-arms.jpg": require("../../assets/images/mountain-open-arms.jpg"),
  "assets/img/mountain-peaks.jpg": require("../../assets/images/mountain-peaks.jpg"),
  "assets/img/mug-bible.jpg": require("../../assets/images/mug-bible.jpg"),
  "assets/img/neon-cross.jpg": require("../../assets/images/neon-cross.jpg"),
  "assets/img/phone-hand.jpg": require("../../assets/images/phone-hand.jpg"),
  "assets/img/sunrise-silhouettes.jpg": require("../../assets/images/sunrise-silhouettes.jpg"),
  "assets/img/team-meeting.jpg": require("../../assets/images/team-meeting.jpg"),
  "assets/img/three-friends.jpg": require("../../assets/images/three-friends.jpg"),
  "assets/img/white-chapel.jpg": require("../../assets/images/white-chapel.jpg"),
  "assets/img/woman-forest.jpg": require("../../assets/images/woman-forest.jpg"),
  "assets/img/woman-praying.jpg": require("../../assets/images/woman-praying.jpg"),
  "assets/img/women-laughing.jpg": require("../../assets/images/women-laughing.jpg"),
  "assets/img/worship-orange.jpg": require("../../assets/images/worship-orange.jpg"),
  "assets/img/worship-pink.jpg": require("../../assets/images/worship-pink.jpg"),
  "assets/img/worship-teal.jpg": require("../../assets/images/worship-teal.jpg"),
};
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "").replace(/\/$/, "");

/** Turns a stored image value into an expo-image source. */
export function imageSource(p?: string | null, fallback: any = IMG.homeWorship) {
  if (!p) return fallback;
  if (/^(https?:|data:)/.test(p)) return { uri: p };
  if (BUNDLED[p]) return BUNDLED[p];
  if (SITE_URL) return { uri: `${SITE_URL}/${p.replace(/^\//, "")}` };
  return fallback;
}

export type HeroContent = { kicker: string; line1: string; words: string[]; slides: { image: any; caption: string }[] };
export type EventItem = { id: string; key: string; title: string; day: string; month: string; weekday: string; time: string; place: string; tags: string[]; image: any; color: string };
export type GroupItem = { id: string; key: string; name: string; text?: string; meets: string; members: number; color: string; image: any };
export type CampaignItem = { id: string; key: string; title: string; accent: string; body: string; raised: number; goal: number; image: any; color: string };
export type ChurchInfo = typeof CHURCH & { phone?: string; whatsapp?: string; email?: string };
export type AppContent = {
  hero: HeroContent; promos: Promo[]; events: EventItem[]; groups: GroupItem[]; campaigns: CampaignItem[];
  announcement?: { title: string; text: string; link: string }; gallery: { image: any; caption: string }[]; verses: Verse[];
  church: ChurchInfo; stats: { members: number; nations: number; rides: number; drivers: number; prayers: number };
};

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
  events: EVENTS.map((e) => ({ ...e, key: eventKey(e), id: eventKey(e) })),
  groups: GROUPS.map((g) => ({ ...g, key: groupKey(g.name), id: groupKey(g.name) })),
  campaigns: CAMPAIGNS.map((c) => ({ ...c, key: campaignKey(c), id: campaignKey(c) })),
  gallery: [],
  verses: VERSES,
  church: CHURCH,
  stats: { members: 2400, nations: 31, rides: 1286, drivers: 64, prayers: 18432 },
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
const PALETTE = [C.flame, C.violet, C.rose, C.sun, C.mint, C.sky];

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
  if (Array.isArray(d.events)) {
    out.events = d.events.map((e: any, i: number) => {
      const key = eventKey(e);
      return {
        id: key, key, title: e.title || "Event", day: e.day || "", month: String(e.month || "").toUpperCase(), weekday: e.weekday || "",
        time: e.meta || "", place: "", tags: String(e.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean), image: imageSource(e.image), color: PALETTE[i % 5],
      };
    });
  }
  if (Array.isArray(d.ministries)) {
    out.groups = d.ministries.filter((m: any) => m && m.name).map((m: any) => {
      const key = groupKey(m.name);
      return { id: key, key, name: m.name, text: m.text || "", meets: m.chip || "", members: 0, color: m.color || C.flame, image: imageSource(m.image) };
    });
  }
  if (Array.isArray(d.campaigns)) {
    out.campaigns = d.campaigns.map((c: any, i: number) => {
      const key = campaignKey(c);
      return { id: key, key, title: c.title || "", accent: c.accent || "", body: c.body || "", raised: Number(c.raised) || 0, goal: Number(c.goal) || 1, image: imageSource(c.image), color: c.color || PALETTE[i % 6] };
    });
  }
  if (Array.isArray(d.gallery)) out.gallery = d.gallery.map((g: any) => ({ image: imageSource(g.image), caption: g.caption || "" }));
  if (Array.isArray(d.verses) && d.verses.some((v: any) => v && v.text)) {
    out.verses = d.verses.filter((v: any) => v && v.text).map((v: any, i: number) => ({
      text: String(v.text), ref: v.ref || "", translation: v.translation || "", theme: v.theme || "",
      image: imageSource(v.image, VERSES[i % VERSES.length].image),
    }));
  }
  if (d.church) {
    const c = d.church;
    out.church = {
      ...CHURCH,
      name: c.name || CHURCH.name, short: c.short || CHURCH.short, address: c.address || CHURCH.address, mapsUrl: c.mapsUrl || CHURCH.mapsUrl,
      youtubeChannelId: c.youtubeChannelId || CHURCH.youtubeChannelId, youtubeUrl: c.youtube || CHURCH.youtubeUrl, currency: c.currency || CHURCH.currency,
      tzOffsetHours: Number.isFinite(+c.tzOffsetHours) ? +c.tzOffsetHours : CHURCH.tzOffsetHours, phone: c.phone || "", whatsapp: c.whatsapp || "", email: c.email || "",
      coords: Number(c.lat) && Number(c.lng) ? { latitude: Number(c.lat), longitude: Number(c.lng) } : CHURCH.coords,
    };
  }
  if (Array.isArray(d.services) && d.services.length) {
    out.church = { ...out.church, services: d.services.map((s: any) => ({ day: +s.day || 0, h: +s.h || 0, m: +s.m || 0, label: s.label || "Service", time: s.time || "" })) };
  }
  if (d.stats) out.stats = { ...DEFAULT.stats, ...Object.fromEntries(Object.entries(d.stats).map(([k, v]) => [k, Number(v) || 0])) };
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

/** Latest content without subscribing (for helpers outside React). */
export const currentContent = () => cache || DEFAULT;
