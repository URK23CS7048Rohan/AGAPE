import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, Switch, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Icon, IconButton, Label, Loading, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { deleteSet, listSets, saveSet, SetItem } from "@/lib/life";
import { listSongs } from "@/lib/scripture";
import { keyPlus } from "@/lib/chords";

export default function SetView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isStaff } = useAuth();
  const sets = useQuery("sets", listSets);
  const songs = useQuery("songs", listSongs);
  const set = sets.data?.find((s) => s.id === id);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<SetItem[]>([]);
  const [shared, setShared] = useState(false);
  const [pick, setPick] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (set) { setTitle(set.title); setItems(set.items); setShared(set.shared); setDirty(false); } }, [set?.id]);
  if (!set) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader />{sets.loading ? <Loading /> : null}</View>;
  const canEdit = set.owner_id === profile?.id || isStaff;
  const song = (slug: string) => songs.data?.find((s) => s.slug === slug);
  const change = (next: SetItem[]) => { setItems(next); setDirty(true); };
  const save = async () => { try { await saveSet({ id: set.id, title: title.trim() || "Set list", items, shared, service_date: set.service_date }); setDirty(false); sets.reload(); } catch (e: any) { Alert.alert("", e.message); } };
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); change(n); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Set list" right={canEdit ? <IconButton name="trash-2" border={C.line} color={C.red} onPress={() => Alert.alert("Delete this set list?", "", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteSet(set.id); router.back(); } }])} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }}>
        <TextInput value={title} editable={canEdit} onChangeText={(t) => { setTitle(t); setDirty(true); }} style={{ fontFamily: F.displayBold, fontSize: 28, color: C.ink }} />
        {items.map((it, i) => {
          const s = song(it.song);
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: R.lg, padding: 12, borderWidth: 1.5, borderColor: C.line }}>
              <Body weight="bold" color={C.muted} style={{ width: 22 }}>{i + 1}</Body>
              <Press style={{ flex: 1 }} onPress={() => router.push({ pathname: "/songs/[slug]", params: { slug: it.song, key: it.key || "" } })}>
                <Body weight="semi" numberOfLines={1}>{s?.title || it.song}</Body>
                <Label>Key {it.key || s?.original_key}</Label>
              </Press>
              {canEdit ? (
                <>
                  <IconButton name="minus" size={32} border={C.line} onPress={() => { const n = [...items]; n[i] = { ...it, key: keyPlus(it.key || s?.original_key || "C", -1) }; change(n); }} />
                  <IconButton name="plus" size={32} border={C.line} onPress={() => { const n = [...items]; n[i] = { ...it, key: keyPlus(it.key || s?.original_key || "C", 1) }; change(n); }} />
                  <IconButton name="arrow-up" size={32} border={C.line} onPress={() => i > 0 && move(i, -1)} />
                  <IconButton name="x" size={32} border={C.line} onPress={() => change(items.filter((_, k) => k !== i))} />
                </>
              ) : null}
            </View>
          );
        })}
        {canEdit ? <Button label="Add a song" variant="white" icon="plus" trail={null} block onPress={() => setPick(true)} /> : null}
        {isStaff ? (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
            <Body style={{ flex: 1 }}>Share with the whole church</Body><Switch value={shared} onValueChange={(v) => { setShared(v); setDirty(true); }} />
          </View>
        ) : null}
        {canEdit && dirty ? <Button label="Save set list" variant="ink" trail="check" block onPress={save} /> : null}
        {items.length ? <Button label="Start: play through the set" variant="sun" icon="play" block onPress={() => router.push({ pathname: "/songs/[slug]", params: { slug: items[0].song, key: items[0].key || "" } })} /> : null}
      </ScrollView>
      <Modal visible={pick} animationType="slide" onRequestClose={() => setPick(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 50 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}><Body weight="bold" size={18} style={{ flex: 1 }}>Add a song</Body><IconButton name="x" border={C.line} onPress={() => setPick(false)} /></View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
            {(songs.data ?? []).map((s) => (
              <Press key={s.id} onPress={() => { change([...items, { song: s.slug, key: s.original_key }]); setPick(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: C.line }}>
                <Body weight="bold" style={{ width: 34 }}>{s.original_key}</Body><Body style={{ flex: 1 }} numberOfLines={1}>{s.title}</Body><Icon name="plus" size={16} />
              </Press>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
