import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, IMG, R } from "@/theme";
import { Body, Button, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/lib/content";
import { fmt } from "@/lib/time";

const { width: SW, height: SH } = Dimensions.get("window");

function Floating({ src, style, delay = 0, rotate = 0, arch }: { src: any; style: any; delay?: number; rotate?: number; arch?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 3200 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 3200 + delay, easing: Easing.inOut(Easing.sin) })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -12 * t.value }, { rotate: `${rotate + t.value * 2}deg` }] }));
  return (
    <Animated.View entering={FadeInUp.delay(200 + delay).duration(900).springify().damping(18)} style={[{ position: "absolute", overflow: "hidden", borderRadius: 28, borderTopLeftRadius: arch ? 999 : 28, borderTopRightRadius: arch ? 999 : 28 }, style, st]}>
      <Image source={src} style={{ flex: 1 }} contentFit="cover" />
    </Animated.View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { live, signInWith, continueAsGuest, demoSignIn } = useStore();
  const { stats } = useSiteContent();
  const [busy, setBusy] = useState<string | null>(null);
  const oauth = async (p: "apple" | "google") => {
    if (!live) { demoSignIn(); router.replace("/"); return; }
    setBusy(p);
    try { if (await signInWith(p)) router.replace("/"); }
    catch (e: any) { Alert.alert("Couldn't sign in", e?.message || "Please try again, or use your e-mail instead."); }
    finally { setBusy(null); }
  };
  const email = () => (live ? router.push("/sign-in") : (demoSignIn(), router.replace("/")));
  const guest = () => { continueAsGuest(); router.replace("/"); };
  const w = SW * 0.38;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <View style={{ position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: C.flame, opacity: 0.35, top: -120, right: -160 }} />
      <View style={{ position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: C.violet, opacity: 0.35, top: SH * 0.25, left: -180 }} />

      {/* collage */}
      <View style={{ height: SH * 0.46 }}>
        <Floating src={IMG.familyDay} arch style={{ left: 18, top: insets.top + 70, width: w, height: w * 1.45 }} rotate={-6} />
        <Floating src={IMG.homeWorship} arch delay={200} style={{ left: SW / 2 - w / 2, top: insets.top + 24, width: w, height: w * 1.7 }} />
        <Floating src={IMG.squadBand} arch delay={400} style={{ right: 18, top: insets.top + 90, width: w, height: w * 1.35 }} rotate={6} />
        <Animated.View entering={FadeInDown.delay(900).springify()} style={{ position: "absolute", left: 24, top: insets.top + 30, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", paddingLeft: 6, paddingRight: 14, height: 40, borderRadius: R.pill }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}><Icon name="car-side" size={15} color="#fff" /></View>
          <Body size={13} weight="semi">{fmt(stats.rides)} rides to church</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(1100).springify()} style={{ position: "absolute", right: 20, bottom: 10, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", paddingLeft: 6, paddingRight: 14, height: 40, borderRadius: R.pill }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.rose, alignItems: "center", justifyContent: "center" }}><Icon name="hands-pray" size={15} color="#fff" /></View>
          <Body size={13} weight="semi">{fmt(stats.prayers)} prayers</Body>
        </Animated.View>
      </View>
      <LinearGradient colors={["transparent", C.ink]} style={{ position: "absolute", left: 0, right: 0, top: SH * 0.3, height: SH * 0.18 }} />

      <View style={{ flex: 1, paddingHorizontal: 22, justifyContent: "flex-end", paddingBottom: insets.bottom + 18 }}>
        <Animated.View entering={FadeInDown.delay(300).duration(800)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={IMG.logoMarkLight} style={{ width: 40, height: 50 }} contentFit="contain" />
            <View>
              <Display size={22} color={C.cream}>Agape</Display>
              <Label color={C.creamMuted} size={9.5}>International Ministries</Label>
            </View>
          </View>
          <Display size={78} color={C.cream} style={{ marginTop: 6, lineHeight: 72 }}>
            Love that{"\n"}<Serif size={86} color={C.flame}>shows up.</Serif>
          </Display>
          <Body size={16} color={C.creamMuted} style={{ marginTop: 10 }}>Sermons, courses, community, prayer, games and a ride to church, all in one place.</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(500).duration(800)} style={{ gap: 10, marginTop: 24 }}>
          <Button label={busy === "apple" ? "Opening Apple…" : "Continue with Apple"} icon="smartphone" variant="white" block onPress={() => oauth("apple")} disabled={!!busy} />
          <Button label={busy === "google" ? "Opening Google…" : "Continue with Google"} icon="globe" variant="glass" block onPress={() => oauth("google")} disabled={!!busy} />
          {busy ? <ActivityIndicator color={C.sun} style={{ marginTop: 4 }} /> : null}
          <Press onPress={email} style={{ height: 54, borderRadius: R.pill, borderWidth: 1.5, borderColor: "rgba(244,238,228,0.25)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Icon name="mail" size={18} color={C.cream} />
            <Body weight="semi" color={C.cream}>Continue with e-mail</Body>
          </Press>
          <Press onPress={guest} style={{ height: 40, alignItems: "center", justifyContent: "center", marginTop: -4 }}>
            <Body weight="semi" color={C.sun}>Explore as guest</Body>
          </Press>
          <Body size={11.5} color="rgba(244,238,228,0.45)" center>By continuing you agree to the church's privacy policy. You can delete your account any time in Me → Settings.</Body>
        </Animated.View>
      </View>
    </View>
  );
}
