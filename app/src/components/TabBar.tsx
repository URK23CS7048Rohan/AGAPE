import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Icon } from "./ui";

const ICONS: Record<string, string> = { index: "home", watch: "play-circle", grow: "book-open", community: "users", me: "user" };
const LABELS: Record<string, string> = { index: "Home", watch: "Watch", grow: "Grow", community: "Family", me: "Me" };
const IND = 52;

export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const slot = w / state.routes.length;
  const x = useSharedValue(0);
  useEffect(() => {
    if (slot) x.value = withSpring(state.index * slot + (slot - IND) / 2, { damping: 16, stiffness: 170, mass: 0.8 });
  }, [state.index, slot]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) }}>
      <View style={s.shadow} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={s.bar}>
          {Platform.OS === "ios" ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "ios" ? "rgba(15,11,18,0.78)" : "rgba(15,11,18,0.96)" }]} />
          {slot ? <Animated.View style={[s.indicator, ind]} /> : null}
          {state.routes.map((route: any, i: number) => {
            const focused = state.index === i;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={LABELS[route.name]}
                onPress={() => {
                  const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !ev.defaultPrevented) {
                    Haptics.selectionAsync().catch(() => {});
                    navigation.navigate(route.name);
                  }
                }}
                style={s.item}
              >
                <Icon name={ICONS[route.name] ?? "circle"} size={21} color={focused ? "#fff" : "rgba(244,238,228,0.55)"} />
                {!focused ? <Text style={s.label}>{LABELS[route.name]}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: { borderRadius: 36, shadowColor: "#0F0B12", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
  bar: { height: 68, borderRadius: 36, overflow: "hidden", flexDirection: "row", alignItems: "center" },
  indicator: { position: "absolute", left: 0, top: 8, width: IND, height: IND, borderRadius: IND / 2, backgroundColor: C.flame },
  item: { flex: 1, height: 68, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: F.sansMedium, fontSize: 10, color: "rgba(244,238,228,0.55)" },
});
