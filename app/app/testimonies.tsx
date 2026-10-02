import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Avatar, BackHeader, Badge, Body, Button, Chip, Empty, Icon, Label, Press } from "@/components/ui";
import { Testimony, useTestimonies } from "@/lib/more";
import { useStore } from "@/lib/store";
import { colorFor, ago } from "@/lib/data";
import { t } from "@/lib/i18n";

const CATS = ["answered prayer", "healing", "provision", "salvation", "family", "work", "other"];
const cat = (c: string) => t(c[0].toUpperCase() + c.slice(1));

export default function Testimonies() {
  const insets = useSafeAreaInsets();
  const { list, share, amen } = useTestimonies();
  const { needsAccount } = useStore();
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<Testimony | null>(null);
  const [write, setWrite] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "answered prayer", anonymous: false });
  const [busy, setBusy] = useState(false);
  const shown = list.filter((x) => !filter || x.category === filter);

  const submit = async () => {
    if (form.title.trim().length < 2 || form.body.trim().length < 10) return Alert.alert(t("Tell us a little more"), t("Add a title and a few sentences."));
    setBusy(true);
    try {
      await share({ ...form, title: form.title.trim(), body: form.body.trim() });
      setWrite(false); setForm({ title: "", body: "", category: "answered prayer", anonymous: false });
      Alert.alert(t("Thank you for sharing"), t("A pastor will read it, and it will appear here once it's approved."));
    } catch (e: any) { Alert.alert(t("Couldn't send"), e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Testimonies")} right={<Button small label={t("Share yours")} onPress={() => { if (!needsAccount(t("share your testimony"))) setWrite(true); }} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
        <Chip label={t("All")} active={!filter} onPress={() => setFilter(null)} />
        {CATS.map((c) => <Chip key={c} label={cat(c)} active={filter === c} onPress={() => setFilter(c)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
        {!shown.length ? <Empty icon="sun" title={t("No stories here yet")} sub={t("Be the first to share what God has done.")} /> : null}
        {shown.map((x) => (
          <Press key={x.id} onPress={() => setOpen(x)} scaleTo={0.985} style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Badge label={cat(x.category)} color={colorFor(x.category)} />
              {x.featured ? <Badge label={t("Featured")} color={C.flame} /> : null}
              {x.pending ? <Badge label={t("Waiting for approval")} color={C.muted} /> : null}
            </View>
            <Body weight="semi" size={17}>{x.title}</Body>
            <Body numberOfLines={4} style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 24 }}>{x.body}</Body>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <Avatar name={x.author || "A"} color={colorFor(x.author || "a")} size={26} />
              <Body size={13} color={C.muted} style={{ flex: 1 }}>{x.anonymous ? t("Anonymous") : x.author || t("Member")} · {ago(x.created_at)}</Body>
              {!x.pending ? (
                <Press onPress={() => { if (!needsAccount(t("say Amen"))) amen(x.id); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 10, backgroundColor: x.amened ? "rgba(255,90,31,0.12)" : "rgba(15,11,18,0.05)" }}>
                  <Icon name="heart" size={14} color={x.amened ? C.flame : C.muted} />
                  <Body size={13} weight="semi" color={x.amened ? C.flame : C.ink}>{t("Amen")} · {x.amens}</Body>
                </Press>
              ) : null}
            </View>
          </Press>
        ))}
      </ScrollView>

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open ? (
          <View style={{ flex: 1, backgroundColor: C.paper }}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
              <Badge label={cat(open.category)} color={colorFor(open.category)} />
              <View style={{ flex: 1 }} />
              <Press onPress={() => Share.share({ message: `${open.title}\n\n${open.body}\n\n— ${t("A testimony from Agape International Ministries")}` }).catch(() => {})} style={{ padding: 8 }} label={t("Share")}><Icon name="share" size={20} /></Press>
              <Press onPress={() => setOpen(null)} style={{ padding: 8 }} label={t("Close")}><Icon name="x" size={22} /></Press>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 60 }}>
              <Body style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 34 }}>{open.title}</Body>
              <Label style={{ marginTop: 8 }}>{open.anonymous ? t("Anonymous") : open.author || t("Member")} · {ago(open.created_at)}</Label>
              <Body style={{ fontFamily: F.serif, fontSize: 19.5, lineHeight: 30, marginTop: 18 }}>{open.body}</Body>
              {!open.pending ? <Button label={open.amened ? t("You said Amen") : t("Amen")} icon="heart" variant={open.amened ? "tonal" : "flame"} block style={{ marginTop: 26 }} onPress={() => { if (!needsAccount(t("say Amen"))) { amen(open.id); setOpen({ ...open, amened: true, amens: open.amens + (open.amened ? 0 : 1) }); } }} /> : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>

      <Modal visible={write} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setWrite(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
            <Press onPress={() => setWrite(false)}><Body color={C.muted}>{t("Cancel")}</Body></Press>
            <Body weight="semi" center style={{ flex: 1 }}>{t("Your testimony")}</Body>
            <Press onPress={submit} disabled={busy}><Body weight="semi" color={C.flame}>{busy ? "…" : t("Send")}</Body></Press>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATS.map((c) => <Chip key={c} label={cat(c)} active={form.category === c} onPress={() => setForm({ ...form, category: c })} />)}
            </ScrollView>
            <TextInput value={form.title} onChangeText={(x) => setForm({ ...form, title: x })} placeholder={t("Title — e.g. “God provided a job”")} placeholderTextColor="rgba(15,11,18,0.35)" style={{ fontFamily: F.sansSemi, fontSize: 19, color: C.ink, paddingVertical: 6 }} />
            <TextInput value={form.body} onChangeText={(x) => setForm({ ...form, body: x })} multiline placeholder={t("What happened? What did God do?")} placeholderTextColor="rgba(15,11,18,0.35)" style={{ minHeight: 220, fontFamily: F.serif, fontSize: 18.5, lineHeight: 27, color: C.ink, textAlignVertical: "top" }} />
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14 }}>
              <Body style={{ flex: 1 }}>{t("Share without my name")}</Body>
              <Switch value={form.anonymous} onValueChange={(v: boolean) => setForm({ ...form, anonymous: v })} trackColor={{ true: C.flame }} />
            </View>
            <Body size={13} color={C.muted}>{t("A pastor reads every testimony before it's shown to the church.")}</Body>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
