import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Bar, Body, Button, Confetti, ConfettiHandle, Display, Icon, Label, Press, Segmented, Serif } from "@/components/ui";
import { CAMPAIGNS, CHURCH } from "@/data/mock";
import { fmt } from "@/lib/time";

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

        <Label style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 10 }}>Campaigns</Label>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {CAMPAIGNS.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(150 + i * 80)}>
              <Press onPress={() => setFund(c.id === "build" ? "Building Fund" : c.id === "nepal" ? "Missions" : "Families in Need")} scaleTo={0.98} style={{ backgroundColor: "#fff", borderRadius: R.xl, padding: 10, flexDirection: "row", gap: 14 }}>
                <Image source={c.image} style={{ width: 100, height: 124, borderRadius: 24 }} contentFit="cover" />
                <View style={{ flex: 1, paddingVertical: 6, paddingRight: 8 }}>
                  <Display size={26}>{c.title} <Serif size={27} color={c.color}>{c.accent}</Serif></Display>
                  <Body size={13} color={C.muted} numberOfLines={2} style={{ marginTop: 2 }}>{c.body}</Body>
                  <View style={{ marginTop: 10 }}><Bar progress={c.raised / c.goal} color={c.color} delay={300 + i * 150} /></View>
                  <Body size={12.5} style={{ marginTop: 6 }}><Body size={12.5} weight="bold">{CHURCH.currency} {fmt(c.raised)}</Body> of {fmt(c.goal)} · {Math.round((c.raised / c.goal) * 100)}%</Body>
                </View>
              </Press>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <Confetti ref={confetti} />
    </KeyboardAvoidingView>
  );
}
