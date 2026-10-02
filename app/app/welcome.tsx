import React, { useEffect } from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Body, Button, Icon, Poster, Press, Starburst } from "@/components/ui";
import { useStore } from "@/lib/store";

const { width: SW, height: SH } = Dimensions.get("window");

function Photo({ src, style, delay = 0, rotate = 0, color }: { src: any; style: any; delay?: number; rotate?: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 3000 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 3000 + delay, easing: Easing.inOut(Easing.sin) })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * t.value }, { rotate: `${rotate + t.value * 1.5}deg` }] } as any));
  return (
    <Animated.View entering={FadeInUp.delay(150 + delay).duration(700).springify().damping(18)} style={[{ position: "absolute", padding: 6, borderRadius: 26, backgroundColor: color }, style, st]}>
      <Image source={src} style={{ flex: 1, borderRadius: 20 }} contentFit="cover" />
    </Animated.View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { signIn } = useStore();
  const go = (guest = false) => { signIn(guest); router.replace("/"); };
  const w = SW * 0.4;
  const top = insets.top + 12;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />

      {/* collage */}
      <View style={{ height: Math.min(SH * 0.42, 380) }}>
        <Photo src={IMG.familyDay} color={C.violet} style={{ left: 16, top: top + 50, width: w, height: w * 1.25 }} rotate={-7} />
        <Photo src={IMG.squadBand} color={C.sun} delay={250} style={{ right: 16, top: top + 20, width: w, height: w * 1.15 }} rotate={6} />
        <Photo src={IMG.homeWorship} color={C.mint} delay={450} style={{ left: SW / 2 - w * 0.55, top: top + w * 0.95, width: w * 1.1, height: w * 0.8 }} rotate={-2} />
        <Animated.View entering={FadeInDown.delay(700).springify()} style={{ position: "absolute", left: SW / 2 - 52, top: top - 4 }}>
          <Starburst size={104} color={C.mint} spikes={16} spin>
            <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, lineHeight: 15, color: "#fff", textAlign: "center" }}>AGAPE{"\n"}FAMILY</Text>
          </Starburst>
        </Animated.View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 22, justifyContent: "flex-end", paddingBottom: insets.bottom + 14 }}>
        <Animated.View entering={FadeInDown.delay(250).duration(700)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Image source={IMG.logoMark} style={{ width: 26, height: 32 }} contentFit="contain" />
            <Body size={14} weight="bold">Agape International Ministries</Body>
          </View>
          <View>
            <Poster size={Math.min(78, SW * 0.19)}>Love that{"\n"}shows up.</Poster>
            <View style={{ position: "absolute", right: SW * 0.08, top: -6 }}>
              <Starburst size={62} color={C.flame} spikes={9} depth={0.55} rotate={14} />
            </View>
            <View style={{ position: "absolute", right: 4, bottom: 6 }}>
              <Icon name="star" size={34} color={C.sun} />
            </View>
          </View>
          <Body size={15.5} color={C.muted} style={{ marginTop: 12 }}>Sermons, courses, community, prayer, games and a ride to church, all in one place.</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(450).duration(700)} style={{ gap: 10, marginTop: 22 }}>
          <Button label="Continue with Apple" icon="smartphone" variant="green" block onPress={() => go()} />
          <Button label="Continue with Google" icon="globe" variant="white" block onPress={() => go()} />
          <Press onPress={() => go(true)} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
            <Body size={14} color={C.muted}>Have an email account? <Body size={14} weight="bold">Sign in</Body> · <Body size={14} weight="bold" color={C.flame}>Explore as guest</Body></Body>
          </Press>
        </Animated.View>
      </View>
    </View>
  );
}
