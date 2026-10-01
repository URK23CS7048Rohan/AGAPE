import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C, fontMap } from "@/theme";
import { StoreProvider } from "@/lib/store";
import { listenForTaps } from "@/lib/push";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts(fontMap);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  // tapping a push notification opens the right screen
  useEffect(() => (loaded ? listenForTaps((r) => router.push(r as any)) : undefined), [loaded]);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ink }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream }, animation: "slide_from_right" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ animation: "fade", contentStyle: { backgroundColor: C.ink } }} />
            <Stack.Screen name="sign-in" options={{ animation: "slide_from_bottom", contentStyle: { backgroundColor: C.ink } }} />
            <Stack.Screen name="onboarding" options={{ animation: "fade", contentStyle: { backgroundColor: C.ink }, gestureEnabled: false }} />
            <Stack.Screen name="auth-callback" options={{ animation: "none", contentStyle: { backgroundColor: C.ink } }} />
            <Stack.Screen name="give-complete" options={{ animation: "none" }} />
            <Stack.Screen name="assistant" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="rides" options={{ contentStyle: { backgroundColor: C.ink } }} />
            <Stack.Screen name="prayer" options={{ contentStyle: { backgroundColor: C.deepViolet } }} />
            <Stack.Screen name="games" options={{ contentStyle: { backgroundColor: C.sun } }} />
          </Stack>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
