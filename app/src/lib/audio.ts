/**
 * Audio Bible: reads verses aloud with the phone's own voices (works offline once the chapter is cached,
 * and in every language the phone has a voice for). Plays verse by verse so the reader can highlight
 * and follow the verse being read.
 */
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { translation, Verse } from "./bible";

const VOICE: Record<string, string> = { en: "en-US", hi: "hi-IN", ml: "ml-IN", ta: "ta-IN", ar: "ar-SA" };
export const voiceFor = (tr: string) => VOICE[translation(tr).lang] || "en-US";

export async function hasVoice(lang: string) {
  try {
    const v = await Speech.getAvailableVoicesAsync();
    if (!v.length) return true; // some platforms don't list voices but still speak
    const base = lang.split("-")[0];
    return v.some((x) => x.language?.toLowerCase().startsWith(base));
  } catch { return true; }
}

/** Plays a list of verses; `current` is the verse number being read (or null when stopped). */
export function useReader(onFinished?: () => void) {
  const [current, setCurrent] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const q = useRef<{ verses: Verse[]; i: number; lang: string; rate: number; token: number }>({ verses: [], i: 0, lang: "en-US", rate: 1, token: 0 });
  const fin = useRef(onFinished); fin.current = onFinished;

  const speakAt = (i: number, token: number) => {
    const s = q.current;
    if (token !== s.token) return;
    if (i >= s.verses.length) { setCurrent(null); fin.current?.(); return; }
    s.i = i;
    setCurrent(s.verses[i].verse);
    Speech.speak(s.verses[i].text, {
      language: s.lang,
      rate: s.rate,
      onDone: () => speakAt(i + 1, token),
      onError: () => { setCurrent(null); },
    });
  };
  const play = (verses: Verse[], from = 0, lang = "en-US", rate = 1) => {
    Speech.stop();
    const token = q.current.token + 1;
    q.current = { verses, i: from, lang, rate, token };
    setPaused(false);
    speakAt(from, token);
  };
  const stop = () => { q.current.token++; Speech.stop(); setCurrent(null); setPaused(false); };
  const pause = () => { q.current.token++; Speech.stop(); setPaused(true); };
  const resume = () => { const token = q.current.token + 1; q.current.token = token; setPaused(false); speakAt(q.current.i, token); };
  const setRate = (r: number) => { q.current.rate = r; if (current != null && !paused) resume(); };
  const skip = (d: number) => { const token = q.current.token + 1; q.current.token = token; Speech.stop(); speakAt(Math.max(0, Math.min(q.current.verses.length - 1, q.current.i + d)), token); };

  useEffect(() => () => { q.current.token++; Speech.stop(); }, []);
  return { current, paused, playing: current != null, play, stop, pause, resume, setRate, skip };
}

/** Speak a short text once (kids stories, devotions, memory verses). */
export function say(text: string, lang = "en-US", rate = 1, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { language: lang, rate, onDone, onStopped: onDone });
}
export const hush = () => Speech.stop();
