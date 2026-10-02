import React, { useEffect, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeOutUp, SharedValue, interpolate, Extrapolation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG, R } from "@/theme";
import { Body, Button, Display, Icon, IconButton, Label, LiveDot, Press } from "./ui";
import { Seal } from "./Motion";
import { HeroContent } from "@/lib/content";
import { nextService } from "@/lib/time";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/data";
import { t } from "@/lib/i18n";

const { width: SW, height: SH } = Dimensions.get("window");
export const HERO_H = Math.max(620, Math.min(SH * 0.86, 780));

function Slide({ source, active }: { source: any; active: boolean }) {
  const o = useSharedValue(active ? 1 : 0);
  const s = useSharedValue(1.14);
  useEffect(() => {
    o.value = withTiming(active ? 1 : 0, { duration: 1300, easing: Easing.inOut(Easing.quad) });
    if (active) { s.value = 1.16; s.value = withTiming(1, { duration: 7200, easing: Easing.out(Easing.quad) }); }
  }, [active]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <Image source={source} style={{ flex: 1 }} contentFit="cover" transition={0} />
    </Animated.View>
  );
}

function CyclingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const timer = setInterval(() => setI((x) => (x + 1) % words.length), 2800);
    return () => clearInterval(timer);
  }, [words.length]);
  const w = words[i % words.length] || "";
  return (
    <View style={{ height: 88, overflow: "hidden", marginTop: -6 }}>
      <Animated.Text key={`${i}-${w}`} entering={FadeInDown.springify().damping(16).stiffness(140)} exiting={FadeOutUp.duration(260)} style={{ fontFamily: F.serifItalic, fontSize: 80, lineHeight: 88, color: C.flame, letterSpacing: -1.5 }} numberOfLines={1} adjustsFontSizeToFit>
        {w}
      </Animated.Text>
    </View>
  );
}

function NextServiceCard() {
  const [n, setN] = useState(nextService());
  useEffect(() => {
    const timer = setInterval(() => setN(nextService()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pad = (v: number) => String(v).padStart(2, "0");
  const inner = (
    <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <LiveDot color={n.live ? "#FF2E4D" : C.sun} size={7} />
          <Label color="rgba(255,255,255,0.75)" size={10}>{n.live ? t("Live now") : t("Next service")}</Label>
        </View>
        <Body size={14.5} weight="semi" color="#fff" style={{ marginTop: 4 }} numberOfLines={1}>{n.live || n.label} · {n.time}</Body>
      </View>
      {n.live ? (
        <Button label={t("Watch")} small icon="play" onPress={() => router.push("/sermon/power-of-grace")} />
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[["d", n.d], ["h", n.h], ["m", n.m], ["s", n.s]].map(([k, v]) => (
            <View key={k as string} style={{ alignItems: "center", minWidth: 30 }}>
              <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 28, color: "#fff", fontVariant: ["tabular-nums"] }}>{pad(v as number)}</Text>
              <Label size={8.5} color="rgba(255,255,255,0.55)">{k}</Label>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  return (
    <View style={{ borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
      {Platform.OS === "ios" ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "ios" ? "rgba(15,11,18,0.25)" : "rgba(15,11,18,0.6)" }]} />
      {inner}
    </View>
  );
}

export function HeroStage({ hero, y }: { hero: HeroContent; y: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { session, profile, firstName } = useStore();
  const notes = useNotifications(session?.user.id ?? null).data;
  const unread = profile ? notes.filter((n) => n.createdAt > profile.notifications_seen_at).length : 0;
  const [idx, setIdx] = useState(0);
  const slides = hero.slides.length ? hero.slides : [{ image: IMG.homeWorship, caption: "" }];
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-200, 0, HERO_H], [-100, 0, HERO_H * 0.35], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-200, 0], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));
  const textFade = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, HERO_H * 0.5], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: interpolate(y.value, [0, HERO_H], [0, -60], Extrapolation.CLAMP) }] }));

  return (
    <View style={{ height: HERO_H, backgroundColor: C.ink, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" }}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        {slides.map((s, i) => <Slide key={i} source={s.image} active={i === idx} />)}
      </Animated.View>
      <LinearGradient colors={["rgba(10,6,14,0.7)", "rgba(10,6,14,0.05)", "rgba(10,6,14,0.35)", "rgba(10,6,14,0.95)"]} locations={[0, 0.28, 0.55, 1]} style={StyleSheet.absoluteFill} />

      {/* top bar */}
      <Animated.View entering={FadeIn.duration(700)} style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image source={IMG.logoMarkLight} style={{ width: 34, height: 42 }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Display size={20} color="#fff">Agape</Display>
          <Label size={8.5} color="rgba(255,255,255,0.7)">International Ministries</Label>
        </View>
        <IconButton name="creation" label={t("Ask Agape")} bg="rgba(255,255,255,0.16)" color={C.sun} onPress={() => router.push("/assistant")} />
        <IconButton name="bell" label={t("Notifications")} badge={unread > 0} bg="rgba(255,255,255,0.16)" color="#fff" onPress={() => router.push("/notifications")} />
        <Press onPress={() => router.push("/me")} label={t("Me")}>
          <LinearGradient colors={[C.flame, C.rose]} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" }}>
            <Body weight="bold" color="#fff" size={16}>{(firstName[0] || "A").toUpperCase()}</Body>
          </LinearGradient>
        </Press>
      </Animated.View>

      {/* spinning seal → watch */}
      <Animated.View entering={FadeIn.delay(900).duration(700)} style={{ position: "absolute", right: 14, top: insets.top + 74 }}>
        <Press onPress={() => router.push("/watch")} scaleTo={0.9} label={t("Watch live")}>
          <Seal text={t("Prayer & Worship · Watch live")} size={104} color="#fff">
            <LinearGradient colors={[C.sun, C.flame, C.rose]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={18} color="#fff" />
            </LinearGradient>
          </Seal>
        </Press>
      </Animated.View>

      {/* copy */}
      <Animated.View style={[{ position: "absolute", left: 20, right: 20, bottom: 26 }, textFade]}>
        <Animated.View entering={FadeInDown.delay(150).duration(700)} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, height: 30, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }}>
          <Icon name="creation" size={13} color={C.sun} />
          <Body size={12} weight="semi" color="#fff">{hero.kicker}</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(250).duration(800)}>
          <Display size={84} color="#fff" style={{ lineHeight: 78, marginTop: 14, textTransform: "uppercase", letterSpacing: -2.5 }} numberOfLines={1}>{hero.line1}</Display>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
          <CyclingWord words={hero.words} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(550).duration(800)} style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Button label={t("Watch live")} icon="play" small onPress={() => router.push("/sermon/power-of-grace")} />
          <Button label={t("Get a ride")} icon="car-side" variant="glass" small onPress={() => router.push("/rides")} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(700).duration(800)} style={{ marginTop: 14 }}>
          <NextServiceCard />
        </Animated.View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {slides.map((_, i) => <View key={i} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? C.flame : "rgba(255,255,255,0.35)" }} />)}
          </View>
          <Body size={12} color="rgba(255,255,255,0.75)" numberOfLines={1} style={{ flex: 1 }}>{slides[idx]?.caption}</Body>
        </View>
      </Animated.View>
    </View>
  );
}
