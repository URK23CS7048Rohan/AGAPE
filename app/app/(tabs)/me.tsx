import React from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { C, IMG, R, onColor } from "@/theme";
import { Body, Dashes, Display, Icon, Label, Press, ScreenTitle, Sticker, Ticket } from "@/components/ui";
import { USER } from "@/data/mock";
import { useStore } from "@/lib/store";
import { isLive } from "@/lib/supabase";

const TOOLS = [
  { icon: "car-side", label: "Ride ministry", sub: "Request or give a ride", color: C.mint, route: "/rides" },
  { icon: "heart", label: "Give", sub: "Tithes, offerings & campaigns", color: C.orange, route: "/give" },
  { icon: "calendar", label: "Events", sub: "RSVP & check in", color: C.violet, route: "/events" },
  { icon: "gamepad-variant", label: "Bible games", sub: "Verse Match & trivia", color: C.sun, route: "/games" },
  { icon: "creation", label: "Ask Agape", sub: "AI Bible assistant", color: C.sky, route: "/assistant" },
  { icon: "hands-pray", label: "Prayer wall", sub: "Pray with the family", color: C.rose, route: "/prayer" },
];

/** Membership card — tilts as you drag it (wallet-pass style). */
function MemberCard() {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => { ry.value = Math.max(-18, Math.min(18, e.translationX / 8)); rx.value = Math.max(-14, Math.min(14, -e.translationY / 8)); })
    .onEnd(() => { rx.value = withSpring(0); ry.value = withSpring(0); });
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }] } as any));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ marginHorizontal: 16, marginTop: 22 }, st]}>
        <Ticket color={C.violet} at={0.58} notch={13}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Image source={IMG.logoMark} style={{ width: 24, height: 30 }} contentFit="contain" />
                </View>
                <View>
                  <Body size={16} weight="bold">Agape</Body>
                  <Label color={C.ink} size={11.5}>International Ministries</Label>
                </View>
              </View>
              <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon name="qrcode" size={38} />
              </View>
            </View>
            <Dashes color="rgba(20,20,20,0.25)" style={{ marginVertical: 18 }} />
            <Label color={C.ink}>Member since {USER.since}</Label>
            <Display size={30} style={{ marginTop: 2 }}>{USER.name}</Display>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: C.ink, borderRadius: 8, paddingHorizontal: 9, height: 26, justifyContent: "center" }}><Body size={12} weight="semi" color="#fff">{USER.memberId}</Body></View>
              <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 9, height: 26, justifyContent: "center" }}><Body size={12} weight="semi">{USER.group}</Body></View>
            </View>
          </View>
        </Ticket>
        <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -18 }}>
          <Sticker top="Member" bottom="card" bg={C.sun} size={74} rotate={-14} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Row({ icon, label, children, color = C.ink, last }: { icon: string; label: string; children?: React.ReactNode; color?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={onColor(color)} />
      </View>
      <Body weight="medium" style={{ flex: 1 }}>{label}</Body>
      {children}
    </View>
  );
}

export default function Me() {
  const insets = useSafeAreaInsets();
  const { settings, setSetting, signOut, score, guest } = useStore();

  const toggleFaceId = async (v: boolean) => {
    if (v) {
      const ok = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      if (ok) {
        const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Enable Face ID for Agape" }).catch(() => ({ success: false }));
        if (!r.success) return;
      }
    }
    setSetting("faceId", v);
  };
  const track = { true: C.mint, false: "#DCD8D0" };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title={`Hi, ${USER.first}`} sub={guest ? "Exploring as a guest" : `${USER.role} · ${USER.group} · welcome home`} />
        </Animated.View>

        <MemberCard />
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 26, gap: 10 }}>
          <Press onPress={() => Alert.alert("Wallet", "Wallet passes are issued by the backend (see README → Apple/Google Wallet).")} style={{ flex: 1, height: 50, borderRadius: 16, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="wallet" size={18} color="#fff" />
            <Body weight="semi" color="#fff" size={14}>Add to Wallet</Body>
          </Press>
          <Press onPress={() => router.push("/events")} style={{ flex: 1, height: 50, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="qrcode" size={18} />
            <Body weight="semi" size={14}>Check in</Body>
          </Press>
        </View>

        {/* stats */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 10 }}>
          {[["12", "sermons saved", C.peach], ["7", "day streak", C.sunSoft], [String(1180 + score), "game points", C.lilac]].map(([v, l, bg]) => (
            <View key={l} style={{ flex: 1, backgroundColor: bg, borderRadius: R.md, padding: 14 }}>
              <Display size={26}>{v}</Display>
              <Label>{l}</Label>
            </View>
          ))}
        </View>

        {/* tools */}
        <Display size={22} style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>Everything else</Display>
        <View style={{ marginHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TOOLS.map((t, i) => {
            const fg = onColor(t.color);
            return (
              <Animated.View key={t.label} entering={FadeInDown.delay(i * 50)} style={{ width: "48.4%" }}>
                <Press onPress={() => router.push(t.route as any)} style={{ backgroundColor: t.color, borderRadius: R.lg, padding: 14, height: 132, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={t.icon} size={20} />
                    </View>
                    <Icon name="arrow-up-right" size={18} color={fg} />
                  </View>
                  <View>
                    <Body weight="semi" size={15.5} color={fg}>{t.label}</Body>
                    <Label numberOfLines={1} color={fg} style={{ opacity: 0.8 }}>{t.sub}</Label>
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>

        {/* settings */}
        <Display size={22} style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>Settings</Display>
        <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line }}>
          <Row icon="face-recognition" label="Face ID sign-in" color={C.ink}><Switch value={settings.faceId} onValueChange={toggleFaceId} trackColor={track} thumbColor="#fff" /></Row>
          <Row icon="bell" label="Push notifications" color={C.flame}><Switch value={settings.notifications} onValueChange={(v) => setSetting("notifications", v)} trackColor={track} thumbColor="#fff" /></Row>
          <Row icon="type" label="Larger text" color={C.violet}><Switch value={settings.largeText} onValueChange={(v) => setSetting("largeText", v)} trackColor={track} thumbColor="#fff" /></Row>
          <Row icon="baby-face-outline" label="Kids mode" color={C.sun}><Switch value={settings.kidsMode} onValueChange={(v) => setSetting("kidsMode", v)} trackColor={track} thumbColor="#fff" /></Row>
          <Press onPress={() => setSetting("language", settings.language === "English" ? "العربية" : settings.language === "العربية" ? "Malayalam" : "English")}>
            <Row icon="globe" label="Language" color={C.mint}><Body color={C.muted}>{settings.language}</Body></Row>
          </Press>
          <Press onPress={() => Alert.alert("Pastoral care", "Your request is private and goes only to the pastoral team. Someone will reach out within 24 hours.")}>
            <Row icon="shield" label="Confidential pastoral care" color={C.rose} last><Icon name="chevron-right" size={18} color={C.muted} /></Row>
          </Press>
        </View>

        <Press onPress={() => { signOut(); router.replace("/welcome"); }} style={{ marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: C.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Icon name="log-out" size={17} />
          <Body weight="semi">Sign out</Body>
        </Press>
        <Label center style={{ marginTop: 14, textAlign: "center" }}>Agape International Ministries · v1.0 · {isLive ? "Connected" : "Demo data"}</Label>
      </ScrollView>
    </View>
  );
}
