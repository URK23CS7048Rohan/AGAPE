import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { C, R } from "@/theme";
import { Async, BackHeader, Bar, Body, Button, Chip, Display, Empty, Icon, Label } from "@/components/ui";
import { useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { listServe, serveCancel, serveSignUp, when } from "@/lib/life";
import { t as tr } from "@/lib/i18n";

const TEAM: Record<string, { icon: string; color: string }> = {
  ushering: { icon: "users", color: C.sun }, kids: { icon: "star", color: C.rose }, tech: { icon: "monitor", color: C.sky }, worship: { icon: "music-note", color: C.violet },
  hospitality: { icon: "coffee", color: C.orange }, driving: { icon: "car-side", color: C.mint }, prayer: { icon: "hands-pray", color: C.roseSoft }, cleanup: { icon: "trash-2", color: C.mintSoft },
};

export default function Serve() {
  const needs = useNeedsAccount();
  const q = useQuery("serve", listServe);
  const [team, setTeam] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const all = q.data ?? [];
  const teams = ["all", ...Array.from(new Set(all.map((o) => o.team)))];
  const shown = all.filter((o) => team === "all" || o.team === team);
  const act = async (id: string, f: (id: string) => Promise<void>) => { setBusy(id); try { await f(id); await q.reload(); } catch (e: any) { Alert.alert("", e.message); } finally { setBusy(null); } };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Serve")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
        <View style={{ backgroundColor: C.orange, borderRadius: R.xl, padding: 18 }}>
          <Display size={28}>{tr("Use your gifts")}</Display>
          <Body size={14} style={{ marginTop: 4 }}>{tr("“Each of you should use whatever gift you have received to serve others.” 1 Peter 4:10")}</Body>
        </View>
        {teams.length > 2 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{teams.map((t) => <Chip key={t} label={t === "all" ? tr("All teams") : t[0].toUpperCase() + t.slice(1)} active={team === t} onPress={() => setTeam(t)} />)}</ScrollView> : null}
        <Async q={q} empty={(d) => (d.length ? null : <Empty icon="heart" title={tr("No openings right now")} body={tr("When a team needs help, it will show up here.")} />)}>
          {() => shown.map((o, i) => {
            const meta = TEAM[o.team] || { icon: "heart", color: C.lilac };
            const left = Math.max(0, o.slots - o.taken);
            return (
              <Animated.View key={o.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: o.mine ? C.mint : C.line }}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: meta.color, alignItems: "center", justifyContent: "center" }}><Icon name={meta.icon} size={20} /></View>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold" size={16}>{o.title}</Body>
                    <Label>{when(o.starts_at)}{o.location ? ` · ${o.location}` : ""}</Label>
                  </View>
                </View>
                {o.description ? <Body size={14} color={C.muted} style={{ marginTop: 10 }}>{o.description}</Body> : null}
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Bar progress={o.slots ? o.taken / o.slots : 0} color={meta.color === C.mintSoft ? C.mint : C.flame} height={8} />
                  <Label size={12}>{tr("{a} of {b} spots filled", { a: o.taken, b: o.slots })}{left ? ` · ${tr("{n} left", { n: left })}` : ""}</Label>
                </View>
                {o.mine ? <Button small variant="white" label={tr("You're on the team · cancel")} trail={null} onPress={() => act(o.id, serveCancel)} style={{ marginTop: 12 }} disabled={busy === o.id} />
                  : <Button small variant="ink" label={left ? tr("Sign me up") : tr("Full")} trail={left ? "check" : null} onPress={() => (needs("sign up to serve") ? null : act(o.id, serveSignUp))} style={{ marginTop: 12 }} disabled={!left || busy === o.id} />}
              </Animated.View>
            );
          })}
        </Async>
      </ScrollView>
    </View>
  );
}
