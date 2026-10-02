import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Icon } from "./ui";
import { t } from "@/lib/i18n";

const ICONS: Record<string, string> = { index: "home", bible: "book-open", watch: "play-circle", community: "users", me: "user" };
const LABELS: Record<string, string> = { index: "Home", bible: "Bible", watch: "Watch", community: "Community", me: "Me" };
export const TAB_H = 56;

/** A calm, standard bottom bar: icon + label, tinted when active. Translucent on iOS. */
export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === "web" ? 6 : 8);
  const dark = state.routes[state.index]?.name === "watch"; // the Watch tab is a dark, cinema-style screen
  return (
    <View style={[s.wrap, { height: TAB_H + bottom, paddingBottom: bottom }]}>
      {Platform.OS === "ios" ? <BlurView intensity={60} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? (Platform.OS === "ios" ? "rgba(15,11,18,0.82)" : "#120D16") : Platform.OS === "ios" ? "rgba(251,248,243,0.86)" : "#FBF8F3" }]} />
      <View style={[s.line, dark && { backgroundColor: "rgba(255,255,255,0.1)" }]} />
      {state.routes.map((route: any, i: number) => {
        const focused = state.index === i;
        const color = focused ? C.flame : dark ? "rgba(244,238,228,0.55)" : "rgba(15,11,18,0.48)";
        const label = t(LABELS[route.name] ?? route.name);
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !ev.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name);
              }
            }}
            style={s.item}
          >
            <Icon name={ICONS[route.name] ?? "circle"} size={22} color={color} />
            <Text numberOfLines={1} style={[s.label, { color, fontFamily: focused ? F.sansSemi : F.sansMedium }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", overflow: "hidden" },
  line: { position: "absolute", top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(15,11,18,0.14)" },
  item: { flex: 1, height: TAB_H, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 2 },
  label: { fontSize: 10.5, letterSpacing: 0.1 },
});
