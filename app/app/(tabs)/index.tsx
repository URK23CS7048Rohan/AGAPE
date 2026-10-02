import React from "react";
import { Share, View } from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R, onColor } from "@/theme";
import { AvatarStack, Body, Display, Icon, IconButton, Label, Press, Ring, SectionTitle, Starburst } from "@/components/ui";
import { PromoCarousel } from "@/components/PromoCarousel";
import { HeroStage, NextService } from "@/components/HeroStage";
import { useSiteContent } from "@/lib/content";
import { COURSES, USER, VERSES } from "@/data/mock";
import { useStore } from "@/lib/store";

const QUICK = [
  { icon: "play", label: "Watch", color: C.flame, route: "/watch" },
  { icon: "book-open", label: "Courses", color: C.violet, route: "/grow" },
  { icon: "hands-pray", label: "Pray", color: C.rose, route: "/prayer" },
  { icon: "gamepad-variant", label: "Games", color: C.sun, route: "/games" },
  { icon: "car-side", label: "Rides", color: C.mint, route: "/rides" },
  { icon: "creation", label: "Ask AI", color: C.sky, route: "/assistant" },
  { icon: "heart", label: "Give", color: C.orange, route: "/give" },
  { icon: "calendar", label: "Events", color: C.ink, route: "/events" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { progress, rsvps, toggleRsvp } = useStore();
  const site = useSiteContent();
  const verse = VERSES[new Date().getDate() % VERSES.length];
  const course = COURSES[0];
  const done = progress[course.id] ?? 0;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        {/* Greeting */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10, marginBottom: 22 }}>
          <View style={{ flex: 1 }}>
            <Display size={30}>Hello, {USER.first} 👋</Display>
            <Label style={{ marginTop: 2 }}>{today}</Label>
          </View>
          <IconButton name="bell" badge border={C.line} onPress={() => router.push("/community")} />
          <Press onPress={() => router.push("/me")}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.sun, borderWidth: 2, borderColor: C.ink, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <Image source={IMG.logoMark} style={{ width: 26, height: 30 }} contentFit="contain" />
            </View>
          </Press>
        </Animated.View>

        <HeroStage hero={site.hero} />

        <View style={{ height: 30 }} />
        <NextService />

        {/* Quick actions */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, marginTop: 26, rowGap: 16 }}>
          {QUICK.map((q, i) => (
            <Animated.View key={q.label} entering={FadeInRight.delay(150 + i * 40).springify().damping(16)} style={{ width: "25%", alignItems: "center" }}>
              <Press onPress={() => router.push(q.route as any)} style={{ alignItems: "center", gap: 7 }}>
                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: q.color, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={q.icon} size={25} color={onColor(q.color)} />
                </View>
                <Body size={12.5} weight="semi">{q.label}</Body>
              </Press>
            </Animated.View>
          ))}
        </View>

        {/* Promotions */}
        <View style={{ marginTop: 32 }}>
          <SectionTitle title="Happening at Agape" sub="Don't miss what's next" />
          <PromoCarousel promos={site.promos} />
        </View>

        {/* Verse of the day */}
        <Animated.View entering={FadeInDown.delay(100)} style={{ marginHorizontal: 16, marginTop: 32 }}>
          <View style={{ backgroundColor: C.sun, borderRadius: R.xl, padding: 20, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -30, bottom: -36, opacity: 0.9 }}>
              <Starburst size={150} color="#FFC21A" spikes={18} spin />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ backgroundColor: C.ink, borderRadius: 10, paddingHorizontal: 10, height: 28, justifyContent: "center" }}>
                <Body size={12} weight="semi" color="#fff">Verse of the day</Body>
              </View>
              <IconButton name="share-2" size={40} bg={C.ink} color="#fff" onPress={() => Share.share({ message: `“${verse.text}” — ${verse.ref}\n\nShared from the Agape app` })} />
            </View>
            <Display size={28} style={{ marginTop: 14 }}>“{verse.text}”</Display>
            <Body size={14} weight="semi" style={{ marginTop: 10 }}>{verse.ref}</Body>
          </View>
        </Animated.View>

        {/* Continue learning */}
        <View style={{ marginTop: 32 }}>
          <SectionTitle title="Keep growing" action="All courses" onAction={() => router.push("/grow")} />
          <Press onPress={() => router.push(`/course/${course.id}`)} scaleTo={0.98} style={{ marginHorizontal: 16, flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
            <View style={{ width: 92, height: 92, borderRadius: 18, backgroundColor: course.color, padding: 6 }}>
              <Image source={course.image} style={{ flex: 1, borderRadius: 13 }} contentFit="cover" />
            </View>
            <View style={{ flex: 1 }}>
              <Label>{course.category} · {course.lessons.length} lessons</Label>
              <Display size={19} style={{ marginTop: 2 }} numberOfLines={2}>{course.title} {course.accent}</Display>
              <Label numberOfLines={1} style={{ marginTop: 4 }}>Next: {course.lessons[Math.min(done, course.lessons.length - 1)].title}</Label>
            </View>
            <Ring size={58} stroke={6} progress={done / course.lessons.length} color={C.violet}>
              <Body size={13} weight="bold">{Math.round((done / course.lessons.length) * 100)}%</Body>
            </Ring>
          </Press>
        </View>

        {/* Events */}
        <View style={{ marginTop: 32 }}>
          <SectionTitle title="This month" action="Calendar" onAction={() => router.push("/events")} />
          <View style={{ marginHorizontal: 16, gap: 10 }}>
            {site.events.slice(0, 3).map((e, i) => {
              const going = rsvps.has(e.id);
              return (
                <Animated.View key={e.id} entering={FadeInDown.delay(i * 70)}>
                  <Press onPress={() => router.push("/events")} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 10, paddingRight: 12, borderWidth: 1.5, borderColor: C.line }}>
                    <View style={{ width: 60, height: 64, borderRadius: 16, backgroundColor: e.color, alignItems: "center", justifyContent: "center" }}>
                      <Display size={24} color={onColor(e.color)} style={{ lineHeight: 26 }}>{e.day}</Display>
                      <Label size={11} color={onColor(e.color)}>{e.month}</Label>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={15.5} weight="semi" numberOfLines={1}>{e.title}</Body>
                      <Label numberOfLines={1}>{e.time}</Label>
                    </View>
                    <Press onPress={() => toggleRsvp(e.id)} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: going ? C.mint : C.ink, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {going ? <Icon name="check" size={14} color="#fff" /> : null}
                      <Body size={12.5} weight="bold" color="#fff">{going ? "Going" : "RSVP"}</Body>
                    </Press>
                  </Press>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Prayer teaser */}
        <Press onPress={() => router.push("/prayer")} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 32, borderRadius: R.xl, backgroundColor: C.rose, padding: 20, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: 16, top: 16 }}>
            <Starburst size={64} color={C.ink} rotate={8}><Icon name="hands-pray" size={26} color={C.rose} /></Starburst>
          </View>
          <Body size={13} weight="semi">Prayer wall</Body>
          <Display size={30} style={{ marginTop: 6, maxWidth: "75%" }}>You don't have to carry it alone.</Display>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, gap: 12 }}>
            <AvatarStack names={["Anna", "Joel", "Mary"]} colors={[C.sun, C.violet, C.mint]} ring={C.rose} extra="+9" />
            <Body size={13.5}><Body size={13.5} weight="bold">1,240</Body> praying this week</Body>
          </View>
        </Press>
      </Animated.ScrollView>
    </View>
  );
}
