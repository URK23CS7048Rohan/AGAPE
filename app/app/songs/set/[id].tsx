import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Badge, Body, Button, Chip, Empty, Group, Icon, IconButton, ListRow, Press, SearchField } from "@/components/ui";
import { SetItem, useSetLists, useSongs } from "@/lib/more";
import { keyPlus } from "@/lib/chords";
import { t } from "@/lib/i18n";

const sunday = (w: number) => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + w * 7); return d.toISOString().slice(0, 10); };

export default function SetEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const songs = useSongs().data;
  const { lists, save, remove } = useSetLists();
  const existing = lists.find((l) => l.id === id);
  const [title, setTitle] = useState(existing?.title || t("Sunday set"));
  const [date, setDate] = useState<string | null>(existing?.service_date || sunday(0));
  const [items, setItems] = useState<SetItem[]>(existing?.items || []);
  const [picking, setPicking] = useState(id === "new");
  const [q, setQ] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id === "new" ? null : id);
  useEffect(() => { if (existing) { setTitle(existing.title); setDate(existing.service_date || null); setItems(existing.items); } }, [existing?.id]);
  const readOnly = !!existing && !existing.mine;
  const song = (slug: string) => songs.find((s) => s.slug === slug);

  const persist = async (next = items) => {
    if (readOnly) return;
    try { const nid = await save({ id: savedId || undefined, title: title.trim() || t("Sunday set"), service_date: date, items: next }); setSavedId(nid); }
    catch (e: any) { Alert.alert(t("Couldn't save"), e.message); }
  };
  useEffect(() => { if (savedId && !readOnly && existing) persist(); }, [date]);
  const update = (next: SetItem[]) => { setItems(next); persist(next); };
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); update(n); };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={readOnly ? title : t("Set list")} right={items.length ? <Button small label={t("Play")} icon="play" onPress={() => router.push(`/songs/${items[0].song}?set=${savedId}&i=0${items[0].key ? `&key=${encodeURIComponent(items[0].key)}` : ""}` as any)} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
        {!readOnly ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 10 }}>
            <TextInput value={title} onChangeText={setTitle} onBlur={() => persist()} placeholder={t("Name")} style={{ fontFamily: F.sansSemi, fontSize: 19, color: C.ink }} />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip label={t("This Sunday")} active={date === sunday(0)} onPress={() => { setDate(sunday(0)); }} />
              <Chip label={t("Next Sunday")} active={date === sunday(1)} onPress={() => { setDate(sunday(1)); }} />
              <Chip label={t("No date")} active={!date} onPress={() => setDate(null)} />
            </View>
          </View>
        ) : null}
        {!items.length ? <Empty icon="music" title={t("No songs yet")} sub={t("Add songs, then set the key for each one.")} /> : null}
        <Group>
          {items.map((it, i) => {
            const s = song(it.song);
            return (
              <ListRow key={`${it.song}${i}`} last={i === items.length - 1} title={`${i + 1}. ${s?.title || it.song}`} sub={s?.author}
                onPress={() => router.push(`/songs/${it.song}?set=${savedId}&i=${i}${it.key ? `&key=${encodeURIComponent(it.key)}` : ""}` as any)}
                right={readOnly ? <Badge label={it.key || s?.key || ""} color={C.violet} /> : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Press onPress={() => update(items.map((x, j) => (j === i ? { ...x, key: keyPlus(x.key || s?.key || "C", -1) } : x)))} hitSlop={6} label={t("Key down")}><Icon name="chevron-left" size={16} color={C.muted} /></Press>
                    <Badge label={it.key || s?.key || "C"} color={C.violet} />
                    <Press onPress={() => update(items.map((x, j) => (j === i ? { ...x, key: keyPlus(x.key || s?.key || "C", 1) } : x)))} hitSlop={6} label={t("Key up")}><Icon name="chevron-right" size={16} color={C.muted} /></Press>
                    {i > 0 ? <Press onPress={() => move(i, -1)} hitSlop={6} label={t("Move up")}><Icon name="arrow-up" size={16} color={C.muted} /></Press> : <View style={{ width: 16 }} />}
                    <Press onPress={() => update(items.filter((_, j) => j !== i))} hitSlop={6} label={t("Remove")}><Icon name="x" size={16} color={C.rose} /></Press>
                  </View>
                )} />
            );
          })}
        </Group>
        {!readOnly ? <Button label={t("Add songs")} icon="plus" variant="tonal" block onPress={() => setPicking(true)} /> : null}
        {!readOnly && savedId ? <Button label={t("Delete set list")} variant="outline" block onPress={() => Alert.alert(t("Delete this set list?"), "", [{ text: t("Cancel"), style: "cancel" }, { text: t("Delete"), style: "destructive", onPress: () => { remove(savedId); router.back(); } }])} /> : null}
      </ScrollView>

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, backgroundColor: C.paper, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 }}>
            <Body weight="semi" size={17} style={{ flex: 1 }}>{t("Add songs")}</Body>
            <Press onPress={() => setPicking(false)}><Body weight="semi" color={C.flame}>{t("Done")}</Body></Press>
          </View>
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}><SearchField value={q} onChangeText={setQ} placeholder={t("Search")} /></View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            <Group>
              {songs.filter((s) => !q || s.title.toLowerCase().includes(q.toLowerCase())).map((s, i, arr) => {
                const n = items.filter((x) => x.song === s.slug).length;
                return (
                  <ListRow key={s.slug} last={i === arr.length - 1} title={s.title} sub={s.author}
                    right={n ? <Icon name="check-circle" size={20} color="#16A37B" /> : <IconButton name="plus" size={32} label={t("Add")} onPress={() => update([...items, { song: s.slug, key: s.key }])} />}
                    onPress={() => update([...items, { song: s.slug, key: s.key }])} />
                );
              })}
            </Group>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
