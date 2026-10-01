import React, { useEffect } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, FadeInRight, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG, R, shadow } from "@/theme";
import { Avatar, Body, Button, Display, Icon, IconButton, Label, LiveBadge, LiveDot, Press, Ring, SectionTitle, Serif } from "@/components/ui";
import { PromoDeck } from "@/components/PromoDeck";
import { WeekStrip } from "@/components/WeekStrip";
import { HeroStage, HERO_H } from "@/components/HeroStage";
import { useSiteContent } from "@/lib/content";
import { useCourses, usePrayers } from "@/lib/data";
import { fmt } from "@/lib/time";
import { VerseDeck } from "@/components/VerseDeck";
import { useStore } from "@/lib/store";

const { width: SW } = Dimensions.get("window");

const QUICK = [
  { icon: "play", label: "Watch", color: C.flame, route: "/watch" },
  { icon: "book-open", label: "Courses", color: C.violet, route: "/grow" },
  { icon: "hands-pray", label: "Pray", color: C.rose, route: "/prayer" },
  { icon: "gamepad-variant", label: "Games", color: C.sun, route: "/games" },
  { icon: "car-side", label: "Rides", color: C.mint, route: "/rides" },
  { icon: "creation", label: "Ask AI", color: C.sky, route: "/assistant" },
  { icon: "heart", label: "Give", color: C.ink, route: "/give" },
  { icon: "calendar", label: "Events", color: "#B98AFF", route: "/events" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { done: doneSet, rsvps, toggleRsvp, markActive } = useStore();
  useEffect(() => { markActive(); }, []);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const site = useSiteContent();
  const miniHeader = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO_H - 160, HERO_H - 90], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: interpolate(y.value, [HERO_H - 160, HERO_H - 90], [-10, 0], Extrapolation.CLAMP) }] }));
  useFocusEffect(React.useCallback(() => { setStatusBarStyle("light"); return () => setStatusBarStyle("dark"); }, []));
  const { courses } = useCourses();
  // the course you're in the middle of, else the first one
  const course = courses.find((c) => { const d = c.lessons.filter((l) => doneSet.has(l.id)).length; return d > 0 && d < c.lessons.length; }) ?? courses[0];
  const done = course ? course.lessons.filter((l) => doneSet.has(l.id)).length : 0;
  const prayers = usePrayers().data;
  const praying = prayers.reduce((a, p) => a + (p.count || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <HeroStage hero={site.hero} y={y} />

        {/* Quick actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 24 }}>
          {QUICK.map((q, i) => (
            <Animated.View key={q.label} entering={FadeInRight.delay(200 + i * 60).springify().damping(15)}>
              <Press onPress={() => router.push(q.route as any)} style={{ alignItems: "center", gap: 8 }}>
                <View style={[{ width: 62, height: 62, borderRadius: 31, backgroundColor: q.color, alignItems: "center", justifyContent: "center" }, shadow(10, 14, 0.18, q.color)]}>
                  <Icon name={q.icon} size={25} color={q.color === C.sun ? C.ink : "#fff"} />
                </View>
                <Body size={12} weight="semi">{q.label}</Body>
              </Press>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Promotions */}
        <SectionTitle eyebrow="Happening at Agape" title="Don't miss" accent="what's next." />
        <PromoDeck promos={site.promos} />

        {/* A week at Agape */}
        <View style={{ marginTop: 38 }}>
          <SectionTitle eyebrow="Everything in one place" title="Every day" accent="of the week." />
          <WeekStrip />
        </View>

        {/* Scripture — swipeable verse deck (edited in the web admin) */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow="Scripture for today" title="Word" accent="for the day" />
          <VerseDeck verses={site.verses} />
        </View>

        {/* Continue learning */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow="Pick up where you left off" title="Keep" accent="growing" action="All courses" onAction={() => router.push("/grow")} />
          {course ? <Press onPress={() => router.push(`/course/${course.id}`)} scaleTo={0.98} style={{ marginHorizontal: 16, flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: "#fff", borderRadius: R.lg, padding: 10 }}>
            <Image source={course.image} style={{ width: 96, height: 96, borderRadius: 22 }} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Label>{course.category} · {course.lessons.length} lessons</Label>
              <Display size={24} style={{ marginTop: 4 }}>{course.title} <Serif size={25} color={C.violet}>{course.accent}</Serif></Display>
              <Body size={13} color={C.muted} numberOfLines={1}>{done >= course.lessons.length ? "Completed 🎉" : `Next: ${course.lessons.find((l) => !doneSet.has(l.id))?.title ?? ""}`}</Body>
            </View>
            <Ring size={62} stroke={6} progress={done / Math.max(1, course.lessons.length)} color={C.violet} track="rgba(110,75,255,0.14)">
              <Body size={13} weight="bold">{Math.round((done / Math.max(1, course.lessons.length)) * 100)}%</Body>
            </Ring>
          </Press> : null}
        </View>

        {/* Events */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow="What's on" title="This" accent="month" action="Calendar" onAction={() => router.push("/events")} />
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            {site.events.slice(0, 3).map((e, i) => {
              const going = rsvps.has(e.key);
              return (
                <Animated.View key={e.id} entering={FadeInDown.delay(i * 80)}>
                  <Press onPress={() => router.push("/events")} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 10, paddingRight: 12 }}>
                    <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
                      <Display size={26} color={C.cream} style={{ lineHeight: 26 }}>{e.day}</Display>
                      <Label size={9} color={C.creamMuted}>{e.month}</Label>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={16} weight="semi">{e.title}</Body>
                      <Body size={13} color={C.muted}>{e.time}</Body>
                    </View>
                    <Press onPress={() => toggleRsvp(e.key, e.title)} style={{ paddingHorizontal: 14, height: 36, borderRadius: R.pill, backgroundColor: going ? C.mint : C.flame, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {going ? <Icon name="check" size={14} color={C.ink} /> : null}
                      <Body size={12.5} weight="bold" color={going ? C.ink : "#fff"}>{going ? "Going" : "RSVP"}</Body>
                    </Press>
                  </Press>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Prayer teaser */}
        <Press onPress={() => router.push("/prayer")} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 34, borderRadius: R.xl, overflow: "hidden" }}>
          <LinearGradient colors={["#2A1B4D", "#1D1233"]} style={{ padding: 22 }}>
            <View style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: C.rose, opacity: 0.25 }} />
            <Label color="rgba(244,238,228,0.7)">Prayer wall</Label>
            <Display size={34} color={C.cream} style={{ marginTop: 8 }}>
              You don't have to{"\n"}<Serif size={36} color="#FF9EC2">carry it alone.</Serif>
            </Display>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, gap: 12 }}>
              <View style={{ flexDirection: "row" }}>
                {[C.rose, C.violet, C.mint, C.sun].map((c, i) => (
                  <View key={c} style={{ marginLeft: i ? -10 : 0 }}><Avatar name={["Anna", "Joel", "Mary", "Tom"][i]} color={c} size={32} ring="#241640" /></View>
                ))}
              </View>
              <Body size={13.5} color={C.creamMuted}><Body size={13.5} weight="bold" color="#fff">{fmt(praying || site.stats.prayers)}</Body> prayers on the wall</Body>
            </View>
          </LinearGradient>
        </Press>
      </Animated.ScrollView>

      {/* Mini sticky header */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 50, overflow: "hidden" }, miniHeader]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,11,18,0.78)" }} />
        <View style={{ position: "absolute", bottom: 10, left: 0, right: 0, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Image source={IMG.logoMarkLight} style={{ width: 26, height: 32 }} contentFit="contain" />
          <Display size={22} color="#fff">Agape <Serif size={22} color={C.flame}>International</Serif></Display>
        </View>
      </Animated.View>
    </View>
  );
}
