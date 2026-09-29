import React from "react";
import { Redirect, Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { useStore } from "@/lib/store";

export default function TabsLayout() {
  const { signedIn } = useStore();
  if (!signedIn) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="watch" options={{ title: "Watch" }} />
      <Tabs.Screen name="grow" options={{ title: "Grow" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />
    </Tabs>
  );
}
