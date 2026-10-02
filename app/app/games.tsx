import React, { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Async, Avatar, BackHeader, Bar, Body, Confetti, ConfettiHandle, Display, Empty, Label, Press, Segmented, Sticker } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { leaderboard, listQuestions, myPoints, submitScore, Trivia as TriviaQ, VerseQ } from "@/lib/api";
import { fmt } from "@/lib/time";
import { t as tr } from "@/lib/i18n";

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function WordButton({ w, used, onPress }: { w: string; used: boolean; onPress: (shake: () => void) => void }) {
  const x = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => { x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 })); };
  if (used) return null;
  return (
    <Animated.View style={st} exiting={undefined} layout={LinearTransition.springify()}>
      <Press onPress={() => onPress(shake)} style={{ paddingHorizontal: 18, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.ink, backgroundColor: "#fff", justifyContent: "center" }}>
        <Body size={16} weight="semi">{w}</Body>
      </Press>
    </Animated.View>
  );
}

function VerseMatch({ items, onPoints, burst }: { items: VerseQ[]; onPoints: (n: number) => void; burst: (y: number, n: number) => void }) {
  const [vi, setVi] = useState(0);
  const [filled, setFilled] = useState(0);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("Tap the missing words in order.");
  const deck = useMemo(() => shuffle(items), [items]);
  const q = deck[vi % deck.length];
  const v = { t: q.prompt, a: q.answer, x: q.options, r: q.reference || "" };
  const opts = useMemo(() => shuffle([...v.a, ...v.x]), [vi, deck]);
  const parts = v.t.split("___");

  const tap = (w: string, shake: () => void) => {
    if (filled >= v.a.length) return;
    if (w === v.a[filled]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const pts = 100 + streak * 20;
      onPoints(pts);
      setStreak((s) => s + 1);
      const nf = filled + 1;
      setFilled(nf);
      burst(260, 24);
      if (nf >= v.a.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setMsg(streak >= 3 ? `Streak ×${streak + 1}! Next verse…` : "Beautiful. Next verse…");
        burst(300, 80);
        setTimeout(() => { setVi((i) => (i + 1) % deck.length); setFilled(0); setMsg("Tap the missing words in order."); }, 1700);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shake();
      setStreak(0);
      setMsg("Not quite. Try another word.");
    }
  };

  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: C.violet, paddingHorizontal: 10, height: 28, borderRadius: 9, justifyContent: "center" }}><Body size={12.5} weight="bold">{tr("Verse Match ·")} {(vi % deck.length) + 1}/{deck.length}</Body></View>
        <Body size={13} weight="semi">{tr("🔥 Streak")} {streak}</Body>
      </View>
      <View style={{ marginTop: 16 }}><Bar progress={((vi % deck.length) + filled / v.a.length) / deck.length} color={C.mint} height={8} delay={0} /></View>
      <Animated.View key={vi} entering={FadeIn.duration(500)}>
        <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 38, letterSpacing: -0.6, color: C.ink, marginTop: 20 }}>
          {parts.map((p, i) => (
            <Text key={i}>
              {p}
              {i < parts.length - 1 ? (
                i < filled ? (
                  <Text style={{ color: C.ink, backgroundColor: C.sun }}> {v.a[i]} </Text>
                ) : (
                  <Text style={{ color: i === filled ? C.flame : "rgba(20,20,20,0.25)" }}>{" ________ "}</Text>
                )
              ) : null}
            </Text>
          ))}
        </Text>
        <Label style={{ marginTop: 12 }}>{v.r}</Label>
      </Animated.View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
        {opts.map((w) => {
          const idx = v.a.indexOf(w);
          return <WordButton key={`${vi}-${w}`} w={w} used={idx > -1 && idx < filled} onPress={(shake) => tap(w, shake)} />;
        })}
      </View>
      <Body size={14} color={msg.includes("Next") ? C.mint : C.muted} weight={msg.includes("Next") ? "bold" : "regular"} style={{ marginTop: 18 }}>{msg}</Body>
    </View>
  );
}

function Trivia({ items, onPoints, burst }: { items: TriviaQ[]; onPoints: (n: number) => void; burst: (y: number, n: number) => void }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const deck = useMemo(() => shuffle(items), [items]);
  const t = deck[qi % deck.length];
  const q = { q: t.prompt, o: t.options, a: Number(t.answer) };
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.a) { onPoints(150); setRight((r) => r + 1); burst(320, 50); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setTimeout(() => { setPicked(null); setQi((x) => (x + 1) % deck.length); }, 1300);
  };
  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: C.sky, paddingHorizontal: 10, height: 28, borderRadius: 9, justifyContent: "center" }}><Body size={12.5} weight="bold">{tr("Trivia ·")} {(qi % deck.length) + 1}/{deck.length}</Body></View>
        <Body size={13} weight="semi">✓ {right} {tr("correct")}</Body>
      </View>
      <Animated.View key={qi} entering={FadeInDown.springify().damping(16)}>
        <Display size={26} style={{ marginTop: 20 }}>{q.q}</Display>
        <View style={{ gap: 10, marginTop: 20 }}>
          {q.o.map((o, i) => {
            const state = picked === null ? "idle" : i === q.a ? "right" : i === picked ? "wrong" : "dim";
            const bg = state === "right" ? C.mint : state === "wrong" ? C.red : "#fff";
            return (
              <Press key={o} onPress={() => pick(i)} style={{ height: 56, borderRadius: 16, backgroundColor: bg, borderWidth: 1.5, borderColor: state === "idle" || state === "dim" ? C.ink : bg, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 12, opacity: state === "dim" ? 0.4 : 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: state === "idle" || state === "dim" ? C.sun : "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Body size={14} weight="bold">{"ABCD"[i]}</Body>
                </View>
                <Body size={16} weight="semi" color={state === "right" || state === "wrong" ? "#fff" : C.ink}>{o}</Body>
              </Press>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export default function Games() {
  const [mode, setMode] = useState(0);
  const { signedIn, session } = useAuth();
  const [session_pts, setSessionPts] = useState(0);
  const verses = useQuery("games:verse_match", () => listQuestions("verse_match") as Promise<VerseQ[]>, 300_000);
  const trivia = useQuery("games:trivia", () => listQuestions("trivia") as Promise<TriviaQ[]>, 300_000);
  const board = useQuery(signedIn ? "points:board" : null, leaderboard);
  const total = useQuery(signedIn ? "points:mine" : null, myPoints);
  const confetti = useRef<ConfettiHandle>(null);
  const onPoints = (n: number) => {
    setSessionPts((p) => p + n);
    if (signedIn) submitScore(mode === 0 ? "verse_match" : "trivia", n).catch(() => {});
  };
  const burst = (y: number, n: number) => confetti.current?.burst(undefined, y, n);
  const pts = signedIn ? (total.data ?? 0) : session_pts;
  const rows = board.data ?? [];
  const max = Math.max(1, ...rows.map((r) => r.points));
  const COLORS = [C.violet, C.rose, C.mint, C.flame, C.sky];

  return (
    <View style={{ flex: 1, backgroundColor: C.sun }}>
      <BackHeader title={tr("Bible games")} right={<View style={{ backgroundColor: C.ink, paddingHorizontal: 12, height: 44, borderRadius: 14, justifyContent: "center" }}><Body size={13} weight="bold" color={C.sun}>{fmt(pts)} {tr("pts")}</Body></View>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
          <Display size={34}>{tr("Play. Learn.")}{"\n"}{tr("Remember.")}</Display>
          <View pointerEvents="none" style={{ position: "absolute", right: 16, top: -6 }}>
            <Sticker top="Win" bottom="points" bg={C.flame} size={82} />
          </View>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={[tr("Verse Match"), tr("Trivia")]} value={mode} onChange={setMode} />
        </View>
        <Animated.View key={mode} entering={FadeInDown.springify().damping(18)} style={{ marginHorizontal: 16, marginTop: 14 }}>
          {mode === 0 ? (
            <Async q={verses} empty={(d) => (d.length ? null : <View style={card}><Empty icon="book" title={tr("No verses yet")} body={tr("The team will add Verse Match packs soon.")} /></View>)}>
              {(d) => <VerseMatch items={d} onPoints={onPoints} burst={burst} />}
            </Async>
          ) : (
            <Async q={trivia} empty={(d) => (d.length ? null : <View style={card}><Empty icon="help-circle" title={tr("No questions yet")} body={tr("The team will add trivia packs soon.")} /></View>)}>
              {(d) => <Trivia items={d} onPoints={onPoints} burst={burst} />}
            </Async>
          )}
          {!signedIn ? <Label color={C.ink} style={{ textAlign: "center", marginTop: 10 }}>{tr("Playing as a guest. Sign in to save your points and join the leaderboard.")}</Label> : null}
        </Animated.View>

        {signedIn ? (
          <View style={[card, { marginHorizontal: 16, marginTop: 14, minHeight: 0, padding: 16 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Display size={20}>{tr("Leaderboard")}</Display>
              <Label>{tr("This week · church-wide")}</Label>
            </View>
            {rows.length === 0 ? <Label style={{ paddingVertical: 12 }}>{tr("No scores yet this week. Be the first!")}</Label> : null}
            {rows.map((p, i) => {
              const me = p.user_id === session?.user.id;
              const color = COLORS[i % COLORS.length];
              return (
                <Animated.View key={p.user_id} layout={LinearTransition.springify().damping(16)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: me ? 10 : 0, marginHorizontal: me ? -10 : 0, backgroundColor: me ? C.sunSoft : "transparent", borderRadius: 14 }}>
                  <Body weight="bold" color={i < 3 ? C.ink : C.muted} style={{ width: 20 }}>{i + 1}</Body>
                  <Avatar name={p.full_name || "?"} color={color} size={36} />
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" numberOfLines={1}>{me ? tr("You") : p.full_name || tr("Member")}</Body>
                    <Bar progress={p.points / max} color={color} height={6} delay={100} />
                  </View>
                  <Body weight="bold" style={{ width: 56, textAlign: "right" }}>{fmt(p.points)}</Body>
                </Animated.View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <Confetti ref={confetti} />
    </View>
  );
}

const card = { backgroundColor: "#fff", borderRadius: R.xl, padding: 20, minHeight: 420, borderWidth: 2, borderColor: C.ink } as const;
