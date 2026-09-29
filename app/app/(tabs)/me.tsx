import React from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { C, IMG, R, shadow } from "@/theme";
import { Body, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { USER } from "@/data/mock";
import { useStore } from "@/lib/store";
import { isLive } from "@/lib/supabase";

const TOOLS = [
  { icon: "car-side", label: "Ride ministry", sub: "Request or give a ride", color: C.mint, route: "/rides" },
  { icon: "heart", label: "Give", sub: "Tithes, offerings & campaigns", color: C.flame, route: "/give" },
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
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ marginHorizontal: 16, marginTop: 20, borderRadius: R.xl, overflow: "hidden" }, shadow(24, 30, 0.35, C.violet), st]}>
        <LinearGradient colors={[C.flame, C.rose, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, height: 210, justifyContent: "space-between" }}>
          <View style={{ position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.14)" }} />
          <View style={{ position: "absolute", left: -40, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(0,0,0,0.12)" }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image source={IMG.logoMarkLight} style={{ width: 30, height: 38 }} contentFit="contain" />
              <View>
                <Display size={22} color="#fff">Agape</Display>
                <Label color={C.sun} size={8.5}>International Ministries</Label>
              </View>
            </View>
            <Icon name="qrcode" size={30} color="#fff" />
          </View>
          <View>
            <Label color="rgba(255,255,255,0.8)">Member since {USER.since}</Label>
            <Display size={34} color="#fff" style={{ marginTop: 4 }}>{USER.name}</Display>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Label color="#fff">{USER.memberId}</Label>
              <Label color="#fff">{USER.group}</Label>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
}

function Row({ icon, label, children, color = C.ink }: { icon: string; label: string; children?: React.ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color="#fff" />
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

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 150 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 20 }}>
          <Label>{guest ? "Guest" : `${USER.role} · ${USER.group}`}</Label>
          <Display size={52} style={{ marginTop: 8, lineHeight: 50 }}>Hi, {USER.first}{"\n"}<Serif size={56} color={C.flame}>welcome home.</Serif></Display>
        </Animated.View>

        <MemberCard />
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 10 }}>
          <Press onPress={() => Alert.alert("Wallet", "Wallet passes are issued by the backend (see README → Apple/Google Wallet).")} style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="wallet" size={18} color="#fff" />
            <Body weight="semi" color="#fff" size={14}>Add to Wallet</Body>
          </Press>
          <Press onPress={() => router.push("/events")} style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="qrcode" size={18} color={C.ink} />
            <Body weight="semi" size={14}>Check in</Body>
          </Press>
        </View>

        {/* stats */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          {[["12", "sermons saved", C.peach], ["7", "day streak", C.sunSoft], [String(1180 + score), "game points", C.lilac]].map(([v, l, bg]) => (
            <View key={l} style={{ flex: 1, backgroundColor: bg, borderRadius: R.lg, padding: 14 }}>
              <Display size={30}>{v}</Display>
              <Body size={12} color={C.muted}>{l}</Body>
            </View>
          ))}
        </View>

        {/* tools */}
        <Label style={{ marginHorizontal: 20, marginTop: 26, marginBottom: 10 }}>Everything else</Label>
        <View style={{ marginHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TOOLS.map((t, i) => (
            <Animated.View key={t.label} entering={FadeInDown.delay(i * 60)} style={{ width: "48.4%" }}>
              <Press onPress={() => router.push(t.route as any)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, height: 138, justifyContent: "space-between" }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.color, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={t.icon} size={22} color={t.color === C.sun ? C.ink : "#fff"} />
                </View>
                <View>
                  <Body weight="semi" size={15.5}>{t.label}</Body>
                  <Body size={12.5} color={C.muted} numberOfLines={1}>{t.sub}</Body>
                </View>
              </Press>
            </Animated.View>
          ))}
        </View>

        {/* settings */}
        <Label style={{ marginHorizontal: 20, marginTop: 26, marginBottom: 10 }}>Settings</Label>
        <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: R.xl, paddingVertical: 6 }}>
          <Row icon="face-recognition" label="Face ID sign-in" color={C.ink}><Switch value={settings.faceId} onValueChange={toggleFaceId} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Row icon="bell" label="Push notifications" color={C.flame}><Switch value={settings.notifications} onValueChange={(v) => setSetting("notifications", v)} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Row icon="type" label="Larger text" color={C.violet}><Switch value={settings.largeText} onValueChange={(v) => setSetting("largeText", v)} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Row icon="baby-face-outline" label="Kids mode" color={C.sun}><Switch value={settings.kidsMode} onValueChange={(v) => setSetting("kidsMode", v)} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Press onPress={() => setSetting("language", settings.language === "English" ? "العربية" : settings.language === "العربية" ? "Malayalam" : "English")}>
            <Row icon="globe" label="Language" color={C.mint}><Body color={C.muted}>{settings.language}</Body></Row>
          </Press>
          <Press onPress={() => Alert.alert("Pastoral care", "Your request is private and goes only to the pastoral team. Someone will reach out within 24 hours.")}>
            <Row icon="shield" label="Confidential pastoral care" color={C.rose}><Icon name="chevron-right" size={18} color={C.muted} /></Row>
          </Press>
        </View>

        <Press onPress={() => { signOut(); router.replace("/welcome"); }} style={{ marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: R.pill, borderWidth: 1.5, borderColor: "rgba(15,11,18,0.15)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Icon name="log-out" size={17} color={C.ink} />
          <Body weight="semi">Sign out</Body>
        </Press>
        <Body size={12} color={C.muted} center style={{ marginTop: 14 }}>Agape International Ministries · v1.0 · {isLive ? "Connected" : "Demo data"}</Body>
      </ScrollView>
    </View>
  );
}
