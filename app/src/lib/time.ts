import { currentContent } from "./content";

/** Next service computed in the church's local time zone. */
export function nextService(now = Date.now(), church = currentContent().church) {
  const CHURCH = church;
  const local = now + CHURCH.tzOffsetHours * 3600e3;
  const d = new Date(local);
  let best: { t: number; label: string; time: string } | null = null;
  let live: string | null = null;
  for (const s of CHURCH.services) {
    const diff = (s.day - d.getUTCDay() + 7) % 7;
    let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff, s.h, s.m);
    if (t <= local && local < t + 90 * 60e3) live = s.label;
    if (t <= local) t += 7 * 864e5;
    if (!best || t < best.t) best = { t, label: s.label, time: s.time };
  }
  const ms = Math.max(0, best!.t - local);
  return {
    label: best!.label,
    time: best!.time,
    live,
    d: Math.floor(ms / 864e5),
    h: Math.floor((ms % 864e5) / 36e5),
    m: Math.floor((ms % 36e5) / 6e4),
    s: Math.floor((ms % 6e4) / 1e3),
  };
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
