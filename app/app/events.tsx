import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { C, R, onColor } from "@/theme";
import { BackHeader, Body, Button, Dashes, Display, Icon, Label, Press, Sticker, Ticket } from "@/components/ui";
import { USER } from "@/data/mock";
import { useSiteContent } from "@/lib/content";
import { useStore } from "@/lib/store";
import { rsvp } from "@/lib/api";

export default function Events() {
  const { rsvps, toggleRsvp } = useStore();
  const EVENTS = useSiteContent().events;
  const [ticket, setTicket] = useState<string | null>(null);
  const hero = EVENTS[0];
  if (!hero) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title="Events" /><Body center color={C.muted} style={{ marginTop: 40 }}>No upcoming events yet.</Body></View>;
  const t = EVENTS.find((e) => e.id === ticket);

  const toggle = (id: string) => {
    const on = toggleRsvp(id);
    rsvp(id, on);
    Haptics.notificationAsync(on ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Events" />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          <Display size={32}>Come for the service. Stay for the family.</Display>
        </View>

        {/* Featured */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ margin: 16, marginTop: 22 }}>
          <Ticket color={hero.color} at={0.7} style={{ padding: 10 }}>
            <View style={{ height: 190, borderRadius: 18, overflow: "hidden" }}>
              <Image source={hero.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, paddingTop: 16 }}>
              <View style={{ flex: 1 }}>
                <Label color={onColor(hero.color)}>Featured · {hero.weekday} {hero.day} {hero.month}</Label>
                <Display size={22} color={onColor(hero.color)} numberOfLines={2} style={{ marginTop: 2 }}>{hero.title}</Display>
              </View>
              <Button label={rsvps.has(hero.id) ? "Ticket" : "RSVP"} icon={rsvps.has(hero.id) ? "maximize" : null} trail={rsvps.has(hero.id) ? null : "arrow-up-right"} variant="light" small onPress={() => (rsvps.has(hero.id) ? setTicket(hero.id) : toggle(hero.id))} />
            </View>
          </Ticket>
          <View pointerEvents="none" style={{ position: "absolute", right: -4, top: -16 }}>
            <Sticker top={hero.day} bottom={hero.month} bg={C.sun} size={74} />
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {EVENTS.map((e, i) => {
            const on = rsvps.has(e.id);
            const fg = onColor(e.color);
            return (
              <Animated.View key={e.id} entering={FadeInDown.delay(120 + i * 50)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ width: 64, height: 72, borderRadius: 16, backgroundColor: e.color, alignItems: "center", justifyContent: "center" }}>
                    <Display size={26} color={fg} style={{ lineHeight: 28 }}>{e.day}</Display>
                    <Label size={11} color={fg}>{e.month} · {e.weekday}</Label>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" size={15.5} numberOfLines={2}>{e.title}</Body>
                    <Label numberOfLines={1}>{e.time}</Label>
                    <View style={{ flexDirection: "row", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      {e.tags.map((tg) => <View key={tg} style={{ paddingHorizontal: 8, height: 22, borderRadius: 7, backgroundColor: C.bg, justifyContent: "center" }}><Body size={11}>{tg}</Body></View>)}
                    </View>
                  </View>
                  <View style={{ gap: 6, alignItems: "center" }}>
                    <Press onPress={() => toggle(e.id)} style={{ paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: on ? C.mint : C.ink, flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {on ? <Animated.View entering={ZoomIn}><Icon name="check" size={14} color="#fff" /></Animated.View> : null}
                      <Body size={12.5} weight="bold" color="#fff">{on ? "Going" : "RSVP"}</Body>
                    </Press>
                    {on ? <Press onPress={() => setTicket(e.id)}><Body size={12} weight="bold" color={C.flame}>Ticket</Body></Press> : null}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {t ? (
        <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,20,20,0.6)", alignItems: "center", justifyContent: "center", padding: 24 }]}>
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ width: "100%" }}>
            <Ticket color="#fff" cut="#6E6E6C" at={0.42} notch={16} radius={R.xl}>
              <View style={{ backgroundColor: t.color, padding: 10 }}>
                <Image source={t.image} style={{ height: 130, borderRadius: 18 }} contentFit="cover" />
              </View>
              <View style={{ padding: 20 }}>
                <Label>Admit one · {t.weekday} {t.day} {t.month}</Label>
                <Display size={26} style={{ marginTop: 4 }}>{t.title}</Display>
                <Label style={{ marginTop: 2 }}>{t.time}</Label>
                <Dashes style={{ marginVertical: 16 }} />
                <View style={{ alignSelf: "center", width: 160, height: 160, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="qrcode" size={130} />
                </View>
                <Label style={{ marginTop: 10, textAlign: "center" }}>{USER.name} · {USER.memberId}</Label>
                <Button label="Done" icon="check" trail={null} variant="ink" block onPress={() => setTicket(null)} style={{ marginTop: 16 }} />
              </View>
            </Ticket>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
