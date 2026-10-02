import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, R } from "@/theme";
import { Async, BackHeader, Body, Button, Display, Empty, Icon, IconButton, Label, Press, Starburst } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { KIND_COLORS, listMeetings, when } from "@/lib/life";


export default function HomePrayer() {
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const q = useQuery(signedIn ? "meetings" : null, listMeetings);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Home prayer meetings" right={signedIn ? <IconButton name="plus" bg={C.ink} color="#fff" onPress={() => router.push("/home-prayer/host")} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
        <View style={{ backgroundColor: C.mint, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -16, top: -16 }}><Starburst size={110} color={C.sun} spikes={10} depth={0.6} spin><Icon name="home" size={28} /></Starburst></View>
          <Display size={26} color="#fff" style={{ maxWidth: "72%" }}>Pray together, close to home</Display>
          <Body size={13.5} color="rgba(255,255,255,0.9)" style={{ marginTop: 4, maxWidth: "72%" }}>Join a meeting near you, or open your home. The address is shared only with people who RSVP.</Body>
        </View>
        {!signedIn ? <Empty icon="home" title="Sign in to see meetings" body="Home meetings are for signed-in members, so addresses stay private." action="Sign in" onAction={() => router.push("/auth")} /> : (
          <Async q={q} empty={(d) => (d.length ? null : <Empty icon="home" title="No meetings planned yet" body="Be the first to open your home for prayer." action="Host a meeting" onAction={() => router.push("/home-prayer/host")} />)}>
            {(list) => list.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
                <Press onPress={() => router.push(`/home-prayer/${m.id}`)} scaleTo={0.98} style={{ flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: KIND_COLORS[m.kind] || C.rose, alignItems: "center", justifyContent: "center" }}>
                    <Body weight="bold" size={18}>{new Date(m.starts_at).getDate()}</Body>
                    <Label size={10} color={C.ink}>{new Date(m.starts_at).toLocaleString(undefined, { month: "short" }).toUpperCase()}</Label>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold" size={15.5} numberOfLines={1}>{m.title}</Body>
                    <Label numberOfLines={1}>{when(m.starts_at)} · {m.area}</Label>
                    <Label numberOfLines={1}>{m.kind[0].toUpperCase() + m.kind.slice(1)} · {m.going} going{m.capacity ? ` of ${m.capacity}` : ""}{m.is_host ? " · You're hosting" : m.joined ? " · You're going" : ""}</Label>
                  </View>
                  <Icon name="chevron-right" size={18} color={C.muted} />
                </Press>
              </Animated.View>
            ))}
          </Async>
        )}
        {signedIn ? <Button label="Host a meeting" variant="ink" icon="home" block onPress={() => (needs("host a meeting") ? null : router.push("/home-prayer/host"))} style={{ marginTop: 6 }} /> : null}
      </ScrollView>
    </View>
  );
}
