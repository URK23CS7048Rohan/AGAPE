import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Body, Button, Empty, IconButton, Label, Press, SearchField } from "@/components/ui";
import { Entry, useJournal, usePlans } from "@/lib/more";
import { dateLabel, t } from "@/lib/i18n";

export default function Journal() {
  const insets = useSafeAreaInsets();
  const { entries, save, remove } = useJournal();
  const plans = usePlans().data;
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Entry> | null>(null);
  const list = entries.filter((e) => !q || (e.body + " " + (e.title || "") + " " + (e.ref || "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Journal")} right={<IconButton name="plus" label={t("New entry")} onPress={() => setEdit({ body: "" })} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}>
        <Body size={13.5} color={C.muted} style={{ marginBottom: 4 }}>{t("Private notes, prayers and reflections. Only you can see them.")}</Body>
        {entries.length > 4 ? <SearchField value={q} onChangeText={setQ} placeholder={t("Search your journal")} /> : null}
        {!list.length ? <Empty icon="edit-3" title={t("Nothing here yet")} sub={t("Write after a reading plan day, or start a new entry with +.")} /> : null}
        {list.map((e) => {
          const plan = plans.find((p) => p.id === e.plan_id);
          return (
            <Press key={e.id} onPress={() => setEdit(e)} scaleTo={0.985} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 6 }}>
              <Label>{dateLabel(new Date(e.updated_at), { day: "numeric", month: "short", year: "numeric" })}{plan ? ` · ${plan.title} · ${t("Day {d}", { d: e.day || 1 })}` : ""}</Label>
              {e.title ? <Body weight="semi">{e.title}</Body> : null}
              <Body color={C.ink} numberOfLines={4} style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 24 }}>{e.body}</Body>
              {e.ref ? <Body size={12.5} color={C.flame} weight="semi">{e.ref}</Body> : null}
            </Press>
          );
        })}
      </ScrollView>

      <Modal visible={!!edit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEdit(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper, padding: 16, gap: 12 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Press onPress={() => setEdit(null)}><Body color={C.muted}>{t("Cancel")}</Body></Press>
            <Body weight="semi" center style={{ flex: 1 }}>{edit?.id ? t("Edit entry") : t("New entry")}</Body>
            <Press onPress={async () => { if (!edit?.body?.trim()) return setEdit(null); await save({ ...edit, body: edit.body.trim() } as any).catch((x) => Alert.alert(x.message)); setEdit(null); }}>
              <Body weight="semi" color={C.flame}>{t("Save")}</Body>
            </Press>
          </View>
          <TextInput value={edit?.title || ""} onChangeText={(x) => setEdit((e) => ({ ...e, title: x }))} placeholder={t("Title (optional)")} placeholderTextColor="rgba(15,11,18,0.35)" style={{ fontFamily: F.sansSemi, fontSize: 20, color: C.ink, paddingVertical: 8 }} />
          <TextInput value={edit?.body || ""} onChangeText={(x) => setEdit((e) => ({ ...e, body: x }))} multiline autoFocus placeholder={t("Write a thought or a prayer…")} placeholderTextColor="rgba(15,11,18,0.35)" style={{ flex: 1, fontFamily: F.serif, fontSize: 19, lineHeight: 27, color: C.ink, textAlignVertical: "top" }} />
          {edit?.id ? <Button label={t("Delete entry")} variant="tonal" onPress={() => Alert.alert(t("Delete this entry?"), "", [{ text: t("Cancel"), style: "cancel" }, { text: t("Delete"), style: "destructive", onPress: () => { remove(edit.id!); setEdit(null); } }])} /> : null}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
