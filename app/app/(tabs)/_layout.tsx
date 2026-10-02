import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { TabBar } from "@/components/TabBar";
import { Body, Button, Display, Icon } from "@/components/ui";
import { C } from "@/theme";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

let unlockedThisSession = false;

/** Optional Face ID / fingerprint lock (Me → Settings). */
function Lock({ onUnlock }: { onUnlock: () => void }) {
  const ask = async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t("Unlock Agape") }).catch(() => ({ success: false }));
    if (r.success) { unlockedThisSession = true; onUnlock(); }
  };
  useEffect(() => { ask(); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", padding: 30 }}>
      <Icon name="lock" size={30} color={C.cream} />
      <Display size={34} color={C.cream} center style={{ marginTop: 16 }}>{t("Agape is locked")}</Display>
      <Body color={C.creamMuted} center style={{ marginTop: 8 }}>{t("Use Face ID or your fingerprint to open the app.")}</Body>
      <Button label={t("Unlock")} variant="white" onPress={ask} style={{ marginTop: 24, alignSelf: "center", minWidth: 180 }} />
    </View>
  );
}

export default function TabsLayout() {
  const { ready, signedIn, live, session, profile, settings } = useStore();
  const [unlocked, setUnlocked] = useState(unlockedThisSession);
  if (!ready) return null;
  if (!signedIn) return <Redirect href="/welcome" />;
  // new members tell us their name once
  if (live && session && profile && !profile.full_name) return <Redirect href="/onboarding" />;
  // Kids mode keeps the phone in the kid-safe section until a parent unlocks it
  if (settings.kidsMode) return <Redirect href="/kids" />;
  if (settings.faceId && !unlocked) return <Lock onUnlock={() => setUnlocked(true)} />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="bible" options={{ title: "Bible" }} />
      <Tabs.Screen name="watch" options={{ title: "Watch" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />
    </Tabs>
  );
}
