import React, { useEffect, useRef } from "react";
import { Dimensions, View } from "react-native";
import Animated, { Extrapolation, SharedValue, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { PROMOS, Promo } from "@/data/mock";
import { Bar, Body, Button, Display, Label, Press, Serif, Sticker } from "./ui";

const { width: SW } = Dimensions.get("window");
const isLight = (hex: string) => { const h = (hex || "#000").replace("#", ""); const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 150; };
const CARD_W = SW - 56;
const GAP = 12;
const SNAP = CARD_W + GAP;

function PromoCard({ p, i, x }: { p: Promo; i: number; x: SharedValue<number> }) {
  const card = useAnimatedStyle(() => {
    const r = [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP];
    return { transform: [{ scale: interpolate(x.value, r, [0.92, 1, 0.92], Extrapolation.CLAMP) }, { rotate: `${interpolate(x.value, r, [2, 0, -2], Extrapolation.CLAMP)}deg` }] };
  });
  const img = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP], [-50, 0, 50], Extrapolation.CLAMP) }] }));
  return (
    <Press onPress={() => router.push(p.route as any)} scaleTo={0.98} style={{ width: CARD_W }}>
      <Animated.View style={[{ height: 440, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.ink }, card]}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: -60, right: -60 }, img]}>
          <Image source={p.image} style={{ flex: 1 }} contentFit="cover" transition={300} />
        </Animated.View>
        <LinearGradient colors={["rgba(12,7,16,0.05)", "rgba(12,7,16,0.35)", "rgba(12,7,16,0.92)"]} locations={[0, 0.4, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        {p.sticker ? (
          <View style={{ position: "absolute", top: 18, right: 18 }}>
            <Sticker top={p.sticker[0]} bottom={p.sticker[1]} bg={p.accentColor} color={isLight(p.accentColor) ? C.ink : "#fff"} size={88} />
          </View>
        ) : null}
        <View style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
          <View style={{ alignSelf: "flex-start", backgroundColor: p.accentColor, paddingHorizontal: 12, height: 28, borderRadius: R.pill, justifyContent: "center" }}>
            <Body size={12} weight="semi" color={isLight(p.accentColor) ? C.ink : "#fff"}>{p.kicker}</Body>
          </View>
          <Display size={58} color="#fff" style={{ textTransform: "uppercase", marginTop: 14, lineHeight: 54 }}>
            {p.title}
            {"\n"}
            <Serif size={60} color={p.accentColor} style={{ textTransform: "none" }}>{p.accent}</Serif>
          </Display>
          <Body size={14.5} color="rgba(255,255,255,0.82)" style={{ marginTop: 10, marginBottom: 16 }} numberOfLines={2}>{p.body}</Body>
          {p.progress ? (
            <View style={{ marginBottom: 16 }}>
              <Bar progress={p.progress} color={C.sun} track="rgba(255,255,255,0.2)" />
              <Label color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }}>{Math.round(p.progress * 100)}% of goal raised</Label>
            </View>
          ) : null}
          <Button label={p.cta} variant="light" small onPress={() => router.push(p.route as any)} />
        </View>
      </Animated.View>
    </Press>
  );
}

function Dot({ i, x }: { i: number; x: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.value / SNAP - i);
    return { width: interpolate(d, [0, 1], [26, 8], Extrapolation.CLAMP), opacity: interpolate(d, [0, 1], [1, 0.25], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: C.ink }, st]} />;
}

export function PromoCarousel({ promos = PROMOS }: { promos?: Promo[] }) {
  const x = useSharedValue(0);
  const ref = useRef<any>(null);
  const idx = useRef(0);
  const touching = useRef(false);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  useEffect(() => {
    const t = setInterval(() => {
      if (touching.current) return;
      idx.current = (idx.current + 1) % promos.length;
      ref.current?.scrollTo({ x: idx.current * SNAP, animated: true });
    }, 5200);
    return () => clearInterval(t);
  }, [promos.length]);
  return (
    <View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 28, gap: GAP }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => { idx.current = Math.round(e.nativeEvent.contentOffset.x / SNAP); touching.current = false; }}
      >
        {promos.map((p, i) => <PromoCard key={p.id} p={p} i={i} x={x} />)}
      </Animated.ScrollView>
      <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 16 }}>
        {promos.map((p, i) => <Dot key={p.id} i={i} x={x} />)}
      </View>
    </View>
  );
}
