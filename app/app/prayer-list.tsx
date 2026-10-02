import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { Async, BackHeader, Body, Button, Empty, Icon, Label, Press, Segmented, Starburst } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { addPrayerItem, answerPrayerItem, deletePrayerItem, listPrayerItems } from "@/lib/life";
import { t as tr } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

export default function PrayerList() {
  const { signedIn } = useAuth();
  const q = useQuery(signedIn ? "prayeritems" : null, listPrayerItems);
  const [t, setT] = useState(0);
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("");
  const list = (q.data ?? []).filter((p) => (t === 0 ? !p.answered_at : !!p.answered_at));
  const answered = (q.data ?? []).filter((p) => p.answered_at).length;
  const add = async () => {
    if (!title.trim()) return;
    try { await addPrayerItem({ title: title.trim(), person: person.trim() || undefined }); setTitle(""); setPerson(""); q.reload(); } catch (e: any) { Alert.alert(tr("Couldn't add"), e.message); }
  };
  if (!signedIn) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title={tr("My prayer list")} /><Empty icon="hands-pray" title={tr("Keep a prayer list")} body={tr("Sign in to keep a private list of the people and things you're praying for, and mark them answered.")} action={tr("Sign in")} onAction={() => router.push("/auth")} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("My prayer list")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.rose, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -14, top: -14 }}><Starburst size={104} color={C.sun} spikes={10} depth={0.6} spin><Body weight="bold" size={22}>{answered}</Body></Starburst></View>
          <Body weight="bold" size={22} style={{ maxWidth: "70%" }}>{tr("Pray. Then watch.")}</Body>
          <Body size={13.5} style={{ marginTop: 4, maxWidth: "70%" }}>{tr("A private list only you can see.")} {answered ? `${answered} answered so far.` : tr("Mark prayers answered as God moves.")}</Body>
        </View>
        <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 12, borderWidth: 1.5, borderColor: C.line, gap: 8 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder={tr("What are you praying for?")} placeholderTextColor={C.muted} style={{ fontFamily: F.sans, fontSize: 16, color: C.ink, paddingHorizontal: 4, paddingVertical: 8 }} />
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput value={person} onChangeText={setPerson} placeholder={tr("For who? (optional)")} placeholderTextColor={C.muted} style={{ flex: 1, fontFamily: F.sans, fontSize: 14, color: C.ink, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, height: 42 }} />
            <Button label={tr("Add")} small variant="ink" trail="plus" onPress={add} disabled={!title.trim()} />
          </View>
        </View>
        <Segmented items={[tr("Praying"), tr("Answered")]} value={t} onChange={setT} />
        <Async q={q} empty={() => null}>
          {() => (list.length ? list.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 8) * 35)} layout={LinearTransition}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
                <Press onPress={() => answerPrayerItem(p.id, !p.answered_at).then(q.reload)} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: p.answered_at ? C.mint : C.line, backgroundColor: p.answered_at ? C.mint : "#fff", alignItems: "center", justifyContent: "center" }}>
                  {p.answered_at ? <Icon name="check" size={16} color="#fff" /> : null}
                </Press>
                <View style={{ flex: 1 }}>
                  <Body weight="semi">{p.title}</Body>
                  <Label>{[p.person, p.answered_at ? tr("Answered {d}", { d: dateLabel(new Date(p.answered_at)) }) : tr("Since {d}", { d: dateLabel(new Date(p.created_at)) })].filter(Boolean).join(" · ")}</Label>
                </View>
                <Press hitSlop={8} onPress={() => Alert.alert(tr("Remove from your list?"), "", [{ text: tr("Cancel"), style: "cancel" }, { text: tr("Remove"), style: "destructive", onPress: () => deletePrayerItem(p.id).then(q.reload) }])}><Icon name="trash-2" size={16} color={C.muted} /></Press>
              </View>
            </Animated.View>
          )) : <Empty icon="hands-pray" title={t === 0 ? tr("Your list is empty") : tr("No answered prayers yet")} body={t === 0 ? tr("Add someone or something you're praying for.") : tr("Tap the circle next to a prayer when God answers it.")} />)}
        </Async>
      </ScrollView>
    </View>
  );
}
