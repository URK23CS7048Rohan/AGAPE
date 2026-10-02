/** Bible games: quiz-style rounds (trivia, who said it, emoji, true/false speed round, daily challenge),
 *  Verse Match, Books in Order and Memory Match. Each round ends with a score that goes on the leaderboard. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { C, F } from "@/theme";
import { Bar, Body, Button, Icon, Label, Press } from "./ui";
import { BOOKS } from "@/lib/bible";
import { Q } from "@/lib/more";
import { VerseQ } from "@/lib/data";
import { t } from "@/lib/i18n";

export const shuffle = <T,>(a: T[], seed?: number) => {
  const r = [...a];
  let s = seed ?? Math.floor(Math.random() * 1e9);
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
const EMOJI = /[\uD83C-\uDBFF\u2600-\u27BF]/;
const isEmoji = (s: string) => EMOJI.test(s) && s.replace(/[\s\uD800-\uDFFF\u2600-\u27BF\uFE0F\u200D+]/g, "").length < 3;
const buzz = (ok: boolean) => Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});

export type Done = (points: number, summary: string) => void;

/* ---------------------------------------------------------------- quiz rounds */
export function QuizRound({ questions, onDone, timed, accent = C.violet, big }: { questions: Q[]; onDone: Done; timed?: number; accent?: string; big?: boolean }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [points, setPoints] = useState(0);
  const [left, setLeft] = useState(timed || 0);
  const t0 = useRef(Date.now());
  const finished = useRef(false);
  const q = questions[i];
  const finish = (pts: number, r: number) => { if (finished.current) return; finished.current = true; onDone(Math.min(1000, pts), t("{r} of {n} right", { r, n: Math.min(questions.length, i + 1) })); };

  useEffect(() => {
    if (!timed) return;
    const iv = setInterval(() => setLeft((x) => { if (x <= 1) { clearInterval(iv); finish(points, right); return 0; } return x - 1; }), 1000);
    return () => clearInterval(iv);
  }, [timed, points, right]);

  if (!q) return null;
  const pick = (k: number) => {
    if (picked !== null || finished.current) return;
    setPicked(k);
    const ok = k === q.answer;
    buzz(ok);
    // faster answers score more (up to 100 a question)
    const secs = (Date.now() - t0.current) / 1000;
    const gain = ok ? Math.round(timed ? 60 : Math.max(50, 100 - secs * 4)) : 0;
    const np = points + gain, nr = right + (ok ? 1 : 0);
    setPoints(np); setRight(nr);
    setTimeout(() => {
      if (i + 1 >= questions.length) return finish(np, nr);
      setPicked(null); setI(i + 1); t0.current = Date.now();
    }, timed ? 450 : 1100);
  };
  const tf = q.options.length === 2;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}><Bar progress={timed ? left / timed : i / questions.length} color={accent} height={6} delay={0} /></View>
        <Body weight="bold" size={14}>{timed ? `${left}s` : `${i + 1}/${questions.length}`}</Body>
        <Body weight="bold" size={14} color={accent}>{points}</Body>
      </View>
      <Animated.View key={i} entering={FadeInDown.duration(260)} style={{ backgroundColor: "#fff", borderRadius: 18, padding: 20, minHeight: 150, justifyContent: "center" }}>
        <Text style={{ fontFamily: isEmoji(q.prompt) ? F.sans : F.displayBold, fontSize: isEmoji(q.prompt) ? 46 : big ? 26 : 22, lineHeight: isEmoji(q.prompt) ? 58 : big ? 32 : 29, color: C.ink, textAlign: isEmoji(q.prompt) ? "center" : "left" }}>{q.prompt}</Text>
        {picked !== null && q.ref ? <Body size={13} color={C.muted} style={{ marginTop: 10 }}>{q.ref}</Body> : null}
      </Animated.View>
      <View style={{ gap: 10, flexDirection: tf ? "row" : "column" }}>
        {q.options.map((o, k) => {
          const state = picked === null ? "idle" : k === q.answer ? "right" : k === picked ? "wrong" : "dim";
          const bg = state === "right" ? "#16A37B" : state === "wrong" ? "#E5484D" : "#fff";
          return (
            <Press key={`${i}-${k}`} onPress={() => pick(k)} scaleTo={0.98} label={o}
              style={{ flex: tf ? 1 : undefined, minHeight: tf ? 72 : 54, borderRadius: 14, backgroundColor: bg, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, opacity: state === "dim" ? 0.45 : 1, borderWidth: 1, borderColor: state === "idle" ? "rgba(15,11,18,0.08)" : "transparent", justifyContent: tf ? "center" : "flex-start" }}>
              {!tf ? <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: state === "idle" ? "rgba(15,11,18,0.06)" : "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}><Body size={12.5} weight="bold" color={state === "idle" ? C.muted : "#fff"}>{"ABCD"[k]}</Body></View> : null}
              <Body size={tf ? 18 : 16} weight="semi" color={state === "idle" || state === "dim" ? C.ink : "#fff"} style={{ flexShrink: 1 }}>{tf ? t(o) : o}</Body>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- verse match */
function Word({ w, onPress }: { w: string; onPress: (shake: () => void) => void }) {
  const x = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => { x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 50 })); };
  return (
    <Animated.View style={st} layout={LinearTransition.springify()}>
      <Press onPress={() => onPress(shake)} style={{ paddingHorizontal: 16, height: 44, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(15,11,18,0.1)", justifyContent: "center" }}>
        <Body size={16} weight="semi">{w}</Body>
      </Press>
    </Animated.View>
  );
}
export function VerseMatchRound({ verses, onDone }: { verses: VerseQ[]; onDone: Done }) {
  const list = useMemo(() => shuffle(verses).slice(0, 5), [verses]);
  const [vi, setVi] = useState(0);
  const [filled, setFilled] = useState(0);
  const [points, setPoints] = useState(0);
  const [miss, setMiss] = useState(0);
  const v = list[vi];
  const opts = useMemo(() => (v ? shuffle([...v.a, ...v.x]) : []), [vi]);
  if (!v) return null;
  const parts = v.t.split("___");
  const tap = (w: string, shake: () => void) => {
    if (w === v.a[filled]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const nf = filled + 1, np = points + 40;
      setFilled(nf); setPoints(np);
      if (nf >= v.a.length) {
        buzz(true);
        setTimeout(() => { if (vi + 1 >= list.length) onDone(Math.min(1000, np + Math.max(0, 200 - miss * 30)), t("{n} verses", { n: list.length })); else { setVi(vi + 1); setFilled(0); } }, 1200);
      }
    } else { buzz(false); shake(); setMiss(miss + 1); }
  };
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}><Bar progress={(vi + filled / v.a.length) / list.length} color={C.flame} height={6} delay={0} /></View>
        <Body weight="bold" size={14}>{vi + 1}/{list.length}</Body>
      </View>
      <Animated.View key={vi} entering={FadeIn.duration(300)} style={{ backgroundColor: "#fff", borderRadius: 18, padding: 20 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 25, lineHeight: 35, color: C.ink }}>
          {parts.map((p, k) => (
            <Text key={k}>{p}{k < parts.length - 1 ? (k < filled ? <Text style={{ color: C.flame, fontFamily: F.serifItalic }}>{v.a[k]}</Text> : <Text style={{ color: k === filled ? C.flame : "rgba(15,11,18,0.3)" }}>{" _____ "}</Text>) : null}</Text>
          ))}
        </Text>
        <Label style={{ marginTop: 12 }}>{v.r}</Label>
      </Animated.View>
      <Body size={13.5} color={C.muted}>{t("Tap the missing words in order.")}</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opts.map((w) => { const idx = v.a.indexOf(w); return idx > -1 && idx < filled ? null : <Word key={`${vi}-${w}`} w={w} onPress={(s) => tap(w, s)} />; })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- books in order */
export function BooksRound({ onDone, kids }: { onDone: Done; kids?: boolean }) {
  const rounds = kids ? 3 : 5, per = kids ? 3 : 5;
  const sets = useMemo(() => Array.from({ length: rounds }, () => {
    const start = Math.floor(Math.random() * (66 - per * 2));
    const pool = BOOKS.slice(start, start + per * 2);
    return shuffle(pool).slice(0, per).sort((a, b) => a.id - b.id);
  }), []);
  const [r, setR] = useState(0);
  const [next, setNext] = useState(0);
  const [miss, setMiss] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const t0 = useRef(Date.now());
  const set = sets[r];
  const order = useMemo(() => shuffle(set), [r]);
  const tap = (id: number) => {
    if (id === set[next].id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (next + 1 >= set.length) {
        buzz(true);
        setTimeout(() => {
          if (r + 1 >= rounds) { const secs = (Date.now() - t0.current) / 1000; onDone(Math.max(50, Math.min(1000, Math.round(rounds * 160 - miss * 40 - secs * 3))), t("{n} rounds · {m} mistakes", { n: rounds, m: miss })); }
          else { setR(r + 1); setNext(0); }
        }, 700);
      }
      setNext(next + 1);
    } else { buzz(false); setMiss(miss + 1); setWrong(id); setTimeout(() => setWrong(null), 500); }
  };
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}><Bar progress={(r + next / per) / rounds} color={C.violet} height={6} delay={0} /></View>
        <Body weight="bold" size={14}>{r + 1}/{rounds}</Body>
      </View>
      <Body weight="semi" size={18}>{t("Tap these books in Bible order")}</Body>
      <View style={{ gap: 10 }}>
        {order.map((b) => {
          const pos = set.findIndex((x) => x.id === b.id);
          const done = pos < next;
          return (
            <Press key={`${r}-${b.id}`} onPress={() => !done && tap(b.id)} scaleTo={0.98}
              style={{ height: 54, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: done ? "#16A37B" : wrong === b.id ? "#E5484D" : "#fff", borderWidth: 1, borderColor: "rgba(15,11,18,0.08)" }}>
              <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(255,255,255,0.25)" : "rgba(15,11,18,0.06)" }}>
                <Body size={12.5} weight="bold" color={done ? "#fff" : C.muted}>{done ? pos + 1 : "?"}</Body>
              </View>
              <Body size={16.5} weight="semi" color={done || wrong === b.id ? "#fff" : C.ink}>{b.name}</Body>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- memory match */
const PAIRS: [string, string][] = [
  ["John 3:16", "God so loved the world"], ["Psalm 23:1", "The Lord is my shepherd"], ["Genesis 1:1", "In the beginning"], ["Philippians 4:13", "I can do all things"],
  ["John 11:35", "Jesus wept"], ["Psalm 119:105", "A lamp to my feet"], ["Romans 3:23", "All have sinned"], ["Matthew 5:9", "Blessed are the peacemakers"],
  ["Hebrews 11:1", "Faith is the assurance"], ["1 John 4:8", "God is love"], ["Joshua 1:9", "Be strong and courageous"], ["Isaiah 40:31", "Wings like eagles"],
];
export function MemoryRound({ onDone, kids }: { onDone: Done; kids?: boolean }) {
  const n = kids ? 4 : 6;
  const cards = useMemo(() => shuffle(shuffle(PAIRS).slice(0, n).flatMap(([a, b], i) => [{ id: `${i}a`, pair: i, text: a, ref: true }, { id: `${i}b`, pair: i, text: b, ref: false }])), []);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const t0 = useRef(Date.now());
  const flip = (k: number) => {
    if (open.length === 2 || open.includes(k) || matched.includes(cards[k].pair)) return;
    Haptics.selectionAsync().catch(() => {});
    const o = [...open, k];
    setOpen(o);
    if (o.length === 2) {
      setMoves(moves + 1);
      if (cards[o[0]].pair === cards[o[1]].pair) {
        const m = [...matched, cards[k].pair];
        setTimeout(() => { setMatched(m); setOpen([]); buzz(true); if (m.length === n) { const secs = (Date.now() - t0.current) / 1000; onDone(Math.max(80, Math.min(1000, Math.round(n * 150 - (moves + 1 - n) * 25 - secs * 2))), t("{m} moves", { m: moves + 1 })); } }, 450);
      } else setTimeout(() => setOpen([]), 900);
    }
  };
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Body weight="semi">{t("Match each verse to its reference")}</Body>
        <Body weight="bold" color={C.muted}>{t("{m} moves", { m: moves })}</Body>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {cards.map((c, k) => {
          const shown = open.includes(k) || matched.includes(c.pair);
          return (
            <Press key={c.id} onPress={() => flip(k)} scaleTo={0.95} style={{ width: "31.8%", aspectRatio: kids ? 1 : 0.86, borderRadius: 14, padding: 8, alignItems: "center", justifyContent: "center", backgroundColor: matched.includes(c.pair) ? "#D5F5E8" : shown ? "#fff" : C.ink }}>
              {shown ? (
                <Animated.View entering={ZoomIn.duration(180)}>
                  <Body size={c.ref ? 14 : 13} weight={c.ref ? "bold" : "medium"} center color={c.ref ? C.flame : C.ink}>{c.text}</Body>
                </Animated.View>
              ) : <Icon name="book-cross" size={22} color="rgba(255,255,255,0.4)" />}
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- end of round */
export function Result({ points, summary, best, onAgain, onExit, daily }: { points: number; summary: string; best: number; onAgain?: () => void; onExit: () => void; daily?: boolean }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={{ backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", gap: 6 }}>
      <Icon name="trophy" size={34} color={C.sun} />
      <Body size={46} weight="bold" style={{ fontFamily: F.displayBold, lineHeight: 54 }}>{points}</Body>
      <Label>{t("points")}</Label>
      <Body color={C.muted} style={{ marginTop: 6 }}>{summary}</Body>
      {points >= best && points > 0 ? <Body weight="semi" color={C.flame}>{t("New personal best!")}</Body> : <Body size={13} color={C.muted}>{t("Your best: {n}", { n: best })}</Body>}
      {daily ? <Body size={13.5} color={C.muted} center style={{ marginTop: 8 }}>{t("Come back tomorrow for a new daily challenge.")}</Body> : null}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignSelf: "stretch" }}>
        <Button label={t("Games")} variant="tonal" onPress={onExit} style={{ flex: 1 }} />
        {onAgain ? <Button label={t("Play again")} onPress={onAgain} style={{ flex: 1 }} /> : null}
      </View>
    </Animated.View>
  );
}
