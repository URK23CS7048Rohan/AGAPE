import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";
import { BackHeader, Badge, Body, Button, Chip, Empty, Group, Icon, ListRow, Segmented, SearchField } from "@/components/ui";
import { useSetLists, useSongs } from "@/lib/more";
import { lyricsOnly } from "@/lib/chords";
import { dateLabel, t } from "@/lib/i18n";

const TAGS = ["all", "hymn", "praise", "worship", "prayer", "communion", "christmas", "kids"];

export default function SongBook() {
  const insets = useSafeAreaInsets();
  const songs = useSongs().data;
  const { lists } = useSetLists();
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const firstLine = useMemo(() => Object.fromEntries(songs.map((s) => [s.slug, lyricsOnly(s.body).split("\n").find((l) => l.trim() && !/^(Verse|Chorus|Refrain|Doxology|Bridge)/i.test(l.trim())) || ""])), [songs]);
  const list = songs.filter((s) => (tag === "all" || s.tags.includes(tag)) && (!q || `${s.title} ${s.author} ${s.body}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Song book")} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Segmented items={[t("Songs"), t("Set lists")]} value={tab} onChange={setTab} />
      </View>
      {tab === 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          <View style={{ paddingHorizontal: 16 }}><SearchField value={q} onChangeText={setQ} placeholder={t("Search titles and lyrics")} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
            {TAGS.map((x) => <Chip key={x} label={x === "all" ? t("All") : t(x[0].toUpperCase() + x.slice(1))} active={tag === x} onPress={() => setTag(x)} />)}
          </ScrollView>
          <Group style={{ marginHorizontal: 16 }}>
            {list.map((s, i) => (
              <ListRow key={s.slug} last={i === list.length - 1} title={s.title} sub={firstLine[s.slug] || s.author}
                right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Badge label={s.key} color={C.violet} /><Icon name="chevron-right" size={16} color="rgba(15,11,18,0.3)" /></View>}
                onPress={() => router.push(`/songs/${s.slug}` as any)} />
            ))}
          </Group>
          {!list.length ? <Empty icon="music" title={t("No songs found")} /> : null}
          <Body size={12} color={C.muted} center style={{ marginTop: 16, paddingHorizontal: 30 }}>{t("Hymns here are public domain. The worship team adds the church's songs from the admin.")}</Body>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
          <Button label={t("New set list")} icon="plus" block onPress={() => router.push("/songs/set/new" as any)} />
          {!lists.length ? <Empty icon="list" title={t("No set lists yet")} sub={t("Put songs in order for Sunday, choose a key for each, and play through them.")} /> : null}
          <Group>
            {lists.map((l, i) => (
              <ListRow key={l.id} last={i === lists.length - 1} icon={l.shared ? "users" : "list"} color={l.shared ? C.flame : C.violet} title={l.title}
                sub={`${l.items.length} ${t("songs")}${l.service_date ? ` · ${dateLabel(new Date(l.service_date + "T00:00:00"))}` : ""}${l.shared ? ` · ${t("Worship team")}` : ""}`}
                onPress={() => router.push(`/songs/set/${l.id}` as any)} />
            ))}
          </Group>
        </ScrollView>
      )}
    </View>
  );
}
