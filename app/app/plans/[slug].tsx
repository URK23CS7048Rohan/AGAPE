import React, { useState } from "react";
import { Alert, Modal, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Bar, Body, Button, Group, Icon, IconButton, Label, ListRow, Press } from "@/components/ui";
import { planToday, usePlanProgress, usePlans } from "@/lib/more";
import { setDailyReminder } from "@/lib/reminders";
import { t } from "@/lib/i18n";

const TIMES = ["06:00", "06:30", "07:00", "07:30", "08:00", "12:30", "18:00", "20:00", "21:00", "22:00"];

export default function PlanDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const plan = usePlans().data.find((p) => p.slug === slug);
  const { progress, start, stop, setReminder } = usePlanProgress();
  const [pick, setPick] = useState(false);
  if (!plan) return <View style={{ flex: 1, backgroundColor: C.cream }} />;
  const pr = progress[plan.id];
  const today = planToday(pr, plan.days.length);
  const done = pr?.done.length || 0;

  const remind = async (time: string | null) => {
    setPick(false);
    const ok = await setDailyReminder(`plan:${plan.id}`, time, plan.title, t("Today's reading is ready. A few minutes with God."), `/plans/${plan.slug}`);
    if (!ok && time) Alert.alert(t("Notifications are off"), t("Allow notifications for Agape in your phone settings to get reminders."));
    await setReminder(plan.id, time).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ height: 300 }}>
          <Image source={plan.image} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
          <LinearGradient colors={["rgba(15,11,18,0.35)", "rgba(15,11,18,0.1)", "rgba(15,11,18,0.85)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: insets.top + 6, left: 12 }}>
            <IconButton name="chevron-left" bg="rgba(255,255,255,0.18)" color="#fff" label={t("Back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/bible"))} />
          </View>
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
            <Label color="rgba(255,255,255,0.75)">{t("{n} days", { n: plan.days.length })} · {t(plan.audience === "kids" ? "Kids" : plan.audience === "teens" ? "Teens" : "Adults")}</Label>
            <Body style={{ fontFamily: F.displayBold, fontSize: 30, lineHeight: 35, color: "#fff", marginTop: 6 }}>{plan.title}</Body>
            {plan.subtitle ? <Body color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>{plan.subtitle}</Body> : null}
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {plan.description ? <Body color={C.muted}>{plan.description}</Body> : null}
          {pr ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Body weight="semi">{t("Day {d} of {n}", { d: today, n: plan.days.length })}</Body>
                <Body color={C.muted}>{Math.round((done / plan.days.length) * 100)}%</Body>
              </View>
              <Bar progress={done / plan.days.length} color={plan.color} height={6} />
              <Button label={done >= plan.days.length ? t("Plan complete — read again") : t("Continue · Day {d}", { d: today })} block onPress={() => router.push(`/plans/day?slug=${plan.slug}&d=${today}` as any)} />
            </View>
          ) : (
            <Button label={t("Start this plan")} block onPress={async () => { await start(plan.id).catch(() => {}); router.push(`/plans/day?slug=${plan.slug}&d=1` as any); }} />
          )}
          <Group>
            <ListRow icon="bell" color={C.violet} title={t("Daily reminder")} sub={pr?.reminder ? pr.reminder : t("Off")} onPress={() => (pr ? setPick(true) : Alert.alert(t("Start the plan first")))} />
            {pr ? <ListRow icon="x-circle" color={C.rose} title={t("Stop this plan")} last onPress={() => Alert.alert(t("Stop this plan?"), t("Your progress will be cleared."), [{ text: t("Cancel"), style: "cancel" }, { text: t("Stop"), style: "destructive", onPress: () => { stop(plan.id); setDailyReminder(`plan:${plan.id}`, null, "", "", ""); } }])} /> : null}
          </Group>
        </View>

        <Body weight="semi" size={17} style={{ paddingHorizontal: 20, marginTop: 6, marginBottom: 10 }}>{t("Days")}</Body>
        <Group style={{ marginHorizontal: 16 }}>
          {plan.days.map((d, i) => {
            const n = i + 1, isDone = pr?.done.includes(n);
            return (
              <ListRow key={n} last={n === plan.days.length} title={`${n}. ${d.title}`} sub={d.refs.join(" · ")}
                right={isDone ? <Icon name="check-circle" size={20} color="#16A37B" /> : <Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" />}
                onPress={() => router.push(`/plans/day?slug=${plan.slug}&d=${n}` as any)} />
            );
          })}
        </Group>
      </ScrollView>

      <Modal visible={pick} transparent animationType="fade" onRequestClose={() => setPick(false)}>
        <Press onPress={() => setPick(false)} scaleTo={1} haptic={false} style={{ flex: 1, backgroundColor: "rgba(15,11,18,0.45)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: C.paper, borderRadius: 18, padding: 16 }}>
            <Body weight="semi" size={17} style={{ marginBottom: 10 }}>{t("Remind me every day at")}</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TIMES.map((x) => (
                <Press key={x} onPress={() => remind(x)} style={{ paddingHorizontal: 14, height: 40, borderRadius: 10, justifyContent: "center", backgroundColor: pr?.reminder === x ? C.flame : "rgba(15,11,18,0.06)" }}>
                  <Body weight="semi" color={pr?.reminder === x ? "#fff" : C.ink}>{x}</Body>
                </Press>
              ))}
            </View>
            <Button label={t("Turn off")} variant="tonal" block onPress={() => remind(null)} style={{ marginTop: 14 }} />
          </View>
        </Press>
      </Modal>
    </View>
  );
}
