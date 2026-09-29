import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** null when the app runs in demo mode (no backend configured yet). */
export const supabase: SupabaseClient | null =
  url && anon && !url.includes("YOUR-PROJECT")
    ? createClient(url, anon, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
    : null;

export const isLive = !!supabase;
