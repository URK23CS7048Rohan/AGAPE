import React from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { BackHeader, Body, Icon, Label, Press } from "@/components/ui";
import { t as tr } from "@/lib/i18n";

type Tile = { icon: string; title: string; sub: string; route: string; color: string };
const GROUPS: { title: string; items: Tile[] }[] = [
  { title: "Grow with God", items: [
    { icon: "book", title: "Bible", sub: "Read, listen, highlight", route: "/bible", color: C.flame },
    { icon: "calendar", title: "Reading plans", sub: "A little every day", route: "/plans", color: C.violet },
    { icon: "edit-3", title: "Journal", sub: "Private notes with God", route: "/journal", color: C.sun },
    { icon: "hands-pray", title: "Prayer list", sub: "Pray & mark answered", route: "/prayer-list", color: C.rose },
    { icon: "award", title: "Courses", sub: "Agape Institute", route: "/grow", color: C.sky },
    { icon: "music-note", title: "Song book", sub: "Lyrics, chords, sets", route: "/songs", color: C.mint },
  ] },
  { title: "Church family", items: [
    { icon: "home", title: "Home prayer", sub: "Meet near you", route: "/home-prayer", color: C.mint },
    { icon: "star", title: "Testimonies", sub: "What God has done", route: "/testimonies", color: C.sun },
    { icon: "hand-heart", title: "Prayer wall", sub: "Pray for each other", route: "/prayer", color: C.rose },
    { icon: "users", title: "Groups & chats", sub: "Find your people", route: "/community?tab=groups", color: C.violet },
    { icon: "calendar", title: "Events", sub: "What's on", route: "/events", color: C.orange },
    { icon: "car-side", title: "Rides", sub: "A lift to church", route: "/rides", color: C.sky },
  ] },
  { title: "Kids, teens & worship", items: [
    { icon: "star", title: "Kids", sub: "Stories, verses, crafts", route: "/ministry/kids", color: C.sun },
    { icon: "zap", title: "Teens", sub: "Real talk & challenges", route: "/ministry/teens", color: C.violet },
    { icon: "music-note", title: "Agape Squad", sub: "Kids & teens worship", route: "/ministry/squad", color: C.rose },
    { icon: "gamepad-variant", title: "Bible games", sub: "Play & learn", route: "/games", color: C.mint },
  ] },
  { title: "Get involved", items: [
    { icon: "heart", title: "Serve", sub: "Join a team", route: "/serve", color: C.orange },
    { icon: "check-circle", title: "Check in", sub: "At church today", route: "/checkin", color: C.sky },
    { icon: "arrow-up-right", title: "Next steps", sub: "Baptism, membership…", route: "/next-steps", color: C.ink },
    { icon: "gift", title: "Give", sub: "Tithes & campaigns", route: "/give", color: C.sun },
    { icon: "creation", title: "Ask Agape", sub: "Bible questions, 24/7", route: "/assistant", color: C.lilac },
    { icon: "bell", title: "Notifications", sub: "News & updates", route: "/notifications", color: C.peach },
  ] },
];

export default function Church() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Church life")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {GROUPS.map((g, gi) => (
          <Animated.View key={g.title} entering={FadeInDown.delay(gi * 60)} style={{ marginBottom: 18 }}>
            <Label style={{ marginBottom: 10, marginLeft: 4 }}>{tr(g.title)}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {g.items.map((t) => (
                <Press key={t.title} onPress={() => router.push(t.route as any)} scaleTo={0.96} style={{ width: "48.4%", backgroundColor: "#fff", borderRadius: R.lg, padding: 14, gap: 10, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.color, alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={19} color={t.color === C.ink ? "#fff" : C.ink} /></View>
                  <View><Body weight="bold" size={15}>{tr(t.title)}</Body><Label size={12} numberOfLines={1}>{tr(t.sub)}</Label></View>
                </Press>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}
