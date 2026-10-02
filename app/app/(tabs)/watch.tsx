import React, { useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG, R, onColor } from "@/theme";
import { Async, Body, Chip, Display, Empty, Icon, Label, LiveBadge, Press, ScreenTitle, SectionTitle, Sticker, Ticket } from "@/components/ui";
import { imageSource, useSiteContent } from "@/lib/content";
import { useQuery } from "@/lib/query";
import { listSeries, listVideos, Series, Video, videoThumb } from "@/lib/api";
import { duration } from "@/lib/time";
import { t } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

const CW = 200;
const GAP = 12;
const SERIES_COLORS = [C.flame, C.violet, C.mint, C.sun, C.rose, C.sky];
const date = (iso: string | null) => (iso ? dateLabel(new Date(iso), { day: "numeric", month: "short", year: "numeric" }) : "");

function SeriesCard({ s, i, active, onPress }: { s: Series; i: number; active: boolean; onPress: () => void }) {
  const tint = s.color || SERIES_COLORS[i % SERIES_COLORS.length];
  const fg = onColor(tint);
  return (
    <Press onPress={onPress} scaleTo={0.97} style={{ width: CW }}>
      <View style={{ backgroundColor: tint, borderRadius: R.lg, padding: 8, borderWidth: 2, borderColor: active ? C.ink : tint }}>
        <View style={{ height: 150, borderRadius: 18, overflow: "hidden", backgroundColor: C.ink }}>
          <Image source={imageSource(s.cover_url, IMG.crossMountain)} style={{ flex: 1 }} contentFit="cover" />
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: "center" }}>
            <Body size={11.5} weight="bold">{String(i + 1).padStart(2, "0")}</Body>
          </View>
        </View>
        <View style={{ padding: 8, paddingTop: 10 }}>
          <Label color={fg} style={{ opacity: 0.8 }}>{[s.book || s.topic, `${s.videos} message${s.videos === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</Label>
          <Display size={20} color={fg} numberOfLines={2} style={{ marginTop: 2 }}>{s.title}</Display>
        </View>
      </View>
    </Press>
  );
}

function Row({ m, i }: { m: Video; i: number }) {
  const thumb = videoThumb(m);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 50)} layout={LinearTransition.springify()}>
      <Press onPress={() => router.push(`/sermon/${m.id}`)} scaleTo={0.98} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 10, borderRadius: R.lg, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line }}>
        <Image source={imageSource(thumb, IMG.homeWorship)} style={{ width: 76, height: 76, borderRadius: 16 }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Label numberOfLines={1}>{[date(m.published_at), duration(m.duration_sec)].filter(Boolean).join(" · ")}</Label>
          <Body size={16} weight="semi" numberOfLines={2} style={{ marginTop: 2 }}>{m.title}</Body>
          {m.speaker ? <Label numberOfLines={1}>{m.speaker}</Label> : null}
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" size={17} color="#fff" />
        </View>
      </Press>
    </Animated.View>
  );
}

export default function Watch() {
  const insets = useSafeAreaInsets();
  const { church } = useSiteContent();
  const series = useQuery("sermons:series", listSeries);
  const videos = useQuery("sermons:videos", listVideos);
  const [q, setQ] = useState("");
  const [book, setBook] = useState("All");
  const [seriesId, setSeriesId] = useState<string | null>(null);

  const all = videos.data ?? [];
  const live = all.find((v) => v.is_live);
  const books = ["All", ...Array.from(new Set((series.data ?? []).map((s) => s.book || s.topic).filter(Boolean) as string[]))];
  const shownSeries = (series.data ?? []).filter((s) => book === "All" || (s.book || s.topic) === book);
  const list = useMemo(() => all.filter((m) => {
    if (m === live) return false;
    const text = `${m.title} ${m.speaker ?? ""} ${m.series?.title ?? ""} ${m.series?.book ?? ""}`.toLowerCase();
    return (!q || text.includes(q.toLowerCase())) && (book === "All" || m.series?.book === book) && (!seriesId || m.series_id === seriesId);
  }), [all, q, book, seriesId, live]);
  const refreshing = false;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { series.reload(); videos.reload(); }} />}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title={t("Watch & listen")} sub={t("Sermons, live services and the full library")} />
        </Animated.View>

        {/* Live now, or the channel's live stream */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Press onPress={() => (live ? router.push(`/sermon/${live.id}`) : router.push("/sermon/live"))} scaleTo={0.98}>
            <Ticket color={C.ink} at={0.66} cut={C.bg} style={{ padding: 10 }}>
              <View style={{ height: 200, borderRadius: 18, overflow: "hidden" }}>
                <Image source={imageSource(live ? videoThumb(live) : null, IMG.homeWorship)} style={StyleSheet.absoluteFill} contentFit="cover" />
                {live ? <View style={{ position: "absolute", top: 10, left: 10 }}><LiveBadge /></View> : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Display size={22} color="#fff" numberOfLines={1}>{live ? live.title : t("Live services")}</Display>
                  <Label color="rgba(255,255,255,0.65)" numberOfLines={1}>{live ? live.speaker || church.name : t("Watch the stream when we're live, or the latest uploads")}</Label>
                </View>
                <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={22} color="#fff" />
                </View>
              </View>
            </Ticket>
          </Press>
          <View pointerEvents="none" style={{ position: "absolute", right: -6, top: -18 }}>
            <Sticker top={live ? "Live" : "Every"} bottom={live ? "now" : "Sunday"} bg={C.sun} size={78} />
          </View>
        </Animated.View>

        {/* YouTube channel */}
        {church.youtube ? (
          <Press onPress={() => Linking.openURL(church.youtube)} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 12, borderRadius: R.lg, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", padding: 10, gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#FF0033", alignItems: "center", justifyContent: "center" }}><Icon name="youtube" size={28} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Label>{church.name}</Label>
              <Body size={16} weight="semi">{t("Every message on YouTube")}</Body>
            </View>
            <Icon name="arrow-up-right" size={20} />
          </Press>
        ) : null}

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginTop: 22, height: 52, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder={t("Search sermons, books, speakers")} placeholderTextColor="rgba(20,20,20,0.4)" style={{ flex: 1, color: C.ink, fontFamily: F.sans, fontSize: 15 }} />
          {q ? <Press onPress={() => setQ("")}><Icon name="x" size={18} color={C.muted} /></Press> : null}
        </View>
        {books.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 14 }}>
            {books.map((b) => <Chip key={b} label={b} active={book === b} onPress={() => { setBook(b); setSeriesId(null); }} />)}
          </ScrollView>
        ) : <View style={{ height: 8 }} />}

        {/* Series */}
        {shownSeries.length ? (
          <View style={{ marginTop: 8 }}>
            <SectionTitle title={t("Series")} sub={seriesId ? t("Showing one series below. Tap it again to show all.") : t("Tap a series to see its messages")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={CW + GAP} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}>
              {shownSeries.map((s, i) => <SeriesCard key={s.id} s={s} i={i} active={seriesId === s.id} onPress={() => setSeriesId((x) => (x === s.id ? null : s.id))} />)}
            </ScrollView>
          </View>
        ) : null}

        {/* Messages */}
        <View style={{ marginTop: 28 }}>
          <SectionTitle title={seriesId ? (series.data ?? []).find((s) => s.id === seriesId)?.title || t("Messages") : t("Latest messages")} />
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Async
              q={videos}
              label={t("Loading sermons…")}
              empty={(d) => (d.length === 0 ? <Empty icon="video" title={t("No sermons yet")} body={t("New messages appear here as soon as the team adds them.")} /> : list.length === 0 ? <Empty icon="search" title={t("Nothing matches")} body={t("Try a different word or clear the filters.")} /> : null)}
            >
              {() => list.map((m, i) => <Row key={m.id} m={m} i={i} />)}
            </Async>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
