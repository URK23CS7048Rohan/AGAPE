import React, { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Bar, Body, Button, Chip, Confetti, ConfettiHandle, Display, Icon, Label, LargeTitle, Press, Segmented, Serif } from "@/components/ui";
import { fmt } from "@/lib/time";
import { useSiteContent } from "@/lib/content";
import { useCounts } from "@/lib/data";
import { giveOnline } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Jar } from "@/components/Motion";
import { Dimensions } from "react-native";

const JW = Math.floor((Dimensions.get("window").width - 32 - 20) / 3);

const AMOUNTS = [5, 10, 25, 50, 100];

export default function Give() {
  const site = useSiteContent();
  const CHURCH = site.church;
  const totals = useCounts("giving_totals");
  const CAMPAIGNS = site.campaigns.map((c) => ({ ...c, raised: c.raised + (totals.data[c.key] ?? 0) }));
  const FUNDS = ["Tithe", "Offering", ...CAMPAIGNS.map((c) => `${c.title} ${c.accent}`.trim())];
  const fundLabel = (f: string) => (f === "Tithe" || f === "Offering" ? t(f) : f);
  const [amount, setAmount] = useState("25");
  const [fund, setFund] = useState("Tithe");
  const [done, setDone] = useState<null | string>(null);
  const [busy, setBusy] = useState(false);
  const confetti = useRef<ConfettiHandle>(null);

  const give = async () => {
    const n = Math.round(parseFloat(amount) * 1000) / 1000;
    if (!(n >= 1)) { Alert.alert(t("Amount"), t("Please give at least {amount}.", { amount: `${CHURCH.currency} 1` })); return; }
    const camp = CAMPAIGNS.find((c) => `${c.title} ${c.accent}`.trim() === fund);
    setBusy(true);
    try {
      const r = await giveOnline({ amount: n, currency: CHURCH.currency, fund, campaignKey: camp?.key, campaignTitle: camp ? fund : undefined, frequency: "once" });
      if (r.status === "succeeded" || r.status === "demo") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        confetti.current?.burst(undefined, 500, 110);
        setDone(r.status === "demo" ? t("Demo mode: no payment was taken.") : t("Received with thanks. {fund} · {amount}. A receipt is in your e-mail from the payment provider.", { fund: fundLabel(fund), amount: `${CHURCH.currency} ${n}` }));
        totals.reload();
        setTimeout(() => setDone(null), 6000);
      } else if (r.status === "failed") {
        Alert.alert(t("Payment didn't go through"), t("Nothing was charged. You can try again, or use a different card."));
      } else if (r.status === "pending") {
        setDone(t("We're confirming your payment with the bank. You'll get a notification when it's received."));
      }
    } catch (e: any) {
      Alert.alert(t("Giving"), e?.message || t("Couldn't start the payment. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={t("Give")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LargeTitle label={t("Tithes, offerings & campaigns")} title={t("Give")} />

        <Animated.View entering={FadeInDown.delay(100)} style={{ margin: 16, backgroundColor: C.ink, borderRadius: R.xl, padding: 20 }}>
          <Label color={C.creamMuted} style={{ marginBottom: 10 }}>{t("Amount")}</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {AMOUNTS.map((a) => {
              const on = amount === String(a);
              return (
                <Button key={a} label={String(a)} variant={on ? "white" : "glass"} onPress={() => setAmount(String(a))} style={{ flex: 1, paddingHorizontal: 0 }} />
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, height: 60, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.07)", paddingHorizontal: 20 }}>
            <Label color={C.creamMuted}>{CHURCH.currency}</Label>
            <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" style={{ flex: 1, fontFamily: F.display, fontSize: 30, color: "#fff" }} />
          </View>
          <Label color={C.creamMuted} style={{ marginTop: 20, marginBottom: 10 }}>{t("Give to")}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FUNDS.map((f) => (
              <Chip key={f} dark label={fundLabel(f)} active={fund === f} onPress={() => setFund(f)} />
            ))}
          </View>
          <Button label={busy ? t("Opening secure payment…") : done ? `${t("Thank you!")} ♥` : t("Give {amount}", { amount: `${CHURCH.currency} ${amount || "—"}` })} icon="heart" variant={done ? "mint" : "flame"} block onPress={give} style={{ marginTop: 20 }} disabled={!parseFloat(amount) || busy} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
            <Icon name="shield" size={13} color={C.creamMuted} />
            <Body size={12} color={C.creamMuted}>{t("Secure checkout")} · KNET · Visa · Mastercard · Apple Pay</Body>
          </View>
        </Animated.View>
        {done ? (
          <Animated.View entering={ZoomIn.springify()} style={{ marginHorizontal: 16, marginBottom: 6, padding: 16, borderRadius: R.lg, backgroundColor: C.mintSoft }}>
            <Body weight="semi">{done}</Body>
          </Animated.View>
        ) : null}

        <View style={{ margin: 16, marginTop: 8, borderRadius: R.xl, backgroundColor: C.flame, padding: 16, paddingTop: 20 }}>
          <Label color="rgba(255,255,255,0.85)">{t("Campaigns · tap a jar")}</Label>
          <Display size={28} color="#fff" style={{ marginTop: 6 }}>{t("Watch it fill up.")}</Display>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            {CAMPAIGNS.map((c, i) => {
              const pct = Math.min(1, c.raised / Math.max(1, c.goal));
              const f = `${c.title} ${c.accent}`.trim();
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
                    <Body size={10.5} color="rgba(255,255,255,0.8)">{t("of {n}", { n: fmt(c.goal) })}</Body>
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
