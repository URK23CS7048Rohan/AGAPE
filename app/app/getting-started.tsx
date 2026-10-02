/** New member welcome checklist — connects new people to a group, a plan, a pastor and a team. */
import React from "react";
import { ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Bar, Body, Icon, Press } from "@/components/ui";
import { useWelcome, Welcome } from "@/lib/more";
import { t } from "@/lib/i18n";

export const STEPS: { k: keyof Welcome; title: () => string; sub: () => string; route: string; icon: string }[] = [
  { k: "profile", title: () => t("Tell us about you"), sub: () => t("Your name and phone, so we can reach you"), route: "/onboarding?edit=1", icon: "user" },
  { k: "visit", title: () => t("Check in on a Sunday"), sub: () => t("Scan the code at church — we'd love to meet you"), route: "/checkin", icon: "check-square" },
  { k: "group", title: () => t("Join a small group"), sub: () => t("Church is better in a circle of friends"), route: "/community", icon: "users" },
  { k: "plan", title: () => t("Start a reading plan"), sub: () => t("“First steps with Jesus” takes 7 days"), route: "/plans/new-believer", icon: "book-open" },
  { k: "event", title: () => t("RSVP to an event"), sub: () => t("Fellowship, family days and more"), route: "/events", icon: "calendar" },
  { k: "pastor", title: () => t("Meet a pastor"), sub: () => t("Ask for a visit or a coffee"), route: "/care", icon: "coffee" },
  { k: "serve", title: () => t("Find a place to serve"), sub: () => t("Ushering, kids, tech, worship, driving…"), route: "/serve", icon: "heart" },
];

export default function GettingStarted() {
  const insets = useSafeAreaInsets();
  const { steps, reload } = useWelcome();
  useFocusEffect(React.useCallback(() => { reload(); }, []));
  const done = STEPS.filter((s) => steps[s.k]).length;
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Getting started")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}>
        <Body style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 33 }}>{t("Welcome to the family")}</Body>
        <Body color={C.muted}>{t("Seven small steps to feel at home at Agape.")}</Body>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 }}>
          <View style={{ flex: 1 }}><Bar progress={done / STEPS.length} color="#16A37B" height={8} /></View>
          <Body weight="bold">{done}/{STEPS.length}</Body>
        </View>
        {STEPS.map((s) => {
          const ok = steps[s.k];
          return (
            <Press key={s.k} onPress={() => router.push(s.route as any)} scaleTo={0.985} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 16, padding: 14, opacity: ok ? 0.75 : 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: ok ? "#16A37B" : "rgba(15,11,18,0.06)" }}>
                <Icon name={ok ? "check" : s.icon} size={17} color={ok ? "#fff" : C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Body weight="semi" style={{ textDecorationLine: ok ? "line-through" : "none" }}>{s.title()}</Body>
                <Body size={13} color={C.muted}>{s.sub()}</Body>
              </View>
              {!ok ? <Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" /> : null}
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}
