import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Body, Button, Chip, Icon, IconButton, Label, Press, Segmented } from "@/components/ui";
import { ShareCard } from "@/components/ShareCard";
import { BOOKS, HIGHLIGHTS, TRANSLATIONS, book, lastPosition, savePosition, translation, useBookNames, useChapter, Verse } from "@/lib/bible";
import { useReader, voiceFor, hasVoice } from "@/lib/audio";
import { useMarks } from "@/lib/more";
import { useStore } from "@/lib/store";
import { langInfo, t } from "@/lib/i18n";

export default function Reader() {
  const p = useLocalSearchParams<{ b?: string; c?: string; v?: string; tr?: string; audio?: string }>();
  const insets = useSafeAreaInsets();
  const { settings, setSetting, markActive } = useStore();
  const [tr, setTr] = useState(p.tr || settings.bible || langInfo().bible);
  const [b, setB] = useState(Number(p.b) || 43);
  const [c, setC] = useState(Number(p.c) || 1);
  // no chapter asked for → carry on where you left off
  const posReady = useRef(!!p.b);
  useEffect(() => { if (!p.b) lastPosition(tr).then((x) => { setB(x.book); setC(x.chapter); posReady.current = true; }); }, []);
  const { verses, loading, error, retry } = useChapter(tr, b, c);
  const names = useBookNames(tr);
  const T = translation(tr);
  const rtl = !!T.rtl;
  const [sel, setSel] = useState<number[]>([]);
  const [sheet, setSheet] = useState<null | "book" | "tr" | "aa">(null);
  const [noteFor, setNoteFor] = useState<Verse | null>(null);
  const [noteText, setNoteText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const marks = useMarks();
  const size = settings.readerSize || 19;
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Record<number, number>>({});
  const continueNext = useRef(false);
  const reader = useReader(() => { if (continueNext.current) next(true); });
  const name = names[b] || book(b).name;

  useEffect(() => { if (posReady.current) savePosition({ tr, book: b, chapter: c }); setSel([]); ys.current = {}; markActive(); }, [tr, b, c]);
  // jump to a verse (from a plan, a bookmark or search) once the chapter has laid out
  const target = useRef(Number(p.v) || 0);
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!verses.length) return;
    if (target.current) { const v = target.current; target.current = 0; setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (ys.current[v] || 0) - 80), animated: true }), 350); setSel([v]); }
    if (p.audio && !autoStarted.current) { autoStarted.current = true; continueNext.current = true; setTimeout(() => listen(0), 400); }
    else if (continueNext.current && !reader.playing) setTimeout(() => listen(0), 300);
  }, [verses]);
  // follow the verse being read
  useEffect(() => { if (reader.current) scroll.current?.scrollTo({ y: Math.max(0, (ys.current[reader.current] || 0) - 160), animated: true }); }, [reader.current]);

  const go = (nb: number, nc: number) => { reader.stop(); setB(nb); setC(nc); scroll.current?.scrollTo({ y: 0, animated: false }); };
  function next(keepPlaying = false) {
    continueNext.current = keepPlaying;
    if (c < book(b).chapters) go(b, c + 1); else if (b < 66) go(b + 1, 1); else continueNext.current = false;
  }
  const prev = () => { continueNext.current = false; if (c > 1) go(b, c - 1); else if (b > 1) go(b - 1, book(b - 1).chapters); };

  async function listen(fromIndex = 0) {
    const lang = voiceFor(tr);
    if (!(await hasVoice(lang))) {
      Alert.alert(t("No voice for this language"), t("Install the {lang} voice in your phone's text-to-speech settings, or switch to an English Bible.", { lang: T.name }));
      return;
    }
    continueNext.current = true;
    reader.play(verses, fromIndex, lang, settings.speechRate || 1);
  }

  const selected = useMemo(() => verses.filter((v) => sel.includes(v.verse)), [verses, sel]);
  const selRef = sel.length ? `${name} ${c}:${sel.length > 1 ? `${Math.min(...sel)}–${Math.max(...sel)}` : sel[0]}` : "";
  const selText = selected.map((v) => v.text).join(" ");
  const base = (v: Verse) => ({ book: b, chapter: c, verse: v.verse, translation: tr, verse_text: v.text });
  const allBookmarked = selected.length > 0 && selected.every((v) => marks.get("bookmark", b, c, v.verse));

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      {/* top bar */}
      <View style={[s.top, { paddingTop: insets.top + 4 }]}>
        <IconButton name="chevron-down" label={t("Close")} onPress={() => { reader.stop(); router.canGoBack() ? router.back() : router.replace("/bible"); }} />
        <Press onPress={() => setSheet("book")} style={s.pill} label={t("Choose a book and chapter")}>
          <Body weight="semi" size={15.5} numberOfLines={1}>{name} {c}</Body>
          <Icon name="chevron-down" size={15} color={C.muted} />
        </Press>
        <Press onPress={() => setSheet("tr")} style={[s.pill, { paddingHorizontal: 10 }]} label={t("Translation")}>
          <Body weight="semi" size={13.5}>{T.short}</Body>
        </Press>
        <View style={{ flex: 1 }} />
        <IconButton name="headphones" label={t("Listen")} onPress={() => (reader.playing ? reader.stop() : listen(sel.length ? verses.findIndex((v) => v.verse === Math.min(...sel)) : 0))} bg={reader.playing ? C.flame : undefined} color={reader.playing ? "#fff" : C.ink} />
        <IconButton name="type" label={t("Text size")} onPress={() => setSheet("aa")} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Label style={{ textAlign: rtl ? "right" : "left" }}>{T.name}</Label>
        <Text style={{ fontFamily: F.displayBold, fontSize: 30, color: C.ink, marginTop: 6, marginBottom: 14, textAlign: rtl ? "right" : "left" }}>{name} {c}</Text>
        {loading ? <ActivityIndicator color={C.flame} style={{ marginTop: 40 }} /> : null}
        {error ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <Icon name="wifi-off" size={26} color={C.muted} />
            <Body center color={C.muted}>{t("This chapter needs the internet the first time you open it. After that it's saved on your phone.")}</Body>
            <Button label={t("Try again")} variant="tonal" small onPress={retry} />
          </View>
        ) : null}
        {verses.map((v) => {
          const hl = marks.get("highlight", b, c, v.verse);
          const bm = marks.get("bookmark", b, c, v.verse);
          const nt = marks.get("note", b, c, v.verse);
          const on = sel.includes(v.verse);
          const reading = reader.current === v.verse;
          return (
            <Press key={v.verse} haptic={false} scaleTo={1} onPress={() => setSel((x) => (x.includes(v.verse) ? x.filter((y) => y !== v.verse) : [...x, v.verse]))}
              style={{ marginBottom: 6, borderRadius: 6, paddingHorizontal: 4, marginHorizontal: -4, backgroundColor: reading ? "rgba(255,90,31,0.12)" : "transparent" }}>
              <View onLayout={(e) => (ys.current[v.verse] = e.nativeEvent.layout.y)}>
                <Text style={{ fontFamily: F.serif, fontSize: size, lineHeight: Math.round(size * 1.55), color: C.ink, textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" } as any}>
                  <Text style={{ fontFamily: F.sansSemi, fontSize: Math.round(size * 0.58), color: bm ? C.flame : "rgba(15,11,18,0.42)" }}>{v.verse}{bm ? " ▪" : ""}  </Text>
                  <Text style={{ backgroundColor: hl?.color || "transparent", textDecorationLine: on ? "underline" : "none", textDecorationStyle: "dotted", textDecorationColor: C.flame } as any}>{v.text}</Text>
                  {nt ? <Text style={{ color: C.violet }}>  ✎</Text> : null}
                </Text>
                {nt && on ? <Body size={13.5} color={C.violet} style={{ marginTop: 4 }}>{nt.note}</Body> : null}
              </View>
            </Press>
          );
        })}
        {verses.length ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
            <Button label={t("Previous")} variant="tonal" icon="chevron-left" onPress={prev} style={{ flex: 1 }} disabled={b === 1 && c === 1} />
            <Button label={t("Next chapter")} variant="ink" onPress={() => next(reader.playing)} style={{ flex: 1.4 }} disabled={b === 66 && c === 22} />
          </View>
        ) : null}
        <Body size={11.5} color={C.muted} style={{ marginTop: 22, textAlign: "center" }}>{T.name} · {t("public domain")} · bolls.life</Body>
      </ScrollView>

      {/* audio player */}
      {reader.playing || reader.paused ? (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[s.dock, { bottom: insets.bottom + 12 }]}>
          <Icon name="headphones" size={18} color={C.sun} />
          <View style={{ flex: 1 }}>
            <Body weight="semi" size={14} color="#fff" numberOfLines={1}>{name} {c}{reader.current ? `:${reader.current}` : ""}</Body>
            <Body size={12} color={C.creamMuted}>{t("Audio Bible")} · {(settings.speechRate || 1).toFixed(2).replace(/0$/, "")}×</Body>
          </View>
          <IconButton name="skip-back" bg="transparent" color="#fff" label={t("Previous verse")} onPress={() => reader.skip(-1)} />
          <IconButton name={reader.paused ? "play" : "pause"} bg="#fff" color={C.ink} label={reader.paused ? t("Play") : t("Pause")} onPress={() => (reader.paused ? reader.resume() : reader.pause())} />
          <IconButton name="skip-forward" bg="transparent" color="#fff" label={t("Next verse")} onPress={() => reader.skip(1)} />
          <Press onPress={() => { const r = [0.75, 1, 1.25, 1.5][([0.75, 1, 1.25, 1.5].indexOf(settings.speechRate || 1) + 1) % 4]; setSetting("speechRate", r); reader.setRate(r); }} style={{ paddingHorizontal: 6 }} label={t("Speed")}>
            <Body weight="bold" size={13} color={C.sun}>{(settings.speechRate || 1)}×</Body>
          </Press>
          <IconButton name="x" bg="transparent" color={C.creamMuted} label={t("Stop")} onPress={() => { continueNext.current = false; reader.stop(); }} />
        </Animated.View>
      ) : null}

      {/* verse actions */}
      {sel.length && !reader.playing && !reader.paused ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[s.actions, { paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Body weight="semi" style={{ flex: 1 }}>{selRef}</Body>
            <Press onPress={() => setSel([])} hitSlop={10} label={t("Clear selection")}><Icon name="x" size={20} color={C.muted} /></Press>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "center" }}>
            {HIGHLIGHTS.map((col) => (
              <Press key={col} onPress={() => { marks.highlight(selected.map(base), col).catch(() => {}); setSel([]); }} label={t("Highlight")} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col, borderWidth: 1, borderColor: "rgba(15,11,18,0.1)" }} />
            ))}
            <Press onPress={() => { marks.highlight(selected.map(base), null).catch(() => {}); setSel([]); }} label={t("Remove highlight")} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(15,11,18,0.18)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="slash" size={15} color={C.muted} />
            </Press>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action icon="bookmark" label={allBookmarked ? t("Saved") : t("Save")} on={allBookmarked} onPress={() => { marks.bookmark(selected.map(base), !allBookmarked).catch(() => {}); }} />
            <Action icon="edit-3" label={t("Note")} onPress={() => { const v = selected[0]; setNoteFor(v); setNoteText(marks.get("note", b, c, v.verse)?.note || ""); }} />
            <Action icon="copy" label={t("Copy")} onPress={async () => { await Clipboard.setStringAsync(`“${selText}” — ${selRef} (${T.short})`); setSel([]); }} />
            <Action icon="image" label={t("Image")} onPress={() => setShareOpen(true)} />
            <Action icon="share-2" label={t("Share")} onPress={() => Share.share({ message: `“${selText}”\n— ${selRef} (${T.short})` }).catch(() => {})} />
            <Action icon="play" label={t("Listen")} onPress={() => { const i = verses.findIndex((v) => v.verse === Math.min(...sel)); setSel([]); listen(i); }} />
          </View>
        </Animated.View>
      ) : null}

      <BookSheet visible={sheet === "book"} names={names} current={[b, c]} onClose={() => setSheet(null)} onPick={(nb, nc) => { setSheet(null); go(nb, nc); }} />
      <Sheet visible={sheet === "tr"} title={t("Translation")} onClose={() => setSheet(null)}>
        {TRANSLATIONS.map((x) => (
          <Press key={x.code} onPress={() => { setTr(x.code); setSetting("bible", x.code); setSheet(null); }} style={[s.row, x.code === tr && { backgroundColor: "rgba(255,90,31,0.08)" }]}>
            <View style={{ width: 64 }}><Body weight="bold" size={14} color={x.code === tr ? C.flame : C.ink}>{x.short}</Body></View>
            <Body style={{ flex: 1 }}>{x.name}</Body>
            {x.code === tr ? <Icon name="check" size={18} color={C.flame} /> : null}
          </Press>
        ))}
        <Body size={12.5} color={C.muted} style={{ padding: 16 }}>{t("All translations here are free to read. Chapters you open are saved for offline reading.")}</Body>
      </Sheet>
      <Sheet visible={sheet === "aa"} title={t("Reading")} onClose={() => setSheet(null)}>
        <View style={{ padding: 16, gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconButton name="minus" onPress={() => setSetting("readerSize", Math.max(14, size - 1))} label={t("Smaller text")} />
            <View style={{ flex: 1, alignItems: "center" }}><Text style={{ fontFamily: F.serif, fontSize: size, color: C.ink }}>{t("In the beginning")}</Text></View>
            <IconButton name="plus" onPress={() => setSetting("readerSize", Math.min(30, size + 1))} label={t("Larger text")} />
          </View>
          <View>
            <Label style={{ marginBottom: 8 }}>{t("Reading speed")}</Label>
            <Segmented items={["0.75×", "1×", "1.25×", "1.5×"]} value={[0.75, 1, 1.25, 1.5].indexOf(settings.speechRate || 1)} onChange={(i) => setSetting("speechRate", [0.75, 1, 1.25, 1.5][i])} />
          </View>
        </View>
      </Sheet>

      <Modal visible={!!noteFor} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <View style={s.scrim}>
          <View style={s.card}>
            <Body weight="semi" size={16}>{t("Note on {ref}", { ref: noteFor ? `${name} ${c}:${noteFor.verse}` : "" })}</Body>
            <TextInput value={noteText} onChangeText={setNoteText} multiline autoFocus placeholder={t("What is God saying to you here?")} placeholderTextColor="rgba(15,11,18,0.4)" style={s.input} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label={t("Cancel")} variant="tonal" onPress={() => setNoteFor(null)} style={{ flex: 1 }} />
              <Button label={t("Save")} onPress={() => { if (noteFor) marks.note(base(noteFor), noteText).catch(() => {}); setNoteFor(null); setSel([]); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
      <ShareCard visible={shareOpen} onClose={() => { setShareOpen(false); setSel([]); }} text={selText} reference={`${selRef} · ${T.short}`} rtl={rtl} />
    </View>
  );
}

function Action({ icon, label, onPress, on }: { icon: string; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Press onPress={onPress} style={{ flex: 1, alignItems: "center", gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: on ? "rgba(255,90,31,0.1)" : "rgba(15,11,18,0.04)" }} label={label}>
      <Icon name={icon} size={18} color={on ? C.flame : C.ink} />
      <Body size={11} weight="medium" numberOfLines={1}>{label}</Body>
    </Press>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Press onPress={onClose} scaleTo={1} haptic={false} style={{ flex: 1, backgroundColor: "rgba(15,11,18,0.35)" }} />
      <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "82%", paddingBottom: insets.bottom + 8 }}>
        <View style={{ alignItems: "center", paddingTop: 8 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(15,11,18,0.18)" }} /></View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
          <Body weight="semi" size={17} style={{ flex: 1 }}>{title}</Body>
          <Press onPress={onClose} hitSlop={10} label={t("Close")}><Icon name="x" size={20} color={C.muted} /></Press>
        </View>
        <ScrollView>{children}</ScrollView>
      </View>
    </Modal>
  );
}

function BookSheet({ visible, names, current, onClose, onPick }: { visible: boolean; names: Record<number, string>; current: [number, number]; onClose: () => void; onPick: (b: number, c: number) => void }) {
  const [test, setTest] = useState(current[0] > 39 ? 1 : 0);
  const [open, setOpen] = useState<number | null>(current[0]);
  useEffect(() => { if (visible) { setTest(current[0] > 39 ? 1 : 0); setOpen(current[0]); } }, [visible]);
  const list = BOOKS.filter((x) => (test ? x.testament === "NT" : x.testament === "OT"));
  return (
    <Sheet visible={visible} title={t("Books")} onClose={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><Segmented items={[t("Old Testament"), t("New Testament")]} value={test} onChange={setTest} /></View>
      {list.map((x) => (
        <View key={x.id}>
          <Press onPress={() => setOpen(open === x.id ? null : x.id)} style={s.row}>
            <Body weight={x.id === current[0] ? "semi" : "regular"} color={x.id === current[0] ? C.flame : C.ink} style={{ flex: 1 }}>{names[x.id] || x.name}</Body>
            <Body size={13} color={C.muted}>{x.chapters}</Body>
            <Icon name={open === x.id ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
          </Press>
          {open === x.id ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
              {Array.from({ length: x.chapters }, (_, i) => i + 1).map((n) => {
                const on = x.id === current[0] && n === current[1];
                return (
                  <Press key={n} onPress={() => onPick(x.id, n)} style={{ width: 48, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.flame : "rgba(15,11,18,0.05)" }} label={`${names[x.id] || x.name} ${n}`}>
                    <Body weight="semi" color={on ? "#fff" : C.ink}>{n}</Body>
                  </Press>
                );
              })}
            </View>
          ) : null}
        </View>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: C.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(15,11,18,0.12)" },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(15,11,18,0.05)", maxWidth: 190 },
  dock: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.ink, borderRadius: 16, paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  actions: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(15,11,18,0.08)" },
  scrim: { flex: 1, backgroundColor: "rgba(15,11,18,0.45)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: C.paper, borderRadius: 18, padding: 18, gap: 14 },
  input: { minHeight: 120, borderRadius: 12, backgroundColor: "rgba(15,11,18,0.05)", padding: 12, fontFamily: F.sans, fontSize: 15.5, color: C.ink, textAlignVertical: "top" },
});
