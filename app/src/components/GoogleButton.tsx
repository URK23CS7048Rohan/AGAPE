import React, { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { router } from "expo-router";
import { C } from "@/theme";
import { Body, Icon, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/** "Continue with Google" — Supabase OAuth in a browser sheet, then straight into the app. */
export function GoogleButton({ onError }: { onError?: (msg: string) => void }) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      if (await signInWithGoogle()) {
        if (router.canDismiss()) router.dismissAll();
        router.replace("/");
      }
    } catch (e: any) {
      const m = /provider is not enabled|unsupported provider/i.test(String(e?.message)) ? "Google sign-in isn't switched on for this church yet." : e?.message || "Couldn't sign in with Google.";
      onError ? onError(m) : Alert.alert("Google sign-in", m);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Press onPress={go} disabled={busy} scaleTo={0.98} style={{ height: 54, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
      {busy ? <ActivityIndicator color={C.ink} /> : <Icon name="google" size={20} color="#4285F4" />}
      <Body weight="bold" size={15}>Continue with Google</Body>
    </Press>
  );
}

export function OrLine() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      <Body size={12.5} color={C.muted}>or use email</Body>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
    </View>
  );
}
