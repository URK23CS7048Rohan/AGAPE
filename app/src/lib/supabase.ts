import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when the build has the Supabase URL + anon key (see app/.env.example). */
export const isConfigured = !!(url && anon && !url.includes("YOUR-PROJECT"));
export const isLive = isConfigured;

/**
 * The app's single Supabase client. When the build isn't configured the root layout shows a
 * "not connected" screen instead of any content, so screens can use this without null checks.
 */
export const supabase: SupabaseClient = createClient(isConfigured ? url! : "https://not-configured.invalid", isConfigured ? anon! : "not-configured", {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh the session only while the app is in the foreground (Supabase's recommended setup for React Native).
AppState.addEventListener("change", (s) => {
  if (!isConfigured) return;
  if (s === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
