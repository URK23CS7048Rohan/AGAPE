import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { C, R } from "@/theme";
import { BackHeader, Body, Button, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { useSiteContent } from "@/lib/content";
import { useStore } from "@/lib/store";
import { useCounts } from "@/lib/data";

export default function Events() {
  const { rsvps, toggleRsvp, name, profile, live, session } = useStore();
  const EVENTS = useSiteContent().events;
  const rc = useCounts("rsvp_counts");
  const counts = rc.data;
  const going = (key: string) => (counts[key] ?? 0) + (rsvps.has(key) && !live ? 1 : 0);
  const [ticket, setTicket] = useState<string | null>(null);
  const hero = EVENTS[0];
  if (!hero) return <View style={{ flex: 1, backgroundColor: C.paper }}><BackHeader title="Events" /><Body center color={C.muted} style={{ marginTop: 40 }}>No upcoming events yet.</Body></View>;
  const t = EVENTS.find((e) => e.key === ticket);

  const toggle = (key: string, title: string) => {
    const was = rsvps.has(key);
    const on = toggleRsvp(key, title);
    if (on === was) return; // needs an account first
    Haptics.notificationAsync(on ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (on) setTicket(key);
    setTimeout(rc.reload, 700);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <BackHeader title="Events" />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20 }}>
          <Display size={52} style={{ lineHeight: 50 }}>Come for the service.{"\n"}<Serif size={54} color={C.flame}>Stay for the family.</Serif></Display>
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={{ margin: 16, height: 250, borderRadius: R.xl, overflow: "hidden" }}>
          <Image source={hero.image} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(10,6,14,0.9)"]} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
          <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View>
              <Label color="rgba(255,255,255,0.8)">Featured · {hero.weekday} {hero.day} {hero.month}</Label>
              <Display size={36} color="#fff" style={{ marginTop: 4, maxWidth: 230 }} numberOfLines={2}>{hero.title}</Display>
            </View>
            <Button label={rsvps.has(hero.key) ? "Ticket" : "RSVP"} icon={rsvps.has(hero.key) ? "maximize" : "arrow-right"} variant="light" small onPress={() => (rsvps.has(hero.key) ? setTicket(hero.key) : toggle(hero.key, hero.title))} />
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {EVENTS.map((e, i) => {
            const on = rsvps.has(e.key);
            const n = going(e.key);
            return (
              <Animated.View key={e.id} entering={FadeInDown.delay(150 + i * 60)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 12 }}>
                  <View style={{ width: 66, height: 72, borderRadius: 20, backgroundColor: e.color, alignItems: "center", justifyContent: "center" }}>
                    <Display size={30} color={e.color === C.sun ? C.ink : "#fff"} style={{ lineHeight: 30 }}>{e.day}</Display>
                    <Label size={9.5} color={e.color === C.sun ? C.ink : "#fff"}>{e.month} · {e.weekday}</Label>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" size={16}>{e.title}</Body>
                    <Body size={13} color={C.muted}>{e.time}</Body>
                    {n ? <Body size={12} weight="semi" color={C.flame} style={{ marginTop: 2 }}>{n} going</Body> : null}
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {e.tags.map((t) => <View key={t} style={{ paddingHorizontal: 9, height: 22, borderRadius: R.pill, borderWidth: 1, borderColor: "rgba(15,11,18,0.15)", justifyContent: "center" }}><Body size={11}>{t}</Body></View>)}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Press onPress={() => toggle(e.key, e.title)} style={{ paddingHorizontal: 13, height: 36, borderRadius: R.pill, backgroundColor: on ? C.mint : C.ink, flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {on ? <Animated.View entering={ZoomIn}><Icon name="check" size={14} color={C.ink} /></Animated.View> : null}
                      <Body size={12.5} weight="bold" color={on ? C.ink : "#fff"}>{on ? "Going" : "RSVP"}</Body>
                    </Press>
                    {on ? <Press onPress={() => setTicket(e.key)} style={{ alignItems: "center" }}><Body size={12} weight="semi" color={C.flame}>Ticket</Body></Press> : null}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {t ? (
        <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,6,14,0.7)", alignItems: "center", justifyContent: "center", padding: 24 }]}>
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ width: "100%", borderRadius: R.xl, overflow: "hidden", backgroundColor: C.cream }}>
            <Image source={t.image} style={{ height: 150 }} contentFit="cover" />
            <View style={{ padding: 22 }}>
              <Label>Admit one · {t.weekday} {t.day} {t.month}</Label>
              <Display size={36} style={{ marginTop: 6 }}>{t.title}</Display>
              <Body color={C.muted}>{t.time}</Body>
              <View style={{ marginTop: 18, alignSelf: "stretch", borderRadius: 24, backgroundColor: "#fff", padding: 18, alignItems: "center", borderWidth: 2, borderColor: C.ink, borderStyle: "dashed" }}>
                <Label>You're on the list</Label>
                <Display size={34} style={{ marginTop: 6 }} center numberOfLines={1}>{name}</Display>
                <Body weight="semi" color={C.flame} style={{ marginTop: 2 }}>{profile?.member_no || (session ? "Member" : live ? "Guest" : "AGP-24-0187")}</Body>
              </View>
              <Body center size={12.5} color={C.muted} style={{ marginTop: 10 }}>Show this at the welcome desk. We've added you to the guest list.</Body>
              <Button label="Done" icon="check" variant="ink" block onPress={() => setTicket(null)} style={{ marginTop: 16 }} />
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
