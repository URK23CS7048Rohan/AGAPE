import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { BackHeader, Body, Empty, Icon, Label, Press, Segmented } from "@/components/ui";
import { book } from "@/lib/bible";
import { MarkKind, useMarks } from "@/lib/scripture";

const KINDS: MarkKind[] = ["highlight", "bookmark", "note"];

export default function Marks() {
  const marks = useMarks();
  const [t, setT] = useState(0);
  const list = marks.all().filter((m) => m.kind === KINDS[t]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="My highlights" />
      <View style={{ marginHorizontal: 16, marginTop: 6 }}>
        <Segmented items={["Highlights", "Saved", "Notes"]} value={t} onChange={setT} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }}>
        {!list.length ? (
          <Empty icon="bookmark" title={["No highlights yet", "Nothing saved yet", "No notes yet"][t]} body="In the Bible, tap a verse to highlight it, save it or write a note." action="Open the Bible" onAction={() => router.push("/bible/read")} />
        ) : list.map((m, i) => (
          <Animated.View key={`${m.kind}${m.book}.${m.chapter}.${m.verse}`} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
            <Press onPress={() => router.push({ pathname: "/bible/read", params: { b: String(m.book), c: String(m.chapter), v: String(m.verse) } })} scaleTo={0.98}
              style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line, borderLeftWidth: 6, borderLeftColor: m.color || (m.kind === "note" ? C.violet : C.flame) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Body weight="bold" style={{ flex: 1 }}>{book(m.book).name} {m.chapter}:{m.verse}</Body>
                {m.translation ? <Label size={11}>{m.translation}</Label> : null}
                <Press hitSlop={8} onPress={() => Alert.alert("Remove?", "", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => marks.remove(m.kind, m.book, m.chapter, m.verse) }])}>
                  <Icon name="trash-2" size={16} color={C.muted} />
                </Press>
              </View>
              {m.verse_text ? <Body size={15} style={{ marginTop: 6 }} numberOfLines={4}>{m.verse_text}</Body> : null}
              {m.note ? <Body size={14} color={C.violet} style={{ marginTop: 8 }}>✎ {m.note}</Body> : null}
            </Press>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
