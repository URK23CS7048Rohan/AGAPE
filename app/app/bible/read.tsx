import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Body, Button, Icon, IconButton, Label, Press, Segmented } from "@/components/ui";
import { BOOKS, HIGHLIGHTS, TRANSLATIONS, book, lastPosition, savePosition, translation, useBookNames, useChapter, Verse } from "@/lib/bible";
import { hasVoice, useReader, voiceFor } from "@/lib/audio";
import { useMarks, useReaderPrefs } from "@/lib/scripture";

export default function Reader() {
  const p = useLocalSearchParams<{ b?: string; c?: string; v?: string }>();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useReaderPrefs();
  const tr = prefs.tr;
  const [b, setB] = useState(Number(p.b) || 43);
  const [c, setC] = useState(Number(p.c) || 1);
  const posReady = useRef(!!p.b);
  useEffect(() => { if (!p.b) lastPosition(tr).then((x) => { setB(x.book); setC(x.chapter); posReady.current = true; }); }, []);
  const { verses, loading, error, retry } = useChapter(tr, b, c);
  const names = useBookNames(tr);
  const T = translation(tr);
  const rtl = !!T.rtl;
  const name = names[b] || book(b).name;
  const marks = useMarks();
  const [sel, setSel] = useState<number[]>([]);
  const [sheet, setSheet] = useState<null | "book" | "tr" | "aa">(null);
  const [noteFor, setNoteFor] = useState<Verse | null>(null);
  const [noteText, setNoteText] = useState("");
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Record<number, number>>({});
  const keepPlaying = useRef(false);
  const reader = useReader(() => { if (keepPlaying.current) next(true); });

  useEffect(() => { if (posReady.current) savePosition({ tr, book: b, chapter: c }); setSel([]); ys.current = {}; }, [tr, b, c]);
  // jump to a verse (verse of the day, a highlight) once the chapter has laid out
  const target = useRef(Number(p.v) || 0);
  useEffect(() => {
    if (!verses.length) return;
    if (target.current) { const v = target.current; target.current = 0; setSel([v]); setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (ys.current[v] || 0) - 90), animated: true }), 350); }
    if (keepPlaying.current && !reader.playing) setTimeout(() => listen(0), 300);
  }, [verses]);
  useEffect(() => { if (reader.current) scroll.current?.scrollTo({ y: Math.max(0, (ys.current[reader.current] || 0) - 160), animated: true }); }, [reader.current]);

  const go = (nb: number, nc: number) => { reader.stop(); setB(nb); setC(nc); scroll.current?.scrollTo({ y: 0, animated: false }); };
  function next(play = false) { keepPlaying.current = play; if (c < book(b).chapters) go(b, c + 1); else if (b < 66) go(b + 1, 1); else keepPlaying.current = false; }
  const prev = () => { keepPlaying.current = false; if (c > 1) go(b, c - 1); else if (b > 1) go(b - 1, book(b - 1).chapters); };

  async function listen(from = 0) {
    const lang = voiceFor(tr);
    if (!(await hasVoice(lang))) { Alert.alert("No voice for this language", `Install the ${T.name} voice in your phone's text-to-speech settings, or switch to an English Bible.`); return; }
    keepPlaying.current = true;
    reader.play(verses, Math.max(0, from), lang, prefs.rate);
  }

  const selected = useMemo(() => verses.filter((v) => sel.includes(v.verse)).sort((x, y) => x.verse - y.verse), [verses, sel]);
  const selRef = sel.length ? `${name} ${c}:${sel.length > 1 ? `${Math.min(...sel)}–${Math.max(...sel)}` : sel[0]}` : "";
  const selText = selected.map((v) => v.text).join(" ");
  const base = (v: Verse) => ({ book: b, chapter: c, verse: v.verse, translation: tr, verse_text: v.text });
  const allBookmarked = selected.length > 0 && selected.every((v) => marks.get("bookmark", b, c, v.verse));
  const safe = (f: () => Promise<any>) => f().catch((e) => Alert.alert("Couldn't save", e.message));

  const highlight = (color: string | null) => safe(async () => {
    for (const v of selected) color ? await marks.put({ kind: "highlight", color, ...base(v) }) : await marks.remove("highlight", b, c, v.verse);
    setSel([]);
  });
  const bookmark = () => safe(async () => {
    for (const v of selected) allBookmarked ? await marks.remove("bookmark", b, c, v.verse) : await marks.put({ kind: "bookmark", ...base(v) });
    setSel([]);
  });
  const saveNote = () => safe(async () => {
    if (!noteFor) return;
    noteText.trim() ? await marks.put({ kind: "note", note: noteText.trim(), ...base(noteFor) }) : await marks.remove("note", b, c, noteFor.verse);
    setNoteFor(null); setSel([]);
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      {/* top bar */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: C.line, backgroundColor: "#FFFCF5" }}>
        <IconButton name="arrow-left" border={C.line} onPress={() => { reader.stop(); router.canGoBack() ? router.back() : router.replace("/bible"); }} />
        <Press onPress={() => setSheet("book")} style={pill}>
          <Body weight="bold" size={15.5} numberOfLines={1}>{name} {c}</Body>
          <Icon name="chevron-down" size={15} color={C.muted} />
        </Press>
        <Press onPress={() => setSheet("tr")} style={[pill, { paddingHorizontal: 10 }]}><Body weight="semi" size={13.5}>{T.short}</Body></Press>
        <View style={{ flex: 1 }} />
        <IconButton name="headphones" border={C.line} bg={reader.playing ? C.flame : "#fff"} color={reader.playing ? "#fff" : C.ink} onPress={() => (reader.playing ? (keepPlaying.current = false, reader.stop()) : listen(sel.length ? verses.findIndex((v) => v.verse === Math.min(...sel)) : 0))} />
        <IconButton name="type" border={C.line} onPress={() => setSheet("aa")} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <Label style={{ textAlign: rtl ? "right" : "left" }}>{T.name}</Label>
        <Text style={{ fontFamily: F.poster, fontSize: 40, color: C.ink, marginTop: 4, marginBottom: 14, textAlign: rtl ? "right" : "left", textTransform: "uppercase" }}>{name} {c}</Text>
        {loading ? <ActivityIndicator color={C.flame} style={{ marginTop: 40 }} /> : null}
        {error ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <Icon name="wifi-off" size={26} color={C.muted} />
            <Body center color={C.muted}>This chapter needs the internet the first time you open it. After that it's saved on your phone.</Body>
            <Button label="Try again" variant="white" small trail={null} onPress={retry} />
          </View>
        ) : null}
        {verses.map((v) => {
          const hl = marks.get("highlight", b, c, v.verse);
          const bm = marks.get("bookmark", b, c, v.verse);
          const nt = marks.get("note", b, c, v.verse);
          const on = sel.includes(v.verse);
          const reading = reader.current === v.verse;
          return (
            <View key={v.verse} onLayout={(e) => (ys.current[v.verse] = e.nativeEvent.layout.y)}>
            <Press haptic={false} scaleTo={1} onPress={() => setSel((x) => (x.includes(v.verse) ? x.filter((y) => y !== v.verse) : [...x, v.verse]))}
              style={{ marginBottom: 6, borderRadius: 8, paddingHorizontal: 4, marginHorizontal: -4, backgroundColor: reading ? "rgba(255,90,31,0.12)" : "transparent" }}>
              <View>
                <Text style={{ fontFamily: F.serif, fontSize: prefs.size, lineHeight: Math.round(prefs.size * 1.55), color: C.ink, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" } as any}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: Math.round(prefs.size * 0.58), color: bm ? C.flame : "rgba(20,20,20,0.4)" }}>{v.verse}{bm ? " ▪" : ""}  </Text>
                  <Text style={{ backgroundColor: hl?.color || "transparent", textDecorationLine: on ? "underline" : "none", textDecorationStyle: "dotted", textDecorationColor: C.flame } as any}>{v.text}</Text>
                  {nt ? <Text style={{ color: C.violet }}>  ✎</Text> : null}
                </Text>
                {nt && on ? <Body size={13.5} color={C.violet} style={{ marginTop: 4 }}>{nt.note}</Body> : null}
              </View>
            </Press>
            </View>
          );
        })}
        {verses.length ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
            <Button label="Previous" variant="white" icon="chevron-left" trail={null} small onPress={prev} style={{ flex: 1 }} disabled={b === 1 && c === 1} />
            <Button label="Next chapter" variant="ink" trail="chevron-right" small onPress={() => next(reader.playing)} style={{ flex: 1.4 }} disabled={b === 66 && c === 22} />
          </View>
        ) : null}
        <Body size={11.5} color={C.muted} style={{ marginTop: 22, textAlign: "center" }}>{T.name} · public domain · bolls.life</Body>
      </ScrollView>

      {/* actions for the selected verses */}
      {sel.length && !reader.playing && !reader.paused ? (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[dock, { bottom: insets.bottom + 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Body weight="semi" color="#fff" style={{ flex: 1 }} numberOfLines={1}>{selRef}</Body>
            <Press onPress={() => setSel([])} hitSlop={10}><Icon name="x" size={18} color="rgba(255,255,255,0.7)" /></Press>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
            {HIGHLIGHTS.map((h) => <Press key={h} onPress={() => highlight(h)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: h, borderWidth: 2, borderColor: "rgba(255,255,255,0.8)" }} />)}
            <Press onPress={() => highlight(null)} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center" }}><Icon name="slash" size={14} color="#fff" /></Press>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {[
              { icon: "bookmark", label: allBookmarked ? "Unsave" : "Save", on: bookmark },
              { icon: "edit-3", label: "Note", on: () => { const v = selected[0]; setNoteFor(v); setNoteText(marks.get("note", b, c, v.verse)?.note || ""); } },
              { icon: "copy", label: "Copy", on: async () => { await Clipboard.setStringAsync(`“${selText}” ${selRef} (${T.short})`); setSel([]); } },
              { icon: "share-2", label: "Share", on: () => Share.share({ message: `“${selText}” ${selRef} (${T.short})` }) },
            ].map((a) => (
              <Press key={a.label} onPress={a.on} style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", gap: 3 }}>
                <Icon name={a.icon} size={17} color="#fff" />
                <Body size={11.5} color="#fff" weight="semi">{a.label}</Body>
              </Press>
            ))}
          </View>
        </Animated.View>
      ) : null}

      {/* audio player */}
      {reader.playing || reader.paused ? (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[dock, { bottom: insets.bottom + 12, flexDirection: "row", alignItems: "center", gap: 6 }]}>
          <Icon name="headphones" size={18} color={C.sun} />
          <View style={{ flex: 1 }}>
            <Body weight="semi" size={14} color="#fff" numberOfLines={1}>{name} {c}{reader.current ? `:${reader.current}` : ""}</Body>
            <Body size={12} color="rgba(255,255,255,0.6)">Audio Bible · {prefs.rate}×</Body>
          </View>
          <IconButton name="skip-back" bg="transparent" color="#fff" size={40} onPress={() => reader.skip(-1)} />
          <IconButton name={reader.paused ? "play" : "pause"} bg="#fff" color={C.ink} size={40} onPress={() => (reader.paused ? reader.resume() : reader.pause())} />
          <IconButton name="skip-forward" bg="transparent" color="#fff" size={40} onPress={() => reader.skip(1)} />
          <Press onPress={() => { const r = [0.75, 1, 1.25, 1.5][([0.75, 1, 1.25, 1.5].indexOf(prefs.rate) + 1) % 4]; setPrefs({ rate: r }); reader.setRate(r); }} style={{ paddingHorizontal: 4 }}>
            <Body weight="bold" size={13} color={C.sun}>{prefs.rate}×</Body>
          </Press>
          <IconButton name="x" bg="transparent" color="rgba(255,255,255,0.6)" size={36} onPress={() => { keepPlaying.current = false; reader.stop(); }} />
        </Animated.View>
      ) : null}

      {/* sheets */}
      <Sheet open={sheet === "book"} onClose={() => setSheet(null)} title="Go to">
        <BookPicker names={names} current={b} onPick={(nb, nc) => { setSheet(null); go(nb, nc); }} />
      </Sheet>
      <Sheet open={sheet === "tr"} onClose={() => setSheet(null)} title="Translation">
        {TRANSLATIONS.map((x) => (
          <Press key={x.code} onPress={() => { setPrefs({ tr: x.code }); setSheet(null); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
            <View style={{ flex: 1 }}><Body weight="semi">{x.name}</Body><Label>{x.short}</Label></View>
            {x.code === tr ? <Icon name="check" size={18} color={C.flame} /> : null}
          </Press>
        ))}
      </Sheet>
      <Sheet open={sheet === "aa"} onClose={() => setSheet(null)} title="Text size">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 }}>
          <IconButton name="minus" border={C.line} onPress={() => setPrefs({ size: Math.max(14, prefs.size - 1) })} />
          <Text style={{ flex: 1, textAlign: "center", fontFamily: F.serif, fontSize: prefs.size, color: C.ink }}>In the beginning was the Word</Text>
          <IconButton name="plus" border={C.line} onPress={() => setPrefs({ size: Math.min(30, prefs.size + 1) })} />
        </View>
      </Sheet>

      {/* note editor */}
      <Modal visible={!!noteFor} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 18 }}>
            <Label>Note on {name} {c}:{noteFor?.verse}</Label>
            <Body size={14} color={C.muted} style={{ marginTop: 6 }} numberOfLines={3}>{noteFor?.text}</Body>
            <TextInput value={noteText} onChangeText={setNoteText} placeholder="What is God saying to you here?" placeholderTextColor={C.muted} multiline autoFocus
              style={{ marginTop: 12, minHeight: 100, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, padding: 12, fontFamily: F.sans, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Button label="Cancel" variant="white" small trail={null} onPress={() => setNoteFor(null)} style={{ flex: 1 }} />
              <Button label="Save note" variant="ink" small trail="check" onPress={saveNote} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BookPicker({ names, current, onPick }: { names: Record<number, string>; current: number; onPick: (b: number, c: number) => void }) {
  const [t, setT] = useState(current > 39 ? 1 : 0);
  const [open, setOpen] = useState<number | null>(current);
  return (
    <View>
      <Segmented items={["Old Testament", "New Testament"]} value={t} onChange={setT} />
      <View style={{ marginTop: 12 }}>
        {BOOKS.filter((x) => x.testament === (t ? "NT" : "OT")).map((x) => (
          <View key={x.id} style={{ borderBottomWidth: 1, borderColor: C.line }}>
            <Press onPress={() => setOpen(open === x.id ? null : x.id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13 }}>
              <Body weight={x.id === current ? "bold" : "semi"} color={x.id === current ? C.flame : C.ink} style={{ flex: 1 }}>{names[x.id] || x.name}</Body>
              <Icon name={open === x.id ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
            </Press>
            {open === x.id ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 14 }}>
                {Array.from({ length: x.chapters }, (_, i) => (
                  <Press key={i} onPress={() => onPick(x.id, i + 1)} style={{ width: 46, height: 42, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
                    <Body weight="semi" size={14}>{i + 1}</Body>
                  </Press>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Press haptic={false} scaleTo={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      <View style={{ maxHeight: "78%", backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 12 }} />
        <Body size={18} weight="bold" style={{ marginBottom: 10 }}>{title}</Body>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const pill = { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, maxWidth: 170 };
const dock = { position: "absolute" as const, left: 12, right: 12, backgroundColor: C.ink, borderRadius: 24, padding: 14, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 };
