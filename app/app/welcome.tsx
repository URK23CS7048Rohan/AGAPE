import React from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Body, Button, Icon, Press, Starburst } from "@/components/ui";
import { GoogleButton } from "@/components/GoogleButton";
import { LanguageButton } from "@/components/LanguagePicker";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

const { width: SW, height: SH } = Dimensions.get("window");
const BG = "#FFFFFF";

/** Giant faded letters scattered behind the type, like the poster backdrop. */
const LETTERS: { ch: string; style: any }[] = [
  { ch: "A", style: { left: -SW * 0.12, top: SH * 0.08, transform: [{ rotate: "-14deg" }] } },
  { ch: "G", style: { right: -SW * 0.16, top: SH * 0.2, transform: [{ rotate: "12deg" }] } },
  { ch: "P", style: { left: SW * 0.18, top: SH * 0.5, transform: [{ rotate: "8deg" }] } },
  { ch: "E", style: { right: -SW * 0.08, top: SH * 0.56, transform: [{ rotate: "-10deg" }] } },
];

/** Big poster word; each line slides up in turn. */
function Line({ children, size, delay }: { children: React.ReactNode; size: number; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(650).springify().damping(16)}>
      <Text style={{ fontFamily: F.poster, fontSize: size, lineHeight: size * 0.86, color: C.ink, textTransform: "uppercase", letterSpacing: -size * 0.01, includeFontPadding: false }}>{children}</Text>
    </Animated.View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();
  const guest = () => { continueAsGuest(); router.replace("/"); };
  // Sized so the three lines fill the width on any phone without crowding the buttons.
  const size = Math.round(Math.min(SW * 0.36, (SH - insets.top - insets.bottom - 330) / 2.9, 170));

  return (
    <View style={{ flex: 1, backgroundColor: BG, overflow: "hidden" }}>
      <StatusBar style="dark" />

      {LETTERS.map((l, i) => (
        <Animated.Text key={l.ch} entering={FadeIn.delay(100 + i * 120).duration(900)} style={[{ position: "absolute", fontFamily: F.poster, fontSize: SW * 0.78, lineHeight: SW * 0.8, color: C.lilac }, l.style]}>
          {l.ch}
        </Animated.Text>
      ))}

      {/* top bar */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Image source={IMG.logoMark} style={{ width: 24, height: 30 }} contentFit="contain" />
        <Body size={13.5} weight="bold" style={{ flex: 1 }}>{t("Agape International")}{"\n"}{t("Ministries")}</Body>
      </View>
      <Animated.View entering={ZoomIn.delay(700).springify().damping(12)} style={{ position: "absolute", right: 14, top: insets.top + 4 }}>
        <Starburst size={104} color={C.mint} spikes={16} spin>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, lineHeight: 15, color: "#fff", textAlign: "center" }}>{t("ALL ARE")}{"\n"}{t("WELCOME")}</Text>
        </Starburst>
      </Animated.View>

      {/* poster */}
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 22, paddingTop: 40 }}>
        <View>
          {/* the burst sits behind the letters so every word stays readable */}
          <Animated.View entering={ZoomIn.delay(900).springify().damping(10)} style={{ position: "absolute", left: size * 0.9, top: size * 1.74 }}>
            <Starburst size={size * 0.6} color={C.flame} spikes={9} depth={0.5} rotate={12} />
          </Animated.View>
          <Line size={size} delay={150}>{t("Love")}</Line>
          <Line size={size} delay={300}>{t("Shows")}</Line>
          <Line size={size} delay={450}>{t("Up.")}</Line>

          {/* tilted connector word, like the poster's "TO" */}
          <Animated.View entering={FadeIn.delay(800)} style={{ position: "absolute", left: size * 1.62, top: size * 0.44, transform: [{ rotate: "-24deg" }] }}>
            <Text style={{ fontFamily: F.poster, fontSize: size * 0.42, lineHeight: size * 0.42, color: C.ink, textTransform: "uppercase" }}>{t("that")}</Text>
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(1050).springify().damping(10)} style={{ position: "absolute", left: size * 1.56, top: size * 1.72, transform: [{ rotate: "14deg" }] }}>
            <Icon name="star" size={size * 0.36} color={C.sun} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(1150).springify().damping(10)} style={{ position: "absolute", left: size * 1.5, top: size * 2.18, transform: [{ rotate: "-10deg" }] }}>
            <View style={{ backgroundColor: C.violet, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Body size={13} weight="bold">{t("every Sunday")}</Body>
            </View>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(600).duration(700)}>
          <Body size={15} color={C.muted} style={{ marginTop: 18, maxWidth: 320 }}>{t("Sermons, courses, prayer, games and a ride to church. All in one place.")}</Body>
        </Animated.View>
      </View>

      {/* actions */}
      <Animated.View entering={FadeInDown.delay(750).duration(700)} style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 12, gap: 10 }}>
        <View>
          <Button label={t("Create a free account")} icon="user-plus" variant="green" block onPress={() => router.push("/auth?mode=signup")} />
          {/* ticket notches cut into the button, as in the reference */}
          <View pointerEvents="none" style={{ position: "absolute", left: 46, top: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: BG }} />
          <View pointerEvents="none" style={{ position: "absolute", left: 46, bottom: -7, width: 14, height: 14, borderRadius: 7, backgroundColor: BG }} />
        </View>
        <GoogleButton />
        <Button label={t("Sign in with email")} icon="log-in" variant="white" block onPress={() => router.push("/auth")} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <LanguageButton />
        <Press onPress={guest} style={{ height: 40, alignItems: "center", justifyContent: "center" }}>
          <Body size={13.5} color={C.muted}>{t("Just looking?")} <Body size={13.5} weight="bold" color={C.flame}>{t("Explore as a guest")}</Body></Body>
        </Press>
        </View>
      </Animated.View>
    </View>
  );
}
