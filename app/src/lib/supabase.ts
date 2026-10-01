import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

/** null when the app runs in demo mode (no backend configured yet). */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR-PROJECT")
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
          flowType: "pkce",
        },
      })
    : null;

export const isLive = !!supabase;

/** Plain fetch to an Edge Function (used where supabase.functions.invoke can't pass a query string). */
export async function callFunction(name: string, init: { method?: string; body?: any; query?: Record<string, string> } = {}) {
  if (!supabase) throw new Error("offline");
  const { data } = await supabase.auth.getSession();
  const qs = init.query ? "?" + new URLSearchParams(init.query).toString() : "";
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}${qs}`, {
    method: init.method || (init.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${data.session?.access_token || SUPABASE_ANON_KEY}`,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || `Request failed (${r.status})`);
  return json;
}
