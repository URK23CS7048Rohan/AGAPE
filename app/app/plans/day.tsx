import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Body, Button, Icon, IconButton, Label, Press } from "@/components/ui";
import { getChapter, parseRef, refLabel, translation, useBookNames, Verse } from "@/lib/bible";
import { useJournal, usePlanProgress, usePlans } from "@/lib/more";
import { useReader, voiceFor } from "@/lib/audio";
import { useStore } from "@/lib/store";
import { langInfo, t } from "@/lib/i18n";

type Block = { ref: string; label: string; verses: Verse[]; b: number; c: number; v?: number; error?: boolean };

export default function PlanDay() {
  const { slug, d } = useLocalSearchParams<{ slug: string; d: string }>();
  const day = Number(d) || 1;
  const insets = useSafeAreaInsets();
  const { settings, markActive } = useStore();
  const tr = settings.bible || langInfo().bible;
  const T = translation(tr);
  const names = useBookNames(tr);
  const plan = usePlans().data.find((p) => p.slug === slug);
  const info = plan?.days[day - 1];
  const { progress, toggleDay, start } = usePlanProgress();
  const pr = plan ? progress[plan.id] : undefined;
  const isDone = !!pr?.done.includes(day);
  const journal = useJournal();
  const existing = journal.entries.find((e) => e.plan_id === plan?.id && e.day === day);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setNote(existing?.body || ""); }, [existing?.id]);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const reader = useReader();

  useEffect(() => {
    if (!info) return;
    let alive = true;
    Promise.all(info.refs.map(async (ref) => {
      const r = parseRef(ref);
      if (!r) return { ref, label: ref, verses: [], b: 43, c: 1, error: true } as Block;
      try {
        const all = await getChapter(tr, r.book, r.chapter);
        const vs = r.from ? all.filter((v) => v.verse >= r.from! && v.verse <= (r.to || r.from!)) : all;
        return { ref, label: refLabel(r, names), verses: vs, b: r.book, c: r.chapter, v: r.from } as Block;
      } catch { return { ref, label: refLabel(r, names), verses: [], b: r.book, c: r.chapter, v: r.from, error: true } as Block; }
    })).then((x) => alive && setBlocks(x));
    return () => { alive = false; };
  }, [info, tr, names]);

  // everything read aloud as one list: devotion first, then the passages
  const audioList = useMemo(() => {
    const list: Verse[] = [];
    if (info?.devotion) list.push({ verse: -1, text: info.devotion });
    (blocks || []).forEach((bl, i) => { list.push({ verse: -(i + 2), text: bl.label }); bl.verses.forEach((v) => list.push({ verse: (i + 1) * 1000 + v.verse, text: v.text })); });
    return list;
  }, [blocks, info]);

  if (!plan || !info) return <View style={{ flex: 1, backgroundColor: C.paper }}><BackHeader /></View>;

  const complete = async () => {
    if (!pr) await start(plan.id).catch(() => {});
    if (!isDone) { await toggleDay(plan.id, day).catch(() => {}); markActive(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    if (note.trim() && note !== existing?.body) await journal.save({ id: existing?.id, plan_id: plan.id, day, ref: info.refs.join("; "), title: info.title, body: note.trim() }).catch(() => {});
    if (day < plan.days.length) router.replace(`/plans/day?slug=${plan.slug}&d=${day + 1}` as any);
    else { Alert.alert(t("Plan complete!"), t("You finished {plan}. Well done.", { plan: plan.title })); router.back(); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={plan.title} right={<IconButton name={reader.playing ? "pause" : "headphones"} label={t("Listen")} onPress={() => (reader.playing ? reader.stop() : reader.play(audioList, 0, voiceFor(tr), settings.speechRate || 1))} bg={reader.playing ? C.flame : undefined} color={reader.playing ? "#fff" : C.ink} />} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Label>{t("Day {d} of {n}", { d: day, n: plan.days.length })}</Label>
        <Text style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 33, color: C.ink, marginTop: 6 }}>{info.title}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {info.refs.map((r) => <View key={r} style={{ paddingHorizontal: 9, height: 26, borderRadius: 7, justifyContent: "center", backgroundColor: plan.color + "22" }}><Body size={12.5} weight="semi" color={C.ink}>{r}</Body></View>)}
        </View>

        {info.devotion ? (
          <View style={{ marginTop: 18, padding: 16, borderRadius: 14, backgroundColor: reader.current === -1 ? "rgba(255,90,31,0.1)" : "#fff" }}>
            <Label style={{ marginBottom: 8 }}>{t("Devotion")}</Label>
            <Body style={{ fontFamily: F.serif, fontSize: 19, lineHeight: 28 }}>{info.devotion}</Body>
          </View>
        ) : null}

        {!blocks ? <ActivityIndicator color={C.flame} style={{ marginTop: 30 }} /> : blocks.map((bl, i) => (
          <View key={bl.ref} style={{ marginTop: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Body weight="semi" size={17} style={{ flex: 1 }}>{bl.label}</Body>
              <Press onPress={() => router.push(`/bible/read?b=${bl.b}&c=${bl.c}&v=${bl.v || 1}&tr=${tr}` as any)} hitSlop={8} label={t("Open in Bible")}>
                <Body size={13.5} weight="semi" color={C.flame}>{t("Open in Bible")}</Body>
              </Press>
            </View>
            {bl.error ? <Body color={C.muted}>{t("Connect to the internet to load this passage.")}</Body> : (
              <Text style={{ fontFamily: F.serif, fontSize: settings.readerSize || 19, lineHeight: Math.round((settings.readerSize || 19) * 1.55), color: C.ink, textAlign: T.rtl ? "right" : "left" }}>
                {bl.verses.map((v) => (
                  <Text key={v.verse} style={{ backgroundColor: reader.current === (i + 1) * 1000 + v.verse ? "rgba(255,90,31,0.16)" : "transparent" }}>
                    <Text style={{ fontFamily: F.sansSemi, fontSize: 11, color: "rgba(15,11,18,0.42)" }}>{v.verse} </Text>{v.text}{" "}
                  </Text>
                ))}
              </Text>
            )}
          </View>
        ))}

        <View style={{ marginTop: 28, backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="edit-3" size={16} color="#16A37B" />
            <Label color="#16A37B">{t("Journal · only you can see this")}</Label>
          </View>
          {info.prompt ? <Body weight="semi">{info.prompt}</Body> : null}
          <TextInput value={note} onChangeText={(x) => { setNote(x); setSaved(false); }} multiline placeholder={t("Write a thought or a prayer…")} placeholderTextColor="rgba(15,11,18,0.4)"
            style={{ minHeight: 110, borderRadius: 12, backgroundColor: "rgba(15,11,18,0.04)", padding: 12, fontFamily: F.sans, fontSize: 15.5, color: C.ink, textAlignVertical: "top" }} />
          {note.trim() && note !== existing?.body ? (
            <Button small variant="tonal" label={saved ? t("Saved") : t("Save to journal")} onPress={async () => { await journal.save({ id: existing?.id, plan_id: plan.id, day, ref: info.refs.join("; "), title: info.title, body: note.trim() }).catch((e) => Alert.alert(e.message)); setSaved(true); }} />
          ) : null}
        </View>

        <Button label={isDone ? (day < plan.days.length ? t("Next day") : t("Done")) : t("Mark day {d} complete", { d: day })} variant={isDone ? "ink" : "flame"} block onPress={complete} style={{ marginTop: 20 }} />
        {isDone ? <Body center size={13} color="#16A37B" style={{ marginTop: 8 }}>✓ {t("You read this day")}</Body> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
