import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Display, Icon, Label, Press, Segmented, Starburst } from "@/components/ui";
import { useAuth } from "@/lib/auth";

function Field({ icon, ...p }: { icon: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 56, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 16 }}>
      <Icon name={icon} size={18} color={C.muted} />
      <TextInput placeholderTextColor="rgba(20,20,20,0.4)" style={{ flex: 1, fontFamily: F.sans, fontSize: 16, color: C.ink }} {...p} />
    </View>
  );
}

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState(params.mode === "signup" ? 1 : 0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const signup = mode === 1;

  const submit = async () => {
    setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: "Enter a valid email address." });
    if (password.length < 8) return setMsg({ text: "Use a password of at least 8 characters." });
    if (signup && name.trim().length < 2) return setMsg({ text: "Tell us your name." });
    setBusy(true);
    try {
      if (signup) {
        const { needsConfirm } = await signUp(name, email, password);
        if (needsConfirm) { setMsg({ ok: true, text: "Almost there! We sent a link to your email. Tap it to confirm your account, then sign in here." }); setMode(0); return; }
      } else await signIn(email, password);
      if (router.canDismiss()) router.dismissAll();
      router.replace("/");
    } catch (e: any) {
      const m = String(e?.message || "");
      setMsg({ text: /invalid login/i.test(m) ? "That email and password don't match." : /not confirmed/i.test(m) ? "Please confirm your email first. Check your inbox for our link." : m || "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: "Type your email above first, then tap “Forgot password”." });
    try { await resetPassword(email); setMsg({ ok: true, text: "We sent a password reset link to your email." }); }
    catch (e: any) { setMsg({ text: e?.message || "Couldn't send the reset email." }); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={signup ? "Create account" : "Sign in"} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(500)} style={{ backgroundColor: C.violet, borderRadius: R.xl, padding: 20, overflow: "hidden", marginBottom: 8 }}>
          <View style={{ position: "absolute", right: -16, top: -16 }}>
            <Starburst size={110} color={C.sun} spikes={14} spin><Icon name={signup ? "user-plus" : "log-in"} size={30} /></Starburst>
          </View>
          <Display size={30} style={{ maxWidth: "70%" }}>{signup ? "Join the family." : "Welcome back."}</Display>
          <Body size={14} style={{ marginTop: 6, maxWidth: "72%" }}>{signup ? "Save sermons, join groups, post prayers and book rides." : "Sign in with the email you used to join."}</Body>
        </Animated.View>

        <Segmented items={["Sign in", "Create account"]} value={mode} onChange={(i) => { setMode(i); setMsg(null); }} />
        {signup ? <Field icon="user" placeholder="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" /> : null}
        <Field icon="mail" placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field icon="lock" placeholder={signup ? "Password (8+ characters)" : "Password"} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? "new-password" : "current-password"} textContentType={signup ? "newPassword" : "password"} onSubmitEditing={submit} returnKeyType="go" />

        {msg ? (
          <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: msg.ok ? C.mintSoft : C.roseSoft }}>
            <Icon name={msg.ok ? "check-circle" : "alert-circle"} size={18} />
            <Body size={14} style={{ flex: 1 }}>{msg.text}</Body>
          </View>
        ) : null}

        <Button label={busy ? "Please wait…" : signup ? "Create account" : "Sign in"} icon={signup ? "user-plus" : "log-in"} variant="green" block onPress={submit} disabled={busy} style={{ marginTop: 4 }} />
        {!signup ? (
          <Press onPress={forgot} style={{ alignSelf: "center", padding: 10 }}>
            <Body size={14} weight="semi">Forgot password?</Body>
          </Press>
        ) : (
          <Label style={{ textAlign: "center", marginTop: 4 }}>By creating an account you agree to the church's privacy policy. You can delete your account at any time in Me → Settings.</Label>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
