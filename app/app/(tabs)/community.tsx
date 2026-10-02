import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R } from "@/theme";
import { Avatar, Body, Button, Display, Icon, IconButton, Label, LargeTitle, Press, Segmented, Tile } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useSiteContent } from "@/lib/content";
import { useAnnouncements, useCounts, useInbox, usePrayers } from "@/lib/data";
import { useStore } from "@/lib/store";
import { joinGroup } from "@/lib/api";
import { fmt } from "@/lib/time";

export default function Community() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const site = useSiteContent();
  const GROUPS = site.groups;
  const { session, live, member, needsAccount } = useStore();
  const inbox = useInbox(session?.user.id ?? null);
  const CHATS = inbox.data;
  const ANNOUNCEMENTS = useAnnouncements();
  const groupCounts = useCounts("group_member_counts");
  const counts = groupCounts.data;
  const prayers = usePrayers().data;
  const [busy, setBusy] = useState<string | null>(null);
  const [demoJoined, setDemoJoined] = useState<Set<string>>(new Set([GROUPS[0]?.key]));
  const joinedConv = useMemo(() => Object.fromEntries(CHATS.filter((c) => c.topicKey?.startsWith("group:")).map((c) => [c.topicKey!.slice(6), c.id])), [CHATS]);
  const isJoined = (key: string) => (live ? !!joinedConv[key] : demoJoined.has(key));
  const join = async (g: { key: string; name: string; color: string }) => {
    if (!live) { setDemoJoined((s) => new Set(s).add(g.key)); return; }
    if (joinedConv[g.key]) { router.push(`/chat/${joinedConv[g.key]}`); return; }
    if (needsAccount(t("join a group"))) return;
    setBusy(g.key);
    try { const id = await joinGroup(g.key, g.name, g.color); await inbox.reload(); groupCounts.reload(); if (id) router.push(`/chat/${id}`); }
    catch (e: any) { Alert.alert(t("Couldn't join"), e?.message || t("Please try again.")); }
    finally { setBusy(null); }
  };
  const prayerTotal = prayers.reduce((a, p) => a + (p.count || 0), 0) || site.stats.prayers;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}>
        <LargeTitle label={t("Real people · Real faith")} title={t("Community")} right={<IconButton name="bell" onPress={() => router.push("/notifications")} label={t("Notifications")} />} />

        {/* Connect */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
          <Tile style={{ width: "48.4%" }} icon="sun" color="#E08A00" label={t("Testimonies")} sub={t("Stories of answered prayer")} onPress={() => router.push("/testimonies" as any)} />
          <Tile style={{ width: "48.4%" }} icon="home" color="#16A37B" label={t("Home groups")} sub={t("Host or join a meeting")} onPress={() => router.push("/home-prayer" as any)} />
          <Tile style={{ width: "48.4%" }} icon="zap" color="#2F7DE1" label={t("Agape Teens")} sub={t("Youth night & chat")} onPress={() => router.push("/ministry/teens" as any)} />
          <Tile style={{ width: "48.4%" }} icon="music" color={C.rose} label={t("Agape Squad")} sub={t("Worship band & dance")} onPress={() => router.push("/ministry/squad" as any)} />
        </View>

        {/* Prayer wall entry */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Press onPress={() => router.push("/prayer")} scaleTo={0.98} style={{ marginHorizontal: 16, marginTop: 18, borderRadius: R.xl, overflow: "hidden", height: 130 }}>
            <Image source={IMG.homeWorship} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(29,18,51,0.95)", "rgba(29,18,51,0.4)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
              <Label color="rgba(244,238,228,0.7)">{t("Prayer wall")} · {t("{n} prayers", { n: fmt(prayerTotal) })}</Label>
              <Display size={28} color={C.cream} style={{ marginTop: 6 }}>{t("Share a request")}</Display>
            </View>
          </Press>
        </Animated.View>

        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={[t("Chats"), t("Groups"), t("News")]} value={tab} onChange={setTab} accent={C.ink} />
        </View>

        {tab === 0 && live && !member ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: R.xl, padding: 20 }}>
            <Display size={28}>{t("Your chats live here")}</Display>
            <Body color={C.muted} style={{ marginTop: 6 }}>{t("Sign in to chat with your groups, your ride driver and the whole Agape family.")}</Body>
            <Button small variant="ink" label={t("Sign in")} onPress={() => router.push("/welcome")} style={{ marginTop: 14 }} />
          </Animated.View>
        ) : null}
        {tab === 0 && (!live || member) ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: R.xl, paddingVertical: 6 }}>
            {CHATS.length === 0 ? <Body color={C.muted} center style={{ padding: 20 }}>{inbox.loading ? t("Loading your chats…") : t("Join a group to start chatting.")}</Body> : null}
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
              const on = isJoined(g.key);
              const n = counts[`group:${g.key}`] ?? 0;
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(i * 60)}>
                  <View style={{ height: 150, borderRadius: R.xl, overflow: "hidden" }}>
                    <Image source={g.image} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <LinearGradient colors={["transparent", "rgba(8,5,10,0.85)"]} style={StyleSheet.absoluteFill} />
                    <View style={{ position: "absolute", left: 18, right: 18, bottom: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <View>
                        <Display size={34} color="#fff" style={{ textTransform: "uppercase" }}>{g.name}</Display>
                        <Body size={13} color="rgba(255,255,255,0.8)">{n ? `${n === 1 ? t("1 member") : t("{n} members", { n })} · ` : ""}{g.meets}</Body>
                      </View>
                      <Button small variant={on ? "white" : "flame"} icon={on ? "message-circle" : null} label={busy === g.key ? t("Joining…") : on ? t("Open chat") : t("Join")} onPress={() => join(g)} disabled={busy === g.key} />
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : null}

        {tab === 2 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            {ANNOUNCEMENTS.length === 0 ? <Body color={C.muted} center style={{ padding: 20 }}>{t("No announcements yet.")}</Body> : null}
            {ANNOUNCEMENTS.map((a, i) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(i * 70)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 18, borderLeftWidth: 6, borderLeftColor: a.color }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Label>{t("Announcement")}</Label>
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
