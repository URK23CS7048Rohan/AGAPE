import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Body, Button, Icon, IconButton, Label, Press } from "@/components/ui";
import { useSetLists, useSongs } from "@/lib/more";
import { capoShapeKey, interval, keyPlus, lyricsOnly, parseSong, transposeChord } from "@/lib/chords";
import { t } from "@/lib/i18n";

export default function SongView() {
  // musicians need the screen to stay on (phones only — browsers may refuse the wake lock)
  useEffect(() => { if (Platform.OS === "web") return; activateKeepAwakeAsync("song").catch(() => {}); return () => { deactivateKeepAwake("song"); }; }, []);
  const p = useLocalSearchParams<{ slug: string; key?: string; set?: string; i?: string }>();
  const insets = useSafeAreaInsets();
  const songs = useSongs().data;
  const song = songs.find((s) => s.slug === p.slug);
  const { lists, save } = useSetLists();
  const set = lists.find((l) => l.id === p.set);
  const idx = Number(p.i ?? -1);
  const [key, setKey] = useState(p.key || song?.key || "C");
  useEffect(() => { if (song && !p.key) setKey(song.key); }, [song?.slug]);
  const [capo, setCapo] = useState(0);
  const [chords, setChords] = useState(true);
  const [size, setSize] = useState(17);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [addTo, setAddTo] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const y = useRef(0);
  const sections = useMemo(() => parseSong(song?.body || ""), [song?.body]);

  useEffect(() => {
    if (!scrolling) return;
    const iv = setInterval(() => { y.current += speed * 0.6; scroll.current?.scrollTo({ y: y.current, animated: false }); }, 50);
    return () => clearInterval(iv);
  }, [scrolling, speed]);

  if (!song) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  const by = interval(song.key, key);
  const shapeKey = capoShapeKey(key, capo);
  const show = (ch: string) => transposeChord(transposeChord(ch, by, key), -capo, shapeKey);
  const nextSong = set && idx >= 0 && idx < set.items.length - 1 ? set.items[idx + 1] : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={[st.top, { paddingTop: insets.top + 4 }]}>
        <IconButton name="chevron-left" label={t("Back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/songs" as any))} />
        <View style={{ flex: 1 }}>
          <Body weight="semi" size={16} numberOfLines={1}>{song.title}</Body>
          {set ? <Body size={12} color={C.muted} numberOfLines={1}>{set.title} · {idx + 1}/{set.items.length}</Body> : null}
        </View>
        <IconButton name="share" label={t("Share")} onPress={() => Share.share({ message: `${song.title}\n\n${chords ? song.body.replace(/^\{(.+)\}$/gm, "\n$1").replace(/\[([^\]]+)\]/g, (_, c) => `[${show(c)}]`) : lyricsOnly(song.body)}` }).catch(() => {})} />
        <IconButton name="list" label={t("Add to set list")} onPress={() => setAddTo(true)} />
      </View>

      {/* controls */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.controls}>
        <Stepper label={t("Key")} value={key} onMinus={() => setKey(keyPlus(key, -1))} onPlus={() => setKey(keyPlus(key, 1))} />
        <Stepper label={t("Capo")} value={capo ? String(capo) : t("Off")} onMinus={() => setCapo(Math.max(0, capo - 1))} onPlus={() => setCapo(Math.min(9, capo + 1))} />
        <Toggle label={t("Chords")} on={chords} onPress={() => setChords(!chords)} />
        <Stepper label={t("Text")} value={String(size)} onMinus={() => setSize(Math.max(13, size - 1))} onPlus={() => setSize(Math.min(28, size + 1))} />
        <Toggle label={scrolling ? t("Scrolling") : t("Auto-scroll")} on={scrolling} onPress={() => setScrolling(!scrolling)} icon={scrolling ? "pause" : "play"} />
        {scrolling ? <Stepper label={t("Speed")} value={String(speed)} onMinus={() => setSpeed(Math.max(1, speed - 1))} onPlus={() => setSpeed(Math.min(8, speed + 1))} /> : null}
      </ScrollView>

      <ScrollView ref={scroll} onScroll={(e) => (y.current = e.nativeEvent.contentOffset.y)} scrollEventThrottle={32} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}>
        <Label>{song.author}</Label>
        <View style={{ flexDirection: "row", gap: 14, marginTop: 8, marginBottom: 6 }}>
          <Body size={13} color={C.muted}>{t("Key")} <Body size={13} weight="bold" color={C.ink}>{key}</Body>{by ? ` (${t("original")} ${song.key})` : ""}</Body>
          {capo ? <Body size={13} color={C.muted}>{t("Capo {n} · play {k} shapes", { n: capo, k: shapeKey })}</Body> : null}
          {song.tempo ? <Body size={13} color={C.muted}>{song.tempo} bpm · {song.time}</Body> : null}
        </View>
        {sections.map((sec, si) => (
          <View key={si} style={{ marginTop: 18 }}>
            {sec.label ? <Label color={C.flame} style={{ marginBottom: 6 }}>{sec.label}</Label> : null}
            {sec.lines.map((line, li) => (
              chords ? (
                <View key={li} style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 6 }}>
                  {line.map((g, gi) => (
                    <View key={gi}>
                      <Text style={{ fontFamily: F.mono, fontSize: size * 0.82, color: C.violet, height: size * 1.2, minWidth: g.chord ? size * 1.6 : 0 }}>{g.chord ? show(g.chord) + " " : " "}</Text>
                      <Text style={{ fontFamily: F.sans, fontSize: size, lineHeight: size * 1.35, color: C.ink }}>{g.text || (g.chord ? " " : "")}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text key={li} style={{ fontFamily: F.sans, fontSize: size, lineHeight: size * 1.5, color: C.ink }}>{line.map((g) => g.text).join("")}</Text>
              )
            ))}
          </View>
        ))}
        <Body size={12} color={C.muted} style={{ marginTop: 28 }}>{song.copyright || ""}</Body>
        {nextSong ? (
          <Button label={t("Next: {s}", { s: songs.find((x) => x.slug === nextSong.song)?.title || nextSong.song })} variant="ink" block style={{ marginTop: 20 }}
            onPress={() => router.replace(`/songs/${nextSong.song}?set=${set!.id}&i=${idx + 1}${nextSong.key ? `&key=${encodeURIComponent(nextSong.key)}` : ""}` as any)} />
        ) : null}
      </ScrollView>

      <Modal visible={addTo} transparent animationType="fade" onRequestClose={() => setAddTo(false)}>
        <Press onPress={() => setAddTo(false)} scaleTo={1} haptic={false} style={{ flex: 1, backgroundColor: "rgba(15,11,18,0.45)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: insets.bottom + 16, gap: 8 }}>
            <Body weight="semi" size={17} style={{ marginBottom: 6 }}>{t("Add “{s}” in {k} to…", { s: song.title, k: key })}</Body>
            {lists.filter((l) => l.mine).map((l) => (
              <Press key={l.id} onPress={async () => { await save({ ...l, items: [...l.items, { song: song.slug, key }] }); setAddTo(false); }} style={st.pick}>
                <Icon name="list" size={17} color={C.violet} /><Body style={{ flex: 1 }}>{l.title}</Body><Body size={13} color={C.muted}>{l.items.length}</Body>
              </Press>
            ))}
            <Button label={t("New set list")} icon="plus" variant="tonal" block onPress={async () => { const id = await save({ title: t("Sunday set"), items: [{ song: song.slug, key }] }); setAddTo(false); router.push(`/songs/set/${id}` as any); }} />
          </View>
        </Press>
      </Modal>
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={st.ctl}>
      <Label size={9.5}>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Press onPress={onMinus} hitSlop={6} style={st.step} label={`${label} −`}><Icon name="minus" size={14} /></Press>
        <Body weight="bold" size={14} style={{ minWidth: 30, textAlign: "center" }}>{value}</Body>
        <Press onPress={onPlus} hitSlop={6} style={st.step} label={`${label} +`}><Icon name="plus" size={14} /></Press>
      </View>
    </View>
  );
}
function Toggle({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: string }) {
  return (
    <Press onPress={onPress} style={[st.ctl, { backgroundColor: on ? C.ink : "#fff", justifyContent: "center", flexDirection: "row", gap: 6, alignItems: "center" }]}>
      {icon ? <Icon name={icon} size={14} color={on ? "#fff" : C.ink} /> : null}
      <Body weight="semi" size={13.5} color={on ? "#fff" : C.ink}>{label}</Body>
    </Press>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  controls: { gap: 8, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(15,11,18,0.1)" },
  ctl: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", gap: 2, minHeight: 52 },
  step: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(15,11,18,0.06)", alignItems: "center", justifyContent: "center" },
  pick: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, backgroundColor: "#fff" },
});
