import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R, onColor } from "@/theme";
import { Async, Avatar, Body, Display, Empty, Icon, IconButton, Label, Press, ScreenTitle, Segmented, Starburst, Ticket } from "@/components/ui";
import { imageSource, useSiteContent } from "@/lib/content";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { joinGroup, listAnnouncements, listGroups, myChats } from "@/lib/api";
import { ago, fmt } from "@/lib/time";
import { t } from "@/lib/i18n";

const GROUP_COLORS = [C.rose, C.mint, C.flame, C.sun, C.violet, C.sky];
const TABS = ["chats", "groups", "news"];

export default function Community() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const { stats } = useSiteContent();
  const [tab, setTab] = useState(Math.max(0, TABS.indexOf(params.tab || "")));
  useEffect(() => { if (params.tab && TABS.includes(params.tab)) setTab(TABS.indexOf(params.tab)); }, [params.tab]);
  const chats = useQuery(signedIn && tab === 0 ? "chats" : null, myChats, 5000);
  const groups = useQuery(tab === 1 ? "groups" : null, listGroups);
  const news = useQuery(tab === 2 ? "news" : null, listAnnouncements);
  const [busy, setBusy] = useState<string | null>(null);

  const toggleJoin = async (id: string, join: boolean) => {
    if (needs("join groups")) return;
    setBusy(id);
    try { await joinGroup(id, join); await groups.reload(); }
    catch (e: any) { Alert.alert(t("Couldn't update"), e.message); }
    finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { chats.reload(); groups.reload(); news.reload(); }} />}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title={t("Family")} sub={t("Your groups, chats and church news")} right={<IconButton name="edit-3" bg={C.ink} color="#fff" onPress={() => (needs("message people") ? null : router.push("/chat/new"))} />} />
        </Animated.View>

        {/* Prayer wall entry */}
        <Animated.View entering={FadeInDown.delay(80)} style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Press onPress={() => router.push("/prayer")} scaleTo={0.98}>
            <Ticket color={C.rose} at={0.5}>
              <View style={{ flexDirection: "row", alignItems: "center", padding: 18, gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Label color={C.ink}>{t("Prayer wall")}{stats.prayers ? ` · ${fmt(stats.prayers)} prayers` : ""}</Label>
                  <Display size={26} style={{ marginTop: 4 }}>{t("Share a request")}</Display>
                  <Body size={13.5} style={{ marginTop: 4 }}>{t("Pray for others, and let the family pray for you.")}</Body>
                </View>
                <Starburst size={70} color={C.ink} rotate={-8}><Icon name="hands-pray" size={28} color={C.rose} /></Starburst>
              </View>
            </Ticket>
          </Press>
        </Animated.View>

        <View style={{ marginHorizontal: 16, marginTop: 18 }}>
          <Segmented items={[t("Chats"), t("Groups"), t("News")]} value={tab} onChange={setTab} />
        </View>

        {tab === 0 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14 }}>
            {!signedIn ? (
              <Empty icon="message-circle" title={t("Chat with the family")} body={t("Sign in to message members and talk with your groups.")} action={t("Sign in")} onAction={() => router.push("/auth")} />
            ) : (
              <Async q={chats} empty={(d) => (d.length ? null : <Empty icon="message-circle" title={t("No chats yet")} body={t("Join a group to get its chat, or tap ✎ to message someone.")} action={t("Browse groups")} onAction={() => setTab(1)} />)}>
                {(list) => (
                  <View style={{ backgroundColor: "#fff", borderRadius: R.lg, paddingVertical: 4, borderWidth: 1.5, borderColor: C.line }}>
                    {list.map((c, i) => (
                      <View key={c.id}>
                        {i ? <View style={{ height: 1, backgroundColor: C.line, marginLeft: 76 }} /> : null}
                        <Press onPress={() => router.push(`/chat/${c.id}`)} scaleTo={0.985} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                          <View>
                            <Avatar name={c.name} color={c.kind === "announcement" ? C.ink : c.kind === "group" ? C.violet : C.sun} size={50} />
                            {c.kind !== "direct" ? <View style={{ position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.sun, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name={c.kind === "group" ? "users" : "volume-2"} size={10} /></View> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Body weight="semi" size={16} numberOfLines={1}>{c.name}</Body>
                            <Label numberOfLines={1} size={13.5}>{c.last_body ? `${c.kind === "direct" ? "" : `${c.last_sender?.split(" ")[0]}: `}${c.last_body}` : c.kind === "group" ? `${c.members} member${c.members === 1 ? "" : "s"} · say hello!` : t("No messages yet")}</Label>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <Label size={12}>{ago(c.last_at)}</Label>
                            {c.unread ? <View style={{ minWidth: 22, height: 22, borderRadius: 8, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Body size={11.5} weight="bold" color="#fff">{c.unread}</Body></View> : null}
                          </View>
                        </Press>
                      </View>
                    ))}
                  </View>
                )}
              </Async>
            )}
          </Animated.View>
        ) : null}

        {tab === 1 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            <Async q={groups} empty={(d) => (d.length ? null : <Empty icon="users" title={t("No groups yet")} body={t("Groups and ministries will appear here once the team adds them.")} />)}>
              {(list) => list.map((g, i) => {
                const color = g.color || GROUP_COLORS[i % GROUP_COLORS.length];
                const fg = onColor(color);
                return (
                  <Animated.View key={g.id} entering={FadeInDown.delay(i * 50)}>
                    <View style={{ backgroundColor: color, borderRadius: R.lg, padding: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Image source={imageSource(g.cover_url, IMG.families)} style={{ width: 96, height: 96, borderRadius: 18 }} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Display size={20} color={fg} numberOfLines={2}>{g.name}</Display>
                        <Label color={fg} style={{ marginTop: 2, opacity: 0.85 }} numberOfLines={1}>{[g.members ? `${g.members} member${g.members === 1 ? "" : "s"}` : null, g.meets].filter(Boolean).join(" · ") || g.description}</Label>
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                          <Press onPress={() => toggleJoin(g.id, !g.joined)} disabled={busy === g.id} style={{ paddingHorizontal: 14, height: 34, borderRadius: 11, backgroundColor: g.joined ? "#fff" : C.ink, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 6, opacity: busy === g.id ? 0.6 : 1 }}>
                            <Icon name={g.joined ? "check" : "plus"} size={14} color={g.joined ? C.ink : "#fff"} />
                            <Body size={13} weight="bold" color={g.joined ? C.ink : "#fff"}>{g.joined ? t("Joined") : t("Join")}</Body>
                          </Press>
                          {g.joined ? (
                            <Press onPress={() => setTab(0)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.6)", justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Icon name="message-circle" size={14} />
                              <Body size={13} weight="bold">{t("Chat")}</Body>
                            </Press>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </Async>
          </Animated.View>
        ) : null}

        {tab === 2 ? (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 16, marginTop: 14, gap: 12 }}>
            <Async q={news} empty={(d) => (d.length ? null : <Empty icon="bell" title={t("No news yet")} body={t("Church announcements will show up here.")} />)}>
              {(list) => list.map((a, i) => (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 60)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length], borderRadius: 8, paddingHorizontal: 9, height: 24, justifyContent: "center" }}>
                      <Body size={11.5} weight="bold" color={onColor(GROUP_COLORS[i % GROUP_COLORS.length])}>{t("Announcement")}</Body>
                    </View>
                    <Label size={12}>{ago(a.created_at)}</Label>
                  </View>
                  <Body size={17} weight="semi" style={{ marginTop: 10 }}>{a.title}</Body>
                  {a.body ? <Body size={14.5} color={C.muted} style={{ marginTop: 4 }}>{a.body}</Body> : null}
                </Animated.View>
              ))}
            </Async>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}
