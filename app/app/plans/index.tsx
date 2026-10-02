import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { Async, BackHeader, Bar, Body, Display, Empty, Label, Press, Segmented } from "@/components/ui";
import { imageSource } from "@/lib/content";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { listPlans, myProgress, planCounts } from "@/lib/life";

const AUD = ["adults", "teens", "kids"] as const;

export default function Plans() {
  const { signedIn } = useAuth();
  const plans = useQuery("plans:list", listPlans);
  const prog = useQuery(signedIn ? "plans:progress" : null, myProgress);
  const counts = useQuery("plans:counts", planCounts);
  const [t, setT] = useState(0);
  const all = plans.data ?? [];
  const mine = all.filter((p) => prog.data?.[p.id]);
  const shown = all.filter((p) => p.audience === AUD[t]);

  const Card = ({ p, i }: { p: (typeof all)[number]; i: number }) => {
    const done = prog.data?.[p.id]?.done.length ?? 0;
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
        <Press onPress={() => router.push(`/plans/${p.slug}`)} scaleTo={0.98} style={{ flexDirection: "row", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
          <Image source={imageSource(p.image)} style={{ width: 92, height: 92, borderRadius: 18 }} contentFit="cover" />
          <View style={{ flex: 1, paddingVertical: 4, paddingRight: 6 }}>
            <Body weight="bold" size={16} numberOfLines={2}>{p.title}</Body>
            <Label numberOfLines={1}>{p.subtitle || `${p.days.length} days`}</Label>
            {prog.data?.[p.id] ? (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Bar progress={p.days.length ? done / p.days.length : 0} color={p.color || C.flame} height={8} />
                <Label size={11.5}>{done} of {p.days.length} days</Label>
              </View>
            ) : <Label size={11.5} style={{ marginTop: 8 }}>{p.days.length} days{counts.data?.[p.id] ? ` · ${counts.data[p.id]} reading` : ""}</Label>}
          </View>
        </Press>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Reading plans" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => { plans.reload(); prog.reload(); }} />}>
        <View style={{ backgroundColor: C.violet, borderRadius: R.xl, padding: 18, marginBottom: 6 }}>
          <Display size={28}>A little every day</Display>
          <Body size={14} style={{ marginTop: 4 }}>Short readings with a devotion and a question to journal on.</Body>
        </View>
        {mine.length ? <><Label style={{ marginTop: 6 }}>My plans</Label>{mine.map((p, i) => <Card key={p.id} p={p} i={i} />)}</> : null}
        <View style={{ marginTop: 8 }}><Segmented items={["Adults", "Teens", "Kids"]} value={t} onChange={setT} /></View>
        <Async q={plans} empty={(d) => (d.length ? null : <Empty icon="book-open" title="No plans yet" body="Reading plans will appear here once the church adds them." />)}>
          {() => (shown.length ? shown.map((p, i) => <Card key={p.id} p={p} i={i} />) : <Empty icon="book-open" title="Nothing here yet" body="Try another tab." />)}
        </Async>
      </ScrollView>
    </View>
  );
}
