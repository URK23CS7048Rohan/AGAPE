import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/theme";
import { supabase } from "@/lib/supabase";

/** Lands here when a sign-in link (e-mail link or Google/Apple) opens the app directly. */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    (async () => {
      if (supabase && code) await supabase.auth.exchangeCodeForSession(String(code)).catch(() => {});
      router.replace("/");
    })();
  }, [code]);
  return <View style={{ flex: 1, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={C.sun} /></View>;
}
