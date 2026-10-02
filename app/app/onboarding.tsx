import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Body, Button, Chip, Display, Label } from "@/components/ui";
import { useStore } from "@/lib/store";
import { LANGS, normalizeLang, t } from "@/lib/i18n";

/** First run after sign-up: the name people see on the prayer wall, in chats and on the member card. */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { updateProfile, profile, signOut, isVolunteer, live, settings, setSetting } = useStore();
  const langCode = normalizeLang(settings.language);
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [vehicle, setVehicle] = useState(profile?.vehicle || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = name.trim().split(/\s+/).filter(Boolean).length >= 1 && name.trim().length >= 2;

  const save = async () => {
    if (!ok) return;
    setBusy(true); setErr("");
    if (!live) { router.back(); return; }
    try {
      await updateProfile({ full_name: name.trim().replace(/\s+/g, " "), phone: phone.trim() || null, ...(isVolunteer ? { vehicle: vehicle.trim() || null } : {}) });
      edit ? router.back() : router.replace("/");
    }
    catch (e: any) { setErr(e?.message || t("Couldn't save. Please try again.")); }
    finally { setBusy(false); }
  };

  const field = (label: string, value: string, set: (s: string) => void, extra: any) => (
    <View style={{ marginTop: 18 }}>
      <Label color={C.creamMuted} style={{ marginLeft: 8, marginBottom: 8 }}>{label}</Label>
      <View style={{ height: 60, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 22, justifyContent: "center" }}>
        <TextInput value={value} onChangeText={set} placeholderTextColor="rgba(244,238,228,0.35)" style={{ fontFamily: F.sansMedium, fontSize: 18, color: C.cream }} {...extra} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ink }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={{ position: "absolute", width: 380, height: 380, borderRadius: 190, backgroundColor: C.rose, opacity: 0.28, top: -140, left: -150 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 50, paddingHorizontal: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(600)}>
          <Label color={C.creamMuted}>{edit ? t("Your profile") : t("Welcome to the family")}</Label>
          <Display size={40} color={C.cream} style={{ marginTop: 8 }}>{edit ? t("Edit your details.") : t("What should we call you?")}</Display>
          <Body color={C.creamMuted} style={{ marginTop: 10 }}>{t("Your name shows on your member card, in group chats and (unless you post anonymously) on the prayer wall.")}</Body>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150).duration(600)}>
          <View style={{ marginTop: 18 }}>
            <Label color={C.creamMuted} style={{ marginLeft: 8, marginBottom: 8 }}>{t("Language")}</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
              {LANGS.map((l) => <Chip key={l.code} dark label={l.name} active={langCode === l.code} onPress={() => { if (l.code !== langCode) setSetting("language", l.code); }} />)}
            </ScrollView>
          </View>
          {field(t("Full name"), name, setName, { placeholder: "Sarah Mathews", autoFocus: true, autoCapitalize: "words", textContentType: "name", autoComplete: "name", returnKeyType: "next" })}
          {field(t("Mobile (optional, shared only with your ride driver)"), phone, setPhone, { placeholder: "+965 …", keyboardType: "phone-pad", textContentType: "telephoneNumber", autoComplete: "tel" })}
          {isVolunteer ? field(t("Your car (shown to riders)"), vehicle, setVehicle, { placeholder: "Toyota Innova · White · KW 38 7456" }) : null}
          {err ? <Body size={13.5} color="#FF9EC2" style={{ marginTop: 12 }}>{err}</Body> : null}
          <Button label={busy ? t("Saving…") : edit ? t("Save") : t("Let's go")} icon="arrow-right" variant="flame" block onPress={save} disabled={!ok || busy} style={{ marginTop: 26 }} />
          <Body size={13} color={C.creamMuted} center style={{ marginTop: 18 }}>{t("Signed in as {email}", { email: profile?.email || "" })}</Body>
          {edit ? <Button label={t("Cancel")} icon={null} variant="glass" small onPress={() => router.back()} style={{ alignSelf: "center", marginTop: 8 }} />
            : <Button label={t("Use a different account")} icon={null} variant="glass" small onPress={async () => { await signOut(); router.replace("/welcome"); }} style={{ alignSelf: "center", marginTop: 8 }} />}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
