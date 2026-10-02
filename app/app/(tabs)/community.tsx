import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R, onColor } from "@/theme";
import { Avatar, AvatarStack, Body, Display, Icon, IconButton, Label, Press, ScreenTitle, Segmented, Starburst, Ticket } from "@/components/ui";
import { ANNOUNCEMENTS, CHATS } from "@/data/mock";
import { useSiteContent } from "@/lib/content";

export default function Community() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const GROUPS = useSiteContent().groups;
  const [joined, setJoined] = useState<Set<string>>(new Set([GROUPS[0]?.id]));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title="Family" sub="Real people, real faith" right={<IconButton name="edit-3" bg={C.ink} color="#fff" onPress={() => router.push("/chat/david")} />} />
        </Animated.View>

        {/* Prayer wall entry */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Press onPress={() => router.push("/prayer")} scaleTo={0.98}>
            <Ticket color={C.rose} at={0.5}>
              <View style={{ flexDirection: "row", alignItems: "center", padding: 18, gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Label color={C.ink}>Prayer wall · 18,432 prayers</Label>
                  <Display size={26} style={{ marginTop: 4 }}>Share a request</Display>
                  <View style={{ marginTop: 12 }}>
                    <AvatarStack names={["Anna", "Joel", "Mary", "Tom"]} colors={[C.sun, C.violet, C.mint, C.orange]} ring={C.rose} size={28} extra="+" />
                  </View>
                </View>
                <Starburst size={70} color={C.ink} rotate={-8}><Icon name="hands-pray" size={28} color={C.rose} /></Starburst>
              </View>
            </Ticket>
          </Press>
        </Animated.View>

        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={["Chats", "Groups", "News"]} value={tab} onChange={setTab} />
        </View>

        {tab === 0 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: R.lg, paddingVertical: 4, borderWidth: 1.5, borderColor: C.line }}>
            {CHATS.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 40)}>
                {i ? <View style={{ height: 1, backgroundColor: C.line, marginLeft: 76 }} /> : null}
                <Press onPress={() => router.push(`/chat/${c.id}`)} scaleTo={0.985} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <View>
                    <Avatar name={c.name} color={c.color} size={50} />
                    {c.group ? <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.sun, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={10} /></View> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" size={16}>{c.name}</Body>
                    <Label numberOfLines={1} size={13.5}>{c.last}</Label>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Label size={12}>{c.time}</Label>
                    {c.unread ? <View style={{ minWidth: 22, height: 22, borderRadius: 8, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Body size={11.5} weight="bold" color="#fff">{c.unread}</Body></View> : null}
                  </View>
                </Press>
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}

        {tab === 1 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            {GROUPS.map((g, i) => {
              const on = joined.has(g.id);
              const fg = onColor(g.color);
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(i * 50)}>
                  <View style={{ backgroundColor: g.color, borderRadius: R.lg, padding: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Image source={g.image} style={{ width: 96, height: 96, borderRadius: 18 }} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Display size={20} color={fg} numberOfLines={2}>{g.name}</Display>
                      <Label color={fg} style={{ marginTop: 2, opacity: 0.85 }} numberOfLines={1}>{g.members ? `${g.members} members · ` : ""}{g.meets}</Label>
                      <Press onPress={() => setJoined((s) => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })} style={{ alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 14, height: 34, borderRadius: 11, backgroundColor: on ? "#fff" : C.ink, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {on ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} color="#fff" />}
                        <Body size={13} weight="bold" color={on ? C.ink : "#fff"}>{on ? "Joined" : "Join"}</Body>
                      </Press>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : null}

        {tab === 2 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            {ANNOUNCEMENTS.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 60)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ backgroundColor: a.color, borderRadius: 8, paddingHorizontal: 9, height: 24, justifyContent: "center" }}>
                    <Body size={11.5} weight="bold" color={onColor(a.color)}>Announcement</Body>
                  </View>
                  <Label size={12}>{a.time}</Label>
                </View>
                <Body size={17} weight="semi" style={{ marginTop: 10 }}>{a.title}</Body>
                <Body size={14.5} color={C.muted} style={{ marginTop: 4 }}>{a.body}</Body>
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}
