import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C, fontMap } from "@/theme";
import { StoreProvider, useStore } from "@/lib/store";
import { I18nProvider, normalizeLang } from "@/lib/i18n";
import { TextScale } from "@/components/ui";
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
          <Shell />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Language + text size wrap everything, so changing either in Settings re-renders the whole app. */
function Shell() {
  const { settings } = useStore();
  const lang = normalizeLang(settings.language);
  return (
    <I18nProvider language={lang}>
      <TextScale.Provider value={settings.largeText ? 1.18 : 1}>
        <React.Fragment key={lang}>
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
            <Stack.Screen name="games/index" options={{ contentStyle: { backgroundColor: C.cream } }} />
            <Stack.Screen name="kids" options={{ animation: "fade", gestureEnabled: false }} />
            <Stack.Screen name="bible/read" options={{ animation: "slide_from_bottom", contentStyle: { backgroundColor: C.paper } }} />
            <Stack.Screen name="songs/[slug]" options={{ contentStyle: { backgroundColor: C.paper } }} />
          </Stack>
        </React.Fragment>
      </TextScale.Provider>
    </I18nProvider>
  );
}
