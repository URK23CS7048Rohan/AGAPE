import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Bar, Body, Button, Confetti, ConfettiHandle, Display, Icon, Label, Press, Segmented, Sticker } from "@/components/ui";
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Give" />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
          <Display size={32}>Give where it moves.</Display>
          <Label style={{ marginTop: 2 }}>Every gift goes straight to the ministry you choose.</Label>
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={{ margin: 16, marginTop: 18 }}>
          <View style={{ backgroundColor: C.orange, borderRadius: R.xl, padding: 16 }}>
            <Segmented items={["One-time", "Monthly"]} value={freq} onChange={setFreq} />
            <Body size={13} weight="semi" style={{ marginTop: 18, marginBottom: 8 }}>Amount</Body>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {AMOUNTS.map((a) => {
                const on = amount === String(a);
                return (
                  <Press key={a} onPress={() => setAmount(String(a))} style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: on ? C.ink : "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Body weight="bold" size={16} color={on ? "#fff" : C.ink}>{a}</Body>
                  </Press>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, height: 64, borderRadius: 16, backgroundColor: "#fff", paddingHorizontal: 16 }}>
              <View style={{ backgroundColor: C.sunSoft, borderRadius: 8, paddingHorizontal: 8, height: 26, justifyContent: "center" }}><Body size={12.5} weight="bold">{CHURCH.currency}</Body></View>
              <TextInput value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" style={{ flex: 1, fontFamily: F.display, fontSize: 30, color: C.ink }} />
            </View>
            <Body size={13} weight="semi" style={{ marginTop: 18, marginBottom: 8 }}>Give to</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {FUNDS.map((f) => (
                <Press key={f} onPress={() => setFund(f)} style={{ paddingHorizontal: 13, height: 36, borderRadius: 12, backgroundColor: fund === f ? C.ink : "rgba(255,255,255,0.7)", justifyContent: "center" }}>
                  <Body size={13.5} weight="semi" color={fund === f ? "#fff" : C.ink}>{f}</Body>
                </Press>
              ))}
            </View>
            <Button label={done ? "Thank you! ♥" : `Give ${CHURCH.currency} ${amount || "—"}${freq ? " / month" : ""}`} icon="heart" variant={done ? "green" : "ink"} block onPress={give} style={{ marginTop: 18 }} disabled={!parseFloat(amount)} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
              <Icon name="shield" size={13} />
              <Body size={12}>Secure · Apple Pay · Google Pay · KNET</Body>
            </View>
          </View>
          <View pointerEvents="none" style={{ position: "absolute", right: -6, top: -18 }}>
            <Sticker top="Give" bottom="with joy" bg={C.violet} size={80} />
          </View>
        </Animated.View>
        {done ? (
          <Animated.View entering={ZoomIn.springify()} style={{ marginHorizontal: 16, marginBottom: 6, padding: 16, borderRadius: 16, backgroundColor: C.mintSoft }}>
            <Body weight="semi">Receipt sent to your email. {fund} · {CHURCH.currency} {amount}{freq ? " monthly" : ""}.</Body>
          </Animated.View>
        ) : null}

        <Display size={22} style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 12 }}>Campaigns</Display>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {CAMPAIGNS.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(150 + i * 70)}>
              <Press onPress={() => setFund(c.id === "build" ? "Building Fund" : c.id === "nepal" ? "Missions" : "Families in Need")} scaleTo={0.98} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 10, flexDirection: "row", gap: 12, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ width: 96, height: 116, borderRadius: 18, backgroundColor: c.color, padding: 5 }}>
                  <Image source={c.image} style={{ flex: 1, borderRadius: 13 }} contentFit="cover" />
                </View>
                <View style={{ flex: 1, paddingVertical: 4, paddingRight: 6 }}>
                  <Body size={16} weight="semi">{c.title} {c.accent}</Body>
                  <Label numberOfLines={2} style={{ marginTop: 2 }}>{c.body}</Label>
                  <View style={{ marginTop: 10 }}><Bar progress={c.raised / c.goal} color={c.color} height={8} delay={300 + i * 150} /></View>
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
