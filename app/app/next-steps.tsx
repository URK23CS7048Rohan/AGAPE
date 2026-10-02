import React, { useState } from "react";
import { Alert, Modal, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Display, Icon, IconButton, Label, Press } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { mySteps, requestStep, StepKind } from "@/lib/life";
import { t } from "@/lib/i18n";

const STEPS: { kind: StepKind; title: string; body: string; icon: string; color: string }[] = [
  { kind: "salvation", title: "I've decided to follow Jesus", body: "Tell us, and someone will help you take your first steps with God.", icon: "heart", color: C.rose },
  { kind: "baptism", title: "Get baptised", body: "Join the next baptism class and celebrate your faith publicly.", icon: "droplet", color: C.sky },
  { kind: "membership", title: "Become a member", body: "Make Agape your church home.", icon: "home", color: C.mint },
  { kind: "dedication", title: "Dedicate my child", body: "Thank God for your child and commit to raising them in faith.", icon: "star", color: C.sun },
  { kind: "counselling", title: "Talk to a pastor", body: "Confidential care for whatever you're going through.", icon: "message-circle", color: C.violet },
  { kind: "wedding", title: "Plan a wedding", body: "Pre-marriage counselling and a church wedding.", icon: "gift", color: C.orange },
  { kind: "visit", title: "Request a home visit", body: "A pastor or elder can visit and pray with you.", icon: "map-pin", color: C.lilac },
];

export default function NextSteps() {
  const { signedIn, profile } = useAuth();
  const needs = useNeedsAccount();
  const mine = useQuery(signedIn ? "steps" : null, mySteps);
  const [open, setOpen] = useState<(typeof STEPS)[number] | null>(null);
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const send = async () => {
    if (!open) return;
    try { await requestStep({ kind: open.kind, name: profile?.full_name || undefined, phone: phone.trim() || undefined, details: details.trim() || undefined }); setOpen(null); setDetails(""); mine.reload(); Alert.alert(t("Thank you"), t("Someone from the church will be in touch soon.")); }
    catch (e: any) { Alert.alert(t("Couldn't send"), e.message); }
  };
  const status = (k: StepKind) => mine.data?.find((s) => s.kind === k);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={t("Next steps")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }}>
        <View style={{ backgroundColor: C.ink, borderRadius: R.xl, padding: 20 }}>
          <Display size={28} color="#fff">{t("Take your next step")}</Display>
          <Body color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>{t("Wherever you are with God, we'd love to walk with you.")}</Body>
        </View>
        {STEPS.map((s, i) => {
          const st = status(s.kind);
          return (
            <Animated.View key={s.kind} entering={FadeInDown.delay(i * 40)}>
              <Press onPress={() => (needs("take a next step") ? null : setOpen(s))} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: s.color, alignItems: "center", justifyContent: "center" }}><Icon name={s.icon} size={20} /></View>
                <View style={{ flex: 1 }}>
                  <Body weight="bold">{t(s.title)}</Body>
                  <Label numberOfLines={2}>{st ? (st.status === "new" ? t("Request sent · we'll be in touch") : st.status === "contacted" ? t("Someone has been in touch") : t("Done · praise God!")) : t(s.body)}</Label>
                </View>
                {st ? <Icon name="check-circle" size={20} color={C.mint} /> : <Icon name="chevron-right" size={18} color={C.muted} />}
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 18, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}><Body weight="bold" size={18} style={{ flex: 1 }}>{open ? t(open.title) : ""}</Body><IconButton name="x" size={38} border={C.line} onPress={() => setOpen(null)} /></View>
            <Body color={C.muted}>{open ? t(open.body) : ""}</Body>
            <TextInput value={phone} onChangeText={setPhone} placeholder={t("Phone or WhatsApp (optional)")} placeholderTextColor={C.muted} keyboardType="phone-pad" style={inp} />
            <TextInput value={details} onChangeText={setDetails} placeholder={t("Anything we should know? (optional)")} placeholderTextColor={C.muted} multiline style={[inp, { height: 100, paddingTop: 12, textAlignVertical: "top" }]} />
            <Button label={t("Send")} variant="ink" trail="send" block onPress={send} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const inp = { backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 14, height: 50, fontFamily: F.sans, fontSize: 15, color: C.ink } as const;
