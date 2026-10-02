import React, { useEffect } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { Async, BackHeader, Body, Empty, Icon, Label, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { listNotes, markNotesRead } from "@/lib/life";
import { listAnnouncements } from "@/lib/api";
import { ago } from "@/lib/time";
import { t } from "@/lib/i18n";

const ICON: Record<string, string> = { testimony: "star", meeting: "home", serve: "heart", announcement: "volume-2" };

export default function Notifications() {
  const { signedIn } = useAuth();
  const notes = useQuery(signedIn ? "notes" : null, listNotes);
  const news = useQuery("news", listAnnouncements);
  useEffect(() => { const unread = (notes.data ?? []).filter((n) => !n.read_at && n.user_id).map((n) => n.id); if (unread.length) markNotesRead(unread); }, [notes.data]);
  const items = [
    ...(notes.data ?? []).map((n) => ({ id: n.id, kind: n.kind, title: n.payload?.title || "", body: n.payload?.body || "", route: n.payload?.route, at: n.created_at, unread: !n.read_at && !!n.user_id })),
    ...(news.data ?? []).map((a: any) => ({ id: `a${a.id}`, kind: "announcement", title: a.title, body: a.body || "", route: "/community?tab=news", at: a.created_at, unread: false })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={t("Notifications")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 8 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => { notes.reload(); news.reload(); }} />}>
        <Async q={news} empty={() => (items.length ? null : <Empty icon="bell" title={t("You're all caught up")} body={t("Church news and updates about your meetings, serving and testimonies show up here.")} />)}>
          {() => items.map((n, i) => (
            <Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 10) * 30)}>
              <Press onPress={() => n.route && router.push(n.route as any)} scaleTo={0.98} style={{ flexDirection: "row", gap: 12, backgroundColor: n.unread ? C.sunSoft : "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}><Icon name={ICON[n.kind] || "bell"} size={18} /></View>
                <View style={{ flex: 1 }}>
                  <Body weight="semi">{n.title}</Body>
                  {n.body ? <Body size={14} color={C.muted} numberOfLines={3}>{n.body}</Body> : null}
                  <Label size={11.5} style={{ marginTop: 4 }}>{ago(n.at)}</Label>
                </View>
              </Press>
            </Animated.View>
          ))}
        </Async>
      </ScrollView>
    </View>
  );
}
