import React, { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R, onColor } from "@/theme";
import { Bar, Body, Chip, DayPill, Display, Icon, Label, Press, Ring, ScreenTitle, SectionTitle, Starburst } from "@/components/ui";
import { COURSES, STUDY_PDFS } from "@/data/mock";
import { useStore } from "@/lib/store";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The last six days plus today, for the reading-plan week strip. */
function week() {
  const out: { top: string; bottom: string; today: boolean }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({ top: DAY_NAMES[d.getDay()], bottom: String(d.getDate()), today: i === 0 });
  }
  return out;
}

export default function Grow() {
  const insets = useSafeAreaInsets();
  const { progress } = useStore();
  const [cat, setCat] = useState("All");
  const [day, setDay] = useState(5);
  const cats = ["All", "Bible", "Explore", "Leadership"];
  const list = COURSES.filter((c) => cat === "All" || c.category === cat);
  const featured = COURSES[0];
  const fDone = progress[featured.id] ?? 0;
  const days = week();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title="Go deeper" sub="Courses, reading plans and study guides" />
        </Animated.View>

        {/* Daily reading */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ backgroundColor: C.violet, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -18, top: -18 }}>
              <Starburst size={130} color={C.orange} spikes={8} depth={0.55} spin>
                <Icon name="fire" size={34} color={C.ink} />
              </Starburst>
            </View>
            <Display size={30} style={{ maxWidth: "70%" }}>Daily reading</Display>
            <Body size={13.5} style={{ marginTop: 2 }}>Bible in a year · Day 273 · 7-day streak</Body>
            <Press onPress={() => router.push("/sermon/psalm-23")} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.ink, borderRadius: 16, paddingLeft: 16, paddingRight: 6, height: 52 }}>
              <Icon name="book-open" size={17} color="#fff" />
              <Body color="#fff" weight="semi" style={{ flex: 1 }}>Today: Psalm 23 · Luke 15</Body>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.sun, alignItems: "center", justifyContent: "center" }}><Icon name="arrow-right" size={18} /></View>
            </Press>
          </View>
        </Animated.View>
        <View style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginTop: 12 }}>
          {days.map((d, i) => <DayPill key={i} top={d.top} bottom={d.bottom} done={!d.today} active={day === i} onPress={() => setDay(i)} />)}
        </View>

        {/* Featured course */}
        <Animated.View entering={FadeInDown.delay(160)} style={{ marginTop: 28 }}>
          <SectionTitle title="Your plan" action="Continue" onAction={() => router.push(`/course/${featured.id}`)} />
          <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16 }}>
            <Press onPress={() => router.push(`/course/${featured.id}`)} scaleTo={0.98} style={{ flex: 1.15, backgroundColor: C.orange, borderRadius: R.lg, padding: 14, minHeight: 230, justifyContent: "space-between" }}>
              <View>
                <Label color={C.ink}>Agape Institute</Label>
                <Display size={22} style={{ marginTop: 4 }}>{featured.title}</Display>
                <Label color={C.ink} style={{ marginTop: 4 }}>{featured.accent}</Label>
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <Ring size={64} stroke={6} progress={fDone / featured.lessons.length} color={C.ink} track="rgba(20,20,20,0.12)">
                  <Body size={13} weight="bold">{Math.round((fDone / featured.lessons.length) * 100)}%</Body>
                </Ring>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Icon name="play" size={16} color="#fff" /></View>
              </View>
            </Press>
            <View style={{ flex: 1, gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: C.sky, borderRadius: R.lg, padding: 14, justifyContent: "space-between" }}>
                <Label color={C.ink}>Lessons</Label>
                <Display size={34}>{fDone}/{featured.lessons.length}</Display>
              </View>
              <Press onPress={() => Linking.openURL("https://example.com/study-guide.pdf")} style={{ height: 70, backgroundColor: C.rose, borderRadius: R.lg, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name="file-text" size={20} />
                <Body size={13.5} weight="semi" style={{ flex: 1 }}>Study guide</Body>
              </Press>
            </View>
          </View>
        </Animated.View>

        {/* All courses */}
        <View style={{ marginTop: 30 }}>
          <SectionTitle title="All courses" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
            {cats.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {list.map((c, i) => {
              const d = progress[c.id] ?? 0;
              const fg = onColor(c.color);
              return (
                <Animated.View key={c.id} entering={FadeInRight.delay(i * 60).springify().damping(16)} layout={LinearTransition.springify()}>
                  <Press onPress={() => router.push(`/course/${c.id}`)} scaleTo={0.98} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 84, height: 84, borderRadius: 18, backgroundColor: c.color, padding: 5 }}>
                        <Image source={c.image} style={{ flex: 1, borderRadius: 13 }} contentFit="cover" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Label>{c.category} · {c.lessons.length} lessons</Label>
                        <Body size={16} weight="semi" numberOfLines={2} style={{ marginTop: 2 }}>{c.title} {c.accent}</Body>
                        <Label style={{ marginTop: 2 }}>{d === 0 ? "Not started" : d >= c.lessons.length ? "Completed 🎉" : `${d} of ${c.lessons.length} done`}</Label>
                      </View>
                      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.color, alignItems: "center", justifyContent: "center" }}>
                        <Icon name={d >= c.lessons.length ? "check" : "play"} size={16} color={fg} />
                      </View>
                    </View>
                    <View style={{ marginTop: 10 }}><Bar progress={d / c.lessons.length} color={c.color} height={6} delay={200 + i * 80} /></View>
                  </Press>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* PDFs */}
        <View style={{ marginTop: 30 }}>
          <SectionTitle title="Study guides" sub="Open page by page" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {STUDY_PDFS.map((p, i) => {
              const fg = onColor(p.color);
              return (
                <Animated.View key={p.id} entering={FadeInRight.delay(i * 70)}>
                  <Press onPress={() => Linking.openURL("https://example.com/study-guide.pdf")} style={{ width: 150, height: 180, borderRadius: R.lg, backgroundColor: p.color, padding: 14, justifyContent: "space-between" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="file-text" size={19} />
                    </View>
                    <View>
                      <Display size={19} color={fg}>{p.title}</Display>
                      <Label color={fg} style={{ marginTop: 4, opacity: 0.85 }}>{p.pages} pages · PDF</Label>
                    </View>
                  </Press>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
