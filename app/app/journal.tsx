import React, { useState } from "react";
import { Alert, Modal, RefreshControl, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { C, F, R } from "@/theme";
import { Async, BackHeader, Body, Button, Empty, Icon, IconButton, Label, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { deleteEntry, Entry, listJournal, saveEntry } from "@/lib/life";
import { router } from "expo-router";
import { t as tr } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

export default function Journal() {
  const { signedIn } = useAuth();
  const q = useQuery(signedIn ? "journal" : null, listJournal);
  const [edit, setEdit] = useState<Partial<Entry> | null>(null);
  const save = async () => {
    if (!edit?.body?.trim()) return;
    try { await saveEntry({ ...edit, body: edit.body.trim() }); setEdit(null); q.reload(); } catch (e: any) { Alert.alert(tr("Couldn't save"), e.message); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Journal")} right={signedIn ? <IconButton name="plus" bg={C.ink} color="#fff" onPress={() => setEdit({ title: "", body: "" })} /> : undefined} />
      {!signedIn ? <Empty icon="edit-3" title={tr("Your private journal")} body={tr("Sign in to write down what God is teaching you. Only you can see it.")} action={tr("Sign in")} onAction={() => router.push("/auth")} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
          <Async q={q} empty={(d) => (d.length ? null : <Empty icon="edit-3" title={tr("Nothing written yet")} body={tr("Tap + to write, or journal from a reading plan. Only you can see this.")} action={tr("New entry")} onAction={() => setEdit({ title: "", body: "" })} />)}>
            {(list) => list.map((e, i) => (
              <Animated.View key={e.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
                <Press onPress={() => setEdit(e)} scaleTo={0.98} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Label style={{ flex: 1 }}>{dateLabel(new Date(e.created_at), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Label>
                    {e.ref ? <Label color={C.flame}>{e.ref}</Label> : null}
                  </View>
                  {e.title ? <Body weight="bold" size={16} style={{ marginTop: 6 }}>{e.title}</Body> : null}
                  <Body style={{ marginTop: 4 }} numberOfLines={4} color={C.muted}>{e.body}</Body>
                </Press>
              </Animated.View>
            ))}
          </Async>
        </ScrollView>
      )}
      <Modal visible={!!edit} animationType="slide" onRequestClose={() => setEdit(null)}>
        <View style={{ flex: 1, backgroundColor: "#FFFCF5", paddingTop: 50, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <IconButton name="x" border={C.line} onPress={() => setEdit(null)} />
            <View style={{ flex: 1 }} />
            {edit?.id ? <IconButton name="trash-2" border={C.line} color={C.red} onPress={() => Alert.alert(tr("Delete this entry?"), "", [{ text: tr("Cancel"), style: "cancel" }, { text: tr("Delete"), style: "destructive", onPress: async () => { await deleteEntry(edit.id!); setEdit(null); q.reload(); } }])} /> : null}
            <Button label={tr("Save")} small variant="ink" trail="check" onPress={save} />
          </View>
          <TextInput value={edit?.title || ""} onChangeText={(t) => setEdit((x) => ({ ...x, title: t }))} placeholder={tr("Title")} placeholderTextColor={C.muted} style={{ marginTop: 20, fontFamily: F.displayBold, fontSize: 26, color: C.ink }} />
          {edit?.ref ? <Label color={C.flame} style={{ marginTop: 4 }}>{edit.ref}</Label> : null}
          <TextInput value={edit?.body || ""} onChangeText={(t) => setEdit((x) => ({ ...x, body: t }))} placeholder={tr("What is God saying to you today?")} placeholderTextColor={C.muted} multiline autoFocus={!edit?.id}
            style={{ flex: 1, marginTop: 12, fontFamily: F.serif, fontSize: 19, lineHeight: 28, color: C.ink, textAlignVertical: "top" }} />
        </View>
      </Modal>
    </View>
  );
}
