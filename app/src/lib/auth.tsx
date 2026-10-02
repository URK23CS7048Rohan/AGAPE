/**
 * Signed-in member: Supabase session + profile, guest browsing, and device settings.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { supabase, isConfigured } from "./supabase";
import { clearCache } from "./query";

export type Role = "member" | "volunteer" | "staff" | "admin";
export type Profile = { id: string; full_name: string | null; role: Role; created_at: string; car: string | null; avatar_url: string | null };
type Settings = { faceId: boolean };

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  guest: boolean;
  signedIn: boolean;           // a real account
  canBrowse: boolean;          // account or guest
  isStaff: boolean;
  isVolunteer: boolean;
  firstName: string;
  signIn: (email: string, password: string) => Promise<void>;
  /** Opens Google in a browser sheet; resolves true when signed in, false if the person backed out. */
  signInWithGoogle: () => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirm: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  refreshProfile: () => Promise<void>;
  settings: Settings;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
};

const Ctx = createContext<Auth>(null as any);
const GUEST_KEY = "agape.guest";
const SETTINGS_KEY = "agape.settings";
const PROFILE_COLS = "id, full_name, role, created_at, car, avatar_url";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guest, setGuest] = useState(false);
  const [settings, setSettings] = useState<Settings>({ faceId: false });

  const loadProfile = useCallback(async (uid?: string) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    (async () => {
      const [g, s] = await Promise.all([AsyncStorage.getItem(GUEST_KEY), AsyncStorage.getItem(SETTINGS_KEY)]).catch(() => [null, null]);
      if (s) try { setSettings({ faceId: false, ...JSON.parse(s) }); } catch {}
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session);
      setGuest(!data.session && g === "1");
      await loadProfile(data.session?.user.id);
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) { setGuest(false); AsyncStorage.removeItem(GUEST_KEY).catch(() => {}); }
      loadProfile(s?.user.id);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<Auth>(() => {
    const role = profile?.role ?? "member";
    return {
      ready, session, profile, guest,
      signedIn: !!session,
      canBrowse: !!session || guest,
      isStaff: role === "staff" || role === "admin",
      isVolunteer: role !== "member",
      firstName: (profile?.full_name || session?.user.email || "friend").split(/[ @]/)[0],
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        clearCache();
      },
      async signInWithGoogle() {
        // Supabase does the Google OAuth dance, then sends the browser back to agape://auth-callback?code=…
        const redirectTo = Linking.createURL("auth-callback");
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
        if (error) throw error;
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type !== "success") return false;
        const back = new URL(res.url.replace("#", "?"));
        const err = back.searchParams.get("error_description");
        if (err) throw new Error(err);
        const code = back.searchParams.get("code");
        if (!code) throw new Error("Google sign-in didn't finish. Please try again.");
        const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
        if (ex) throw ex;
        clearCache();
        return true;
      },
      async signUp(name, email, password) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        if (error) throw error;
        clearCache();
        return { needsConfirm: !data.session };
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: process.env.EXPO_PUBLIC_SITE_URL || undefined });
        if (error) throw error;
      },
      async signOut() {
        await supabase.auth.signOut().catch(() => {});
        await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
        setGuest(false);
        clearCache();
      },
      continueAsGuest() {
        setGuest(true);
        AsyncStorage.setItem(GUEST_KEY, "1").catch(() => {});
      },
      refreshProfile: () => loadProfile(session?.user.id),
      settings,
      setSetting(k, v) {
        setSettings((s) => {
          const n = { ...s, [k]: v };
          AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(n)).catch(() => {});
          return n;
        });
      },
    };
  }, [ready, session, profile, guest, settings, loadProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Returns a guard: call it before an action that needs an account. Guests get a friendly prompt. */
export function useNeedsAccount() {
  const { signedIn } = useAuth();
  return useCallback((what: string) => {
    if (signedIn) return false;
    Alert.alert("Sign in to continue", `Create a free account or sign in to ${what}.`, [
      { text: "Not now", style: "cancel" },
      { text: "Sign in", onPress: () => router.push("/auth") },
    ]);
    return true;
  }, [signedIn]);
}
