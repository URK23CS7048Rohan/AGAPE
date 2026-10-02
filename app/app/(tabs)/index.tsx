import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Avatar, Bar, Body, Icon, Label, Press, Ring, SectionTitle } from "@/components/ui";
import { PromoDeck } from "@/components/PromoDeck";
import { HeroStage, HERO_H } from "@/components/HeroStage";
import { VerseDeck } from "@/components/VerseDeck";
import { useSiteContent } from "@/lib/content";
import { useCourses, usePrayers } from "@/lib/data";
import { planToday, usePlanProgress, usePlans, useTestimonies, useWelcome } from "@/lib/more";
import { fmt } from "@/lib/time";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const EXPLORE: { icon: string; label: string; color: string; route: string }[] = [
  { icon: "book-open", label: "Bible", color: C.flame, route: "/bible" },
  { icon: "music-clef-treble", label: "Songs", color: "#B7791F", route: "/songs" },
  { icon: "zap", label: "Games", color: C.violet, route: "/games" },
  { icon: "hands-pray", label: "Prayer", color: C.rose, route: "/prayer" },
  { icon: "sun", label: "Testimonies", color: "#E08A00", route: "/testimonies" },
  { icon: "home", label: "Home groups", color: "#16A37B", route: "/home-prayer" },
  { icon: "car-side", label: "Rides", color: "#2F7DE1", route: "/rides" },
  { icon: "creation", label: "Ask AI", color: "#0E9AA7", route: "/assistant" },
  { icon: "heart", label: "Give", color: C.ink, route: "/give" },
  { icon: "calendar", label: "Events", color: "#8B5CF6", route: "/events" },
  { icon: "check-square", label: "Check in", color: "#16A37B", route: "/checkin" },
  { icon: "users", label: "Serve", color: C.flame, route: "/serve" },
];
const MINISTRIES = [
  { key: "kids", title: "Agape Kids", sub: "Stories, videos & games", image: IMG.kidsHearts, route: "/kids" },
  { key: "teens", title: "Agape Teens", sub: "Youth night & challenges", image: IMG.friendsTeal, route: "/ministry/teens" },
  { key: "squad", title: "Agape Squad", sub: "Worship band & dance", image: IMG.squadBand, route: "/ministry/squad" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { done: doneSet, rsvps, toggleRsvp, markActive, member, profile } = useStore();
  useEffect(() => { markActive(); }, []);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const site = useSiteContent();
  const miniHeader = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO_H - 160, HERO_H - 90], [0, 1], Extrapolation.CLAMP) }));
  useFocusEffect(React.useCallback(() => { setStatusBarStyle("light"); return () => setStatusBarStyle("dark"); }, []));
  const { courses } = useCourses();
  const course = courses.find((c) => { const d = c.lessons.filter((l) => doneSet.has(l.id)).length; return d > 0 && d < c.lessons.length; }) ?? courses[0];
  const done = course ? course.lessons.filter((l) => doneSet.has(l.id)).length : 0;
  const prayers = usePrayers().data;
  const praying = prayers.reduce((a, p) => a + (p.count || 0), 0);
  const plans = usePlans().data;
  const { progress } = usePlanProgress();
  const plan = plans.find((p) => progress[p.id] && progress[p.id].done.length < p.days.length);
  const stories = useTestimonies().list.filter((x) => !x.pending).slice(0, 3);
  const { steps } = useWelcome();
  const welcomeDone = Object.values(steps).filter(Boolean).length;
  const isNew = member && welcomeDone < 7 && (!profile || Date.now() - new Date(profile.created_at).getTime() < 90 * 864e5);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <HeroStage hero={site.hero} y={y} />

        {/* Explore */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 20, rowGap: 14 }}>
          {EXPLORE.map((q, i) => (
            <Animated.View key={q.label} entering={FadeInDown.delay(100 + i * 25)} style={{ width: "25%", alignItems: "center" }}>
              <Press onPress={() => router.push(q.route as any)} scaleTo={0.94} style={{ alignItems: "center", gap: 7, width: "100%" }} label={t(q.label)}>
                <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(15,11,18,0.08)" }}>
                  <Icon name={q.icon} size={23} color={q.color} />
                </View>
                <Body size={12} weight="medium" numberOfLines={1}>{t(q.label)}</Body>
              </Press>
            </Animated.View>
          ))}
        </View>

        {/* New member checklist */}
        {isNew ? (
          <Press onPress={() => router.push("/getting-started" as any)} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 24, backgroundColor: "#fff", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Ring size={52} stroke={5} progress={welcomeDone / 7} color="#16A37B" track="rgba(22,163,123,0.15)"><Body size={13} weight="bold">{welcomeDone}/7</Body></Ring>
            <View style={{ flex: 1 }}>
              <Body weight="semi">{t("Getting started at Agape")}</Body>
              <Body size={13} color={C.muted}>{t("Small steps to feel at home — join a group, meet a pastor…")}</Body>
            </View>
            <Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" />
          </Press>
        ) : null}

        {/* Today's reading */}
        {plan ? (() => {
          const pr = progress[plan.id], day = planToday(pr, plan.days.length);
          return (
            <Press onPress={() => router.push(`/plans/day?slug=${plan.slug}&d=${day}` as any)} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: C.ink, borderRadius: 18, overflow: "hidden", flexDirection: "row" }}>
              <Image source={plan.image} style={{ width: 96 }} contentFit="cover" />
              <View style={{ flex: 1, padding: 14, gap: 4 }}>
                <Label color={C.sun}>{t("Today's reading")} · {t("Day {d} of {n}", { d: day, n: plan.days.length })}</Label>
                <Body weight="semi" color={C.cream} numberOfLines={1}>{plan.days[day - 1]?.title}</Body>
                <Body size={13} color={C.creamMuted} numberOfLines={1}>{plan.days[day - 1]?.refs.join(" · ")}</Body>
                <View style={{ marginTop: 6 }}><Bar progress={pr.done.length / plan.days.length} color={C.sun} track="rgba(255,255,255,0.12)" height={4} /></View>
              </View>
            </Press>
          );
        })() : null}

        {/* Promotions */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow={t("Happening at Agape")} title={t("Don't miss")} accent={t("what's next.")} />
          <PromoDeck promos={site.promos} />
        </View>

        {/* Ministries */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow={t("For every age")} title={t("Ministries")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {MINISTRIES.map((m) => (
              <Press key={m.key} onPress={() => router.push(m.route as any)} scaleTo={0.97} style={{ width: 240, height: 170, borderRadius: 18, overflow: "hidden" }}>
                <Image source={m.image} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["rgba(15,11,18,0)", "rgba(15,11,18,0.8)"]} style={StyleSheet.absoluteFill} />
                <View style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
                  <Body weight="bold" size={17} color="#fff">{t(m.title)}</Body>
                  <Body size={13} color="rgba(255,255,255,0.85)">{t(m.sub)}</Body>
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>

        {/* Scripture */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow={t("Scripture for today")} title={t("Word")} accent={t("for the day")} />
          <VerseDeck verses={site.verses} />
        </View>

        {/* Continue learning */}
        {course ? (
          <View style={{ marginTop: 34 }}>
            <SectionTitle eyebrow={t("Agape Institute")} title={t("Keep learning")} action={t("All courses")} onAction={() => router.push("/learn" as any)} />
            <Press onPress={() => router.push(`/course/${course.id}`)} scaleTo={0.985} style={{ marginHorizontal: 16, flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 10 }}>
              <Image source={course.image} style={{ width: 84, height: 84, borderRadius: 14 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Label>{course.category} · {t("{n} lessons", { n: course.lessons.length })}</Label>
                <Body weight="semi" size={17} style={{ marginTop: 4 }}>{course.title} {course.accent}</Body>
                <Body size={13} color={C.muted} numberOfLines={1}>{done >= course.lessons.length ? t("Completed") : t("Next: {l}", { l: course.lessons.find((l) => !doneSet.has(l.id))?.title ?? "" })}</Body>
              </View>
              <Ring size={54} stroke={5} progress={done / Math.max(1, course.lessons.length)} color={C.violet} track="rgba(110,75,255,0.14)">
                <Body size={12} weight="bold">{Math.round((done / Math.max(1, course.lessons.length)) * 100)}%</Body>
              </Ring>
            </Press>
          </View>
        ) : null}

        {/* Events */}
        <View style={{ marginTop: 34 }}>
          <SectionTitle eyebrow={t("What's on")} title={t("This month")} action={t("Calendar")} onAction={() => router.push("/events")} />
          <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 18, overflow: "hidden" }}>
            {site.events.slice(0, 3).map((e, i) => {
              const going = rsvps.has(e.key);
              return (
                <Press key={e.id} onPress={() => router.push("/events")} scaleTo={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: "rgba(15,11,18,0.1)" }}>
                  <View style={{ width: 50, alignItems: "center" }}>
                    <Label size={10} color={C.flame}>{e.month}</Label>
                    <Body style={{ fontFamily: F.displayBold, fontSize: 24, lineHeight: 28 }}>{e.day}</Body>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi">{e.title}</Body>
                    <Body size={13} color={C.muted}>{e.time}</Body>
                  </View>
                  <Press onPress={() => toggleRsvp(e.key, e.title)} style={{ paddingHorizontal: 12, height: 32, borderRadius: 9, backgroundColor: going ? "rgba(22,163,123,0.12)" : C.ink, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 5 }}>
                    {going ? <Icon name="check" size={13} color="#16A37B" /> : null}
                    <Body size={12.5} weight="semi" color={going ? "#16A37B" : "#fff"}>{going ? t("Going") : t("RSVP")}</Body>
                  </Press>
                </Press>
              );
            })}
          </View>
        </View>

        {/* Testimonies */}
        {stories.length ? (
          <View style={{ marginTop: 34 }}>
            <SectionTitle eyebrow={t("What God is doing")} title={t("Testimonies")} action={t("Read all")} onAction={() => router.push("/testimonies" as any)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {stories.map((s) => (
                <Press key={s.id} onPress={() => router.push("/testimonies" as any)} scaleTo={0.97} style={{ width: 270, backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 }}>
                  <Label color={C.flame}>{t(s.category[0].toUpperCase() + s.category.slice(1))}</Label>
                  <Body weight="semi" size={16} numberOfLines={1}>{s.title}</Body>
                  <Body numberOfLines={4} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22 }}>{s.body}</Body>
                  <Body size={12.5} color={C.muted}>{s.author || t("Anonymous")} · {t("Amen")} {s.amens}</Body>
                </Press>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Prayer teaser */}
        <Press onPress={() => router.push("/prayer")} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 34, borderRadius: 18, overflow: "hidden" }}>
          <LinearGradient colors={["#2A1B4D", "#1D1233"]} style={{ padding: 20 }}>
            <Label color="rgba(244,238,228,0.7)">{t("Prayer wall")}</Label>
            <Body style={{ fontFamily: F.displayBold, fontSize: 24, lineHeight: 30, color: C.cream, marginTop: 6 }}>{t("You don't have to carry it alone.")}</Body>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 12 }}>
              <View style={{ flexDirection: "row" }}>
                {[C.rose, C.violet, C.mint, C.sun].map((c, i) => (
                  <View key={c} style={{ marginLeft: i ? -10 : 0 }}><Avatar name={["Anna", "Joel", "Mary", "Tom"][i]} color={c} size={30} ring="#241640" /></View>
                ))}
              </View>
              <Body size={13.5} color={C.creamMuted}>{t("{n} prayers on the wall", { n: fmt(praying || site.stats.prayers) })}</Body>
            </View>
          </LinearGradient>
        </Press>
      </Animated.ScrollView>

      {/* Mini sticky header */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 48, overflow: "hidden" }, miniHeader]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,11,18,0.82)" }} />
        <View style={{ position: "absolute", bottom: 11, left: 0, right: 0, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Image source={IMG.logoMarkLight} style={{ width: 20, height: 25 }} contentFit="contain" />
          <Body weight="semi" size={16} color="#fff">Agape International</Body>
        </View>
      </Animated.View>
    </View>
  );
}
