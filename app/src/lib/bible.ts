/**
 * Bible text: public-domain translations served by bolls.life (free, no key), cached on the phone so a chapter
 * you've opened once reads offline. Book names come from the translation itself, so the Hindi, Malayalam,
 * Tamil and Arabic Bibles show their own book names.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export const BIBLE_API = process.env.EXPO_PUBLIC_BIBLE_API || "https://bolls.life";

export type Translation = { code: string; name: string; short: string; lang: "en" | "hi" | "ml" | "ta" | "ar"; rtl?: boolean };
export const TRANSLATIONS: Translation[] = [
  { code: "WEB", short: "WEB", name: "World English Bible", lang: "en" },
  { code: "KJV", short: "KJV", name: "King James Version", lang: "en" },
  { code: "BSB", short: "BSB", name: "Berean Standard Bible", lang: "en" },
  { code: "ASV", short: "ASV", name: "American Standard Version", lang: "en" },
  { code: "YLT", short: "YLT", name: "Young's Literal Translation", lang: "en" },
  { code: "HIOV", short: "हिन्दी", name: "Hindi O.V. (BSI)", lang: "hi" },
  { code: "MOV", short: "മലയാളം", name: "സത്യവേദപുസ്തകം O.V.", lang: "ml" },
  { code: "TBSI", short: "தமிழ்", name: "Tamil O.V. (BSI)", lang: "ta" },
  { code: "SVD", short: "العربية", name: "Smith & Van Dyke", lang: "ar", rtl: true },
];
export const translation = (code: string) => TRANSLATIONS.find((x) => x.code === code) || TRANSLATIONS[0];

// [name, chapters, aliases]
const RAW: [string, number, string][] = [
  ["Genesis", 50, "gen ge gn"], ["Exodus", 40, "exod ex exo"], ["Leviticus", 27, "lev le lv"], ["Numbers", 36, "num nu nm"], ["Deuteronomy", 34, "deut dt de"],
  ["Joshua", 24, "josh jos"], ["Judges", 21, "judg jdg"], ["Ruth", 4, "ru rth"], ["1 Samuel", 31, "1sam 1sa"], ["2 Samuel", 24, "2sam 2sa"],
  ["1 Kings", 22, "1kgs 1ki"], ["2 Kings", 25, "2kgs 2ki"], ["1 Chronicles", 29, "1chr 1ch"], ["2 Chronicles", 36, "2chr 2ch"], ["Ezra", 10, "ezr"],
  ["Nehemiah", 13, "neh ne"], ["Esther", 10, "esth es"], ["Job", 42, "jb"], ["Psalms", 150, "psalm ps psa pss"], ["Proverbs", 31, "prov pr prv"],
  ["Ecclesiastes", 12, "eccl ecc qoh"], ["Song of Solomon", 8, "song sos songs"], ["Isaiah", 66, "isa is"], ["Jeremiah", 52, "jer je"], ["Lamentations", 5, "lam la"],
  ["Ezekiel", 48, "ezek eze"], ["Daniel", 12, "dan da dn"], ["Hosea", 14, "hos ho"], ["Joel", 3, "jl"], ["Amos", 9, "am"],
  ["Obadiah", 1, "obad ob"], ["Jonah", 4, "jon"], ["Micah", 7, "mic mi"], ["Nahum", 3, "nah na"], ["Habakkuk", 3, "hab"],
  ["Zephaniah", 3, "zeph zep"], ["Haggai", 2, "hag"], ["Zechariah", 14, "zech zec"], ["Malachi", 4, "mal"],
  ["Matthew", 28, "matt mt"], ["Mark", 16, "mk mrk"], ["Luke", 24, "lk luk"], ["John", 21, "jn jhn joh"], ["Acts", 28, "ac act"],
  ["Romans", 16, "rom ro rm"], ["1 Corinthians", 16, "1cor 1co"], ["2 Corinthians", 13, "2cor 2co"], ["Galatians", 6, "gal ga"], ["Ephesians", 6, "eph"],
  ["Philippians", 4, "phil php"], ["Colossians", 4, "col"], ["1 Thessalonians", 5, "1thess 1th"], ["2 Thessalonians", 3, "2thess 2th"], ["1 Timothy", 6, "1tim 1ti"],
  ["2 Timothy", 4, "2tim 2ti"], ["Titus", 3, "tit"], ["Philemon", 1, "phlm phm"], ["Hebrews", 13, "heb"], ["James", 5, "jas jm"],
  ["1 Peter", 5, "1pet 1pe"], ["2 Peter", 3, "2pet 2pe"], ["1 John", 5, "1jn 1jo"], ["2 John", 1, "2jn 2jo"], ["3 John", 1, "3jn 3jo"],
  ["Jude", 1, "jud"], ["Revelation", 22, "rev re rv revelations"],
];
export type Book = { id: number; name: string; chapters: number; testament: "OT" | "NT" };
export const BOOKS: Book[] = RAW.map(([name, chapters], i) => ({ id: i + 1, name, chapters, testament: i < 39 ? "OT" : "NT" }));
const ALIAS = new Map<string, number>();
RAW.forEach(([name, , aliases], i) => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  ALIAS.set(norm(name), i + 1);
  aliases.split(" ").forEach((a) => a && ALIAS.set(norm(a), i + 1));
});
ALIAS.set("songofsongs", 22);
export const book = (id: number) => BOOKS[Math.max(0, Math.min(65, id - 1))];

export type Ref = { book: number; chapter: number; from?: number; to?: number };
/** "John 3:16", "Psalm 23", "1 Cor 13:4-7", "Ps 119:105" → { book, chapter, from, to } */
export function parseRef(s: string): Ref | null {
  const m = String(s || "").trim().match(/^((?:[123]\s*)?[A-Za-z][A-Za-z .]*?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return null;
  const id = ALIAS.get(m[1].toLowerCase().replace(/[^a-z0-9]/g, ""));
  if (!id) return null;
  const chapter = Math.min(Number(m[2]), BOOKS[id - 1].chapters);
  return { book: id, chapter, from: m[3] ? Number(m[3]) : undefined, to: m[4] ? Number(m[4]) : m[3] ? Number(m[3]) : undefined };
}
export const refLabel = (r: Ref, names?: Record<number, string>) =>
  `${names?.[r.book] || book(r.book).name} ${r.chapter}${r.from ? `:${r.from}${r.to && r.to !== r.from ? `–${r.to}` : ""}` : ""}`;

/* ---------------------------------------------------------------- text */
export type Verse = { verse: number; text: string };
const clean = (s: string) =>
  String(s || "")
    .replace(/<S>\d+<\/S>/g, "")         // Strong's numbers (KJV)
    .replace(/<sup>.*?<\/sup>/g, "")      // footnote markers
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

const mem = new Map<string, Verse[]>();
const KEY = (tr: string, b: number, c: number) => `agape.bible.${tr}.${b}.${c}`;

export async function getChapter(tr: string, b: number, c: number): Promise<Verse[]> {
  const k = KEY(tr, b, c);
  if (mem.has(k)) return mem.get(k)!;
  const cached = await AsyncStorage.getItem(k).catch(() => null);
  if (cached) { const v = JSON.parse(cached); mem.set(k, v); return v; }
  const r = await fetch(`${BIBLE_API}/get-text/${tr}/${b}/${c}/`);
  if (!r.ok) throw new Error(`Bible text unavailable (${r.status})`);
  const rows: any[] = await r.json();
  const verses = rows.map((x) => ({ verse: Number(x.verse), text: clean(x.text) })).filter((v) => v.text).sort((a, b2) => a.verse - b2.verse);
  if (!verses.length) throw new Error("This chapter isn't in this translation");
  mem.set(k, verses);
  AsyncStorage.setItem(k, JSON.stringify(verses)).catch(() => {});
  return verses;
}

const namesMem = new Map<string, Record<number, string>>();
export async function getBookNames(tr: string): Promise<Record<number, string>> {
  if (translation(tr).lang === "en") return {};
  if (namesMem.has(tr)) return namesMem.get(tr)!;
  const k = `agape.bible.books.${tr}`;
  const cached = await AsyncStorage.getItem(k).catch(() => null);
  if (cached) { const v = JSON.parse(cached); namesMem.set(tr, v); return v; }
  try {
    const rows: any[] = await (await fetch(`${BIBLE_API}/get-books/${tr}/`)).json();
    const out: Record<number, string> = {};
    rows.forEach((x) => { if (x.bookid <= 66) out[x.bookid] = String(x.name).trim(); });
    namesMem.set(tr, out);
    AsyncStorage.setItem(k, JSON.stringify(out)).catch(() => {});
    return out;
  } catch { return {}; }
}

export function useChapter(tr: string, b: number, c: number) {
  const [state, set] = useState<{ verses: Verse[]; loading: boolean; error: string | null }>({ verses: [], loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    set((s) => ({ ...s, loading: true, error: null }));
    getChapter(tr, b, c)
      .then((v) => alive && set({ verses: v, loading: false, error: null }))
      .catch((e) => alive && set({ verses: [], loading: false, error: e.message || "Couldn't load this chapter" }));
    // quietly fetch the next chapter so "next" is instant and works offline
    const nb = c < book(b).chapters ? [b, c + 1] : b < 66 ? [b + 1, 1] : null;
    if (nb) setTimeout(() => getChapter(tr, nb[0], nb[1]).catch(() => {}), 1500);
    return () => { alive = false; };
  }, [tr, b, c, n]);
  return { ...state, retry: () => setN((x) => x + 1) };
}
export function useBookNames(tr: string) {
  const [names, setNames] = useState<Record<number, string>>(namesMem.get(tr) || {});
  useEffect(() => { let a = true; getBookNames(tr).then((v) => a && setNames(v)); return () => { a = false; }; }, [tr]);
  return names;
}

/** Text of a reference range, joined ("For God so loved…"). */
export async function passage(tr: string, ref: Ref): Promise<string> {
  const v = await getChapter(tr, ref.book, ref.chapter);
  const from = ref.from || 1, to = ref.to || ref.from || v.length;
  return v.filter((x) => x.verse >= from && x.verse <= to).map((x) => x.text).join(" ");
}

/* ---------------------------------------------------------------- verse of the day */
const VOTD = [
  "John 3:16", "Psalm 23:1", "Philippians 4:13", "Jeremiah 29:11", "Romans 8:28", "Proverbs 3:5-6", "Isaiah 41:10", "Joshua 1:9",
  "Matthew 11:28", "Psalm 46:10", "2 Corinthians 5:17", "Galatians 2:20", "Romans 12:2", "Psalm 119:105", "Isaiah 40:31", "Matthew 6:33",
  "1 Corinthians 13:4-7", "Ephesians 2:8-9", "Hebrews 11:1", "Psalm 37:4", "Lamentations 3:22-23", "John 14:6", "Romans 5:8", "Psalm 91:1-2",
  "Philippians 4:6-7", "James 1:5", "1 Peter 5:7", "Micah 6:8", "Zephaniah 3:17", "Psalm 139:14", "Colossians 3:23",
];
export function verseOfDay(d = new Date()): Ref {
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  return parseRef(VOTD[day % VOTD.length])!;
}

/* ---------------------------------------------------------------- reading position */
const POS = "agape.bible.pos";
export type Position = { tr: string; book: number; chapter: number };
export async function lastPosition(defTr: string): Promise<Position> {
  try { const p = JSON.parse((await AsyncStorage.getItem(POS)) || "null"); if (p?.book) return p; } catch {}
  return { tr: defTr, book: 43, chapter: 1 };
}
export const savePosition = (p: Position) => AsyncStorage.setItem(POS, JSON.stringify(p)).catch(() => {});

export const HIGHLIGHTS = ["#FFE07A", "#B8F0C8", "#BFE3FF", "#FFC7DE", "#E0D2FF"];
