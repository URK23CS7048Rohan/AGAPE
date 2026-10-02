import React, { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG, R, onColor } from "@/theme";
import { Body, Chip, Display, Icon, Label, LiveBadge, Press, ScreenTitle, SectionTitle, Sticker, Ticket } from "@/components/ui";
import { CHURCH, SERIES, SERMONS, Series } from "@/data/mock";

const CW = 200;
const GAP = 12;

function SeriesCard({ s, i }: { s: Series; i: number }) {
  const first = SERMONS.find((m) => m.seriesId === s.id) ?? SERMONS[0];
  const fg = onColor(s.tint);
  return (
    <Press onPress={() => router.push(`/sermon/${first.id}`)} scaleTo={0.97} style={{ width: CW }}>
      <View style={{ backgroundColor: s.tint, borderRadius: R.lg, padding: 8 }}>
        <View style={{ height: 150, borderRadius: 18, overflow: "hidden" }}>
          <Image source={s.image} style={{ flex: 1 }} contentFit="cover" />
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: "center" }}>
            <Body size={11.5} weight="bold">{String(i + 1).padStart(2, "0")}</Body>
          </View>
        </View>
        <View style={{ padding: 8, paddingTop: 10 }}>
          <Label color={fg} style={{ opacity: 0.8 }}>{s.book} · {s.count} messages</Label>
          <Display size={20} color={fg} numberOfLines={2} style={{ marginTop: 2 }}>{s.title}{s.accent.length < 6 ? "" : " "}{s.accent}</Display>
        </View>
      </View>
    </Press>
  );
}

export default function Watch() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [book, setBook] = useState("All");
  const live = SERMONS[0];
  const books = ["All", ...Array.from(new Set(SERIES.map((s) => s.book)))];
  const series = SERIES.filter((s) => book === "All" || s.book === book);
  const list = useMemo(() => SERMONS.slice(1).filter((m) => {
    const s = SERIES.find((x) => x.id === m.seriesId);
    const text = `${m.title} ${m.accent} ${m.speaker} ${s?.book}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (book === "All" || s?.book === book);
  }), [q, book]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title="Watch & listen" sub="Sermons, live services and the full library" />
        </Animated.View>

        {/* Live */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Press onPress={() => router.push(`/sermon/${live.id}`)} scaleTo={0.98}>
            <Ticket color={C.ink} at={0.66} cut={C.bg} style={{ padding: 10 }}>
              <View style={{ height: 200, borderRadius: 18, overflow: "hidden" }}>
                <Image source={live.image} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={{ position: "absolute", top: 10, left: 10 }}><LiveBadge /></View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Display size={22} color="#fff" numberOfLines={1}>{live.title} {live.accent}</Display>
                  <Label color="rgba(255,255,255,0.65)">{live.speaker} · Sunday Celebration</Label>
                </View>
                <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={22} color="#fff" />
                </View>
              </View>
            </Ticket>
          </Press>
          <View pointerEvents="none" style={{ position: "absolute", right: -6, top: -18 }}>
            <Sticker top="Live" bottom="Sundays" bg={C.sun} size={78} />
          </View>
        </Animated.View>

        {/* YouTube channel */}
        <Animated.View entering={FadeInDown.delay(160).duration(600)}>
          <Press onPress={() => Linking.openURL(CHURCH.youtubeUrl)} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 12, borderRadius: R.lg, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", padding: 10, gap: 12 }}>
            <View style={{ width: 84, height: 64, borderRadius: 14, overflow: "hidden" }}>
              <Image source={IMG.prayerWorship} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={{ position: "absolute", left: 26, top: 18, width: 32, height: 28, borderRadius: 8, backgroundColor: "#FF0033", alignItems: "center", justifyContent: "center" }}><Icon name="play" size={13} color="#fff" /></View>
            </View>
            <View style={{ flex: 1 }}>
              <Label>Agape International Media</Label>
              <Body size={16} weight="semi">Every message on YouTube</Body>
            </View>
            <Icon name="arrow-up-right" size={20} />
          </Press>
        </Animated.View>

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginTop: 22, height: 52, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search sermons, books, speakers" placeholderTextColor="rgba(20,20,20,0.4)" style={{ flex: 1, color: C.ink, fontFamily: F.sans, fontSize: 15 }} />
          {q ? <Press onPress={() => setQ("")}><Icon name="x" size={18} color={C.muted} /></Press> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 14 }}>
          {books.map((b) => <Chip key={b} label={b} active={book === b} onPress={() => setBook(b)} />)}
        </ScrollView>

        {/* Series */}
        <View style={{ marginTop: 8 }}>
          <SectionTitle title="Series by book" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={CW + GAP} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}>
            {series.map((s, i) => <SeriesCard key={s.id} s={s} i={i} />)}
          </ScrollView>
        </View>

        {/* Latest */}
        <View style={{ marginTop: 28 }}>
          <SectionTitle title="Latest messages" />
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {list.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 60)} layout={LinearTransition.springify()}>
                <Press onPress={() => router.push(`/sermon/${m.id}`)} scaleTo={0.98} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 10, borderRadius: R.lg, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line }}>
                  <Image source={m.image} style={{ width: 76, height: 76, borderRadius: 16 }} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Label>{m.date} · {m.duration}</Label>
                    <Body size={16} weight="semi" numberOfLines={1} style={{ marginTop: 2 }}>{m.title} {m.accent}</Body>
                    <Label numberOfLines={1}>{m.speaker}</Label>
                  </View>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="play" size={17} color="#fff" />
                  </View>
                </Press>
              </Animated.View>
            ))}
            {list.length === 0 ? <Body color={C.muted} center style={{ marginTop: 20 }}>No messages match that search yet.</Body> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
