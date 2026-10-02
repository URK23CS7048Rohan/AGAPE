import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeOutUp, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C, F, IMG, R } from "@/theme";
import { Body, Button, Dashes, DigitTiles, Display, Icon, Label, LiveDot, Sticker, Starburst, Ticket } from "./ui";
import { HeroContent } from "@/lib/content";
import { nextService } from "@/lib/time";
import { useSiteContent } from "@/lib/content";

function Slide({ source, active }: { source: any; active: boolean }) {
  const o = useSharedValue(active ? 1 : 0);
  const s = useSharedValue(1.08);
  useEffect(() => {
    o.value = withTiming(active ? 1 : 0, { duration: 900, easing: Easing.inOut(Easing.quad) });
    if (active) { s.value = 1.08; s.value = withTiming(1, { duration: 6000, easing: Easing.out(Easing.quad) }); }
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
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, [words.length]);
  const w = words[i % words.length] || "";
  return (
    <View style={{ alignSelf: "flex-start", marginTop: 6, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12, height: 52, justifyContent: "center", overflow: "hidden", transform: [{ rotate: "-2deg" }] }}>
      <Animated.Text key={`${i}-${w}`} entering={FadeInDown.springify().damping(16).stiffness(150)} exiting={FadeOutUp.duration(220)} numberOfLines={1} style={{ fontFamily: F.display, fontSize: 36, lineHeight: 42, color: C.ink, letterSpacing: -1.2 }}>
        {w}
      </Animated.Text>
    </View>
  );
}

/** Purple hero block: headline, cycling word and the admin-managed photo slideshow. */
export function HeroStage({ hero }: { hero: HeroContent; y?: any }) {
  const [idx, setIdx] = useState(0);
  const slides = hero.slides.length ? hero.slides : [{ image: IMG.homeWorship, caption: "" }];
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <Animated.View entering={FadeInDown.duration(600)} style={{ marginHorizontal: 16 }}>
      <View style={{ backgroundColor: C.violet, borderRadius: R.xl, padding: 18 }}>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.55)", paddingHorizontal: 11, height: 28, borderRadius: R.pill, maxWidth: "70%" }}>
          <Icon name="star-four-points" size={12} color={C.ink} />
          <Body size={12} weight="semi" numberOfLines={1}>{hero.kicker}</Body>
        </View>
        <Display size={40} style={{ marginTop: 14, maxWidth: "78%" }}>{hero.line1}</Display>
        <CyclingWord words={hero.words} />

        <View style={{ marginTop: 16, height: 190, borderRadius: 20, overflow: "hidden", backgroundColor: C.ink }}>
          {slides.map((s, i) => <Slide key={i} source={s.image} active={i === idx} />)}
          <View style={{ position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {slides[idx]?.caption ? (
              <View style={{ flexShrink: 1, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, height: 28, justifyContent: "center" }}>
                <Body size={12} weight="semi" numberOfLines={1}>{slides[idx].caption}</Body>
              </View>
            ) : <View style={{ flex: 1 }} />}
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", gap: 4, backgroundColor: "rgba(20,20,20,0.55)", paddingHorizontal: 8, height: 20, borderRadius: 10, alignItems: "center" }}>
              {slides.map((_, i) => <View key={i} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.45)" }} />)}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Button label="Watch" icon="play" trail={null} small onPress={() => router.push("/watch")} style={{ flex: 1 }} />
          <Button label="Get a ride" icon="car-side" trail={null} variant="light" small onPress={() => router.push("/rides")} style={{ flex: 1 }} />
        </View>
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: -6, top: -14 }}>
        <Sticker top="Join us" bottom="this week" bg={C.sun} size={92} rotate={12} />
      </View>
    </Animated.View>
  );
}

/** Green ticket with a split-flap countdown to the next service. */
export function NextService() {
  const { services, church } = useSiteContent();
  const calc = () => nextService(services, church.tzOffsetHours ?? 3);
  const [n, setN] = useState(calc);
  useEffect(() => {
    setN(calc());
    const t = setInterval(() => setN(calc()), 1000);
    return () => clearInterval(t);
  }, [services, church.tzOffsetHours]);
  if (!n) return null;
  return (
    <Animated.View entering={FadeIn.delay(150).duration(600)} style={{ marginHorizontal: 16 }}>
      <Ticket color={C.mint} at={0.62}>
        <View style={{ padding: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <LiveDot color={n.live ? "#fff" : C.sun} size={7} />
            <Label color="rgba(255,255,255,0.85)">{n.live ? "Live now" : "Next service"}</Label>
          </View>
          <Body size={18} weight="semi" color="#fff" style={{ marginTop: 4, marginRight: 50 }} numberOfLines={1}>{n.live || n.label} · {n.time}</Body>
          <Dashes color="rgba(255,255,255,0.4)" style={{ marginVertical: 14 }} />
          {n.live ? (
            <Button label="Join the stream" icon="play" variant="light" block onPress={() => router.push("/watch")} />
          ) : (
            <DigitTiles groups={[["Days", n.d], ["Hours", n.h], ["Minutes", n.m], ["Seconds", n.s]]} />
          )}
        </View>
      </Ticket>
      <View pointerEvents="none" style={{ position: "absolute", right: 8, top: -16 }}>
        <Starburst size={54} color={C.sun} rotate={10}>
          <Text style={{ fontFamily: F.poster, fontSize: 26, color: C.ink }}>!</Text>
        </Starburst>
      </View>
    </Animated.View>
  );
}
