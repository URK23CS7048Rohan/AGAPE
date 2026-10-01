import React, { useMemo, useState } from "react";
import { Dimensions, Share, View } from "react-native";
import Animated, { Extrapolation, SharedValue, interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { C, R, shadow } from "@/theme";
import { Verse } from "@/data/mock";
import { Body, Icon, Label, Press, Serif } from "./ui";

const { width: SW } = Dimensions.get("window");
const CARD_W = SW - 56;
const GAP = 12;
const SNAP = CARD_W + GAP;
const CARD_H = 460;

const dayOfYear = () => { const n = new Date(); return Math.floor((n.getTime() - new Date(n.getFullYear(), 0, 0).getTime()) / 864e5); };
const textSize = (t: string) => (t.length > 115 ? 27 : t.length > 70 ? 32 : 40);

function share(v: Verse) {
  Share.share({ message: `“${v.text}”\n— ${v.ref}${v.translation ? ` (${v.translation})` : ""}\n\nShared from the Agape app` }).catch(() => {});
}

function VerseCard({ v, i, x, today }: { v: Verse; i: number; x: SharedValue<number>; today: boolean }) {
  const r = [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP];
  const card = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(x.value, r, [0.9, 1, 0.9], Extrapolation.CLAMP) },
      { rotate: `${interpolate(x.value, r, [-3, 0, 3], Extrapolation.CLAMP)}deg` },
    ],
    opacity: interpolate(x.value, r, [0.6, 1, 0.6], Extrapolation.CLAMP),
  }));
  const img = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, r, [-60, 0, 60], Extrapolation.CLAMP) }, { scale: 1.08 }] }));
  const txt = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, r, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(x.value, r, [40, 0, -40], Extrapolation.CLAMP) }],
  }));
  const size = textSize(v.text);
  return (
    <View style={{ width: CARD_W }}>
      <Animated.View style={[{ height: CARD_H, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.ink }, shadow(18, 30, 0.28, "#1a0c14"), card]}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: -70, right: -70 }, img]}>
          <Image source={v.image} style={{ flex: 1 }} contentFit="cover" transition={300} />
        </Animated.View>
        <LinearGradient colors={["rgba(10,6,14,0.55)", "rgba(10,6,14,0.15)", "rgba(10,6,14,0.9)"]} locations={[0, 0.35, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <LinearGradient colors={["transparent", "rgba(255,90,31,0.28)"]} start={{ x: 0, y: 0.6 }} end={{ x: 0.2, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />

        <View style={{ position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ borderRadius: R.pill, overflow: "hidden" }}>
            <BlurView intensity={30} tint="dark" style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 30 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: today ? C.sun : "rgba(255,255,255,0.6)" }} />
              <Label size={10} color="#fff">{today ? "Verse of the day" : v.theme || "Scripture"}</Label>
            </BlurView>
          </View>
          {v.translation ? (
            <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: R.pill, paddingHorizontal: 10, height: 26, justifyContent: "center" }}>
              <Label size={9} color="rgba(255,255,255,0.8)">{v.translation}</Label>
            </View>
          ) : null}
        </View>

        <Animated.View style={[{ position: "absolute", left: 22, right: 22, bottom: 22 }, txt]}>
          {today && v.theme ? <Label size={10} color={C.sun} style={{ marginBottom: 8 }}>{v.theme}</Label> : null}
          <Serif size={size} color="#fff" style={{ lineHeight: Math.round(size * 1.08) }}>“{v.text}”</Serif>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
            <Body size={16} weight="bold" color="#fff">{v.ref}</Body>
            <Press onPress={() => share(v)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: R.pill, paddingLeft: 14, paddingRight: 6, height: 40 }}>
              <Body size={13} weight="semi">Share</Body>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
                <Icon name="share-2" size={14} color="#fff" />
              </View>
            </Press>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Dot({ i, x }: { i: number; x: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const r = [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP];
    return { width: interpolate(x.value, r, [6, 22, 6], Extrapolation.CLAMP), opacity: interpolate(x.value, r, [0.25, 1, 0.25], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: C.flame }, s]} />;
}

/** Swipeable Scripture deck. Opens on today's verse; the list is edited in the web admin. */
export function VerseDeck({ verses }: { verses: Verse[] }) {
  const list = verses.length ? verses : [];
  const today = useMemo(() => (list.length ? dayOfYear() % list.length : 0), [list.length]);
  const x = useSharedValue(today * SNAP);
  const [idx, setIdx] = useState(today);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
    const k = Math.round(e.contentOffset.x / SNAP);
    runOnJS(setIdx)(k);
  });
  if (!list.length) return null;
  return (
    <View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={{ x: today * SNAP, y: 0 }}
        contentContainerStyle={{ paddingHorizontal: 28, gap: GAP, paddingVertical: 8 }}
      >
        {list.map((v, i) => <VerseCard key={`${v.ref}-${i}`} v={v} i={i} x={x} today={i === today} />)}
      </Animated.ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 28, marginTop: 14 }}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center", flexShrink: 1, flexWrap: "wrap" }}>
          {list.map((_, i) => <Dot key={i} i={i} x={x} />)}
        </View>
        <Label size={11} color={C.muted}>{String(Math.min(list.length, Math.max(1, idx + 1))).padStart(2, "0")} / {String(list.length).padStart(2, "0")}</Label>
      </View>
    </View>
  );
}
