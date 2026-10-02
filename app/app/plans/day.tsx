import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Display, Icon, Label, Press } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { getChapter, parseRef } from "@/lib/bible";
import { useReaderPrefs } from "@/lib/scripture";
import { getPlan, myProgress, saveEntry, setDayDone, startPlan } from "@/lib/life";
import { t } from "@/lib/i18n";

/** One reference's text, e.g. "John 3" or "Psalm 51:10-12". */
function Passage({ refText, tr }: { refText: string; tr: string }) {
  const [verses, setVerses] = useState<{ verse: number; text: string }[] | null>(null);
  const [err, setErr] = useState(false);
  const r = parseRef(refText);
  useEffect(() => {
    if (!r) return;
    getChapter(tr, r.book, r.chapter).then((v) => setVerses(v.filter((x) => !r.from || (x.verse >= r.from && x.verse <= (r.to || r.from))))).catch(() => setErr(true));
  }, [refText, tr]);
  return (
    <View style={{ marginTop: 18 }}>
      <Press onPress={() => r && router.push({ pathname: "/bible/read", params: { b: String(r.book), c: String(r.chapter), ...(r.from ? { v: String(r.from) } : {}) } })} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Label color={C.flame} style={{ letterSpacing: 1, textTransform: "uppercase" }}>{refText}</Label>
        <Icon name="external-link" size={12} color={C.flame} />
      </Press>
      {err ? <Body color={C.muted} style={{ marginTop: 6 }}>{t("This passage needs the internet the first time. Tap the reference to open it in the Bible.")}</Body> : null}
      {verses ? (
        <Text style={{ fontFamily: F.serif, fontSize: 18.5, lineHeight: 29, color: C.ink, marginTop: 6 }}>
          {verses.map((v) => <Text key={v.verse}><Text style={{ fontFamily: F.sansSemi, fontSize: 11, color: C.muted }}>{v.verse} </Text>{v.text} </Text>)}
        </Text>
      ) : !err ? <Label style={{ marginTop: 6 }}>{t("Loading…")}</Label> : null}
    </View>
  );
}

export default function PlanDay() {
  const { slug, day } = useLocalSearchParams<{ slug: string; day: string }>();
  const n = Number(day) || 1;
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const [prefs] = useReaderPrefs();
  const q = useQuery(`plans:one:${slug}`, () => getPlan(slug!));
  const prog = useQuery(signedIn ? "plans:progress" : null, myProgress);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = q.data;
  if (!p) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader /></View>;
  const d = p.days[n - 1];
  const done = prog.data?.[p.id]?.done ?? [];
  const isDone = done.includes(n);

  const finish = async () => {
    if (needs("track your reading")) return;
    setBusy(true);
    try {
      if (!prog.data?.[p.id]) await startPlan(p.id);
      if (note.trim()) await saveEntry({ plan_id: p.id, day: n, ref: d.refs.join(", "), title: `${p.title} · Day ${n}`, body: note.trim() });
      await setDayDone(p.id, n, !isDone, done);
      await prog.reload();
      setNote("");
      if (!isDone && n < p.days.length) router.replace({ pathname: "/plans/day", params: { slug: p.slug, day: String(n + 1) } });
      else if (!isDone) Alert.alert(t("Plan complete"), t("Well done! You finished every day of this plan."));
    } catch (e: any) { Alert.alert(t("Couldn't save"), e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FFFCF5" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={`Day ${n} of ${p.days.length}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Label>{p.title}</Label>
        <Display size={30} style={{ marginTop: 4 }}>{d?.title}</Display>
        {d?.refs.map((r) => <Passage key={r} refText={r} tr={prefs.tr} />)}
        {d?.devotion ? (
          <View style={{ marginTop: 24, backgroundColor: C.sunSoft, borderRadius: R.lg, padding: 16 }}>
            <Label color={C.ink}>{t("Devotion")}</Label>
            <Body size={15.5} style={{ marginTop: 6, lineHeight: 24 }}>{d.devotion}</Body>
          </View>
        ) : null}
        {d?.prompt ? (
          <View style={{ marginTop: 12, backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line }}>
            <Label>{t("Reflect")}</Label>
            <Body weight="semi" size={16} style={{ marginTop: 6 }}>{d.prompt}</Body>
            <TextInput value={note} onChangeText={setNote} placeholder={t("Write in your journal (optional)")} placeholderTextColor={C.muted} multiline
              style={{ marginTop: 10, minHeight: 90, borderRadius: 14, backgroundColor: C.bg, padding: 12, fontFamily: F.sans, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
          </View>
        ) : null}
        <Button label={isDone ? t("Mark as not done") : n < p.days.length ? t("Done · next day") : t("Finish the plan")} variant={isDone ? "white" : "ink"} trail={isDone ? null : "check"} block onPress={finish} disabled={busy} style={{ marginTop: 18 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
          {n > 1 ? <Press onPress={() => router.replace({ pathname: "/plans/day", params: { slug: p.slug, day: String(n - 1) } })}><Body weight="semi" color={C.muted}>{t("← Day")} {n - 1}</Body></Press> : <View />}
          {n < p.days.length ? <Press onPress={() => router.replace({ pathname: "/plans/day", params: { slug: p.slug, day: String(n + 1) } })}><Body weight="semi" color={C.muted}>{t("Day")} {n + 1} →</Body></Press> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
