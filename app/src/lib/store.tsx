/**
 * Session + member data.
 *
 * Live mode (Supabase configured): real accounts (e-mail code, Google, Apple), and everything a member
 * does — saved sermons, RSVPs, lesson progress, notes, scores, settings — is written to the database.
 * Guests can look around; anything personal asks them to sign in first.
 *
 * Demo mode (no backend yet): the sign-in buttons open the app with demo data, and member data is kept
 * on the device so the app still feels real in a showroom.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { supabase, isLive } from "./supabase";
import { forgetPushToken, registerForPush } from "./push";

WebBrowser.maybeCompleteAuthSession();

export type Role = "member" | "volunteer" | "staff" | "admin";
export type Settings = { faceId: boolean; notifications: boolean; largeText: boolean; kidsMode: boolean; language: string };
export type Profile = {
  id: string; full_name: string | null; email: string | null; phone: string | null; role: Role; member_no: string | null;
  vehicle: string | null; avatar_url: string | null; created_at: string; settings: Partial<Settings>; notifications_seen_at: string;
};

const DEFAULT_SETTINGS: Settings = { faceId: false, notifications: true, largeText: false, kidsMode: false, language: "English" };
const LOCAL_KEY = "agape.local.v2";
const today = () => new Date().toISOString().slice(0, 10);

type State = {
  ready: boolean;
  live: boolean;
  session: Session | null;
  profile: Profile | null;
  /** In the app (member, guest or demo). */
  signedIn: boolean;
  /** Has a real account (or is in demo mode) — can post, pray, RSVP… */
  member: boolean;
  guest: boolean;
  isVolunteer: boolean;
  isStaff: boolean;
  name: string;
  firstName: string;
  // auth
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signInWith: (provider: "google" | "apple") => Promise<boolean>;
  continueAsGuest: () => void;
  demoSignIn: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "full_name" | "phone" | "vehicle" | "avatar_url">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Returns true (and offers sign-in) when a guest tries something that needs an account. */
  needsAccount: (what: string) => boolean;
  // member data
  saved: Set<string>;
  toggleSaved: (videoId: string) => void;
  rsvps: Set<string>;
  toggleRsvp: (eventKey: string, title?: string) => boolean;
  praying: Set<string>;
  markPraying: (id: string) => void;
  notes: Record<string, string>;
  setNote: (videoId: string, body: string) => void;
  done: Set<string>;
  completeLesson: (lessonId: string) => void;
  score: number;
  addScore: (game: "verse_match" | "trivia", n: number) => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  activeDays: string[];
  markActive: () => void;
};

const Ctx = createContext<State>(null as any);

const toggleIn = (set: Set<string>, id: string) => {
  const n = new Set(set);
  n.has(id) ? n.delete(id) : n.add(id);
  return n;
};
const warn = (e: any) => { if (e) console.warn("[agape]", e.message || e); };

type Local = { guest?: boolean; demo?: boolean; saved?: string[]; rsvps?: string[]; praying?: string[]; notes?: Record<string, string>; done?: string[]; settings?: Partial<Settings>; activeDays?: string[]; score?: number };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guest, setGuest] = useState(false);
  const [demo, setDemo] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [rsvps, setRsvps] = useState<Set<string>>(new Set());
  const [praying, setPraying] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const noteTimers = useRef<Record<string, any>>({});
  const uid = session?.user.id ?? null;

  // ---- restore device state + session
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        const l: Local = raw ? JSON.parse(raw) : {};
        setGuest(!!l.guest); setDemo(!!l.demo);
        setSaved(new Set(l.saved || [])); setRsvps(new Set(l.rsvps || [])); setPraying(new Set(l.praying || []));
        setNotes(l.notes || {}); setDone(new Set(l.done || [])); setScore(l.score || 0);
        setLocalSettings({ ...DEFAULT_SETTINGS, ...(l.settings || {}) }); setActiveDays(l.activeDays || []);
      } catch {}
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      }
      setReady(true);
    })();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- persist device state (guests + demo; members keep a copy for offline start-up)
  useEffect(() => {
    if (!ready) return;
    const l: Local = { guest, demo, saved: [...saved], rsvps: [...rsvps], praying: [...praying], notes, done: [...done], settings: localSettings, activeDays: activeDays.slice(-60), score };
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(l)).catch(() => {});
  }, [ready, guest, demo, saved, rsvps, praying, notes, done, localSettings, activeDays, score]);

  // ---- load the member's data when they sign in
  const refreshProfile = useCallback(async () => {
    if (!supabase || !uid) { setProfile(null); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    warn(error);
    if (data) setProfile(data as Profile);
  }, [uid]);

  useEffect(() => {
    if (!supabase || !uid) { setProfile(null); return; }
    setGuest(false);
    let cancelled = false;
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [p, sv, rv, lp, sn, gs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("saved_videos").select("video_id"),
        supabase.from("event_rsvps").select("event_key").eq("user_id", uid),
        supabase.from("lesson_progress").select("lesson_id"),
        supabase.from("sermon_notes").select("video_id, body"),
        supabase.from("game_scores").select("points").eq("user_id", uid).gte("created_at", weekAgo),
      ]);
      if (cancelled) return;
      if (p.data) setProfile(p.data as Profile);
      if (sv.data) setSaved(new Set(sv.data.map((r: any) => r.video_id)));
      if (rv.data) setRsvps(new Set(rv.data.map((r: any) => r.event_key)));
      if (lp.data) setDone(new Set(lp.data.map((r: any) => r.lesson_id)));
      if (sn.data) setNotes(Object.fromEntries(sn.data.map((r: any) => [r.video_id, r.body])));
      if (gs.data) setScore(gs.data.reduce((a: number, r: any) => a + r.points, 0));
    })().catch(warn);
    return () => { cancelled = true; };
  }, [uid]);

  const settings: Settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...localSettings, ...(profile?.settings || {}) }), [localSettings, profile]);

  // ---- push notifications for signed-in members
  useEffect(() => {
    if (uid && settings.notifications) registerForPush().catch(warn);
  }, [uid, settings.notifications]);

  const signedIn = isLive ? !!session || guest : demo || guest;

  const needsAccount = useCallback((what: string) => {
    if (!isLive || session) return false;
    Alert.alert("Sign in to continue", `Create a free account to ${what}. It takes a few seconds with your e-mail.`, [
      { text: "Not now", style: "cancel" },
      { text: "Sign in", onPress: () => router.push("/welcome") },
    ]);
    return true;
  }, [session]);

  // ---- auth
  const sendCode = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL("auth-callback") } });
    if (error) throw error;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    if (error) throw error;
  }, []);

  const signInWith = useCallback(async (provider: "google" | "apple") => {
    if (!supabase) { setDemo(true); return true; }
    if (provider === "apple" && Platform.OS === "ios") {
      // Native Sign in with Apple on iPhone
      const Apple = await import("expo-apple-authentication");
      if (await Apple.isAvailableAsync()) {
        try {
          const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL] });
          if (!cred.identityToken) throw new Error("Apple didn't return a token");
          const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
          if (error) throw error;
          const full = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ");
          if (full) { const { data } = await supabase.auth.getUser(); if (data.user) await supabase.from("profiles").update({ full_name: full }).eq("id", data.user.id); }
          return true;
        } catch (e: any) {
          if (e?.code === "ERR_REQUEST_CANCELED") return false;
          throw e;
        }
      }
    }
    // Google (and Apple on Android/web) through the browser, PKCE
    const redirectTo = Linking.createURL("auth-callback");
    if (Platform.OS === "web") {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
      if (error) throw error;
      return false;
    }
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success") return false;
    const q = (Linking.parse(res.url).queryParams || {}) as Record<string, string>;
    const code = q.code;
    if (!code) throw new Error(q.error_description || "Sign-in was cancelled");
    const ex = await supabase.auth.exchangeCodeForSession(code);
    if (ex.error) throw ex.error;
    return true;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase && session) {
      await forgetPushToken().catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    }
    setGuest(false); setDemo(false); setProfile(null);
    setSaved(new Set()); setRsvps(new Set()); setDone(new Set()); setNotes({}); setPraying(new Set()); setScore(0);
  }, [session]);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) { await signOut(); return; }
    await forgetPushToken().catch(() => {});
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    await supabase.auth.signOut().catch(() => {});
    await signOut();
  }, [session, signOut]);

  const updateProfile = useCallback(async (patch: Partial<Pick<Profile, "full_name" | "phone" | "vehicle" | "avatar_url">>) => {
    if (!supabase || !uid) return;
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", uid).select().single();
    if (error) throw error;
    setProfile(data as Profile);
  }, [uid]);

  // ---- member data (write-through when signed in)
  const toggleSaved = useCallback((id: string) => {
    if (needsAccount("save sermons")) return;
    const on = !saved.has(id);
    setSaved((s) => toggleIn(s, id));
    if (supabase && uid) {
      (on ? supabase.from("saved_videos").insert({ video_id: id }) : supabase.from("saved_videos").delete().eq("video_id", id)).then(({ error }) => warn(error));
    }
  }, [saved, uid, needsAccount]);

  const toggleRsvp = useCallback((key: string, title?: string) => {
    if (needsAccount("RSVP to events")) return rsvps.has(key);
    const on = !rsvps.has(key);
    setRsvps((s) => toggleIn(s, key));
    if (supabase && uid) {
      (on
        ? supabase.from("event_rsvps").upsert({ event_key: key, event_title: title ?? null }, { onConflict: "event_key,user_id" })
        : supabase.from("event_rsvps").delete().eq("event_key", key).eq("user_id", uid)
      ).then(({ error }) => warn(error));
    }
    return on;
  }, [rsvps, uid, needsAccount]);

  const markPraying = useCallback((id: string) => setPraying((s) => new Set(s).add(id)), []);

  const setNote = useCallback((videoId: string, body: string) => {
    setNotes((n) => ({ ...n, [videoId]: body }));
    if (!supabase || !uid) return;
    clearTimeout(noteTimers.current[videoId]);
    noteTimers.current[videoId] = setTimeout(() => {
      supabase!.from("sermon_notes").upsert({ video_id: videoId, body, updated_at: new Date().toISOString() }, { onConflict: "user_id,video_id" }).then(({ error }) => warn(error));
    }, 800);
  }, [uid]);

  const markActive = useCallback(() => {
    const d = today();
    setActiveDays((a) => (a.includes(d) ? a : [...a, d].slice(-60)));
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setDone((s) => new Set(s).add(lessonId));
    markActive();
    if (supabase && uid) supabase.from("lesson_progress").upsert({ lesson_id: lessonId, completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" }).then(({ error }) => warn(error));
  }, [uid, markActive]);

  const addScore = useCallback((game: "verse_match" | "trivia", n: number) => {
    setScore((s) => s + n);
    markActive();
    if (supabase && uid) supabase.from("game_scores").insert({ game, points: Math.max(0, Math.min(1000, Math.round(n))) }).then(({ error }) => warn(error));
  }, [uid, markActive]);

  const setSetting = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setLocalSettings((s) => ({ ...s, [k]: v }));
    if (supabase && uid && profile) {
      const next = { ...(profile.settings || {}), [k]: v };
      setProfile({ ...profile, settings: next });
      supabase.from("profiles").update({ settings: next }).eq("id", uid).then(({ error }) => warn(error));
      if (k === "notifications" && !v) forgetPushToken().catch(() => {});
    }
  }, [uid, profile]);

  const name = profile?.full_name || (isLive ? (session?.user.email?.split("@")[0] ?? "Friend") : demo ? "Sarah Mathews" : "Friend");
  const role = profile?.role ?? (demo && !isLive ? "volunteer" : "member");

  const value = useMemo<State>(() => ({
    ready, live: isLive, session, profile,
    signedIn, member: isLive ? !!session : demo, guest: isLive ? !session && guest : guest,
    isVolunteer: ["volunteer", "staff", "admin"].includes(role), isStaff: ["staff", "admin"].includes(role),
    name, firstName: name.split(" ")[0],
    sendCode, verifyCode, signInWith,
    continueAsGuest: () => setGuest(true),
    demoSignIn: () => setDemo(true),
    signOut, deleteAccount, updateProfile, refreshProfile, needsAccount,
    saved, toggleSaved, rsvps, toggleRsvp, praying, markPraying, notes, setNote, done, completeLesson,
    score, addScore, settings, setSetting, activeDays, markActive,
  }), [ready, session, profile, signedIn, demo, guest, role, name, sendCode, verifyCode, signInWith, signOut, deleteAccount, updateProfile, refreshProfile, needsAccount,
    saved, toggleSaved, rsvps, toggleRsvp, praying, markPraying, notes, setNote, done, completeLesson, score, addScore, settings, setSetting, activeDays, markActive]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

/** Days in a row (ending today or yesterday) with activity in the app. */
export function streakOf(days: string[]) {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
