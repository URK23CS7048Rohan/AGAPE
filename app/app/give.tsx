import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Bar, Body, Button, Confetti, ConfettiHandle, Display, Icon, Label, Press, Segmented, Serif } from "@/components/ui";
import { CAMPAIGNS, CHURCH } from "@/data/mock";
import { fmt } from "@/lib/time";
import { Jar } from "@/components/Motion";
import { Dimensions } from "react-native";

const JW = Math.floor((Dimensions.get("window").width - 32 - 20) / 3);

const AMOUNTS = [5, 10, 25, 50, 100];
const FUNDS = ["Tithe", "Offering", "Building Fund", "Missions", "Families in Need"];

export default function Give() {
  const [freq, setFreq] = useState(0);
  const [amount, setAmount] = useState("25");
  const [fund, setFund] = useState("Tithe");
  const [done, setDone] = useState(false);
  const confetti = useRef<ConfettiHandle>(null);

  const give = () => {
    // Production: create a payment intent server-side (Stripe / Tap / MyFatoorah for KNET) and present its sheet here.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    confetti.current?.burst(undefined, 500, 110);
    setDone(true);
    setTimeout(() => setDone(false), 3500);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Give" />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20 }}>
          <Display size={56} style={{ lineHeight: 54 }}>Give where{"\n"}<Serif size={62} color={C.flame}>it moves.</Serif></Display>
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={{ margin: 16, backgroundColor: C.ink, borderRadius: R.xl, padding: 20 }}>
          <Segmented items={["One-time", "Monthly"]} value={freq} onChange={setFreq} dark />
          <Label color={C.creamMuted} style={{ marginTop: 20, marginBottom: 10 }}>Amount</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {AMOUNTS.map((a) => {
              const on = amount === String(a);
              return (
                <Press key={a} onPress={() => setAmount(String(a))} style={{ flex: 1, height: 52, borderRadius: R.pill, backgroundColor: on ? C.cream : "transparent", borderWidth: 1.5, borderColor: on ? C.cream : "rgba(244,238,228,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Body weight="bold" size={16} color={on ? C.ink : C.cream}>{a}</Body>
                </Press>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, height: 60, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.07)", paddingHorizontal: 20 }}>
            <Label color={C.creamMuted}>{CHURCH.currency}</Label>
            <TextInput value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" style={{ flex: 1, fontFamily: F.display, fontSize: 30, color: "#fff" }} />
          </View>
          <Label color={C.creamMuted} style={{ marginTop: 20, marginBottom: 10 }}>Give to</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FUNDS.map((f) => (
              <Press key={f} onPress={() => setFund(f)} style={{ paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: fund === f ? C.sun : "rgba(255,255,255,0.08)", justifyContent: "center" }}>
                <Body size={13.5} weight="semi" color={fund === f ? C.ink : C.cream}>{f}</Body>
              </Press>
            ))}
          </View>
          <Button label={done ? "Thank you! ♥" : `Give ${CHURCH.currency} ${amount || "—"}${freq ? " / month" : ""}`} icon="heart" variant={done ? "mint" : "flame"} block onPress={give} style={{ marginTop: 20 }} disabled={!parseFloat(amount)} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
            <Icon name="shield" size={13} color={C.creamMuted} />
            <Body size={12} color={C.creamMuted}>Secure · Apple Pay · Google Pay · KNET</Body>
          </View>
        </Animated.View>
        {done ? (
          <Animated.View entering={ZoomIn.springify()} style={{ marginHorizontal: 16, marginBottom: 6, padding: 16, borderRadius: R.lg, backgroundColor: C.mintSoft }}>
            <Body weight="semi">Receipt sent to your email. {fund} · {CHURCH.currency} {amount}{freq ? " monthly" : ""}.</Body>
          </Animated.View>
        ) : null}

        <View style={{ margin: 16, marginTop: 8, borderRadius: R.xl, backgroundColor: C.flame, padding: 16, paddingTop: 20 }}>
          <Label color="rgba(255,255,255,0.85)">Campaigns · tap a jar</Label>
          <Display size={34} color="#fff" style={{ marginTop: 6, lineHeight: 34 }}>Watch it <Serif size={36} color={C.ink}>fill up.</Serif></Display>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            {CAMPAIGNS.map((c, i) => {
              const pct = c.raised / c.goal;
              const f = c.id === "build" ? "Building Fund" : c.id === "nepal" ? "Missions" : "Families in Need";
              return (
                <Animated.View key={c.id} entering={FadeInDown.delay(150 + i * 90)} style={{ width: JW, alignItems: "flex-start" }}>
                  <View style={{ alignSelf: "center", zIndex: 2, marginBottom: -22 }}>
                    <Image source={c.image} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: C.flame }} contentFit="cover" />
                  </View>
                  <Jar pct={pct} color={c.color === C.flame ? C.sun : c.color} width={JW} height={Math.round(JW * 1.6)} delay={400 + i * 200}>
                    <Display size={30} color="#fff">{Math.round(pct * 100)}<Body size={13} weight="bold" color="#fff">%</Body></Display>
                  </Jar>
                  <Press onPress={() => setFund(f)} style={{ marginTop: 10 }}>
                    <Display size={19} color="#fff" style={{ textTransform: "uppercase", lineHeight: 19 }}>{c.title}</Display>
                    <Serif size={18} color={C.ink} style={{ lineHeight: 20 }}>{c.accent}</Serif>
                    <Body size={11.5} weight="bold" color="#fff" style={{ marginTop: 4 }}>{CHURCH.currency} {fmt(c.raised)}</Body>
                    <Body size={10.5} color="rgba(255,255,255,0.8)">of {fmt(c.goal)}</Body>
                  </Press>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <Confetti ref={confetti} />
    </KeyboardAvoidingView>
  );
}
