import React, { useState } from "react";
import { Alert, Modal, RefreshControl, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { C, F, R } from "@/theme";
import { Async, BackHeader, Body, Button, Chip, Display, Empty, Icon, IconButton, Label, Press } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { listTestimonies, sayAmen, shareTestimony } from "@/lib/life";
import { ago } from "@/lib/time";
import { t as tr } from "@/lib/i18n";

const CATS = ["answered prayer", "healing", "provision", "salvation", "family", "work & studies", "other"];
const COLORS = [C.sunSoft, C.roseSoft, C.mintSoft, C.lilac, C.skySoft, C.peach];

export default function Testimonies() {
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const q = useQuery("testimonies", listTestimonies);
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", body: "", category: CATS[0], anonymous: false });
  const list = (q.data ?? []).filter((t) => cat === "all" || t.category === cat);
  const submit = async () => {
    if (f.title.trim().length < 2 || f.body.trim().length < 10) { Alert.alert(tr("A little more"), tr("Add a short title and a few sentences about what God did.")); return; }
    try { await shareTestimony({ ...f, title: f.title.trim(), body: f.body.trim() }); setOpen(false); setF({ title: "", body: "", category: CATS[0], anonymous: false }); Alert.alert(tr("Thank you!"), tr("A pastor will read your testimony, and it will appear here once it's approved.")); } catch (e: any) { Alert.alert(tr("Couldn't send"), e.message); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Testimonies")} right={<IconButton name="plus" bg={C.ink} color="#fff" onPress={() => (needs("share a testimony") ? null : setOpen(true))} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
        <View style={{ backgroundColor: C.sun, borderRadius: R.xl, padding: 18 }}>
          <Display size={28}>{tr("God is still moving")}</Display>
          <Body size={14} style={{ marginTop: 4 }}>{tr("Stories from our church family. Read one, say Amen, and share your own.")}</Body>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["all", ...CATS].map((c) => <Chip key={c} label={c === "all" ? tr("All") : tr(c[0].toUpperCase() + c.slice(1))} active={cat === c} onPress={() => setCat(c)} />)}
        </ScrollView>
        <Async q={q} empty={(d) => (d.length ? null : <Empty icon="star" title={tr("No testimonies yet")} body={tr("Be the first to share what God has done. A pastor reads each one before it's shown.")} action={tr("Share yours")} onAction={() => (needs("share a testimony") ? null : setOpen(true))} />)}>
          {() => list.map((t, i) => (
            <Animated.View key={t.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)} style={{ backgroundColor: COLORS[i % COLORS.length], borderRadius: R.lg, padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Label color={C.ink} style={{ flex: 1, textTransform: "uppercase", letterSpacing: 1 }}>{t.category}</Label>
                {t.featured ? <Icon name="star" size={14} color={C.ink} /> : null}
              </View>
              <Body weight="bold" size={18} style={{ marginTop: 6 }}>{t.title}</Body>
              <Body style={{ marginTop: 6, lineHeight: 22 }}>{t.body}</Body>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <Label style={{ flex: 1 }}>{t.anonymous || !t.author_name ? tr("Anonymous") : t.author_name} · {ago(t.created_at)}</Label>
                <Press onPress={async () => { if (needs("say Amen")) return; try { await sayAmen(t.id); q.reload(); } catch (e: any) { Alert.alert("", e.message); } }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: t.amened ? C.ink : "#fff" }}>
                  <Icon name="hands-pray" size={15} color={t.amened ? "#fff" : C.ink} />
                  <Body size={13} weight="bold" color={t.amened ? "#fff" : C.ink}>{tr("Amen")}{t.amens ? ` · ${t.amens}` : ""}</Body>
                </Press>
              </View>
            </Animated.View>
          ))}
        </Async>
      </ScrollView>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: 50, padding: 18, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconButton name="x" border={C.line} onPress={() => setOpen(false)} />
            <Body weight="bold" size={17} style={{ flex: 1, textAlign: "center" }}>{tr("Share a testimony")}</Body>
            <View style={{ width: 44 }} />
          </View>
          <Body color={C.muted}>{tr("A pastor reads every testimony before it's shown to the church.")}</Body>
          <TextInput value={f.title} onChangeText={(t) => setF({ ...f, title: t })} placeholder={tr("Title, e.g. “God provided a job”")} placeholderTextColor={C.muted} maxLength={120} style={inp} />
          <TextInput value={f.body} onChangeText={(t) => setF({ ...f, body: t })} placeholder={tr("What happened? What did God do?")} placeholderTextColor={C.muted} multiline maxLength={6000} style={[inp, { minHeight: 180, textAlignVertical: "top", paddingTop: 12 }]} />
          <Label>{tr("Category")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{CATS.map((c) => <Chip key={c} label={tr(c[0].toUpperCase() + c.slice(1))} active={f.category === c} onPress={() => setF({ ...f, category: c })} />)}</View>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
            <Body style={{ flex: 1 }}>{tr("Share anonymously")}</Body>
            <Switch value={f.anonymous} onValueChange={(v) => setF({ ...f, anonymous: v })} />
          </View>
          <Button label={tr("Send to a pastor")} variant="ink" block trail="send" onPress={submit} />
        </ScrollView>
      </Modal>
    </View>
  );
}
const inp = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, height: 52, fontFamily: F.sans, fontSize: 15.5, color: C.ink } as const;
