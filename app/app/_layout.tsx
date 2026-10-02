import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C, fontMap } from "@/theme";
import { StoreProvider } from "@/lib/store";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts(fontMap);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "slide_from_right" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ animation: "fade" }} />
            <Stack.Screen name="assistant" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="rides" options={{ contentStyle: { backgroundColor: C.ink } }} />
            <Stack.Screen name="prayer" options={{ contentStyle: { backgroundColor: C.roseSoft } }} />
            <Stack.Screen name="games" options={{ contentStyle: { backgroundColor: C.sun } }} />
          </Stack>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
