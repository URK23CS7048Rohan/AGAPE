/** Agape Teens and Agape Squad: what's on, challenges, devotions, the group chat, and (Squad) the song book. */
import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Body, Button, IconButton, Label, Tile } from "@/components/ui";
import { PostCard, VideoModal } from "@/components/PostCard";
import { PlanCard } from "@/components/PlanCard";
import { MinistryKey, useMinistry, usePlans } from "@/lib/more";
import { joinGroup } from "@/lib/api";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const INFO: Record<string, { title: () => string; sub: () => string; image: any; color: string; chat: [string, string] }> = {
  teens: { title: () => t("Agape Teens"), sub: () => t("Ages 13–19 · Friday youth night"), image: IMG.friendsTeal, color: "#2F7DE1", chat: ["teens", "Agape Teens"] },
  squad: { title: () => t("Agape Squad"), sub: () => t("Kids & teens who lead worship"), image: IMG.squadBand, color: C.rose, chat: ["agape-squad", "Agape Squad"] },
};

export default function Ministry() {
  const { key } = useLocalSearchParams<{ key: MinistryKey }>();
  const info = INFO[key] || INFO.teens;
  const insets = useSafeAreaInsets();
  const { needsAccount, live } = useStore();
  const posts = useMinistry(key as MinistryKey).data;
  const plans = usePlans().data.filter((p) => p.audience === "teens");
  const [video, setVideo] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const events = posts.filter((p) => p.kind === "event");
  const feed = posts.filter((p) => p.kind !== "event");

  const chat = async () => {
    if (needsAccount(t("join the group chat"))) return;
    if (!live) return router.push("/community" as any);
    setJoining(true);
    try { const id = await joinGroup(info.chat[0], info.chat[1], info.color); if (id) router.push(`/chat/${id}` as any); }
    catch (e: any) { Alert.alert(t("Couldn't join"), e.message); }
    finally { setJoining(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: 280 }}>
          <Image source={info.image} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
          <LinearGradient colors={["rgba(15,11,18,0.4)", "rgba(15,11,18,0.05)", "rgba(15,11,18,0.85)"]} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: insets.top + 6, left: 12 }}>
            <IconButton name="chevron-left" bg="rgba(255,255,255,0.18)" color="#fff" label={t("Back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
          </View>
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
            <Label color="rgba(255,255,255,0.8)">{info.sub()}</Label>
            <Body style={{ fontFamily: F.displayBold, fontSize: 32, lineHeight: 38, color: "#fff", marginTop: 4 }}>{info.title()}</Body>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, padding: 16 }}>
          <Tile style={{ flex: 1 }} icon="message-circle" color={info.color} label={t("Group chat")} sub={joining ? t("Joining…") : t("Join in")} onPress={chat} />
          {key === "squad" ? <Tile style={{ flex: 1 }} icon="music-clef-treble" color={C.violet} label={t("Songs")} sub={t("Chords & sets")} onPress={() => router.push("/songs" as any)} />
            : <Tile style={{ flex: 1 }} icon="calendar" color={C.violet} label={t("Plans")} sub={t("For teens")} onPress={() => router.push("/plans" as any)} />}
          <Tile style={{ flex: 1 }} icon="zap" color="#E5484D" label={t("Games")} sub={t("Play")} onPress={() => router.push("/games" as any)} />
        </View>

        {events.length ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Body weight="semi" size={18}>{t("Coming up")}</Body>
            {events.map((p) => <PostCard key={p.id} p={p} onVideo={setVideo} />)}
          </View>
        ) : null}

        {key === "teens" && plans.length ? (
          <View style={{ marginTop: 22 }}>
            <Body weight="semi" size={18} style={{ paddingHorizontal: 16, marginBottom: 10 }}>{t("Reading plans for you")}</Body>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {plans.map((p) => <PlanCard key={p.id} p={p} />)}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 22 }}>
          <Body weight="semi" size={18}>{t("Latest")}</Body>
          {feed.map((p) => <PostCard key={p.id} p={p} onVideo={setVideo} />)}
        </View>
      </ScrollView>
      <VideoModal id={video} onClose={() => setVideo(null)} />
    </View>
  );
}
