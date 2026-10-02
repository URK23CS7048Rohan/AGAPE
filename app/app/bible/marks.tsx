import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { C, F } from "@/theme";
import { BackHeader, Body, Empty, Icon, Press, Segmented } from "@/components/ui";
import { book, translation, useBookNames } from "@/lib/bible";
import { useMarks } from "@/lib/more";
import { useStore } from "@/lib/store";
import { langInfo, t } from "@/lib/i18n";

export default function Marks() {
  const { marks } = useMarks();
  const { settings } = useStore();
  const names = useBookNames(settings.bible || langInfo().bible);
  const [tab, setTab] = useState(0);
  const kind = (["highlight", "bookmark", "note"] as const)[tab];
  const list = marks.filter((m) => m.kind === kind).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Saved in the Bible")} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Segmented items={[t("Highlights"), t("Bookmarks"), t("Notes")]} value={tab} onChange={setTab} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}>
        {!list.length ? <Empty icon={kind === "highlight" ? "edit-2" : kind === "bookmark" ? "bookmark" : "edit-3"} title={t("Nothing saved yet")} sub={t("Tap any verse while reading to highlight it, bookmark it or add a note.")} /> : null}
        {list.map((m) => (
          <Press key={`${m.kind}${m.book}.${m.chapter}.${m.verse}`} scaleTo={0.985} onPress={() => router.push(`/bible/read?b=${m.book}&c=${m.chapter}&v=${m.verse}${m.translation ? `&tr=${m.translation}` : ""}` as any)}
            style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 6, borderLeftWidth: 4, borderLeftColor: m.color || (kind === "note" ? C.violet : C.flame) }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Body weight="semi" style={{ flex: 1 }}>{names[m.book] || book(m.book).name} {m.chapter}:{m.verse}</Body>
              {m.translation ? <Body size={12} color={C.muted}>{translation(m.translation).short}</Body> : null}
              <Icon name="chevron-right" size={16} color="rgba(15,11,18,0.3)" />
            </View>
            {m.verse_text ? <Body numberOfLines={3} style={{ fontFamily: F.serif, fontSize: 16.5, lineHeight: 23 }}>{m.verse_text}</Body> : null}
            {m.note ? <Body size={14} color={C.violet}>{m.note}</Body> : null}
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}
