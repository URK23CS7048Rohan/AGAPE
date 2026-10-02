/**
 * Bible marks (highlights, bookmarks, notes), reader settings and the song book.
 * Marks sync to Supabase for signed-in members and stay on the phone for guests.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

/* ---------------------------------------------------------------- reader settings */
export type ReaderPrefs = { tr: string; size: number; rate: number };
const PREFS = "agape.bible.prefs";
const DEF: ReaderPrefs = { tr: "WEB", size: 19, rate: 1 };
let prefsMem: ReaderPrefs | null = null;
const listeners = new Set<(p: ReaderPrefs) => void>();

export function useReaderPrefs() {
  const [p, setP] = useState<ReaderPrefs>(prefsMem || DEF);
  useEffect(() => {
    listeners.add(setP);
    if (!prefsMem) AsyncStorage.getItem(PREFS).then((s) => { prefsMem = { ...DEF, ...(s ? JSON.parse(s) : {}) }; listeners.forEach((f) => f(prefsMem!)); }).catch(() => {});
    return () => { listeners.delete(setP); };
  }, []);
  const set = useCallback((patch: Partial<ReaderPrefs>) => {
    prefsMem = { ...(prefsMem || DEF), ...patch };
    AsyncStorage.setItem(PREFS, JSON.stringify(prefsMem)).catch(() => {});
    listeners.forEach((f) => f(prefsMem!));
  }, []);
  return [p, set] as const;
}

/* ---------------------------------------------------------------- marks */
export type MarkKind = "highlight" | "bookmark" | "note";
export type Mark = { id?: string; kind: MarkKind; book: number; chapter: number; verse: number; color?: string | null; note?: string | null; translation?: string | null; verse_text?: string | null; created_at?: string };
const LOCAL = "agape.bible.marks";
const k = (m: { kind: string; book: number; chapter: number; verse: number }) => `${m.kind}.${m.book}.${m.chapter}.${m.verse}`;
let marksMem: Map<string, Mark> | null = null;
const markListeners = new Set<() => void>();
const notify = () => markListeners.forEach((f) => f());

async function loadMarks(signedIn: boolean) {
  const map = new Map<string, Mark>();
  if (signedIn) {
    const { data, error } = await supabase.from("bible_marks").select("id, kind, book, chapter, verse, color, note, translation, verse_text, created_at").order("created_at", { ascending: false });
    if (!error) (data || []).forEach((m: any) => map.set(k(m), m));
  } else {
    try { (JSON.parse((await AsyncStorage.getItem(LOCAL)) || "[]") as Mark[]).forEach((m) => map.set(k(m), m)); } catch {}
  }
  marksMem = map; notify();
}
const saveLocal = () => AsyncStorage.setItem(LOCAL, JSON.stringify([...(marksMem?.values() || [])])).catch(() => {});

export function useMarks() {
  const { signedIn } = useAuth();
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((x) => x + 1);
    markListeners.add(f);
    loadMarks(signedIn);
    return () => { markListeners.delete(f); };
  }, [signedIn]);
  const get = (kind: MarkKind, book: number, chapter: number, verse: number) => marksMem?.get(k({ kind, book, chapter, verse }));
  const all = () => [...(marksMem?.values() || [])].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  async function put(m: Mark) {
    const row = { ...m, created_at: m.created_at || new Date().toISOString() };
    marksMem?.set(k(m), row); notify();
    if (signedIn) {
      const { id, created_at, ...rest } = row;
      const { data, error } = await supabase.from("bible_marks").upsert(rest, { onConflict: "user_id,kind,book,chapter,verse" }).select("id").single();
      if (error) throw new Error(error.message);
      row.id = data.id;
    } else saveLocal();
  }
  async function remove(kind: MarkKind, book: number, chapter: number, verse: number) {
    const cur = marksMem?.get(k({ kind, book, chapter, verse }));
    marksMem?.delete(k({ kind, book, chapter, verse })); notify();
    if (signedIn) await supabase.from("bible_marks").delete().match({ kind, book, chapter, verse });
    else saveLocal();
    return cur;
  }
  return { get, all, put, remove };
}

/* ---------------------------------------------------------------- songs */
export type Song = { id: string; slug: string; title: string; author: string | null; original_key: string; tempo: number | null; time_sig: string | null; tags: string[]; body: string; youtube_id: string | null; copyright: string | null };
const SONG_COLS = "id, slug, title, author, original_key, tempo, time_sig, tags, body, youtube_id, copyright";

export async function listSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from("songs").select(SONG_COLS).eq("published", true).order("position").order("title");
  if (error) throw new Error(error.message);
  return (data || []) as Song[];
}
export async function getSong(slug: string): Promise<Song | null> {
  const { data, error } = await supabase.from("songs").select(SONG_COLS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Song | null;
}
