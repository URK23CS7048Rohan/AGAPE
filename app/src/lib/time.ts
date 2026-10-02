import type { Service } from "./content";
import { dateLabel, t } from "./i18n";

/** Next service from the times set in /admin, computed in the church's local time zone. */
export function nextService(services: Service[], tzOffsetHours: number, now = Date.now()) {
  if (!services.length) return null;
  const local = now + tzOffsetHours * 3600e3;
  const d = new Date(local);
  let best: { t: number; label: string; time: string } | null = null;
  let live: string | null = null;
  for (const s of services) {
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

export const fmt = (n: number) => Math.round(n || 0).toLocaleString("en-US");

/** "5m", "3h", "Yesterday", "12 Sep" */
export function ago(iso?: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("now");
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 172800) return t("Yesterday");
  return dateLabel(new Date(iso), { day: "numeric", month: "short" });
}

export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function duration(sec?: number | null) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
