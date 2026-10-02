import React, { useState } from "react";
import { Alert, FlatList, TextInput, View } from "react-native";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { Async, Avatar, BackHeader, Body, Empty, Icon, Label, Press } from "@/components/ui";
import { useQuery } from "@/lib/query";
import { searchMembers, startDirect } from "@/lib/api";
import { t } from "@/lib/i18n";

/** Pick a member to message. */
export default function NewChat() {
  const [q, setQ] = useState("");
  const people = useQuery(`members:${q.trim().toLowerCase()}`, () => searchMembers(q), 60_000);
  const [busy, setBusy] = useState<string | null>(null);

  const open = async (id: string) => {
    setBusy(id);
    try { const conv = await startDirect(id); router.replace(`/chat/${conv}`); }
    catch (e: any) { Alert.alert(t("Couldn't start the chat"), e.message); }
    finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={t("New message")} />
      <View style={{ marginHorizontal: 16, marginBottom: 10, height: 52, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder={t("Search members by name")} placeholderTextColor="rgba(20,20,20,0.4)" style={{ flex: 1, color: C.ink, fontFamily: F.sans, fontSize: 15 }} />
      </View>
      <Async q={people} empty={(d) => (d.length ? null : <Empty icon="users" title={t("No one found")} body={t("Try another name.")} />)}>
        {(list) => (
          <FlatList
            data={list}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line, paddingVertical: 4 }}
            renderItem={({ item: p, index }) => (
              <Press onPress={() => open(p.id)} disabled={!!busy} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderColor: C.line, opacity: busy && busy !== p.id ? 0.5 : 1 }}>
                <Avatar name={p.full_name || "?"} color={C.violet} size={42} />
                <View style={{ flex: 1 }}>
                  <Body weight="semi">{p.full_name || t("Member")}</Body>
                  {p.role !== "member" ? <Label>{p.role === "volunteer" ? t("Volunteer") : t("Church staff")}</Label> : null}
                </View>
                <Icon name="message-circle" size={18} color={C.muted} />
              </Press>
            )}
          />
        )}
      </Async>
    </View>
  );
}
