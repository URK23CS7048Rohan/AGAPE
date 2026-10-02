import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Body, Icon, IconButton, Label, Loading, Press } from "@/components/ui";
import { useQuery } from "@/lib/query";
import { getSong } from "@/lib/scripture";
import { capoShapeKey, interval, keyPlus, lyricsOnly, parseSong, transposeChord } from "@/lib/chords";

export default function SongView() {
  const p = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const q = useQuery(p.slug ? `song:${p.slug}` : null, () => getSong(p.slug!));
  const song = q.data;
  const [key, setKey] = useState("C");
  useEffect(() => { if (song) setKey(song.original_key); }, [song?.slug]);
  const [capo, setCapo] = useState(0);
  const [chords, setChords] = useState(true);
  const [size, setSize] = useState(17);
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(2);
  const scroll = useRef<ScrollView>(null);
  const y = useRef(0);
  const sections = useMemo(() => parseSong(song?.body || ""), [song?.body]);

  // hands-free scrolling for musicians
  useEffect(() => {
    if (!scrolling) return;
    const iv = setInterval(() => { y.current += speed * 0.6; scroll.current?.scrollTo({ y: y.current, animated: false }); }, 50);
    return () => clearInterval(iv);
  }, [scrolling, speed]);

  if (!song) return <View style={{ flex: 1, backgroundColor: "#FFFCF5" }}>{q.loading ? <Loading /> : null}</View>;
  const by = interval(song.original_key, key);
  const shapeKey = capoShapeKey(key, capo);
  const show = (ch: string) => transposeChord(transposeChord(ch, by, key), -capo, shapeKey);
  const share = () => Share.share({ message: `${song.title}\n\n${chords ? song.body.replace(/^\{(.+)\}$/gm, "\n$1").replace(/\[([^\]]+)\]/g, (_, c) => `[${show(c)}]`) : lyricsOnly(song.body)}` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton name="arrow-left" border={C.line} onPress={() => (router.canGoBack() ? router.back() : router.replace("/songs"))} />
        <View style={{ flex: 1 }}>
          <Body weight="bold" size={16} numberOfLines={1}>{song.title}</Body>
          <Label numberOfLines={1}>{song.author}</Label>
        </View>
        <IconButton name="share-2" border={C.line} onPress={share} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 72, borderBottomWidth: 1, borderColor: C.line }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: "center" }}>
        <Stepper label="Key" value={key} onMinus={() => setKey(keyPlus(key, -1))} onPlus={() => setKey(keyPlus(key, 1))} />
        <Stepper label="Capo" value={capo ? String(capo) : "Off"} onMinus={() => setCapo(Math.max(0, capo - 1))} onPlus={() => setCapo(Math.min(9, capo + 1))} />
        <Toggle label="Chords" on={chords} onPress={() => setChords(!chords)} />
        <Stepper label="Text" value={String(size)} onMinus={() => setSize(Math.max(13, size - 1))} onPlus={() => setSize(Math.min(28, size + 1))} />
        <Toggle label={scrolling ? "Scrolling" : "Auto-scroll"} on={scrolling} onPress={() => setScrolling(!scrolling)} icon={scrolling ? "pause" : "play"} />
        {scrolling ? <Stepper label="Speed" value={String(speed)} onMinus={() => setSpeed(Math.max(1, speed - 1))} onPlus={() => setSpeed(Math.min(8, speed + 1))} /> : null}
      </ScrollView>

      <ScrollView ref={scroll} onScroll={(e) => (y.current = e.nativeEvent.contentOffset.y)} scrollEventThrottle={32} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tag text={`Key ${key}${by ? ` · original ${song.original_key}` : ""}`} color={C.sun} />
          {capo ? <Tag text={`Capo ${capo} · play ${shapeKey} shapes`} color={C.lilac} /> : null}
          {song.tempo ? <Tag text={`${song.tempo} bpm · ${song.time_sig || "4/4"}`} color={C.mintSoft} /> : null}
        </View>
        {sections.map((sec, si) => (
          <View key={si} style={{ marginTop: 22 }}>
            {sec.label ? <Label color={C.flame} style={{ marginBottom: 6, letterSpacing: 1.5, textTransform: "uppercase" }}>{sec.label}</Label> : null}
            {sec.lines.map((line, li) =>
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
                <Text key={li} style={{ fontFamily: F.serif, fontSize: size * 1.12, lineHeight: size * 1.6, color: C.ink }}>{line.map((g) => g.text).join("")}</Text>
              )
            )}
          </View>
        ))}
        {song.copyright ? <Body size={12} color={C.muted} style={{ marginTop: 28 }}>{song.copyright}</Body> : null}
      </ScrollView>
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return <View style={{ backgroundColor: color, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}><Body size={12.5} weight="semi">{text}</Body></View>;
}
function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={ctl}>
      <Label size={9.5}>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Press onPress={onMinus} hitSlop={6} style={step}><Icon name="minus" size={14} /></Press>
        <Body weight="bold" size={14} style={{ minWidth: 30, textAlign: "center" }}>{value}</Body>
        <Press onPress={onPlus} hitSlop={6} style={step}><Icon name="plus" size={14} /></Press>
      </View>
    </View>
  );
}
function Toggle({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: string }) {
  return (
    <Press onPress={onPress} style={[ctl, { backgroundColor: on ? C.ink : "#fff", justifyContent: "center", flexDirection: "row", gap: 6, alignItems: "center" }]}>
      {icon ? <Icon name={icon} size={14} color={on ? "#fff" : C.ink} /> : null}
      <Body weight="semi" size={13.5} color={on ? "#fff" : C.ink}>{label}</Body>
    </Press>
  );
}
const ctl = { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" as const, gap: 2, minHeight: 54 };
const step = { width: 28, height: 28, borderRadius: 8, backgroundColor: C.bg, alignItems: "center" as const, justifyContent: "center" as const };
