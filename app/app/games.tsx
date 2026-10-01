import React, { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Bar, Body, Confetti, ConfettiHandle, Display, Label, Press, Segmented, Serif } from "@/components/ui";
import { useStore } from "@/lib/store";
import { TriviaQ, VerseQ, useGames, useLeaderboard } from "@/lib/data";
import { fmt } from "@/lib/time";

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function WordButton({ w, used, onPress }: { w: string; used: boolean; onPress: (shake: () => void) => void }) {
  const x = useSharedValue(0);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => { x.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 })); };
  if (used) return null;
  return (
    <Animated.View style={st} exiting={undefined} layout={LinearTransition.springify()}>
      <Press onPress={() => onPress(shake)} style={{ paddingHorizontal: 20, height: 50, borderRadius: R.pill, borderWidth: 1.5, borderColor: "rgba(244,238,228,0.25)", justifyContent: "center" }}>
        <Body size={16} weight="semi" color={C.cream}>{w}</Body>
      </Press>
    </Animated.View>
  );
}

function VerseMatch({ onPoints, burst, VERSE_MATCH }: { onPoints: (n: number) => void; burst: (y: number, n: number) => void; VERSE_MATCH: VerseQ[] }) {
  const [vi, setVi] = useState(0);
  const [filled, setFilled] = useState(0);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("Tap the missing words in order.");
  const v = VERSE_MATCH[vi % VERSE_MATCH.length];
  const opts = useMemo(() => shuffle([...v.a, ...v.x]), [vi, v.t]);
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
        setTimeout(() => { setVi((i) => (i + 1) % VERSE_MATCH.length); setFilled(0); setMsg("Tap the missing words in order."); }, 1700);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shake();
      setStreak(0);
      setMsg("Not quite. Try another word.");
    }
  };

  return (
    <View style={{ backgroundColor: C.ink, borderRadius: R.xl, padding: 22, minHeight: 420 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: C.sun, paddingHorizontal: 12, height: 28, borderRadius: R.pill, justifyContent: "center" }}><Body size={12.5} weight="bold">Verse Match · {vi + 1}/{VERSE_MATCH.length}</Body></View>
        <Label color={C.creamMuted}>Streak {streak}</Label>
      </View>
      <View style={{ marginTop: 18 }}><Bar progress={(vi + filled / v.a.length) / VERSE_MATCH.length} color={C.sun} track="rgba(255,255,255,0.1)" height={6} delay={0} /></View>
      <Animated.View key={vi} entering={FadeIn.duration(500)}>
        <Text style={{ fontFamily: F.serif, fontSize: 30, lineHeight: 40, color: C.cream, marginTop: 24 }}>
          {parts.map((p, i) => (
            <Text key={i}>
              {p}
              {i < parts.length - 1 ? (
                i < filled ? (
                  <Text style={{ fontFamily: F.serifItalic, color: C.ink, backgroundColor: C.sun }}> {v.a[i]} </Text>
                ) : (
                  <Text style={{ color: i === filled ? C.sun : "rgba(255,194,61,0.5)" }}>{" ________ "}</Text>
                )
              ) : null}
            </Text>
          ))}
        </Text>
        <Label color={C.creamMuted} style={{ marginTop: 14 }}>{v.r}</Label>
      </Animated.View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
        {opts.map((w) => {
          const idx = v.a.indexOf(w);
          return <WordButton key={`${vi}-${w}`} w={w} used={idx > -1 && idx < filled} onPress={(shake) => tap(w, shake)} />;
        })}
      </View>
      <Body size={14} color={msg.includes("Next") ? C.sun : C.creamMuted} weight={msg.includes("Next") ? "semi" : "regular"} style={{ marginTop: 18 }}>{msg}</Body>
    </View>
  );
}

function Trivia({ onPoints, burst, TRIVIA }: { onPoints: (n: number) => void; burst: (y: number, n: number) => void; TRIVIA: TriviaQ[] }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const q = TRIVIA[qi % TRIVIA.length];
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.a) { onPoints(150); setRight((r) => r + 1); burst(320, 50); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setTimeout(() => { setPicked(null); setQi((x) => (x + 1) % TRIVIA.length); }, 1300);
  };
  return (
    <View style={{ backgroundColor: C.ink, borderRadius: R.xl, padding: 22, minHeight: 420 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ backgroundColor: C.violet, paddingHorizontal: 12, height: 28, borderRadius: R.pill, justifyContent: "center" }}><Body size={12.5} weight="bold" color="#fff">Trivia · {qi % TRIVIA.length + 1}/{TRIVIA.length}</Body></View>
        <Label color={C.creamMuted}>{right} correct</Label>
      </View>
      <Animated.View key={qi} entering={FadeInDown.springify().damping(16)}>
        <Display size={34} color={C.cream} style={{ marginTop: 22 }}>{q.q}</Display>
        <View style={{ gap: 10, marginTop: 20 }}>
          {q.o.map((o, i) => {
            const state = picked === null ? "idle" : i === q.a ? "right" : i === picked ? "wrong" : "dim";
            const bg = state === "right" ? C.mint : state === "wrong" ? C.rose : "rgba(255,255,255,0.07)";
            return (
              <Press key={o} onPress={() => pick(i)} style={{ height: 56, borderRadius: R.pill, backgroundColor: bg, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: state === "dim" ? 0.4 : 1 }}>
                <Body size={16} weight="semi" color={state === "right" ? C.ink : C.cream}>{o}</Body>
                <Label color={state === "right" ? C.ink : C.creamMuted}>{"ABCD"[i]}</Label>
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
  const { score, addScore, session, live, firstName } = useStore();
  const games = useGames();
  const lb = useLeaderboard();
  const confetti = useRef<ConfettiHandle>(null);
  const refresh = useRef<any>(null);
  const onPoints = (n: number) => {
    addScore(mode === 0 ? "verse_match" : "trivia", n);
    clearTimeout(refresh.current); refresh.current = setTimeout(lb.reload, 1500);
  };
  const burst = (y: number, n: number) => confetti.current?.burst(undefined, y, n);
  const uid = session?.user.id;
  // live: the real weekly board (you're highlighted). demo: sample players + you.
  const board = (live
    ? lb.data.map((p) => ({ ...p, me: p.id === uid, name: p.id === uid ? `${firstName} (you)` : p.name }))
    : [...lb.data.map((p) => ({ ...p, me: false })), { name: "You", points: 1180 + score, color: C.ink, me: true }]
  ).sort((a, b) => b.points - a.points);
  const max = Math.max(1, board[0]?.points ?? 1);

  return (
    <View style={{ flex: 1, backgroundColor: C.sun }}>
      <BackHeader title="Bible games" right={<View style={{ backgroundColor: C.ink, paddingHorizontal: 14, height: 36, borderRadius: R.pill, justifyContent: "center" }}><Body size={13} weight="bold" color={C.sun}>{fmt(live ? score : 1180 + score)} pts</Body></View>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
          <Display size={54} style={{ lineHeight: 52 }}>Play. Learn.{"\n"}<Serif size={58} color={C.ink} style={{ textDecorationLine: "underline" }}>Remember.</Serif></Display>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={["Verse Match", "Trivia"]} value={mode} onChange={setMode} accent={C.ink} />
        </View>
        <Animated.View key={mode} entering={FadeInDown.springify().damping(18)} style={{ marginHorizontal: 16, marginTop: 14 }}>
          {mode === 0 ? <VerseMatch onPoints={onPoints} burst={burst} VERSE_MATCH={games.verses} /> : <Trivia onPoints={onPoints} burst={burst} TRIVIA={games.trivia} />}
        </Animated.View>

        <View style={{ marginHorizontal: 16, marginTop: 18, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: R.xl, padding: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Body weight="bold" size={17}>Leaderboard</Body>
            <Body size={13} color={C.muted}>This week · church-wide</Body>
          </View>
          {board.length === 0 ? <Body color={C.muted} style={{ paddingVertical: 8 }}>{session ? "No scores yet this week. Play a round to top the board!" : "Sign in to appear on the leaderboard."}</Body> : null}
          {board.map((p, i) => (
            <Animated.View key={`${p.name}-${i}`} layout={LinearTransition.springify().damping(16)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: p.me ? 10 : 0, marginHorizontal: p.me ? -10 : 0, backgroundColor: p.me ? "rgba(15,11,18,0.07)" : "transparent", borderRadius: 16 }}>
              <Body weight="bold" color={i < 3 ? C.ink : C.muted} style={{ width: 20 }}>{i + 1}</Body>
              <Avatar name={p.name} color={p.color} size={36} />
              <View style={{ flex: 1 }}>
                <Body weight="semi">{p.name}</Body>
                <Bar progress={p.points / max} color={p.color} height={6} delay={100} />
              </View>
              <Body weight="bold" style={{ width: 56, textAlign: "right" }}>{fmt(p.points)}</Body>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <Confetti ref={confetti} />
    </View>
  );
}
