/** Agape Institute: structured courses (video, PDF and quiz lessons) and the study-guide library. */
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Body, Chip, Group, Icon, Label, ListRow, Press, Ring, SearchField } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useCourses, useDocuments } from "@/lib/data";
import { t } from "@/lib/i18n";

export default function Learn() {
  const insets = useSafeAreaInsets();
  const { done } = useStore();
  const { courses, loading } = useCourses();
  const docs = useDocuments();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const cats = ["All", ...Array.from(new Set(courses.map((c) => c.category)))];
  const list = courses.filter((c) => (cat === "All" || c.category === cat) && (!q || `${c.title} ${c.accent} ${c.category}`.toLowerCase().includes(q.toLowerCase())));
  const doneIn = (c: { lessons: { id: string }[] }) => c.lessons.filter((l) => done.has(l.id)).length;
  const featured = courses.find((c) => { const d = doneIn(c); return d > 0 && d < c.lessons.length; }) || courses[0];
  const fd = featured ? doneIn(featured) : 0, fn = featured ? Math.max(1, featured.lessons.length) : 1;
  const pdfs = docs.filter((d) => !q || d.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Agape Institute")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingHorizontal: 16 }}><SearchField value={q} onChangeText={setQ} placeholder={t("Search courses and guides")} /></View>

        {featured && !q ? (
          <Press onPress={() => router.push(`/course/${featured.id}`)} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 14, height: 220, borderRadius: 18, overflow: "hidden" }}>
            <Image source={featured.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["transparent", "rgba(20,10,40,0.9)"]} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
            <View style={{ position: "absolute", top: 14, right: 14 }}>
              <Ring size={58} stroke={5} progress={fd / fn} color={C.sun}><Body size={13} weight="bold" color="#fff">{Math.round((fd / fn) * 100)}%</Body></Ring>
            </View>
            <View style={{ position: "absolute", left: 18, right: 18, bottom: 16 }}>
              <Label color="rgba(255,255,255,0.75)">{fd ? t("Continue") : t("Start here")} · {t("{n} lessons", { n: featured.lessons.length })}</Label>
              <Body style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 31, color: "#fff", marginTop: 4 }}>{featured.title} {featured.accent}</Body>
            </View>
          </Press>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 14 }}>
          {cats.map((c) => <Chip key={c} label={c === "All" ? t("All") : c} active={cat === c} onPress={() => setCat(c)} />)}
        </ScrollView>
        {!list.length && !loading ? <Body center color={C.muted} style={{ marginVertical: 20 }}>{t("Courses appear here as soon as the team publishes them.")}</Body> : null}
        <Group style={{ marginHorizontal: 16 }}>
          {list.map((c, i) => {
            const d = doneIn(c), n = Math.max(1, c.lessons.length);
            return (
              <Press key={c.id} onPress={() => router.push(`/course/${c.id}`)} scaleTo={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: "rgba(15,11,18,0.1)" }}>
                <Image source={c.image} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Label size={10}>{c.category} · {t("{n} lessons", { n: c.lessons.length })}</Label>
                  <Body weight="semi" size={16} style={{ marginTop: 2 }}>{c.title} {c.accent}</Body>
                  <Body size={13} color={C.muted}>{d === 0 ? t("Not started") : d >= n ? t("Completed") : t("{d} of {n} done", { d, n: c.lessons.length })}</Body>
                </View>
                <Ring size={40} stroke={4} progress={d / n} color={c.color} track="rgba(15,11,18,0.07)">
                  <Icon name={d >= n ? "check" : "play"} size={13} color={c.color} />
                </Ring>
              </Press>
            );
          })}
        </Group>

        <Body weight="semi" size={18} style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 10 }}>{t("Study guides")}</Body>
        <Group style={{ marginHorizontal: 16 }}>
          {pdfs.map((p, i) => (
            <ListRow key={p.id} icon="file-text" color={p.color} title={p.title} sub={p.url ? `${p.pages ? t("{n} pages", { n: p.pages }) + " · " : ""}PDF` : t("Coming soon")} last={i === pdfs.length - 1}
              onPress={() => (p.url ? WebBrowser.openBrowserAsync(p.url) : Alert.alert(p.title, t("This guide is being prepared. It'll open here once the team uploads it.")))} />
          ))}
        </Group>
      </ScrollView>
    </View>
  );
}
