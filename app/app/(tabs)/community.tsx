import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R } from "@/theme";
import { Avatar, Body, Display, Icon, IconButton, Label, Press, Segmented, Serif } from "@/components/ui";
import { ANNOUNCEMENTS, CHATS } from "@/data/mock";
import { useSiteContent } from "@/lib/content";

export default function Community() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const GROUPS = useSiteContent().groups;
  const [joined, setJoined] = useState<Set<string>>(new Set([GROUPS[0]?.id]));

  return (
    <View style={{ flex: 1, backgroundColor: C.mintSoft }}>
      <View pointerEvents="none" style={{ position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: "#9BE8CD", opacity: 0.5, top: -120, left: -100 }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 150 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Label>Real people · Real faith</Label>
            <Display size={56} style={{ marginTop: 8, lineHeight: 54 }}>Real{"\n"}<Serif size={62} color="#0E9F74">community.</Serif></Display>
          </View>
          <IconButton name="edit-3" bg={C.ink} color="#fff" onPress={() => router.push("/chat/david")} />
        </Animated.View>

        {/* Prayer wall entry */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Press onPress={() => router.push("/prayer")} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 18, borderRadius: R.xl, overflow: "hidden", height: 130 }}>
            <Image source={IMG.homeWorship} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(29,18,51,0.95)", "rgba(29,18,51,0.4)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
              <Label color="rgba(244,238,228,0.7)">Prayer wall · 18,432 prayers</Label>
              <Display size={30} color={C.cream} style={{ marginTop: 6 }}>Share a <Serif size={32} color="#FF9EC2">request</Serif></Display>
            </View>
          </Press>
        </Animated.View>

        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={["Chats", "Groups", "News"]} value={tab} onChange={setTab} accent={C.ink} />
        </View>

        {tab === 0 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: R.xl, paddingVertical: 6 }}>
            {CHATS.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 50)}>
                <Press onPress={() => router.push(`/chat/${c.id}`)} scaleTo={0.985} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <View>
                    <Avatar name={c.name} color={c.color} size={50} />
                    {c.group ? <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.mint, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={10} color={C.ink} /></View> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" size={16}>{c.name}</Body>
                    <Body size={13.5} color={C.muted} numberOfLines={1}>{c.last}</Body>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Body size={12} color={C.muted}>{c.time}</Body>
                    {c.unread ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Body size={11.5} weight="bold" color="#fff">{c.unread}</Body></View> : null}
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
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(i * 60)}>
                  <View style={{ height: 150, borderRadius: R.xl, overflow: "hidden" }}>
                    <Image source={g.image} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <LinearGradient colors={["transparent", "rgba(8,5,10,0.85)"]} style={StyleSheet.absoluteFill} />
                    <View style={{ position: "absolute", left: 18, right: 18, bottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <View>
                        <Display size={34} color="#fff" style={{ textTransform: "uppercase" }}>{g.name}</Display>
                        <Body size={13} color="rgba(255,255,255,0.8)">{g.members ? `${g.members} members · ` : ""}{g.meets}</Body>
                      </View>
                      <Press onPress={() => setJoined((s) => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })} style={{ paddingHorizontal: 16, height: 40, borderRadius: R.pill, backgroundColor: on ? "#fff" : g.color, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {on ? <Icon name="check" size={14} color={C.ink} /> : null}
                        <Body size={13.5} weight="bold" color={on ? C.ink : g.color === C.sun ? C.ink : "#fff"}>{on ? "Joined" : "Join"}</Body>
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
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 70)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 18, borderLeftWidth: 6, borderLeftColor: a.color }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Label>Announcement</Label>
                  <Body size={12} color={C.muted}>{a.time}</Body>
                </View>
                <Body size={17} weight="semi" style={{ marginTop: 8 }}>{a.title}</Body>
                <Body size={14.5} color={C.muted} style={{ marginTop: 4 }}>{a.body}</Body>
              </Animated.View>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}
