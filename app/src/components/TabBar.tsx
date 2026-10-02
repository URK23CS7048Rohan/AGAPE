import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";
import { Icon } from "./ui";

const ICONS: Record<string, string> = { index: "home", watch: "play-circle", grow: "book-open", community: "users", me: "user" };
const LABELS: Record<string, string> = { index: "Home", watch: "Watch", grow: "Grow", community: "Family", me: "Me" };
const IND = 50;

/** Floating black pill; the active tab sits in a white circle. */
export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const slot = (w - 16) / state.routes.length;
  const x = useSharedValue(0);
  useEffect(() => {
    if (slot > 0) x.value = withSpring(8 + state.index * slot + (slot - IND) / 2, { damping: 17, stiffness: 190, mass: 0.8 });
  }, [state.index, slot]);
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 20, right: 20, bottom: Math.max(insets.bottom, 12) }}>
      <View style={s.bar} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {slot > 0 ? <Animated.View style={[s.indicator, ind]} /> : null}
        {state.routes.map((route: any, i: number) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={LABELS[route.name]}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !ev.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  navigation.navigate(route.name);
                }
              }}
              style={s.item}
            >
              <Icon name={ICONS[route.name] ?? "circle"} size={22} color={focused ? C.ink : "rgba(255,255,255,0.8)"} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: 66, borderRadius: 33, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  indicator: { position: "absolute", left: 0, top: 8, width: IND, height: IND, borderRadius: IND / 2, backgroundColor: "#fff" },
  item: { flex: 1, height: 66, alignItems: "center", justifyContent: "center" },
});
