import React, { useState } from "react";
import { Linking, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R, onColor } from "@/theme";
import { Async, Bar, Body, Chip, DayPill, Display, Empty, Icon, Label, Press, Ring, ScreenTitle, SectionTitle, Starburst } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { imageSource } from "@/lib/content";
import { completedLessons, Course, learningDays, listCourses, listGuides } from "@/lib/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = [C.violet, C.mint, C.flame, C.sun, C.rose, C.sky];

/** The last six days plus today, for the week strip. */
function week() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (5 - k));
    return { top: DAY_NAMES[d.getDay()], bottom: String(d.getDate()), iso: d.toLocaleDateString("en-CA"), today: k === 5 };
  });
}

export default function Grow() {
  const insets = useSafeAreaInsets();
  const { signedIn } = useAuth();
  const courses = useQuery("courses", listCourses);
  const done = useQuery(signedIn ? "progress:lessons" : null, completedLessons);
  const days = useQuery(signedIn ? "progress:days" : null, learningDays);
  const guides = useQuery("guides", listGuides);
  const [cat, setCat] = useState("All");

  const list = courses.data ?? [];
  const cats = ["All", ...Array.from(new Set(list.map((c) => c.category).filter(Boolean) as string[]))];
  const shown = list.filter((c) => cat === "All" || c.category === cat);
  const doneIn = (c: Course) => c.lessons.filter((l) => done.data?.has(l.id)).length;
  const featured = list.filter((c) => c.lessons.length && doneIn(c) < c.lessons.length).sort((a, b) => doneIn(b) / b.lessons.length - doneIn(a) / a.lessons.length)[0] ?? list[0];
  const fDone = featured ? doneIn(featured) : 0;
  const strip = week();
  let streak = 0;
  for (let i = strip.length - 1; i >= 0; i--) {
    if (days.data?.has(strip[i].iso)) streak++;
    else if (!strip[i].today) break;
  }
  const colorOf = (c: Course, i: number) => c.color || COLORS[i % COLORS.length];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { courses.reload(); done.reload(); days.reload(); guides.reload(); }} />}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title="Go deeper" sub="Courses and study guides from the Agape Institute" />
        </Animated.View>

        {/* This week */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ backgroundColor: C.violet, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -18, top: -18 }}>
              <Starburst size={130} color={C.orange} spikes={8} depth={0.55} spin>
                <Icon name="fire" size={34} color={C.ink} />
              </Starburst>
            </View>
            <Display size={30} style={{ maxWidth: "70%" }}>{signedIn ? (streak ? `${streak}-day streak` : "Start a streak") : "Learn every day"}</Display>
            <Body size={13.5} style={{ marginTop: 2, maxWidth: "70%" }}>{signedIn ? "Finish a lesson each day to keep it going." : "Sign in to track your progress and earn certificates."}</Body>
            <Press
              onPress={() => (!signedIn ? router.push("/auth") : featured ? router.push(`/course/${featured.id}`) : null)}
              style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.ink, borderRadius: 16, paddingLeft: 16, paddingRight: 6, height: 52 }}
            >
              <Icon name={signedIn ? "book-open" : "log-in"} size={17} color="#fff" />
              <Body color="#fff" weight="semi" style={{ flex: 1 }} numberOfLines={1}>{!signedIn ? "Sign in to start" : featured ? `Continue: ${featured.title}` : "Courses coming soon"}</Body>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.sun, alignItems: "center", justifyContent: "center" }}><Icon name="arrow-right" size={18} /></View>
            </Press>
          </View>
        </Animated.View>
        {signedIn ? (
          <View style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginTop: 12 }}>
            {strip.map((d) => <DayPill key={d.iso} top={d.top} bottom={d.bottom} done={!!days.data?.has(d.iso)} active={d.today} />)}
          </View>
        ) : null}

        {/* Featured */}
        {featured ? (
          <Animated.View entering={FadeInDown.delay(160)} style={{ marginTop: 28 }}>
            <SectionTitle title="Your plan" action="Open" onAction={() => router.push(`/course/${featured.id}`)} />
            <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16 }}>
              <Press onPress={() => router.push(`/course/${featured.id}`)} scaleTo={0.98} style={{ flex: 1.15, backgroundColor: C.orange, borderRadius: R.lg, padding: 14, minHeight: 230, justifyContent: "space-between" }}>
                <View>
                  {featured.category ? <Label color={C.ink}>{featured.category}</Label> : null}
                  <Display size={22} style={{ marginTop: 4 }} numberOfLines={4}>{featured.title}</Display>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <Ring size={64} stroke={6} progress={featured.lessons.length ? fDone / featured.lessons.length : 0} color={C.ink} track="rgba(20,20,20,0.12)">
                    <Body size={13} weight="bold">{featured.lessons.length ? Math.round((fDone / featured.lessons.length) * 100) : 0}%</Body>
                  </Ring>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Icon name="play" size={16} color="#fff" /></View>
                </View>
              </Press>
              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: C.sky, borderRadius: R.lg, padding: 14, justifyContent: "space-between" }}>
                  <Label color={C.ink}>Lessons done</Label>
                  <Display size={34}>{fDone}/{featured.lessons.length}</Display>
                </View>
                <Press onPress={() => (guides.data?.[0]?.url ? Linking.openURL(guides.data[0].url!) : router.push(`/course/${featured.id}`))} style={{ height: 70, backgroundColor: C.rose, borderRadius: R.lg, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="file-text" size={20} />
                  <Body size={13.5} weight="semi" style={{ flex: 1 }} numberOfLines={2}>{guides.data?.[0]?.title || "Study guide"}</Body>
                </Press>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* All courses */}
        <View style={{ marginTop: 30 }}>
          <SectionTitle title="All courses" />
          {cats.length > 2 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
              {cats.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
            </ScrollView>
          ) : null}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <Async q={courses} label="Loading courses…" empty={(d) => (d.length ? null : <Empty icon="book-open" title="No courses yet" body="The Agape Institute's courses will appear here." />)}>
              {() => shown.map((c, i) => {
                const d = doneIn(c);
                const color = colorOf(c, i);
                return (
                  <Animated.View key={c.id} entering={FadeInRight.delay(i * 60).springify().damping(16)} layout={LinearTransition.springify()}>
                    <Press onPress={() => router.push(`/course/${c.id}`)} scaleTo={0.98} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 84, height: 84, borderRadius: 18, backgroundColor: color, padding: 5 }}>
                          <Image source={imageSource(c.cover_url, IMG.institute)} style={{ flex: 1, borderRadius: 13 }} contentFit="cover" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Label>{[c.category, `${c.lessons.length} lesson${c.lessons.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</Label>
                          <Body size={16} weight="semi" numberOfLines={2} style={{ marginTop: 2 }}>{c.title}</Body>
                          <Label style={{ marginTop: 2 }}>{!signedIn ? "Sign in to track progress" : d === 0 ? "Not started" : d >= c.lessons.length ? "Completed 🎉" : `${d} of ${c.lessons.length} done`}</Label>
                        </View>
                        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
                          <Icon name={c.lessons.length && d >= c.lessons.length ? "check" : "play"} size={16} color={onColor(color)} />
                        </View>
                      </View>
                      {signedIn && c.lessons.length ? <View style={{ marginTop: 10 }}><Bar progress={d / c.lessons.length} color={color} height={6} delay={200 + i * 80} /></View> : null}
                    </Press>
                  </Animated.View>
                );
              })}
            </Async>
          </View>
        </View>

        {/* Study guides */}
        {guides.data?.length ? (
          <View style={{ marginTop: 30 }}>
            <SectionTitle title="Study guides" sub="Open and read page by page" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {guides.data.map((p, i) => {
                const color = p.color || COLORS[i % COLORS.length];
                const fg = onColor(color);
                return (
                  <Animated.View key={p.id} entering={FadeInRight.delay(i * 70)}>
                    <Press onPress={() => p.url && Linking.openURL(p.url)} style={{ width: 150, height: 180, borderRadius: R.lg, backgroundColor: color, padding: 14, justifyContent: "space-between" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="file-text" size={19} />
                      </View>
                      <View>
                        <Display size={19} color={fg} numberOfLines={3}>{p.title}</Display>
                        <Label color={fg} style={{ marginTop: 4, opacity: 0.85 }}>{p.pages ? `${p.pages} pages · ` : ""}PDF</Label>
                      </View>
                    </Press>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
