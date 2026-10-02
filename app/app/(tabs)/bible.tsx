import React, { useEffect, useState } from "react";
import { ScrollView, Share, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R } from "@/theme";
import { Body, Display, Icon, Label, Press, ScreenTitle, Segmented, Starburst } from "@/components/ui";
import { BOOKS, book, lastPosition, passage, Position, refLabel, translation, TRANSLATIONS, verseOfDay } from "@/lib/bible";
import { useMarks, useReaderPrefs } from "@/lib/scripture";
import { useSiteContent } from "@/lib/content";
import { parseRef } from "@/lib/bible";

const BOOK_COLORS = [C.peach, C.lilac, C.mintSoft, C.sunSoft, C.skySoft, C.roseSoft];

export default function Bible() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useReaderPrefs();
  const [pos, setPos] = useState<Position | null>(null);
  const [votd, setVotd] = useState<{ ref: string; text: string } | null>(null);
  const [t, setT] = useState(1);
  const marks = useMarks();
  const saved = marks.all();
  const T = translation(prefs.tr);
  const site = useSiteContent();
  // the same "Bible verses" list the church edits in /admin; falls back to the built-in list
  const today = React.useMemo(() => {
    const list = (site.verses || []).filter((v) => parseRef(v.ref));
    if (!list.length) return null;
    const d = new Date(), day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    return list[day % list.length];
  }, [site.verses]);

  useFocusEffect(React.useCallback(() => { lastPosition(prefs.tr).then(setPos); }, [prefs.tr]));
  useEffect(() => {
    if (today) { setVotd({ ref: today.ref, text: today.text.replace(/^[“"]|[”"]$/g, "") }); return; }
    const r = verseOfDay();
    setVotd({ ref: refLabel(r), text: "" });
    passage(prefs.tr, r).then((text) => setVotd({ ref: refLabel(r), text })).catch(() => {});
  }, [prefs.tr, today]);
  const votdRef = () => (today && parseRef(today.ref)) || verseOfDay();

  const open = (b: number, c = 1, v?: number) => router.push({ pathname: "/bible/read", params: { b: String(b), c: String(c), ...(v ? { v: String(v) } : {}) } });
  const books = BOOKS.filter((b) => b.testament === (t === 0 ? "OT" : "NT"));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title="Bible" sub={`${T.name} · reads offline once opened`} />
        </Animated.View>

        {/* verse of the day */}
        <Animated.View entering={FadeInDown.delay(60)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ backgroundColor: C.ink, borderRadius: R.xl, padding: 20, overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -22, top: -22 }}><Starburst size={120} color={C.sun} spikes={12} depth={0.7} spin><Icon name="sun" size={30} /></Starburst></View>
            <Label color={C.sun}>Verse of the day</Label>
            <Display size={23} color="#fff" style={{ marginTop: 10, maxWidth: "88%" }}>{votd?.text ? `“${votd.text}”` : "…"}</Display>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
              <Body weight="semi" color="#fff" style={{ flex: 1 }}>{votd?.ref}</Body>
              {votd?.text ? (
                <Press onPress={() => Share.share({ message: `“${votd.text}” ${votd.ref}` })} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="share-2" size={17} color="#fff" />
                </Press>
              ) : null}
              <Press onPress={() => { const r = votdRef(); open(r.book, r.chapter, r.from); }} style={{ paddingHorizontal: 14, height: 40, borderRadius: 12, backgroundColor: C.sun, alignItems: "center", justifyContent: "center" }}>
                <Body weight="bold" size={13.5}>Read chapter</Body>
              </Press>
            </View>
          </View>
        </Animated.View>

        {/* continue */}
        {pos ? (
          <Animated.View entering={FadeInDown.delay(120)} style={{ marginHorizontal: 16, marginTop: 12 }}>
            <Press onPress={() => open(pos.book, pos.chapter)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.flame, borderRadius: R.lg, padding: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Icon name="book-open" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Label color={C.ink}>Continue reading</Label>
                <Display size={22}>{book(pos.book).name} {pos.chapter}</Display>
              </View>
              <Icon name="arrow-right" size={22} />
            </Press>
          </Animated.View>
        ) : null}

        {/* shortcuts */}
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
          <Press onPress={() => router.push("/bible/marks")} scaleTo={0.97} style={{ flex: 1, backgroundColor: C.lilac, borderRadius: R.lg, padding: 14, gap: 8 }}>
            <Icon name="bookmark" size={20} color={C.ink} />
            <Body weight="bold">My highlights</Body>
            <Label>{saved.length ? `${saved.length} saved` : "Tap a verse to save it"}</Label>
          </Press>
          <Press onPress={() => router.push("/songs")} scaleTo={0.97} style={{ flex: 1, backgroundColor: C.mintSoft, borderRadius: R.lg, padding: 14, gap: 8 }}>
            <Icon name="music-note" size={20} color={C.ink} />
            <Body weight="bold">Song book</Body>
            <Label>Lyrics & chords</Label>
          </Press>
        </View>

        {/* translation */}
        <Label style={{ marginHorizontal: 20, marginTop: 24 }}>Translation</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 10 }}>
          {TRANSLATIONS.map((x) => {
            const on = x.code === prefs.tr;
            return (
              <Press key={x.code} onPress={() => setPrefs({ tr: x.code })} style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: "center", backgroundColor: on ? C.ink : "#fff", borderWidth: 1.5, borderColor: on ? C.ink : C.line }}>
                <Body size={13.5} weight="semi" color={on ? "#fff" : C.ink}>{x.short}</Body>
              </Press>
            );
          })}
        </ScrollView>

        {/* books */}
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          <Segmented items={["Old Testament", "New Testament"]} value={t} onChange={setT} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginTop: 14 }}>
          {books.map((b, i) => (
            <Press key={b.id} onPress={() => open(b.id)} scaleTo={0.95} style={{ width: "31.6%", backgroundColor: BOOK_COLORS[i % BOOK_COLORS.length], borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10 }}>
              <Body weight="bold" size={14} numberOfLines={1}>{b.name}</Body>
              <Label size={11.5}>{b.chapters} ch</Label>
            </Press>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
