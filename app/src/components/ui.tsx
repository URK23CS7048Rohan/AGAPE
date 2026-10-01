import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle, StyleProp, LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";

const { width: SW, height: SH } = Dimensions.get("window");

/* ---------------------------------------------------------------- Icons */
const MCI = new Set(["car", "car-side", "hands-pray", "gamepad-variant", "cross", "church", "fire", "trophy", "robot-happy", "hand-heart", "account-group", "bookshelf", "piggy-bank", "baby-face-outline", "face-recognition", "wallet", "qrcode", "creation", "steering"]);
export function Icon({ name, size = 20, color = C.ink }: { name: string; size?: number; color?: string }) {
  if (MCI.has(name)) return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  return <Feather name={name as any} size={size} color={color} />;
}

/* ---------------------------------------------------------------- Type */
type TProps = { children?: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; center?: boolean };

export function Display({ children, size = 44, color = C.ink, style, numberOfLines, center }: TProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.display, fontSize: size, lineHeight: Math.round(size * 1.0), letterSpacing: -size * 0.025, color, textAlign: center ? "center" : "left" }, style]}>
      {children}
    </Text>
  );
}
/** Italic serif accent. Nest inside <Display> for the signature mixed headline. */
export function Serif({ children, size, color = C.flame, style, italic = true }: TProps & { italic?: boolean }) {
  return <Text style={[{ fontFamily: italic ? F.serifItalic : F.serif, letterSpacing: -0.2, color }, size ? { fontSize: size, lineHeight: Math.round(size * 1.08) } : null, style]}>{children}</Text>;
}
export function Body({ children, size = 15, color = C.ink, style, numberOfLines, weight = "regular", center }: TProps & { weight?: "regular" | "medium" | "semi" | "bold" }) {
  const fam = { regular: F.sans, medium: F.sansMedium, semi: F.sansSemi, bold: F.sansBold }[weight];
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: fam, fontSize: size, lineHeight: Math.round(size * 1.45), color, textAlign: center ? "center" : "left" }, style]}>{children}</Text>;
}
export function Label({ children, color = C.muted, style, size = 11 }: TProps) {
  return <Text style={[{ fontFamily: F.mono, fontSize: size, letterSpacing: size * 0.14, textTransform: "uppercase", color }, style]}>{children}</Text>;
}

/* ---------------------------------------------------------------- Press (spring scale + haptics) */
const APressable = Animated.createAnimatedComponent(Pressable);
export function Press({ children, onPress, style, scaleTo = 0.96, haptic = true, disabled, hitSlop, label }: { children?: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean; disabled?: boolean; hitSlop?: number; label?: string }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      hitSlop={hitSlop}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => (s.value = withSpring(scaleTo, { damping: 15, stiffness: 420 }))}
      onPressOut={() => (s.value = withSpring(1, { damping: 11, stiffness: 260 }))}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress && onPress();
      }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
}

/* ---------------------------------------------------------------- Buttons */
const VARIANTS = {
  flame: { bg: C.flame, fg: "#fff", ibg: "#fff", ifg: C.flame },
  ink: { bg: C.ink, fg: C.cream, ibg: C.flame, ifg: "#fff" },
  light: { bg: C.cream, fg: C.ink, ibg: C.ink, ifg: C.cream },
  white: { bg: "#fff", fg: C.ink, ibg: C.ink, ifg: "#fff" },
  mint: { bg: C.mint, fg: C.ink, ibg: C.ink, ifg: C.mint },
  rose: { bg: C.rose, fg: "#fff", ibg: "#fff", ifg: C.rose },
  violet: { bg: C.violet, fg: "#fff", ibg: "#fff", ifg: C.violet },
  glass: { bg: "rgba(255,255,255,0.16)", fg: "#fff", ibg: "#fff", ifg: C.ink },
};
export type Variant = keyof typeof VARIANTS;
export function Button({ label, icon = "arrow-right", variant = "flame", onPress, block, small, style, disabled }: { label: string; icon?: string | null; variant?: Variant; onPress?: () => void; block?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const v = VARIANTS[variant];
  const h = small ? 46 : 56;
  return (
    <Press
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress && onPress();
      }}
      haptic={false}
      style={[
        { height: h, borderRadius: R.pill, backgroundColor: v.bg, flexDirection: "row", alignItems: "center", paddingLeft: 22, paddingRight: icon ? 6 : 22, gap: 12, alignSelf: block ? "stretch" : "flex-start", justifyContent: block ? "space-between" : "center", opacity: disabled ? 0.5 : 1 },
        variant === "flame" && { shadowColor: C.flame, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.sansSemi, fontSize: small ? 14.5 : 16, color: v.fg, letterSpacing: -0.2 }}>{label}</Text>
      {icon ? (
        <View style={{ width: h - 12, height: h - 12, borderRadius: R.pill, backgroundColor: v.ibg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={small ? 16 : 18} color={v.ifg} />
        </View>
      ) : null}
    </Press>
  );
}
export function IconButton({ name, onPress, bg = "#fff", color = C.ink, size = 44, style, badge, label }: { name: string; onPress?: () => void; bg?: string; color?: string; size?: number; style?: StyleProp<ViewStyle>; badge?: boolean; label?: string }) {
  return (
    <Press onPress={onPress} hitSlop={6} label={label ?? name} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }, style]}>
      <Icon name={name} size={size * 0.42} color={color} />
      {badge ? <View style={{ position: "absolute", top: size * 0.24, right: size * 0.26, width: 8, height: 8, borderRadius: 4, backgroundColor: C.flame, borderWidth: 1.5, borderColor: bg }} /> : null}
    </Press>
  );
}

/* ---------------------------------------------------------------- Chips */
export function Chip({ label, active, onPress, dark, icon, color }: { label: string; active?: boolean; onPress?: () => void; dark?: boolean; icon?: string; color?: string }) {
  const on = dark ? { bg: C.cream, fg: C.ink, border: C.cream } : { bg: C.ink, fg: "#fff", border: C.ink };
  const off = dark ? { bg: "transparent", fg: C.cream, border: "rgba(244,238,228,0.22)" } : { bg: "rgba(255,255,255,0.6)", fg: C.ink, border: "rgba(15,11,18,0.1)" };
  const s = active ? on : off;
  return (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 15, height: 38, borderRadius: R.pill, backgroundColor: color && active ? color : s.bg, borderWidth: 1, borderColor: color && active ? color : s.border }}>
      {icon ? <Icon name={icon} size={14} color={s.fg} /> : null}
      <Text style={{ fontFamily: F.sansSemi, fontSize: 13.5, color: s.fg }}>{label}</Text>
    </Press>
  );
}

/* ---------------------------------------------------------------- Live */
export function LiveDot({ color = "#FF2E4D", size = 8 }: { color?: string; size?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), -1, false);
  }, []);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 1 + p.value * 1.8 }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, borderWidth: 1.5, borderColor: color }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}
export function LiveBadge({ small }: { small?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FF2E4D", paddingHorizontal: small ? 9 : 12, height: small ? 24 : 30, borderRadius: R.pill, alignSelf: "flex-start" }}>
      <LiveDot color="#fff" size={small ? 6 : 7} />
      <Text style={{ fontFamily: F.sansBold, fontSize: small ? 10 : 11.5, letterSpacing: 1.2, color: "#fff" }}>LIVE</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- Avatar */
export function Avatar({ name, color = C.violet, size = 40, ring }: { name: string; color?: string; size?: number; ring?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center", borderWidth: ring ? 2.5 : 0, borderColor: ring }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: size * 0.36, color: "#fff" }}>{initials}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- Progress */
const ACircle = Animated.createAnimatedComponent(Circle);
export function Ring({ size = 64, stroke = 6, progress = 0.5, color = C.flame, track = "rgba(255,255,255,0.25)", children, delay = 200 }: { size?: number; stroke?: number; progress?: number; color?: string; track?: string; children?: React.ReactNode; delay?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(progress, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} animatedProps={ap} />
      </Svg>
      {children}
    </View>
  );
}
export function Bar({ progress, color = C.flame, track = "rgba(15,11,18,0.08)", height = 10, delay = 250 }: { progress: number; color?: string; track?: string; height?: number; delay?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(progress, { duration: 1500, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, st]} />
    </View>
  );
}

/* ---------------------------------------------------------------- Headers */
export function SectionTitle({ eyebrow, title, accent, action, onAction, dark }: { eyebrow?: string; title: string; accent?: string; action?: string; onAction?: () => void; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 14 }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Label color={dark ? C.creamMuted : C.muted} style={{ marginBottom: 6 }}>{eyebrow}</Label> : null}
        <Display size={30} color={dark ? C.cream : C.ink}>
          {title}
          {accent ? <Serif size={32} color={dark ? C.sun : C.flame}> {accent}</Serif> : null}
        </Display>
      </View>
      {action ? (
        <Press onPress={onAction} style={{ paddingVertical: 6, paddingLeft: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Body size={14} weight="semi" color={dark ? C.cream : C.ink}>{action}</Body>
          <Icon name="arrow-up-right" size={15} color={dark ? C.cream : C.ink} />
        </Press>
      ) : null}
    </View>
  );
}
export function BackHeader({ title, dark, right, transparent }: { title?: string; dark?: boolean; right?: React.ReactNode; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: transparent ? "transparent" : undefined, zIndex: 10 }}>
      <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} bg={dark ? "rgba(255,255,255,0.14)" : "#fff"} color={dark ? "#fff" : C.ink} />
      <Body size={17} weight="semi" color={dark ? "#fff" : C.ink} style={{ flex: 1 }} numberOfLines={1}>{title}</Body>
      {right}
    </View>
  );
}

/* ---------------------------------------------------------------- Segmented (sliding pill) */
export function Segmented({ items, value, onChange, dark, accent = C.flame }: { items: string[]; value: number; onChange: (i: number) => void; dark?: boolean; accent?: string }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const seg = w ? (w - 10) / items.length : 0;
  useEffect(() => {
    x.value = withSpring(value * seg, { damping: 18, stiffness: 180 });
  }, [value, seg]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", padding: 5, borderRadius: R.pill, backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(15,11,18,0.06)" }}>
      {seg ? <Animated.View style={[{ position: "absolute", top: 5, bottom: 5, left: 5, width: seg, borderRadius: R.pill, backgroundColor: accent }, pill]} /> : null}
      {items.map((it, i) => (
        <Pressable key={it} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(i); }} style={{ flex: 1, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 14, color: i === value ? "#fff" : dark ? C.cream : C.ink }}>{it}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------------- Sticker (rotated, wobbling badge) */
export function Sticker({ top, bottom, bg = C.rose, color = C.ink, size = 96, rotate = 12 }: { top: string; bottom: string; bg?: string; color?: string; size?: number; rotate?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate - t.value * 8}deg` }, { translateY: -t.value * 6 }] }));
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, st]}>
      <Text style={{ fontFamily: F.display, fontSize: size * 0.28, lineHeight: size * 0.3, color, textTransform: "uppercase" }}>{top}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: size * 0.2, lineHeight: size * 0.24, color }}>{bottom}</Text>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- Confetti */
const PALETTE = [C.flame, C.sun, C.rose, C.violet, C.mint, C.sky, "#ffffff"];
function Piece({ x, y, angle, v, color, w, h, spin, round }: any) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) });
  }, []);
  const st = useAnimatedStyle(() => {
    const k = t.value;
    return {
      opacity: 1 - k * k,
      transform: [{ translateX: Math.cos(angle) * v * k }, { translateY: Math.sin(angle) * v * k + 520 * k * k }, { rotate: `${spin * k}deg` }],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: round ? w : 2, backgroundColor: color }, st]} />;
}
function Burst({ x, y, count }: { x: number; y: number; count: number }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, () => ({ angle: -Math.PI * Math.random(), v: 120 + Math.random() * 220, color: PALETTE[Math.floor(Math.random() * PALETTE.length)], w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, spin: (Math.random() - 0.5) * 900, round: Math.random() < 0.3 })),
    []
  );
  return <>{pieces.map((p, i) => <Piece key={i} x={x} y={y} {...p} />)}</>;
}
export type ConfettiHandle = { burst: (x?: number, y?: number, count?: number) => void };
export const Confetti = forwardRef<ConfettiHandle, {}>(function Confetti(_props, ref) {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; count: number }[]>([]);
  useImperativeHandle(ref, () => ({
    burst: (x = SW / 2, y = SH / 3, count = 44) => {
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, x, y, count }]);
      setTimeout(() => setBursts((b) => b.filter((q) => q.id !== id)), 1900);
    },
  }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((b) => <Burst key={b.id} x={b.x} y={b.y} count={b.count} />)}
    </View>
  );
});

/* ---------------------------------------------------------------- Typing dots */
function Dot({ i, color }: { i: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(i * 150, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 }), withTiming(0, { duration: 300 })), -1));
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: 0.35 + t.value * 0.65, transform: [{ translateY: -t.value * 4 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, st]} />;
}
export function TypingDots({ color = C.violet }: { color?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }}>
      {[0, 1, 2].map((i) => <Dot key={i} i={i} color={color} />)}
    </View>
  );
}

export const screen = { width: SW, height: SH };
