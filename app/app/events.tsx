import React, { useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import QRCode from "react-native-qrcode-svg";
import { C, R, onColor } from "@/theme";
import { BackHeader, Body, Button, Dashes, Display, Empty, Icon, Label, Press, Sticker, Ticket } from "@/components/ui";
import { useSiteContent } from "@/lib/content";
import { useAuth } from "@/lib/auth";
import { useRsvps } from "@/lib/hooks";

export default function Events() {
  const { events } = useSiteContent();
  const { profile, session } = useAuth();
  const rsvp = useRsvps();
  const [ticket, setTicket] = useState<string | null>(null);
  const hero = events[0];
  const t = events.find((e) => e.key === ticket);

  if (!hero) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title="Events" /><Empty icon="calendar" title="No upcoming events" body="New events appear here as soon as the team publishes them." /></View>;
  const heroGoing = rsvp.going(hero.key);

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
                <Label color={onColor(hero.color)}>Featured · {[hero.weekday, hero.day, hero.month].filter(Boolean).join(" ")}</Label>
                <Display size={22} color={onColor(hero.color)} numberOfLines={2} style={{ marginTop: 2 }}>{hero.title}</Display>
              </View>
              <Button label={heroGoing ? "Ticket" : "RSVP"} icon={heroGoing ? "maximize" : null} trail={heroGoing ? null : "arrow-up-right"} variant="light" small onPress={() => (heroGoing ? setTicket(hero.key) : rsvp.toggle(hero))} />
            </View>
          </Ticket>
          {hero.day ? (
            <View pointerEvents="none" style={{ position: "absolute", right: -4, top: -16 }}>
              <Sticker top={hero.day} bottom={hero.month} bg={C.sun} size={74} />
            </View>
          ) : null}
        </Animated.View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {events.map((e, i) => {
            const on = rsvp.going(e.key);
            const fg = onColor(e.color);
            const n = rsvp.count(e.key);
            return (
              <Animated.View key={e.key} entering={FadeInDown.delay(120 + i * 50)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: R.lg, padding: 10, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ width: 64, height: 72, borderRadius: 16, backgroundColor: e.color, alignItems: "center", justifyContent: "center" }}>
                    <Display size={26} color={fg} style={{ lineHeight: 28 }}>{e.day}</Display>
                    <Label size={11} color={fg}>{[e.month, e.weekday].filter(Boolean).join(" · ")}</Label>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" size={15.5} numberOfLines={2}>{e.title}</Body>
                    {e.time ? <Label numberOfLines={2}>{e.time}</Label> : null}
                    <View style={{ flexDirection: "row", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      {n ? <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 7, backgroundColor: C.mintSoft, justifyContent: "center" }}><Body size={11} weight="semi">{n} going</Body></View> : null}
                      {e.tags.map((tg) => <View key={tg} style={{ paddingHorizontal: 8, height: 22, borderRadius: 7, backgroundColor: C.bg, justifyContent: "center" }}><Body size={11}>{tg}</Body></View>)}
                    </View>
                  </View>
                  <View style={{ gap: 6, alignItems: "center" }}>
                    <Press onPress={() => rsvp.toggle(e)} style={{ paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: on ? C.mint : C.ink, flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {on ? <Animated.View entering={ZoomIn}><Icon name="check" size={14} color="#fff" /></Animated.View> : null}
                      <Body size={12.5} weight="bold" color="#fff">{on ? "Going" : "RSVP"}</Body>
                    </Press>
                    {on ? <Press onPress={() => setTicket(e.key)}><Body size={12} weight="bold" color={C.flame}>Ticket</Body></Press> : null}
                    {!on && /^https?:/.test(e.link) ? <Press onPress={() => Linking.openURL(e.link)}><Body size={12} weight="bold" color={C.muted}>Details</Body></Press> : null}
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
                <Label>Admit one · {[t.weekday, t.day, t.month].filter(Boolean).join(" ")}</Label>
                <Display size={26} style={{ marginTop: 4 }}>{t.title}</Display>
                {t.time ? <Label style={{ marginTop: 2 }}>{t.time}</Label> : null}
                <Dashes style={{ marginVertical: 16 }} />
                <View style={{ alignSelf: "center", padding: 12, borderRadius: 20, borderWidth: 1.5, borderColor: C.line, backgroundColor: "#fff" }}>
                  <QRCode value={`agape:rsvp:${t.key}:${session?.user.id ?? ""}`} size={140} color={C.ink} backgroundColor="#fff" />
                </View>
                <Label style={{ marginTop: 10, textAlign: "center" }}>{profile?.full_name || session?.user.email}</Label>
                <Button label="Done" icon="check" trail={null} variant="ink" block onPress={() => setTicket(null)} style={{ marginTop: 16 }} />
              </View>
            </Ticket>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
