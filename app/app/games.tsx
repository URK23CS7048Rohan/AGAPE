import React, { useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Bar, Body, Confetti, ConfettiHandle, Display, Label, Press, Segmented, Sticker } from "@/components/ui";
import { LEADERBOARD, TRIVIA, VERSE_MATCH } from "@/data/mock";
import { useStore } from "@/lib/store";
import { submitScore } from "@/lib/api";
import { fmt } from "@/lib/time";

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

function VerseMatch({ onPoints, burst }: { onPoints: (n: number) => void; burst: (y: number, n: number) => void }) {
  const [vi, setVi] = useState(0);
  const [filled, setFilled] = useState(0);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("Tap the missing words in order.");
  const v = VERSE_MATCH[vi];
  const opts = useMemo(() => shuffle([...v.a, ...v.x]), [vi]);
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
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: C.violet, paddingHorizontal: 10, height: 28, borderRadius: 9, justifyContent: "center" }}><Body size={12.5} weight="bold">Verse Match · {vi + 1}/{VERSE_MATCH.length}</Body></View>
        <Body size={13} weight="semi">🔥 Streak {streak}</Body>
      </View>
      <View style={{ marginTop: 16 }}><Bar progress={(vi + filled / v.a.length) / VERSE_MATCH.length} color={C.mint} height={8} delay={0} /></View>
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

function Trivia({ onPoints, burst }: { onPoints: (n: number) => void; burst: (y: number, n: number) => void }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const q = TRIVIA[qi];
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.a) { onPoints(150); setRight((r) => r + 1); burst(320, 50); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setTimeout(() => { setPicked(null); setQi((x) => (x + 1) % TRIVIA.length); }, 1300);
  };
  return (
    <View style={card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ backgroundColor: C.sky, paddingHorizontal: 10, height: 28, borderRadius: 9, justifyContent: "center" }}><Body size={12.5} weight="bold">Trivia · Pack 1</Body></View>
        <Body size={13} weight="semi">✓ {right} correct</Body>
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
  const { score, addScore } = useStore();
  const confetti = useRef<ConfettiHandle>(null);
  const onPoints = (n: number) => { addScore(n); submitScore(mode === 0 ? "verse_match" : "trivia", n); };
  const burst = (y: number, n: number) => confetti.current?.burst(undefined, y, n);
  const board = [...LEADERBOARD, { name: "You", points: 1180 + score, color: C.ink }].sort((a, b) => b.points - a.points);
  const max = board[0].points;

  return (
    <View style={{ flex: 1, backgroundColor: C.sun }}>
      <BackHeader title="Bible games" right={<View style={{ backgroundColor: C.ink, paddingHorizontal: 12, height: 44, borderRadius: 14, justifyContent: "center" }}><Body size={13} weight="bold" color={C.sun}>{fmt(1180 + score)} pts</Body></View>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 6 }}>
          <Display size={34}>Play. Learn.{"\n"}Remember.</Display>
          <View pointerEvents="none" style={{ position: "absolute", right: 16, top: -6 }}>
            <Sticker top="Win" bottom="points" bg={C.flame} size={82} />
          </View>
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={["Verse Match", "Trivia"]} value={mode} onChange={setMode} />
        </View>
        <Animated.View key={mode} entering={FadeInDown.springify().damping(18)} style={{ marginHorizontal: 16, marginTop: 14 }}>
          {mode === 0 ? <VerseMatch onPoints={onPoints} burst={burst} /> : <Trivia onPoints={onPoints} burst={burst} />}
        </Animated.View>

        <View style={[card, { marginHorizontal: 16, marginTop: 14, minHeight: 0, padding: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Display size={20}>Leaderboard</Display>
            <Label>This week · church-wide</Label>
          </View>
          {board.map((p, i) => (
            <Animated.View key={p.name} layout={LinearTransition.springify().damping(16)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: p.name === "You" ? 10 : 0, marginHorizontal: p.name === "You" ? -10 : 0, backgroundColor: p.name === "You" ? C.sunSoft : "transparent", borderRadius: 14 }}>
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

const card = { backgroundColor: "#fff", borderRadius: R.xl, padding: 20, minHeight: 420, borderWidth: 2, borderColor: C.ink } as const;
