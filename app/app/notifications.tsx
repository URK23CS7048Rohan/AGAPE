import React, { useEffect } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { BackHeader, Body, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useNotifications } from "@/lib/data";
import { markNotificationsSeen } from "@/lib/api";

const KIND: Record<string, { icon: string; color: string }> = {
  ride: { icon: "car-side", color: C.mint }, ride_request: { icon: "steering", color: C.mint }, message: { icon: "message-circle", color: C.violet },
  announcement: { icon: "volume-2", color: C.flame }, prayed: { icon: "hands-pray", color: C.rose }, giving: { icon: "heart", color: C.sun },
  volunteer: { icon: "award", color: C.sky },
};

export default function Notifications() {
  const { session, profile, refreshProfile, live } = useStore();
  const { data, loading } = useNotifications(session?.user.id ?? null);
  const seen = profile?.notifications_seen_at;
  useEffect(() => { if (session) markNotificationsSeen().then(refreshProfile).catch(() => {}); }, [session?.user.id]);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <BackHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} showsVerticalScrollIndicator={false}>
        <Display size={52} style={{ lineHeight: 50, marginBottom: 6, marginLeft: 4 }}>What's <Serif size={56} color={C.flame}>new.</Serif></Display>
        {!session ? (
          <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 18 }}>
            <Body weight="semi">{live ? "Sign in to get ride updates, chat messages and church news here." : "Notifications appear here in the live app."}</Body>
            {live ? <Press onPress={() => router.push("/welcome")} style={{ marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 18, height: 42, borderRadius: R.pill, backgroundColor: C.ink, justifyContent: "center" }}><Body weight="semi" color="#fff">Sign in</Body></Press> : null}
          </View>
        ) : null}
        {session && !loading && data.length === 0 ? <Body color={C.muted} center style={{ marginTop: 30 }}>You're all caught up.</Body> : null}
        {data.map((n, i) => {
          const k = KIND[n.kind] || { icon: "bell", color: C.ink };
          const fresh = seen ? n.createdAt > seen : false;
          return (
            <Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
              <Press onPress={() => n.route && router.push(n.route as any)} scaleTo={0.98} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: fresh ? 2 : 0, borderColor: C.flame }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: k.color, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={k.icon} size={19} color={k.color === C.sun ? C.ink : "#fff"} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Body weight="semi" style={{ flex: 1 }} numberOfLines={1}>{n.title}</Body>
                    <Label size={10}>{n.time}</Label>
                  </View>
                  {n.body ? <Body size={14} color={C.muted} style={{ marginTop: 2 }}>{n.body}</Body> : null}
                </View>
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}
