import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R, shadow } from "@/theme";
import { Body, Chip, Display, Icon, Label, Press, Ring, SectionTitle, Serif } from "@/components/ui";
import { useStore, streakOf } from "@/lib/store";
import { useCourses, useDocuments } from "@/lib/data";
import { useSiteContent } from "@/lib/content";
import * as WebBrowser from "expo-web-browser";


export default function Grow() {
  const insets = useSafeAreaInsets();
  const { done, activeDays } = useStore();
  const { courses: COURSES, loading } = useCourses();
  const docs = useDocuments();
  const verses = useSiteContent().verses;
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(COURSES.map((c) => c.category)))];
  const list = COURSES.filter((c) => cat === "All" || c.category === cat);
  const featured = COURSES[0];
  const doneIn = (c: { lessons: { id: string }[] }) => c.lessons.filter((l) => done.has(l.id)).length;
  const fDone = featured ? doneIn(featured) : 0;
  const fTotal = featured ? Math.max(1, featured.lessons.length) : 1;
  const streak = streakOf(activeDays);
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { k: d.toISOString().slice(0, 10), l: "SMTWTFS"[d.getDay()] }; });
  const todays = verses.length ? verses[Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5) % verses.length] : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.lilac }}>
      <View pointerEvents="none" style={{ position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: "#C9BBFF", opacity: 0.5, top: -120, right: -120 }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 150 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 20 }}>
          <Label>Courses · Plans · Study guides</Label>
          <Display size={56} style={{ marginTop: 8, lineHeight: 54 }}>Go{"\n"}<Serif size={62} color={C.violet}>deeper.</Serif></Display>
        </Animated.View>

        {/* Streak / reading plan */}
        <Animated.View entering={FadeInDown.delay(100)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <LinearGradient colors={[C.ink, "#2A1B4D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: R.xl, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Label color={C.creamMuted}>Your rhythm · this week</Label>
                <Display size={32} color={C.cream} style={{ marginTop: 6 }}>{streak}-day <Serif size={34} color={C.sun}>streak</Serif></Display>
              </View>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
                <Icon name="fire" size={30} color="#fff" />
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
              {week.map((d, i) => {
                const on = activeDays.includes(d.k);
                return (
                  <View key={d.k} style={{ alignItems: "center", gap: 6 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: on ? C.sun : "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: i === 6 && !on ? 1.5 : 0, borderColor: C.sun, borderStyle: "dashed" }}>
                      {on ? <Icon name="check" size={16} color={C.ink} /> : null}
                    </View>
                    <Label size={10} color={C.creamMuted}>{d.l}</Label>
                  </View>
                );
              })}
            </View>
            <Press onPress={() => router.push("/")} style={{ marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.pill, paddingLeft: 18, paddingRight: 6, height: 52 }}>
              <Body color={C.cream} weight="semi" numberOfLines={1} style={{ flex: 1 }}>Today's verse: {todays?.ref ?? "Psalm 46:10"}</Body>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sun, alignItems: "center", justifyContent: "center" }}><Icon name="arrow-right" size={18} color={C.ink} /></View>
            </Press>
          </LinearGradient>
        </Animated.View>

        {/* Featured course */}
        {featured ? <Animated.View entering={FadeInDown.delay(180)}>
          <Press onPress={() => router.push(`/course/${featured.id}`)} scaleTo={0.98} style={[{ marginHorizontal: 16, marginTop: 16, height: 260, borderRadius: R.xl, overflow: "hidden" }, shadow(18, 26, 0.25, C.violet)]}>
            <Image source={featured.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["transparent", "rgba(20,10,40,0.92)"]} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
            <View style={{ position: "absolute", top: 16, right: 16 }}>
              <Ring size={72} stroke={7} progress={fDone / fTotal} color={C.sun}>
                <Body weight="bold" color="#fff">{Math.round((fDone / fTotal) * 100)}%</Body>
              </Ring>
            </View>
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
              <Label color="rgba(255,255,255,0.75)">Agape Institute of Ministry · {featured.lessons.length} lessons</Label>
              <Display size={40} color="#fff" style={{ marginTop: 6 }}>{featured.title} <Serif size={42} color={C.sun}>{featured.accent}</Serif></Display>
            </View>
          </Press>
        </Animated.View> : !loading ? <Body center color={C.muted} style={{ marginTop: 30 }}>Courses appear here as soon as the team publishes them.</Body> : null}

        {/* All courses */}
        <View style={{ marginTop: 30 }}>
          <SectionTitle eyebrow="Structured courses" title="All" accent="courses" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 14 }}>
            {cats.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {list.map((c, i) => {
              const d = doneIn(c);
              const n = Math.max(1, c.lessons.length);
              return (
                <Animated.View key={c.id} entering={FadeInRight.delay(i * 70).springify().damping(16)} layout={LinearTransition.springify()}>
                  <Press onPress={() => router.push(`/course/${c.id}`)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 10 }}>
                    <Image source={c.image} style={{ width: 90, height: 90, borderRadius: 22 }} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Label size={10}>{c.category} · {c.lessons.length} lessons</Label>
                      <Display size={24} style={{ marginTop: 4 }}>{c.title} <Serif size={25} color={c.color}>{c.accent}</Serif></Display>
                      <Body size={13} color={C.muted}>{d === 0 ? "Not started" : d >= n ? "Completed 🎉" : `${d} of ${c.lessons.length} done`}</Body>
                    </View>
                    <Ring size={50} stroke={5} progress={d / n} color={c.color} track="rgba(15,11,18,0.07)">
                      <Icon name={d >= n ? "check" : "play"} size={16} color={c.color} />
                    </Ring>
                  </Press>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* PDFs */}
        <View style={{ marginTop: 30 }}>
          <SectionTitle eyebrow="Instant page-by-page viewing" title="Study" accent="guides" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
            {docs.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInRight.delay(i * 80)}>
                <Press onPress={() => (p.url ? WebBrowser.openBrowserAsync(p.url) : Alert.alert(p.title, "This guide is being prepared. It'll open here once the team uploads it."))} style={{ width: 150, height: 196, borderRadius: R.lg, backgroundColor: p.color, padding: 16, justifyContent: "space-between" }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="file-text" size={20} color={p.color === C.sun ? C.ink : "#fff"} />
                  </View>
                  <View>
                    <Display size={22} color="#fff">{p.title}</Display>
                    <Label color="rgba(255,255,255,0.8)" style={{ marginTop: 6 }}>{p.url ? `${p.pages ? `${p.pages} pages · ` : ""}PDF` : "Coming soon"}</Label>
                  </View>
                </Press>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
