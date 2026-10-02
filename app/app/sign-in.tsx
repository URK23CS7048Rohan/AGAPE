import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Body, Button, Display, IconButton, Label, Press } from "@/components/ui";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/** E-mail sign-in: we send a 6-digit code, the member types it here. No passwords to forget. */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { sendCode, verifyCode } = useStore();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeSt = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(id); }, [wait]);

  const send = async () => {
    if (!isEmail(email)) { setErr(t("Please enter a valid e-mail address.")); return; }
    setBusy(true); setErr("");
    try {
      await sendCode(email);
      setStep("code"); setWait(45); setCode("");
      setTimeout(() => codeRef.current?.focus(), 350);
    } catch (e: any) {
      setErr(/rate|seconds/i.test(e?.message || "") ? t("Please wait a minute before asking for another code.") : e?.message || t("Couldn't send the code."));
    } finally { setBusy(false); }
  };

  const verify = async (c = code) => {
    if (c.length < 6) return;
    setBusy(true); setErr("");
    try {
      await verifyCode(email, c);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 50 }));
      setErr(/expired|invalid/i.test(e?.message || "") ? t("That code didn't work. Check the latest e-mail, or send a new one.") : e?.message || t("Couldn't sign in."));
      setCode("");
    } finally { setBusy(false); }
  };

  // one whole sentence for translators; the address is bolded where {email} sits
  const [sentA, sentB = ""] = t("Sent to {email}. It can take a minute, and check spam too.").split("{email}");

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.ink }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={{ position: "absolute", width: 380, height: 380, borderRadius: 190, backgroundColor: C.flame, opacity: 0.3, top: -140, right: -150 }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: C.violet, opacity: 0.3, bottom: 60, left: -150 }} />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <IconButton name="chevron-left" label={t("Back")} bg="rgba(255,255,255,0.12)" color="#fff" onPress={() => (step === "code" ? setStep("email") : router.back())} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 28 }}>
        {step === "email" ? (
          <Animated.View key="email" entering={FadeInDown.duration(500)}>
            <Label color={C.creamMuted}>{t("Sign in or create your account")}</Label>
            <Display size={40} color={C.cream} style={{ marginTop: 8 }}>{t("What's your e-mail?")}</Display>
            <Body color={C.creamMuted} style={{ marginTop: 10 }}>{t("We'll send you a 6-digit code. No password needed.")}</Body>
            <View style={{ marginTop: 26, height: 62, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1.5, borderColor: err ? C.rose : "rgba(255,255,255,0.12)", paddingHorizontal: 22, justifyContent: "center" }}>
              <TextInput
                value={email} onChangeText={(v) => { setEmail(v); setErr(""); }} onSubmitEditing={send}
                autoFocus autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="send"
                placeholder="you@example.com" placeholderTextColor="rgba(244,238,228,0.35)"
                style={{ fontFamily: F.sansMedium, fontSize: 18, color: C.cream }}
              />
            </View>
            {err ? <Body size={13.5} color="#FF9EC2" style={{ marginTop: 10, marginLeft: 8 }}>{err}</Body> : null}
            <Button label={busy ? t("Sending…") : t("Send my code")} icon="send" variant="flame" block onPress={send} disabled={busy || !email} style={{ marginTop: 18 }} />
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInRight.duration(450)}>
            <Label color={C.creamMuted}>{t("Check your inbox")}</Label>
            <Display size={40} color={C.cream} style={{ marginTop: 8 }}>{t("Enter the code.")}</Display>
            <Body color={C.creamMuted} style={{ marginTop: 10 }}>{sentA}<Body weight="semi" color={C.cream}>{email.trim()}</Body>{sentB}</Body>
            <Press onPress={() => codeRef.current?.focus()} haptic={false} scaleTo={1}>
              <Animated.View style={[{ flexDirection: "row", justifyContent: "space-between", marginTop: 28 }, shakeSt]}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const ch = code[i];
                  const active = i === code.length;
                  return (
                    <View key={i} style={{ width: 50, height: 64, borderRadius: 18, backgroundColor: ch ? C.cream : "rgba(255,255,255,0.08)", borderWidth: 2, borderColor: active ? C.sun : "transparent", alignItems: "center", justifyContent: "center" }}>
                      <Display size={32} color={C.ink}>{ch ?? ""}</Display>
                    </View>
                  );
                })}
              </Animated.View>
            </Press>
            <TextInput
              ref={codeRef} value={code} maxLength={6} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
              onChangeText={(v) => { const c = v.replace(/\D/g, "").slice(0, 6); setCode(c); setErr(""); if (c.length === 6) verify(c); }}
              style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
            />
            {err ? <Body size={13.5} color="#FF9EC2" style={{ marginTop: 12 }}>{err}</Body> : null}
            {busy ? <ActivityIndicator color={C.sun} style={{ marginTop: 22 }} /> : null}
            <Press onPress={() => (wait > 0 ? null : send())} style={{ marginTop: 22, alignSelf: "flex-start" }}>
              <Body weight="semi" color={wait > 0 ? C.creamMuted : C.sun}>{wait > 0 ? t("Send a new code in {s}s", { s: wait }) : t("Send a new code")}</Body>
            </Press>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
