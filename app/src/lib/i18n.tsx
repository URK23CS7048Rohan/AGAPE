/**
 * Multilingual UI. Every visible string goes through t("English text"); the dictionaries in src/i18n map the
 * English text to Hindi, Malayalam, Tamil and Arabic. Missing entries fall back to English.
 * The language lives in the member's settings (synced to their profile), so it follows them across devices.
 */
import React, { useEffect } from "react";
import { I18nManager, Platform, Alert } from "react-native";
import hi from "@/i18n/hi.json";
import ml from "@/i18n/ml.json";
import ta from "@/i18n/ta.json";
import ar from "@/i18n/ar.json";

export type Lang = "en" | "hi" | "ml" | "ta" | "ar";
export const LANGS: { code: Lang; name: string; english: string; speech: string; bible: string }[] = [
  { code: "en", name: "English", english: "English", speech: "en-US", bible: "WEB" },
  { code: "hi", name: "हिन्दी", english: "Hindi", speech: "hi-IN", bible: "HIOV" },
  { code: "ml", name: "മലയാളം", english: "Malayalam", speech: "ml-IN", bible: "MOV" },
  { code: "ta", name: "தமிழ்", english: "Tamil", speech: "ta-IN", bible: "TBSI" },
  { code: "ar", name: "العربية", english: "Arabic", speech: "ar-SA", bible: "SVD" },
];
const DICTS: Record<string, Record<string, string>> = { hi, ml, ta, ar };

let current: Lang = "en";
/** Old builds stored the language's English name ("English", "Hindi"…). */
export function normalizeLang(v?: string | null): Lang {
  if (!v) return "en";
  const hit = LANGS.find((l) => l.code === v || l.english.toLowerCase() === String(v).toLowerCase() || l.name === v);
  return hit ? hit.code : "en";
}
export const lang = () => current;
export const langInfo = (c: Lang = current) => LANGS.find((l) => l.code === c) || LANGS[0];
export const isRTL = () => current === "ar";

/** Translate. `vars` fills {placeholders}: t("{n} people praying", { n: 4 }). */
export function t(s: string, vars?: Record<string, string | number>): string {
  let out = (current !== "en" && DICTS[current]?.[s]) || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
  return out;
}

/** Digits stay Western (as Kuwait and India mostly use); dates use the language's month names. */
export function dateLabel(d: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const loc = current === "en" ? "en-GB" : current === "ar" ? "ar-KW-u-nu-latn" : `${current}-IN`;
  try { return d.toLocaleDateString(loc, opts); } catch { return d.toDateString(); }
}
export function timeLabel(d: Date) {
  const loc = current === "ar" ? "ar-KW-u-nu-latn" : "en-US";
  try { return d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" }); } catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }
}

/**
 * Sets the active language before children render. The whole tree is keyed by language in the root layout,
 * so every t() call re-runs when it changes.
 */
export function I18nProvider({ language, children }: { language?: string | null; children: React.ReactNode }) {
  const code = normalizeLang(language);
  current = code;
  useEffect(() => {
    const rtl = code === "ar";
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") { document.documentElement.dir = rtl ? "rtl" : "ltr"; document.documentElement.lang = code; }
      return;
    }
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      Alert.alert(t("Language changed"), t("Close and reopen Agape to switch the layout direction."));
    }
  }, [code]);
  return <>{children}</>;
}
