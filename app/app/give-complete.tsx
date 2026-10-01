import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { C } from "@/theme";

/** The payment page sends people back here; the Give screen shows the result. */
export default function GiveComplete() {
  useEffect(() => { const t = setTimeout(() => (router.canGoBack() ? router.back() : router.replace("/give")), 50); return () => clearTimeout(t); }, []);
  return <View style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={C.flame} /></View>;
}
