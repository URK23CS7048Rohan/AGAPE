import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { C, R } from "@/theme";
import { BackHeader, Bar, Body, Button, Display, Icon, Label, Loading, Press } from "@/components/ui";
import { imageSource } from "@/lib/content";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { getPlan, leavePlan, myProgress, startPlan } from "@/lib/life";

export default function PlanView() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const q = useQuery(`plans:one:${slug}`, () => getPlan(slug!));
  const prog = useQuery(signedIn ? "plans:progress" : null, myProgress);
  const p = q.data;
  if (!p) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader />{q.loading ? <Loading /> : null}</View>;
  const mine = prog.data?.[p.id];
  const done = mine?.done ?? [];
  const nextDay = (p.days.findIndex((_, i) => !done.includes(i + 1)) + 1) || 1;
  const open = (d: number) => router.push({ pathname: "/plans/day", params: { slug: p.slug, day: String(d) } });
  const start = async () => { if (needs("start a reading plan")) return; try { await startPlan(p.id); await prog.reload(); open(1); } catch (e: any) { Alert.alert("Couldn't start", e.message); } };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={p.title} right={mine ? <Press onPress={() => Alert.alert("Leave this plan?", "Your progress will be cleared.", [{ text: "Cancel", style: "cancel" }, { text: "Leave", style: "destructive", onPress: async () => { await leavePlan(p.id); prog.reload(); } }])} style={{ width: 44, alignItems: "center" }}><Icon name="log-out" size={18} color={C.muted} /></Press> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Image source={imageSource(p.image)} style={{ height: 190, borderRadius: R.xl }} contentFit="cover" />
        <Display size={30} style={{ marginTop: 16 }}>{p.title}</Display>
        {p.subtitle ? <Label style={{ marginTop: 2 }}>{p.subtitle}</Label> : null}
        {p.description ? <Body style={{ marginTop: 10 }} color={C.muted}>{p.description}</Body> : null}
        {mine ? (
          <View style={{ marginTop: 16, backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line, gap: 8 }}>
            <Body weight="bold">{done.length} of {p.days.length} days done</Body>
            <Bar progress={p.days.length ? done.length / p.days.length : 0} color={p.color || C.flame} />
            <Button label={done.length >= p.days.length ? "Read it again" : `Continue: day ${nextDay}`} variant="ink" block onPress={() => open(nextDay)} style={{ marginTop: 6 }} />
          </View>
        ) : <Button label="Start this plan" variant="ink" block onPress={start} style={{ marginTop: 16 }} />}
        <Label style={{ marginTop: 22, marginBottom: 8 }}>Days</Label>
        <View style={{ gap: 8 }}>
          {p.days.map((d, i) => {
            const ok = done.includes(i + 1);
            return (
              <Press key={i} onPress={() => open(i + 1)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: ok ? C.mint : C.bg, alignItems: "center", justifyContent: "center" }}>
                  {ok ? <Icon name="check" size={18} color="#fff" /> : <Body weight="bold">{i + 1}</Body>}
                </View>
                <View style={{ flex: 1 }}>
                  <Body weight="semi" numberOfLines={1}>{d.title}</Body>
                  <Label numberOfLines={1}>{d.refs.join(" · ")}</Label>
                </View>
                <Icon name="chevron-right" size={16} color={C.muted} />
              </Press>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
