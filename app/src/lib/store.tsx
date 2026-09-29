import React, { createContext, useContext, useMemo, useState } from "react";
import { COURSES } from "@/data/mock";

type State = {
  signedIn: boolean;
  guest: boolean;
  signIn: (guest?: boolean) => void;
  signOut: () => void;
  saved: Set<string>;
  toggleSaved: (id: string) => void;
  rsvps: Set<string>;
  toggleRsvp: (id: string) => boolean;
  praying: Set<string>;
  togglePraying: (id: string) => boolean;
  notes: Record<string, string>;
  setNote: (id: string, body: string) => void;
  progress: Record<string, number>; // courseId -> completed lessons
  completeNext: (courseId: string) => void;
  score: number;
  addScore: (n: number) => void;
  settings: { faceId: boolean; notifications: boolean; largeText: boolean; kidsMode: boolean; language: string };
  setSetting: (k: keyof State["settings"], v: any) => void;
};

const Ctx = createContext<State>(null as any);

const toggleIn = (set: Set<string>, id: string) => {
  const n = new Set(set);
  n.has(id) ? n.delete(id) : n.add(id);
  return n;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [guest, setGuest] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set(["unshakeable-3"]));
  const [rsvps, setRsvps] = useState<Set<string>>(new Set(["revival"]));
  const [praying, setPraying] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, number>>(Object.fromEntries(COURSES.map((c) => [c.id, c.completed])));
  const [score, setScore] = useState(0);
  const [settings, setSettings] = useState({ faceId: true, notifications: true, largeText: false, kidsMode: false, language: "English" });

  const value = useMemo<State>(
    () => ({
      signedIn, guest,
      signIn: (g = false) => { setSignedIn(true); setGuest(g); },
      signOut: () => { setSignedIn(false); setGuest(false); },
      saved, toggleSaved: (id) => setSaved((s) => toggleIn(s, id)),
      rsvps, toggleRsvp: (id) => { const on = !rsvps.has(id); setRsvps((s) => toggleIn(s, id)); return on; },
      praying, togglePraying: (id) => { const on = !praying.has(id); setPraying((s) => toggleIn(s, id)); return on; },
      notes, setNote: (id, body) => setNotes((n) => ({ ...n, [id]: body })),
      progress, completeNext: (courseId) => setProgress((p) => {
        const c = COURSES.find((x) => x.id === courseId);
        return { ...p, [courseId]: Math.min((p[courseId] ?? 0) + 1, c ? c.lessons.length : 99) };
      }),
      score, addScore: (n) => setScore((s) => s + n),
      settings, setSetting: (k, v) => setSettings((s) => ({ ...s, [k]: v })),
    }),
    [signedIn, guest, saved, rsvps, praying, notes, progress, score, settings]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
