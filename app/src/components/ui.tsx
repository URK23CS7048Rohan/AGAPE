import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle, StyleProp, LayoutChangeEvent } from "react-native";
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
const MCI = new Set(["music-clef-treble", "guitar-acoustic", "baby-face-outline", "account-child", "book-cross", "cards-outline", "puzzle", "emoticon-happy-outline", "home-heart", "hand-heart-outline", "account-group-outline", "qrcode-scan", "book-open-page-variant", "headphones", "translate", "car", "car-side", "hands-pray", "gamepad-variant", "cross", "church", "fire", "trophy", "robot-happy", "hand-heart", "account-group", "bookshelf", "piggy-bank", "baby-face-outline", "face-recognition", "wallet", "qrcode", "creation", "steering"]);
export function Icon({ name, size = 20, color = C.ink }: { name: string; size?: number; color?: string }) {
  if (MCI.has(name)) return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  return <Feather name={name as any} size={size} color={color} />;
}

/* ---------------------------------------------------------------- Type */
/** Larger-text setting (Me → Settings) scales every Body/Label/Display. */
export const TextScale = React.createContext(1);
const useScale = () => React.useContext(TextScale);
type TProps = { children?: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; center?: boolean };

export function Display({ children, size = 44, color = C.ink, style, numberOfLines, center }: TProps) {
  const k = useScale();
  const z = Math.round(size * (size > 30 ? 0.86 : 1) * (k > 1 ? 1 + (k - 1) * 0.5 : 1)); // calmer headlines; large text grows them a little
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.display, fontSize: z, lineHeight: Math.round(z * 1.02), letterSpacing: -z * 0.018, color, textAlign: center ? "center" : undefined }, style, { fontSize: z }]}>
      {children}
    </Text>
  );
}
/** Italic serif accent. Nest inside <Display> for the signature mixed headline. */
export function Serif({ children, size, color = C.flame, style, italic = true }: TProps & { italic?: boolean }) {
  const k = useScale();
  const z = size ? Math.round(size * (size > 30 ? 0.86 : 1) * (k > 1 ? 1 + (k - 1) * 0.5 : 1)) : undefined;
  return <Text style={[{ fontFamily: italic ? F.serifItalic : F.serif, letterSpacing: -0.2, color }, z ? { fontSize: z, lineHeight: Math.round(z * 1.08) } : null, style, z ? { fontSize: z } : null]}>{children}</Text>;
}
export function Body({ children, size = 15, color = C.ink, style, numberOfLines, weight = "regular", center }: TProps & { weight?: "regular" | "medium" | "semi" | "bold" }) {
  const fam = { regular: F.sans, medium: F.sansMedium, semi: F.sansSemi, bold: F.sansBold }[weight];
  const z = Math.round(size * useScale() * 10) / 10;
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: fam, fontSize: z, lineHeight: Math.round(z * 1.45), color, textAlign: center ? "center" : undefined }, style, { fontSize: z }]}>{children}</Text>;
}
export function Label({ children, color = C.muted, style, size = 11 }: TProps) {
  const z = Math.round(size * useScale() * 10) / 10;
  return <Text style={[{ fontFamily: F.sansSemi, fontSize: z, letterSpacing: z * 0.06, textTransform: "uppercase", color }, style]}>{children}</Text>;
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

/* ---------------------------------------------------------------- Buttons
   Calm, native-feeling: solid or tonal fills, 14px corners, centred label, optional small icon. */
const VARIANTS = {
  flame: { bg: C.flame, fg: "#fff" },
  ink: { bg: C.ink, fg: "#fff" },
  light: { bg: "#fff", fg: C.ink },
  white: { bg: "#fff", fg: C.ink },
  mint: { bg: "#16A37B", fg: "#fff" },
  rose: { bg: C.rose, fg: "#fff" },
  violet: { bg: C.violet, fg: "#fff" },
  glass: { bg: "rgba(255,255,255,0.14)", fg: "#fff" },
  tonal: { bg: "rgba(15,11,18,0.06)", fg: C.ink },
  outline: { bg: "transparent", fg: C.ink, border: "rgba(15,11,18,0.16)" },
};
export type Variant = keyof typeof VARIANTS;
export function Button({ label, icon = null, variant = "flame", onPress, block, small, style, disabled }: { label: string; icon?: string | null; variant?: Variant; onPress?: () => void; block?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const v: any = VARIANTS[variant] || VARIANTS.flame;
  const h = small ? 42 : 52;
  const showIcon = icon && !["arrow-right", "arrow-up-right"].includes(icon);
  return (
    <Press
      disabled={disabled}
      scaleTo={0.98}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress && onPress();
      }}
      haptic={false}
      style={[
        { height: h, borderRadius: small ? 12 : 14, backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: small ? 16 : 20, gap: 8, alignSelf: block ? "stretch" : "flex-start", opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {showIcon ? <Icon name={icon!} size={small ? 15 : 17} color={v.fg} /> : null}
      <Text numberOfLines={1} style={{ fontFamily: F.sansSemi, fontSize: small ? 14 : 15.5, color: v.fg, letterSpacing: -0.1 }}>{label}</Text>
    </Press>
  );
}
export function IconButton({ name, onPress, bg = "rgba(15,11,18,0.06)", color = C.ink, size = 40, style, badge, label }: { name: string; onPress?: () => void; bg?: string; color?: string; size?: number; style?: StyleProp<ViewStyle>; badge?: boolean; label?: string }) {
  const b = bg === "#fff" ? "rgba(255,255,255,0.96)" : bg;
  return (
    <Press onPress={onPress} hitSlop={6} label={label ?? name} scaleTo={0.92} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: b, alignItems: "center", justifyContent: "center" }, style]}>
      <Icon name={name} size={Math.round(size * 0.45)} color={color} />
      {badge ? <View style={{ position: "absolute", top: size * 0.2, right: size * 0.22, width: 8, height: 8, borderRadius: 4, backgroundColor: C.flame, borderWidth: 1.5, borderColor: "#fff" }} /> : null}
    </Press>
  );
}

/* ---------------------------------------------------------------- Chips */
export function Chip({ label, active, onPress, dark, icon, color }: { label: string; active?: boolean; onPress?: () => void; dark?: boolean; icon?: string; color?: string }) {
  const on = dark ? { bg: C.cream, fg: C.ink } : { bg: color || C.ink, fg: "#fff" };
  const off = dark ? { bg: "rgba(255,255,255,0.08)", fg: C.cream } : { bg: "rgba(15,11,18,0.05)", fg: C.ink };
  const s = active ? on : off;
  return (
    <Press onPress={onPress} scaleTo={0.97} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, height: 34, borderRadius: 10, backgroundColor: s.bg }}>
      {icon ? <Icon name={icon} size={14} color={s.fg} /> : null}
      <Text style={{ fontFamily: active ? F.sansSemi : F.sansMedium, fontSize: 13.5, color: s.fg }}>{label}</Text>
    </Press>
  );
}

/* ---------------------------------------------------------------- Lists, tiles, cards */
/** Grouped list row (Settings-style): tinted icon square, title, subtitle, accessory. */
export function ListRow({ icon, color = C.ink, title, sub, right, onPress, dark, last }: { icon?: string; color?: string; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; dark?: boolean; last?: boolean }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
      {icon ? (
        <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: color + "1F", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={17} color={color} />
        </View>
      ) : null}
      <View style={{ flex: 1, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: dark ? "rgba(255,255,255,0.1)" : "rgba(15,11,18,0.1)", paddingBottom: 12, marginBottom: -12, minHeight: 34, justifyContent: "center" }}>
        <Body weight="medium" size={15.5} color={dark ? C.cream : C.ink} numberOfLines={1}>{title}</Body>
        {sub ? <Body size={13} color={dark ? C.creamMuted : C.muted} numberOfLines={2}>{sub}</Body> : null}
      </View>
      {right !== undefined ? right : onPress ? <Icon name="chevron-right" size={18} color={dark ? C.creamMuted : "rgba(15,11,18,0.3)"} /> : null}
    </View>
  );
  return onPress ? <Press onPress={onPress} scaleTo={0.99}>{inner}</Press> : inner;
}
export function Group({ children, dark, style }: { children: React.ReactNode; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: dark ? C.ink3 : "#fff", borderRadius: 16, overflow: "hidden", paddingVertical: 2 }, style]}>{children}</View>;
}
/** Square-ish feature tile for hubs (Home quick actions, Bible, Kids…). */
export function Tile({ icon, label, sub, color = C.ink, onPress, dark, style }: { icon: string; label: string; sub?: string; color?: string; onPress?: () => void; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} scaleTo={0.97} style={[{ backgroundColor: dark ? C.ink3 : "#fff", borderRadius: 16, padding: 14, gap: 10, minHeight: 96, justifyContent: "space-between" }, style]}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "1F", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View>
        <Body weight="semi" size={14.5} color={dark ? C.cream : C.ink} numberOfLines={1}>{label}</Body>
        {sub ? <Body size={12} color={dark ? C.creamMuted : C.muted} numberOfLines={1}>{sub}</Body> : null}
      </View>
    </Press>
  );
}
export function Badge({ label, color = C.ink, soft = true }: { label: string; color?: string; soft?: boolean }) {
  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, height: 22, borderRadius: 6, backgroundColor: soft ? color + "1F" : color, justifyContent: "center" }}>
      <Text style={{ fontFamily: F.sansSemi, fontSize: 11.5, color: soft ? color : "#fff" }}>{label}</Text>
    </View>
  );
}
export function Empty({ icon = "inbox", title, sub, dark }: { icon?: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 24, gap: 8 }}>
      <Icon name={icon} size={28} color={dark ? C.creamMuted : "rgba(15,11,18,0.3)"} />
      <Body weight="semi" center color={dark ? C.cream : C.ink}>{title}</Body>
      {sub ? <Body size={13.5} center color={dark ? C.creamMuted : C.muted}>{sub}</Body> : null}
    </View>
  );
}
export function SearchField({ value, onChangeText, placeholder, dark }: { value: string; onChangeText: (s: string) => void; placeholder?: string; dark?: boolean }) {
  return (
    <View style={{ height: 44, borderRadius: 12, backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(118,118,128,0.12)", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
      <Icon name="search" size={17} color={dark ? C.creamMuted : "rgba(15,11,18,0.45)"} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={dark ? "rgba(244,238,228,0.45)" : "rgba(15,11,18,0.4)"} style={{ flex: 1, color: dark ? C.cream : C.ink, fontFamily: F.sans, fontSize: 15.5 }} />
      {value ? <Press onPress={() => onChangeText("")} hitSlop={8}><Icon name="x-circle" size={16} color={dark ? C.creamMuted : "rgba(15,11,18,0.35)"} /></Press> : null}
    </View>
  );
}
/** Large title like iOS: small label above a calm headline. */
export function LargeTitle({ label, title, accent, dark, right, style }: { label?: string; title: string; accent?: string; dark?: boolean; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: 20, flexDirection: "row", alignItems: "flex-end", gap: 12 }, style]}>
      <View style={{ flex: 1 }}>
        {label ? <Label color={dark ? C.creamMuted : C.muted} style={{ marginBottom: 6 }}>{label}</Label> : null}
        <Display size={40} color={dark ? C.cream : C.ink}>{title}{accent ? <Serif size={42} color={dark ? C.sun : C.flame}> {accent}</Serif> : null}</Display>
      </View>
      {right}
    </View>
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
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Label color={dark ? C.creamMuted : C.muted} style={{ marginBottom: 4 }}>{eyebrow}</Label> : null}
        <Display size={28} color={dark ? C.cream : C.ink}>
          {title}
          {accent ? <Serif size={29} color={dark ? C.sun : C.flame}> {accent}</Serif> : null}
        </Display>
      </View>
      {action ? (
        <Press onPress={onAction} style={{ paddingVertical: 6, paddingLeft: 10 }}>
          <Body size={14.5} weight="semi" color={dark ? C.sun : C.flame}>{action}</Body>
        </Press>
      ) : null}
    </View>
  );
}
export function BackHeader({ title, dark, right, transparent }: { title?: string; dark?: boolean; right?: React.ReactNode; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: transparent ? "transparent" : undefined, zIndex: 10 }}>
      <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} bg={dark ? "rgba(255,255,255,0.12)" : "rgba(15,11,18,0.05)"} color={dark ? "#fff" : C.ink} label="Back" />
      <Body size={17} weight="semi" color={dark ? "#fff" : C.ink} style={{ flex: 1 }} numberOfLines={1}>{title}</Body>
      {right}
    </View>
  );
}

/* ---------------------------------------------------------------- Segmented (iOS-style) */
export function Segmented({ items, value, onChange, dark, accent }: { items: string[]; value: number; onChange: (i: number) => void; dark?: boolean; accent?: string }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const seg = w ? (w - 4) / items.length : 0;
  useEffect(() => {
    x.value = withSpring(value * seg, { damping: 22, stiffness: 260 });
  }, [value, seg]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const thumb = dark ? "rgba(255,255,255,0.18)" : "#fff";
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", padding: 2, borderRadius: 10, backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(118,118,128,0.12)" }}>
      {seg ? <Animated.View style={[{ position: "absolute", top: 2, bottom: 2, left: 2, width: seg, borderRadius: 8, backgroundColor: thumb, shadowColor: "#000", shadowOpacity: dark ? 0 : 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: dark ? 0 : 2 }, pill]} /> : null}
      {items.map((it, i) => (
        <Pressable key={it} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(i); }} style={{ flex: 1, height: 34, alignItems: "center", justifyContent: "center" }}>
          <Text numberOfLines={1} style={{ fontFamily: i === value ? F.sansSemi : F.sansMedium, fontSize: 13.5, color: dark ? (i === value ? "#fff" : C.creamMuted) : i === value ? C.ink : "rgba(15,11,18,0.6)" }}>{it}</Text>
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
