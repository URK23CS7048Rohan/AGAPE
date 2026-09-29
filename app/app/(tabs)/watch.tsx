import React, { useMemo, useState } from "react";
import { Dimensions, Linking, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, LinearTransition, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, SharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG, R, shadow } from "@/theme";
import { Body, Chip, Display, Icon, Label, LiveBadge, Press, Serif } from "@/components/ui";
import { CHURCH, SERIES, SERMONS, Series } from "@/data/mock";

const { width: SW } = Dimensions.get("window");
const CW = 230;
const GAP = 14;

function SeriesCard({ s, i, x }: { s: Series; i: number; x: SharedValue<number> }) {
  const arch = i % 2 === 1;
  const st = useAnimatedStyle(() => {
    const c = i * (CW + GAP);
    return { transform: [{ translateY: interpolate(x.value, [c - SW, c, c + SW], [26, 0, 26], Extrapolation.CLAMP) }] };
  });
  const img = useAnimatedStyle(() => {
    const c = i * (CW + GAP);
    return { transform: [{ translateX: interpolate(x.value, [c - SW, c + SW], [-30, 30], Extrapolation.CLAMP) }] };
  });
  const first = SERMONS.find((m) => m.seriesId === s.id) ?? SERMONS[0];
  return (
    <Press onPress={() => router.push(`/sermon/${first.id}`)} scaleTo={0.97}>
      <Animated.View style={[{ width: CW, height: 340, borderRadius: R.xl, borderTopLeftRadius: arch ? CW / 2 : R.xl, borderTopRightRadius: arch ? CW / 2 : R.xl, overflow: "hidden", backgroundColor: C.ink }, st]}>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: -40, right: -40 }, img]}>
          <Image source={s.image} style={{ flex: 1 }} contentFit="cover" />
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: s.tint, opacity: 0.55 }]} />
        <LinearGradient colors={["transparent", "rgba(8,5,10,0.9)"]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
        <Label color="rgba(255,255,255,0.85)" style={{ position: "absolute", top: arch ? 40 : 18, left: arch ? 0 : 18, right: arch ? 0 : undefined, textAlign: arch ? "center" : "left" }}>{String(i + 1).padStart(2, "0")}</Label>
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
          <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, height: 24, borderRadius: R.pill, justifyContent: "center" }}>
            <Body size={11} weight="semi" color="#fff">{s.book}</Body>
          </View>
          <Display size={34} color="#fff" style={{ textTransform: "uppercase", marginTop: 8, lineHeight: 32 }}>
            {s.title}<Serif size={34} color="#fff" style={{ textTransform: "none" }}>{s.accent}</Serif>
          </Display>
          <Body size={12.5} color="rgba(255,255,255,0.75)" style={{ marginTop: 6 }}>{s.count} messages · {s.speaker}</Body>
        </View>
      </Animated.View>
    </Press>
  );
}

export default function Watch() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [book, setBook] = useState("All");
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  const live = SERMONS[0];
  const books = ["All", ...Array.from(new Set(SERIES.map((s) => s.book)))];
  const series = SERIES.filter((s) => book === "All" || s.book === book);
  const list = useMemo(() => SERMONS.slice(1).filter((m) => {
    const s = SERIES.find((x) => x.id === m.seriesId);
    const text = `${m.title} ${m.accent} ${m.speaker} ${s?.book}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (book === "All" || s?.book === book);
  }), [q, book]);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 150 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 20 }}>
          <Label color={C.creamMuted}>Sermons · Live · Library</Label>
          <Display size={56} color={C.cream} style={{ marginTop: 8, lineHeight: 54 }}>
            Watch &{"\n"}<Serif size={62} color={C.sun}>listen.</Serif>
          </Display>
        </Animated.View>

        {/* Live */}
        <Animated.View entering={FadeInDown.delay(100).duration(700)}>
          <Press onPress={() => router.push(`/sermon/${live.id}`)} scaleTo={0.98} style={[{ marginHorizontal: 16, marginTop: 22, height: 250, borderRadius: R.xl, overflow: "hidden" }, shadow(20, 30, 0.5, "#000")]}>
            <Image source={live.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.88)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
            <View style={{ position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <LiveBadge />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 12, height: 30, borderRadius: R.pill }}>
                <Icon name="eye" size={14} color="#fff" />
                <Body size={12.5} weight="semi" color="#fff">YouTube</Body>
              </View>
            </View>
            <View style={{ position: "absolute", left: 18, bottom: 18, right: 90 }}>
              <Display size={36} color="#fff">{live.title} <Serif size={38} color={C.sun}>{live.accent}</Serif></Display>
              <Body size={13} color="rgba(255,255,255,0.75)">{live.speaker} · Sunday Celebration</Body>
            </View>
            <View style={{ position: "absolute", right: 18, bottom: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={24} color="#fff" />
            </View>
          </Press>
        </Animated.View>

        {/* YouTube channel */}
        <Animated.View entering={FadeInDown.delay(160).duration(700)}>
          <Press onPress={() => Linking.openURL(CHURCH.youtubeUrl)} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 12, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.ink3, flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 150, height: 96 }}>
              <Image source={IMG.prayerWorship} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={{ position: "absolute", left: 55, top: 32, width: 40, height: 30, borderRadius: 9, backgroundColor: "#FF0033", alignItems: "center", justifyContent: "center" }}><Icon name="play" size={15} color="#fff" /></View>
            </View>
            <View style={{ flex: 1, padding: 14 }}>
              <Label color={C.creamMuted} size={10}>Agape International Media</Label>
              <Display size={22} color={C.cream} style={{ marginTop: 4 }}>Every message, <Serif size={23} color={C.sun}>on YouTube</Serif></Display>
            </View>
          </Press>
        </Animated.View>

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginTop: 22, height: 52, borderRadius: R.pill, backgroundColor: C.ink3, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 10 }}>
          <Icon name="search" size={18} color={C.creamMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search sermons, books, speakers" placeholderTextColor="rgba(244,238,228,0.45)" style={{ flex: 1, color: C.cream, fontFamily: F.sans, fontSize: 15 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 16 }}>
          {books.map((b) => <Chip key={b} label={b} active={book === b} dark onPress={() => setBook(b)} />)}
        </ScrollView>

        {/* Series */}
        <View style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 14 }}>
          <Label color={C.creamMuted}>Series by book</Label>
          <Display size={30} color={C.cream} style={{ marginTop: 6 }}>Sorted by <Serif size={32} color={C.sun}>the Book</Serif></Display>
        </View>
        <Animated.ScrollView horizontal onScroll={onScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator={false} snapToInterval={CW + GAP} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, gap: GAP, paddingBottom: 30 }}>
          {series.map((s, i) => <SeriesCard key={s.id} s={s} i={i} x={x} />)}
        </Animated.ScrollView>

        {/* Latest */}
        <View style={{ paddingHorizontal: 20, marginTop: 10, marginBottom: 12 }}>
          <Display size={30} color={C.cream}>Latest <Serif size={32} color={C.sun}>messages</Serif></Display>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {list.map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 60)} layout={LinearTransition.springify()}>
              <Press onPress={() => router.push(`/sermon/${m.id}`)} scaleTo={0.98} style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 10, borderRadius: R.lg, backgroundColor: C.ink3 }}>
                <Image source={m.image} style={{ width: 84, height: 84, borderRadius: 20 }} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Label color={C.creamMuted} size={10}>{m.date} · {m.duration}</Label>
                  <Display size={23} color={C.cream} style={{ marginTop: 4 }}>{m.title} <Serif size={24} color={C.sun}>{m.accent}</Serif></Display>
                  <Body size={13} color={C.creamMuted}>{m.speaker}</Body>
                </View>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={16} color={C.cream} />
                </View>
              </Press>
            </Animated.View>
          ))}
          {list.length === 0 ? <Body color={C.creamMuted} center style={{ marginTop: 20 }}>No messages match that search yet.</Body> : null}
        </View>
      </ScrollView>
    </View>
  );
}
