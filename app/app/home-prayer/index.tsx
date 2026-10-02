import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Badge, Body, Button, Chip, Empty, Icon, Label, Press } from "@/components/ui";
import { useHomeMeetings } from "@/lib/more";
import { useStore } from "@/lib/store";
import { KIND_COLOR, kindLabel } from "@/lib/labels";
import { dateLabel, t, timeLabel } from "@/lib/i18n";


export default function HomePrayer() {
  const insets = useSafeAreaInsets();
  const { list } = useHomeMeetings();
  const { needsAccount } = useStore();
  const [kind, setKind] = useState<string | null>(null);
  const shown = list.filter((m) => !kind || m.kind === kind);
  const mine = shown.filter((m) => m.isHost || m.joined);
  const others = shown.filter((m) => !m.isHost && !m.joined);

  const Card = ({ m }: { m: (typeof list)[number] }) => {
    const d = new Date(m.starts_at);
    const full = m.capacity ? m.going >= m.capacity : false;
    return (
      <Press onPress={() => router.push(`/home-prayer/${m.id}` as any)} scaleTo={0.985} style={{ flexDirection: "row", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 14 }}>
        <View style={{ width: 56, alignItems: "center", paddingTop: 2 }}>
          <Label color={KIND_COLOR[m.kind] || C.flame}>{dateLabel(d, { weekday: "short" })}</Label>
          <Body style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 30 }}>{d.getDate()}</Body>
          <Body size={12} color={C.muted}>{timeLabel(d)}</Body>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Body weight="semi" size={16}>{m.title}</Body>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="map-pin" size={13} color={C.muted} />
            <Body size={13.5} color={C.muted} numberOfLines={1} style={{ flex: 1 }}>{m.area}</Body>
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <Badge label={kindLabel(m.kind)} color={KIND_COLOR[m.kind] || C.flame} />
            {m.repeats ? <Badge label={t("Weekly")} color={C.ink} /> : null}
            {m.isHost ? <Badge label={t("You're hosting")} color="#16A37B" /> : m.joined ? <Badge label={t("Going")} color="#16A37B" /> : full ? <Badge label={t("Full")} color={C.muted} /> : null}
            <Body size={12.5} color={C.muted}>{t("{n} going", { n: m.going })}{m.capacity ? ` / ${m.capacity}` : ""}</Body>
          </View>
        </View>
      </Press>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Home prayer meetings")} right={<Button small label={t("Host")} icon="plus" onPress={() => { if (!needsAccount(t("host a prayer meeting"))) router.push("/home-prayer/host" as any); }} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
        <Chip label={t("All")} active={!kind} onPress={() => setKind(null)} />
        {Object.keys(KIND_COLOR).map((k) => <Chip key={k} label={kindLabel(k)} active={kind === k} onPress={() => setKind(k)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}>
        <Body size={13.5} color={C.muted}>{t("Members open their homes to pray, study and worship together. The exact address is shared after you RSVP.")}</Body>
        {mine.length ? <Label style={{ marginTop: 8 }}>{t("Your meetings")}</Label> : null}
        {mine.map((m) => <Card key={m.id} m={m} />)}
        {others.length ? <Label style={{ marginTop: 8 }}>{t("Near you this week")}</Label> : null}
        {others.map((m) => <Card key={m.id} m={m} />)}
        {!shown.length ? <Empty icon="home" title={t("No meetings yet")} sub={t("Host one in your home — it takes a minute.")} /> : null}
      </ScrollView>
    </View>
  );
}
