import React, { useEffect, useRef } from "react";
import { Dimensions, View } from "react-native";
import Animated, { Extrapolation, SharedValue, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C, R, onColor } from "@/theme";
import { PROMOS, Promo } from "@/data/mock";
import { Bar, Body, Display, Icon, Label, Press, Sticker, Ticket } from "./ui";

const { width: SW } = Dimensions.get("window");
const CARD_W = SW - 64;
const GAP = 12;
const SNAP = CARD_W + GAP;

function PromoCard({ p, i, x }: { p: Promo; i: number; x: SharedValue<number> }) {
  const card = useAnimatedStyle(() => {
    const r = [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP];
    return { transform: [{ scale: interpolate(x.value, r, [0.94, 1, 0.94], Extrapolation.CLAMP) }] };
  });
  const fg = onColor(p.accentColor);
  return (
    <Press onPress={() => router.push(p.route as any)} scaleTo={0.98} style={{ width: CARD_W }}>
      <Animated.View style={card}>
        <View style={{ paddingTop: 14 }}>
          <Ticket color={p.accentColor} at={0.5} notch={12} style={{ padding: 10 }}>
            <View style={{ height: 210, borderRadius: 18, overflow: "hidden", backgroundColor: C.ink }}>
              <Image source={p.image} style={{ flex: 1 }} contentFit="cover" transition={300} />
              <View style={{ position: "absolute", left: 10, bottom: 10, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, height: 28, justifyContent: "center", maxWidth: "80%" }}>
                <Body size={12} weight="semi" numberOfLines={1}>{p.kicker}</Body>
              </View>
            </View>
          </Ticket>
          {p.sticker ? (
            <View pointerEvents="none" style={{ position: "absolute", right: -4, top: 0 }}>
              <Sticker top={p.sticker[0]} bottom={p.sticker[1]} bg={p.accentColor === C.sun ? C.flame : C.sun} size={84} />
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingHorizontal: 4 }}>
          <View style={{ flex: 1 }}>
            <Display size={21} numberOfLines={1}>{p.title} {p.accent}</Display>
            <Label numberOfLines={2} style={{ marginTop: 2 }}>{p.body}</Label>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: p.accentColor, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-up-right" size={20} color={fg} />
          </View>
        </View>
        {p.progress ? (
          <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
            <Bar progress={p.progress} color={C.mint} height={8} />
            <Label style={{ marginTop: 6 }}>{Math.round(p.progress * 100)}% of goal raised · {p.cta}</Label>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 4 }}>
            <Icon name="star" size={13} color={C.violet} />
            <Body size={13} weight="semi">{p.cta}</Body>
          </View>
        )}
      </Animated.View>
    </Press>
  );
}

function Dot({ i, x }: { i: number; x: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.value / SNAP - i);
    return { width: interpolate(d, [0, 1], [22, 7], Extrapolation.CLAMP), opacity: interpolate(d, [0, 1], [1, 0.25], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: C.ink }, st]} />;
}

export function PromoCarousel({ promos = PROMOS }: { promos?: Promo[] }) {
  const x = useSharedValue(0);
  const ref = useRef<any>(null);
  const idx = useRef(0);
  const touching = useRef(false);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  useEffect(() => {
    const t = setInterval(() => {
      if (touching.current || promos.length < 2) return;
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
        contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={(e) => { idx.current = Math.round(e.nativeEvent.contentOffset.x / SNAP); touching.current = false; }}
      >
        {promos.map((p, i) => <PromoCard key={p.id} p={p} i={i} x={x} />)}
      </Animated.ScrollView>
      <View style={{ flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 14 }}>
        {promos.map((p, i) => <Dot key={p.id} i={i} x={x} />)}
      </View>
    </View>
  );
}
