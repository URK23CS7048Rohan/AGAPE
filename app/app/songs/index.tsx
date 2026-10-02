import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { Async, BackHeader, Body, Empty, Icon, Label, Press, Starburst } from "@/components/ui";
import { useQuery } from "@/lib/query";
import { listSongs } from "@/lib/scripture";
import { lyricsOnly } from "@/lib/chords";

const COLORS = [C.sun, C.rose, C.mint, C.violet, C.orange, C.sky];

export default function Songs() {
  const q = useQuery("songs", listSongs);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("all");
  const all = q.data ?? [];
  const tags = useMemo(() => ["all", ...Array.from(new Set(all.flatMap((s) => s.tags || []))).sort()], [all]);
  const term = search.trim().toLowerCase();
  const shown = all.filter((s) => (tag === "all" || (s.tags || []).includes(tag)) && (!term || s.title.toLowerCase().includes(term) || (s.author || "").toLowerCase().includes(term) || lyricsOnly(s.body).toLowerCase().includes(term)));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Song book" right={<Press onPress={() => router.push("/songs/sets")} style={{ height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="list" size={16} color="#fff" /><Body size={13} weight="bold" color="#fff">Sets</Body></Press>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />} keyboardShouldPersistTaps="handled">
        <View style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: C.mint, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -16, top: -16 }}><Starburst size={110} color={C.sun} spikes={10} depth={0.6} spin><Icon name="music-note" size={28} /></Starburst></View>
          <Body weight="bold" size={24} color="#fff" style={{ maxWidth: "70%" }}>Lyrics & chords</Body>
          <Body size={13.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 4, maxWidth: "72%" }}>Change the key, add a capo, or hide the chords to sing along.</Body>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, height: 50 }}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search title, author or lyrics" placeholderTextColor={C.muted} style={{ flex: 1, fontFamily: F.sans, fontSize: 15, color: C.ink }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          {tags.map((t) => (
            <Press key={t} onPress={() => setTag(t)} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, justifyContent: "center", backgroundColor: tag === t ? C.ink : "#fff", borderWidth: 1.5, borderColor: tag === t ? C.ink : C.line }}>
              <Body size={13} weight="semi" color={tag === t ? "#fff" : C.ink}>{t === "all" ? "All songs" : t[0].toUpperCase() + t.slice(1)}</Body>
            </Press>
          ))}
        </ScrollView>
        <View style={{ marginHorizontal: 16, marginTop: 14, gap: 10 }}>
          <Async q={q} empty={(d) => (d.length ? null : <Empty icon="music" title="No songs yet" body="Your worship team can add songs with chords in the admin." />)}>
            {() => (shown.length ? shown.map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(Math.min(i, 10) * 35)}>
                <Press onPress={() => router.push(`/songs/${s.slug}`)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 12, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS[i % COLORS.length], alignItems: "center", justifyContent: "center" }}>
                    <Body weight="bold" size={18}>{s.original_key}</Body>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold" size={15.5} numberOfLines={1}>{s.title}</Body>
                    <Label numberOfLines={1}>{s.author || (s.tags || []).join(" · ")}</Label>
                  </View>
                  <Icon name="chevron-right" size={18} color={C.muted} />
                </Press>
              </Animated.View>
            )) : <Empty icon="search" title="No songs match" body="Try another word." />)}
          </Async>
        </View>
      </ScrollView>
    </View>
  );
}
