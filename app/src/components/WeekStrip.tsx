import React from "react";
import { Dimensions, View } from "react-native";
import Animated, { Extrapolation, SharedValue, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C, F, IMG, R, shadow } from "@/theme";
import { Body, Display, Icon, Label, Press, Serif } from "./ui";

const { width: SW } = Dimensions.get("window");
const PW = Math.round(SW * 0.8);
const PH = 430;

type Day = { d: string; k: string; t: string; a: string; body: string; cta: string; route: string; color: string; light?: boolean; image: any; radius: object; chip: string; chipIcon: string };
const DAYS: Day[] = [
  { d: "Sun", k: "Sunday · 10 AM & 6 PM", t: "Celebrate", a: "together.", body: "Worship in the room or live from anywhere.", cta: "Watch live", route: "/watch", color: C.flame, image: IMG.homeWorship, radius: { borderTopLeftRadius: 200, borderTopRightRadius: 200, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, chip: "Live every Sunday", chipIcon: "radio" },
  { d: "Mon", k: "Agape Institute", t: "Learn", a: "deeper.", body: "Courses with video, PDFs and quizzes.", cta: "Start a course", route: "/grow", color: C.violet, image: IMG.institute, radius: { borderRadius: 200 }, chip: "Earn a certificate", chipIcon: "award" },
  { d: "Tue", k: "Bible games", t: "Play &", a: "remember.", body: "Verse Match, trivia and leaderboards.", cta: "Play a round", route: "/games", color: C.sun, light: true, image: IMG.kidsHearts, radius: { borderTopLeftRadius: 120, borderTopRightRadius: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 120 }, chip: "New verses weekly", chipIcon: "zap" },
  { d: "Wed", k: "Wednesday Prayer · 7:30 PM", t: "Pray", a: "with us.", body: "Post a request. Feel the family stand with you.", cta: "Prayer wall", route: "/prayer", color: C.rose, image: IMG.prayerWorship, radius: { borderTopLeftRadius: 160, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 160 }, chip: "Pray with the family", chipIcon: "heart" },
  { d: "Thu", k: "Ask Agape · AI", t: "Ask", a: "anything.", body: "Bible questions and devotionals, at 2 AM too.", cta: "Ask now", route: "/assistant", color: C.sky, light: true, image: IMG.bibleCoffee, radius: { borderRadius: 200 }, chip: "Ask about any verse", chipIcon: "message-circle" },
  { d: "Fri", k: "Home gatherings", t: "Gather", a: "at home.", body: "Host or join a prayer meeting nearby.", cta: "Find a group", route: "/community", color: C.mint, light: true, image: IMG.families, radius: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 200, borderBottomRightRadius: 200 }, chip: "Join a group", chipIcon: "home" },
  { d: "Sat", k: "Serve & rides", t: "Serve", a: "someone.", body: "Drive, lead worship, or join the tech team.", cta: "Volunteer", route: "/rides", color: "#B7A5FF", light: true, image: IMG.squadBand, radius: { borderRadius: 60 }, chip: "Free rides to church", chipIcon: "navigation" },
];

function Panel({ d, i, x }: { d: Day; i: number; x: SharedValue<number> }) {
  const ink = d.light ? C.ink : "#fff";
  const r = [(i - 1) * (PW + 12), i * (PW + 12), (i + 1) * (PW + 12)];
  const img = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, r, [-40, 0, 40], Extrapolation.CLAMP) }, { scale: 1.2 }] }));
  const name = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.value, r, [60, 0, -60], Extrapolation.CLAMP) }] }));
  const card = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(x.value, r, [0.94, 1, 0.94], Extrapolation.CLAMP) }, { rotate: `${interpolate(x.value, r, [3, 0, -3], Extrapolation.CLAMP)}deg` }] }));
  return (
    <Animated.View style={[{ width: PW, height: PH, borderRadius: 34, overflow: "hidden", backgroundColor: d.color }, shadow(16, 26, 0.22, "#1a0a14"), card]}>
      <Animated.Text style={[{ position: "absolute", left: 12, top: 8, fontFamily: F.display, fontSize: 150, lineHeight: 150, color: d.light ? "rgba(15,11,18,0.1)" : "rgba(0,0,0,0.16)", textTransform: "uppercase", letterSpacing: -5 }, name]}>{d.d}</Animated.Text>
      <View style={[{ position: "absolute", right: 16, top: 70, width: PW * 0.56, height: 200, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.15)" }, d.radius]}>
        <Animated.View style={[{ position: "absolute", left: -30, right: -30, top: 0, bottom: 0 }, img]}>
          <Image source={d.image} style={{ flex: 1 }} contentFit="cover" transition={250} />
        </Animated.View>
      </View>
      <View style={[{ position: "absolute", left: 14, top: 236, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 38, borderRadius: R.pill, backgroundColor: "#fff", transform: [{ rotate: i % 2 ? "3deg" : "-3deg" }] }, shadow(10, 18, 0.25)]}>
        <Icon name={d.chipIcon} size={15} color={d.color === C.sun ? C.flame : d.color} />
        <Body size={12.5} weight="bold">{d.chip}</Body>
      </View>
      <View style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
        <Label size={9.5} color={ink} style={{ opacity: 0.75 }}>{d.k}</Label>
        <Display size={46} color={ink} style={{ textTransform: "uppercase", lineHeight: 44, marginTop: 6 }}>{d.t}</Display>
        <Serif size={38} color={ink} style={{ lineHeight: 40, marginTop: -4 }}>{d.a}</Serif>
        <Body size={13.5} color={ink} style={{ opacity: 0.85, marginTop: 4 }} numberOfLines={2}>{d.body}</Body>
        <Press onPress={() => router.push(d.route as any)} style={{ alignSelf: "flex-start", marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 42, borderRadius: R.pill, backgroundColor: d.light ? C.ink : "#fff" }}>
          <Body size={13.5} weight="bold" color={d.light ? "#fff" : C.ink}>{d.cta}</Body>
          <Icon name="arrow-up-right" size={15} color={d.light ? "#fff" : C.ink} />
        </Press>
      </View>
    </Animated.View>
  );
}

/** “A week at Agape” — snap-scrolling colour panels, the app twin of the website's horizontal week. */
export function WeekStrip() {
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  return (
    <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={PW + 12} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: (SW - PW) / 2, gap: 12, paddingVertical: 10 }}>
      {DAYS.map((d, i) => <Panel key={d.d} d={d} i={i} x={x} />)}
    </Animated.ScrollView>
  );
}
