import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Bar, Body, Button, Chip, Empty, Group, Icon, Label, ListRow } from "@/components/ui";
import { useServeBoard } from "@/lib/more";
import { team, TEAM } from "@/lib/labels";
import { remindAt, cancelReminder } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { dateLabel, t, timeLabel } from "@/lib/i18n";

export default function Serve() {
  const insets = useSafeAreaInsets();
  const { list, signUp, cancel } = useServeBoard();
  const { needsAccount, isVolunteer } = useStore();
  const [f, setF] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const shown = list.filter((o) => !f || o.team === f);
  const mine = list.filter((o) => o.mine);

  const go = async (id: string, on: boolean) => {
    if (needsAccount(t("sign up to serve"))) return;
    const o = list.find((x) => x.id === id)!;
    setBusy(id);
    try {
      if (on) {
        await signUp(id);
        remindAt(`serve:${id}`, new Date(new Date(o.starts_at).getTime() - 2 * 3600e3), t("Serving today"), `${o.title} · ${timeLabel(new Date(o.starts_at))}`, "/serve");
      } else { await cancel(id); cancelReminder(`serve:${id}`); }
    } catch (e: any) { Alert.alert(t("Couldn't update"), e.message); }
    finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Serve")} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ paddingHorizontal: 16, gap: 6 }}>
          <Body style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 31 }}>{t("Find your place on the team")}</Body>
          <Body color={C.muted}>{t("Pick a shift. We'll remind you two hours before.")}</Body>
        </View>
        {mine.length ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: C.ink, borderRadius: 16, padding: 16, gap: 6 }}>
            <Label color={C.sun}>{t("You're serving")}</Label>
            {mine.map((o) => <Body key={o.id} color={C.cream}>• {o.title} — {dateLabel(new Date(o.starts_at))}, {timeLabel(new Date(o.starts_at))}</Body>)}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Chip label={t("All teams")} active={!f} onPress={() => setF(null)} />
          {Object.keys(TEAM).map((k) => <Chip key={k} label={team(k).label()} icon={team(k).icon} active={f === k} onPress={() => setF(k)} />)}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {!shown.length ? <Empty icon="calendar" title={t("No open shifts right now")} sub={t("New ones are posted every week.")} /> : null}
          {shown.map((o) => {
            const tm = team(o.team), d = new Date(o.starts_at), full = o.taken >= o.slots && !o.mine;
            return (
              <View key={o.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tm.color + "1F", alignItems: "center", justifyContent: "center" }}><Icon name={tm.icon} size={15} color={tm.color} /></View>
                  <Label color={tm.color} style={{ flex: 1 }}>{tm.label()}</Label>
                  <Body size={13} color={C.muted}>{dateLabel(d)} · {timeLabel(d)}</Body>
                </View>
                <Body weight="semi" size={16.5}>{o.title}</Body>
                {o.description ? <Body size={14} color={C.muted}>{o.description}</Body> : null}
                {o.location ? <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon name="map-pin" size={13} color={C.muted} /><Body size={13} color={C.muted}>{o.location}</Body></View> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Bar progress={Math.min(1, o.taken / o.slots)} color={tm.color} height={5} delay={0} />
                    <Body size={12} color={C.muted}>{t("{a} of {b} spots filled", { a: o.taken, b: o.slots })}</Body>
                  </View>
                  <Button small label={o.mine ? t("Signed up ✓") : full ? t("Full") : t("Sign up")} variant={o.mine ? "tonal" : "flame"} disabled={full || busy === o.id} onPress={() => go(o.id, !o.mine)} />
                </View>
              </View>
            );
          })}
        </View>
        <Group style={{ margin: 16, marginTop: 24 }}>
          <ListRow icon="truck" color={C.flame} title={t("Drive for the ride ministry")} sub={isVolunteer ? t("You're a driver — open the driver board") : t("Apply once; then accept rides to church")} onPress={() => router.push((isVolunteer ? "/rides" : "/volunteer") as any)} last />
        </Group>
      </ScrollView>
    </View>
  );
}
