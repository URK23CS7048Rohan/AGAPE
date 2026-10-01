/**
 * Motion building blocks shared by several screens:
 *  - Seal: a spinning circular text badge (poster sticker)
 *  - SwipeDeck: a Tinder-style stack you fling cards off (promos, prayers)
 *  - Jar: a liquid-filled progress capsule with a sloshing wave
 */
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Defs, Path, Text as SvgText, TextPath } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { F } from "@/theme";

const { width: SW } = Dimensions.get("window");

/* ---------------------------------------------------------------- Seal */
let sealId = 0;
export function Seal({ text, size = 110, color = "#fff", bg, children, speed = 14000, style }: { text: string; size?: number; color?: string; bg?: string; children?: React.ReactNode; speed?: number; style?: StyleProp<ViewStyle> }) {
  const [id] = useState(() => `seal${++sealId}`);
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: speed, easing: Easing.linear }), -1, false);
  }, [speed]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  let unit = text.toUpperCase() + " · ";
  let full = unit;
  while ((full + unit).length <= 40) full += unit;
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {bg ? <View style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: bg }} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, st]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <Path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
          </Defs>
          <SvgText fill={color} fontSize={16} letterSpacing={3.2} fontFamily={F.mono}>
            <TextPath href={`#${id}`}>{full}</TextPath>
          </SvgText>
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
}

/* ---------------------------------------------------------------- SwipeDeck */
type DeckCardProps<T> = { item: T; depth: number; isTop: boolean; tx: SharedValue<number>; ty: SharedValue<number>; render: (item: T, top: boolean, tx: SharedValue<number>) => React.ReactNode; height: number; width: number };

function DeckCard<T>({ item, depth, isTop, tx, ty, render, height, width }: DeckCardProps<T>) {
  const st = useAnimatedStyle(() => {
    if (isTop) {
      return {
        zIndex: 100,
        transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotate: `${interpolate(tx.value, [-SW, 0, SW], [-18, 0, 18], Extrapolation.CLAMP)}deg` }],
      };
    }
    const pull = depth === 1 ? interpolate(Math.abs(tx.value), [0, 160], [0, 1], Extrapolation.CLAMP) : 0;
    const d = depth - pull;
    return {
      zIndex: 100 - depth,
      opacity: depth > 3 ? 0 : 1,
      transform: [{ translateY: -d * 16 }, { scale: 1 - d * 0.055 }, { rotate: `${(depth % 2 ? 1 : -1) * d * 1.6}deg` }],
    };
  }, [isTop, depth]);
  return <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height }, st]}>{render(item, isTop, tx)}</Animated.View>;
}

export function SwipeDeck<T extends { id?: string }>({ items, render, height = 470, width = SW - 32, onSwipe, emptyText, keyOf }: { items: T[]; render: (item: T, top: boolean, tx: SharedValue<number>) => React.ReactNode; height?: number; width?: number; onSwipe?: (item: T, dir: 1 | -1) => void; emptyText?: React.ReactNode; keyOf?: (item: T, i: number) => string }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  useEffect(() => setOrder(items.map((_, i) => i)), [items.length]);
  const tx = useSharedValue(0), ty = useSharedValue(0);
  const done = (dir: 1 | -1) => {
    const top = order[0];
    setOrder((o) => [...o.slice(1), o[0]]);
    tx.value = 0; ty.value = 0;
    if (top != null && items[top]) onSwipe && onSwipe(items[top], dir);
  };
  const buzz = () => Haptics.selectionAsync().catch(() => {});
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY * 0.35; })
    .onEnd((e) => {
      const fling = Math.abs(tx.value) > width * 0.3 || Math.abs(e.velocityX) > 900;
      if (fling) {
        const dir = (tx.value + e.velocityX * 0.1) > 0 ? 1 : -1;
        runOnJS(buzz)();
        tx.value = withTiming(dir * SW * 1.4, { duration: 260 }, () => runOnJS(done)(dir as 1 | -1));
        ty.value = withTiming(ty.value + e.velocityY * 0.08, { duration: 260 });
      } else {
        tx.value = withSpring(0, { damping: 14, stiffness: 180 });
        ty.value = withSpring(0, { damping: 14, stiffness: 180 });
      }
    });
  // a little "you can swipe me" nudge on mount
  useEffect(() => {
    const t = setTimeout(() => { tx.value = withSequence(withTiming(-46, { duration: 380 }), withSpring(0, { damping: 9 })); }, 900);
    return () => clearTimeout(t);
  }, []);
  if (!items.length) return <>{emptyText || null}</>;
  const shown = order.slice(0, 4);
  return (
    <View style={{ width, height, alignSelf: "center" }}>
      {[...shown].reverse().map((idx) => {
        const depth = shown.indexOf(idx);
        const card = <DeckCard key={keyOf ? keyOf(items[idx], idx) : String(idx)} item={items[idx]} depth={depth} isTop={depth === 0} tx={tx} ty={ty} render={render} height={height} width={width} />;
        return depth === 0 ? <GestureDetector key={`g-${keyOf ? keyOf(items[idx], idx) : idx}`} gesture={pan}>{card}</GestureDetector> : card;
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- Jar */
const APath = Animated.createAnimatedComponent(Path);
function wave(level: number, phase: number, amp: number, W: number, H: number) {
  "worklet";
  const base = H * (1 - level);
  let d = `M0 ${H} L0 ${base.toFixed(1)}`;
  for (let x = 0; x <= W; x += 5) d += ` L${x} ${(base + Math.sin(x * 0.085 + phase) * amp).toFixed(1)}`;
  return d + ` L${W} ${H} Z`;
}
export function Jar({ pct, color, width = 110, height = 176, children, delay = 200 }: { pct: number; color: string; width?: number; height?: number; children?: React.ReactNode; delay?: number }) {
  const W = 100, H = 160;
  const level = useSharedValue(0), t = useSharedValue(0), amp = useSharedValue(7);
  useEffect(() => {
    const id = setTimeout(() => {
      level.value = withTiming(Math.max(0, Math.min(1, pct)), { duration: 2400, easing: Easing.out(Easing.cubic) });
      amp.value = withTiming(3.2, { duration: 2800 });
    }, delay);
    t.value = withRepeat(withTiming(Math.PI * 2, { duration: 2600, easing: Easing.linear }), -1, false);
    return () => clearTimeout(id);
  }, [pct]);
  const back = useAnimatedProps(() => ({ d: wave(level.value, t.value + 1.4, amp.value * 1.25, W, H) }));
  const front = useAnimatedProps(() => ({ d: wave(level.value, t.value, amp.value, W, H) }));
  const slosh = () => { amp.value = withSequence(withTiming(10, { duration: 160 }), withTiming(3.2, { duration: 1800 })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
  const tap = Gesture.Tap().onEnd(() => runOnJS(slosh)());
  return (
    <GestureDetector gesture={tap}>
      <View style={{ width, height, borderRadius: width / 2, overflow: "hidden", backgroundColor: "#0B0710", borderWidth: 3, borderColor: "rgba(255,255,255,0.18)" }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <APath animatedProps={back} fill={color} fillOpacity={0.45} />
          <APath animatedProps={front} fill={color} />
        </Svg>
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", paddingTop: height * 0.16 }}>{children}</View>
      </View>
    </GestureDetector>
  );
}
