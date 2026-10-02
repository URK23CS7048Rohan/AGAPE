import React from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { Async, BackHeader, Body, Empty, Icon, IconButton, Label, Press } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { listSets, saveSet } from "@/lib/life";

export default function Sets() {
  const { signedIn, profile } = useAuth();
  const needs = useNeedsAccount();
  const q = useQuery(signedIn ? "sets" : null, listSets);
  const create = async () => {
    if (needs("make a set list")) return;
    try { const id = await saveSet({ title: "Sunday set", items: [], service_date: new Date().toLocaleDateString("en-CA") }); router.push(`/songs/set/${id}`); } catch (e: any) { Alert.alert("", e.message); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Set lists" right={<IconButton name="plus" bg={C.ink} color="#fff" onPress={create} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
        {!signedIn ? <Empty icon="list" title="Set lists" body="Sign in to plan a worship set: songs in order, each in the key you'll play it." action="Sign in" onAction={() => router.push("/auth")} /> : (
          <Async q={q} empty={(d) => (d.length ? null : <Empty icon="list" title="No set lists yet" body="Plan Sunday's songs in order, each in the key you'll play it. Worship-team sets shared by staff appear here too." action="New set list" onAction={create} />)}>
            {(list) => list.map((s) => (
              <Press key={s.id} onPress={() => router.push(`/songs/set/${s.id}`)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: s.shared ? C.violet : C.sun, alignItems: "center", justifyContent: "center" }}><Icon name={s.shared ? "users" : "list"} size={20} /></View>
                <View style={{ flex: 1 }}>
                  <Body weight="bold">{s.title}</Body>
                  <Label>{[s.service_date ? new Date(s.service_date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : null, `${s.items.length} song${s.items.length === 1 ? "" : "s"}`, s.shared ? "Worship team" : s.owner_id === profile?.id ? "Mine" : null].filter(Boolean).join(" · ")}</Label>
                </View>
                <Icon name="chevron-right" size={18} color={C.muted} />
              </Press>
            ))}
          </Async>
        )}
      </ScrollView>
    </View>
  );
}
