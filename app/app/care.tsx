import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Chip, Display, Icon, Label, LargeTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/lib/content";
import { requestCare } from "@/lib/api";
import { t } from "@/lib/i18n";

const KINDS = [["visit", "A visit"], ["counselling", "Someone to talk to"], ["hospital", "Hospital visit"], ["prayer", "Private prayer"], ["other", "Something else"]] as const;

/** Confidential pastoral care: goes only to staff (row-level security), never to the prayer wall. */
export default function Care() {
  const { needsAccount, profile } = useStore();
  const church = useSiteContent().church;
  const [kind, setKind] = useState<string>("visit");
  const [details, setDetails] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!details.trim() || needsAccount(t("ask the pastors for care"))) return;
    setBusy(true);
    try { await requestCare(kind, details.trim(), phone.trim()); setSent(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e: any) { Alert.alert(t("Not sent"), e?.message || t("Please try again.")); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.roseSoft }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={t("Pastoral care")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <LargeTitle label={t("Confidential care")} title={t("We're here for you.")} style={{ paddingHorizontal: 4 }} />
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 14 }}>
          <Icon name="lock" size={18} color={C.rose} />
          <Body size={14} color={C.muted} style={{ flex: 1 }}>{t("Private. Only the pastoral team can read this. It never appears on the prayer wall.")}</Body>
        </View>
        {sent ? (
          <Animated.View entering={ZoomIn.springify()} style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.xl, padding: 22 }}>
            <Display size={28} color={C.cream}>{t("Thank you. We'll be in touch.")}</Display>
            <Body color={C.creamMuted} style={{ marginTop: 8 }}>{t("A pastor will reach out within a day.")}{church.phone ? ` ${t("If it's urgent, call {phone}.", { phone: church.phone })}` : ""} {t("In an emergency, call 112.")}</Body>
            <Button label={t("Done")} icon="check" variant="white" small onPress={() => router.back()} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Label style={{ marginTop: 22, marginBottom: 10, marginLeft: 4 }}>{t("How can we help?")}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {KINDS.map(([k, l]) => <Chip key={k} label={t(l)} active={kind === k} color={C.rose} onPress={() => setKind(k)} />)}
            </View>
            <View style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 16 }}>
              <TextInput value={details} onChangeText={setDetails} multiline maxLength={2000} placeholder={t("Tell us a little about what's going on. Share as much or as little as you like.")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, minHeight: 130, textAlignVertical: "top", color: C.ink }} />
            </View>
            <View style={{ marginTop: 10, backgroundColor: "#fff", borderRadius: R.pill, paddingHorizontal: 18, height: 54, justifyContent: "center" }}>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t("Best number to reach you (optional)")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
            </View>
            <Button label={busy ? t("Sending…") : t("Send to the pastors")} icon="send" variant="rose" block disabled={!details.trim() || busy} onPress={send} style={{ marginTop: 16 }} />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
