import React from "react";
import { Dimensions, View } from "react-native";
import Animated, { Extrapolation, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { C, F, R, shadow } from "@/theme";
import { Promo } from "@/data/mock";
import { Body, Display, Icon, Label, Press, Serif } from "./ui";
import { Seal, SwipeDeck } from "./Motion";
import { t } from "@/lib/i18n";

const { width: SW } = Dimensions.get("window");
const W = SW - 36;
const H = 500;
const isLight = (hex: string) => { const h = (hex || "#000").replace("#", ""); const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16); return 0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 150; };

function Poster({ p, top, tx, i, n }: { p: Promo; top: boolean; tx: SharedValue<number>; i: number; n: number }) {
  const lt = isLight(p.accentColor);
  const ink = lt ? C.ink : "#fff";
  const photo = useAnimatedStyle(() => ({ transform: [{ translateX: top ? interpolate(tx.value, [-W, 0, W], [30, 0, -30], Extrapolation.CLAMP) : 0 }, { scale: 1.1 }] }));
  return (
    <View style={[{ flex: 1, borderRadius: 34, overflow: "hidden", backgroundColor: p.accentColor }, shadow(20, 30, 0.3, "#1a0a14")]}>
      <LinearGradient colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.6 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ paddingHorizontal: 12, height: 30, borderRadius: R.pill, justifyContent: "center", backgroundColor: lt ? "rgba(15,11,18,0.1)" : "rgba(255,255,255,0.18)", maxWidth: W - 90 }}>
          <Body size={12} weight="semi" color={ink} numberOfLines={1}>{p.kicker}</Body>
        </View>
        <Label size={10} color={ink} style={{ opacity: 0.65 }}>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</Label>
      </View>
      {/* arch photo */}
      <View style={{ marginHorizontal: 16, height: 230, borderTopLeftRadius: 200, borderTopRightRadius: 200, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.2)" }}>
        <Animated.View style={[{ position: "absolute", left: -20, right: -20, top: 0, bottom: 0 }, photo]}>
          <Image source={p.image} style={{ flex: 1 }} contentFit="cover" transition={250} />
        </Animated.View>
      </View>
      {p.sticker ? (
        <View style={{ position: "absolute", right: 14, top: 214 }}>
          <Seal text={`${p.sticker[0]} ${p.sticker[1]}`} size={92} bg={lt ? C.ink : "#fff"} color={lt ? "#fff" : C.ink}>
            <Display size={20} color={lt ? "#fff" : C.ink} style={{ textTransform: "uppercase", lineHeight: 20 }}>{p.sticker[0]}</Display>
            <Serif size={15} color={p.accentColor} style={{ lineHeight: 16 }}>{p.sticker[1]}</Serif>
          </Seal>
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
        <Display size={52} color={ink} style={{ textTransform: "uppercase", lineHeight: 48 }} numberOfLines={1}>{p.title}</Display>
        <Serif size={40} color={ink} style={{ lineHeight: 42, marginTop: -2 }}>{p.accent}</Serif>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 12 }}>
          <Body size={13.5} color={ink} numberOfLines={2} style={{ flex: 1, opacity: 0.85 }}>{p.body}</Body>
          <Press onPress={() => router.push(p.route as any)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16, paddingRight: 5, height: 46, borderRadius: R.pill, backgroundColor: lt ? C.ink : "#fff" }}>
            <Body size={13.5} weight="bold" color={lt ? "#fff" : C.ink}>{p.cta}</Body>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: C.flame }}>
              <Icon name="arrow-right" size={16} color="#fff" />
            </View>
          </Press>
        </View>
      </View>
    </View>
  );
}

/** Poster promotions you fling off the top of the stack. */
export function PromoDeck({ promos }: { promos: Promo[] }) {
  return (
    <View style={{ marginTop: 20, paddingTop: 30 }}>
      <SwipeDeck
        items={promos}
        width={W}
        height={H}
        keyOf={(p) => p.id}
        render={(p, top, tx) => <Poster p={p} top={top} tx={tx} i={promos.indexOf(p)} n={promos.length} />}
      />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
        <Icon name="chevrons-left" size={14} color={C.muted} />
        <Label size={10}>{t("Swipe the stack")}</Label>
        <Icon name="chevrons-right" size={14} color={C.muted} />
      </View>
    </View>
  );
}
