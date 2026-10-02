import React, { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C, fontMap } from "@/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { Body, Button, Display, Empty } from "@/components/ui";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Shown by builds made without the Supabase URL/key, instead of any fake content. */
function NotConnected() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 24 }}>
      <Empty icon="cloud-off" color={C.sun} title="This build isn't connected yet" body="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (in app/.env, or as GitHub secrets for the APK build) and build again." />
    </View>
  );
}

/** Face ID / fingerprint lock when the member turned it on in Me → Settings. */
function AppLock({ children }: { children: React.ReactNode }) {
  const { settings, signedIn } = useAuth();
  const on = settings.faceId && signedIn;
  const [locked, setLocked] = useState(on);
  const last = useRef(AppState.currentState);
  const unlock = async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Agape" }).catch(() => ({ success: false }));
    if (r.success) setLocked(false);
  };
  useEffect(() => {
    if (!on) { setLocked(false); return; }
    unlock();
    const sub = AppState.addEventListener("change", (s) => {
      if (last.current === "background" && s === "active") { setLocked(true); unlock(); }
      last.current = s;
    });
    return () => sub.remove();
  }, [on]);
  if (!locked) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
      <Display size={28} center>Agape is locked</Display>
      <Body center color={C.muted}>Use Face ID or your fingerprint to continue.</Body>
      <Button label="Unlock" icon="unlock" trail={null} variant="ink" onPress={unlock} style={{ alignSelf: "center" }} />
    </View>
  );
}

function Root() {
  const { ready } = useAuth();
  const [loaded] = useFonts(fontMap);
  useEffect(() => {
    if (loaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, ready]);
  if (!loaded || !ready) return null;
  if (!isConfigured) return <NotConnected />;
  return (
    <AppLock>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="auth" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="assistant" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="rides" options={{ contentStyle: { backgroundColor: C.ink } }} />
        <Stack.Screen name="games" options={{ contentStyle: { backgroundColor: C.sun } }} />
      </Stack>
    </AppLock>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
