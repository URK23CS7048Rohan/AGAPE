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
import Svg, { Circle, Polygon } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R, onColor } from "@/theme";

const { width: SW, height: SH } = Dimensions.get("window");

/* ---------------------------------------------------------------- Icons */
const MCI = new Set(["car", "car-side", "hands-pray", "gamepad-variant", "cross", "church", "fire", "trophy", "robot-happy", "hand-heart", "account-group", "bookshelf", "piggy-bank", "baby-face-outline", "face-recognition", "wallet", "qrcode", "creation", "star-four-points", "star", "youtube", "lightning-bolt", "music-note", "party-popper", "google"]);
export function Icon({ name, size = 20, color = C.ink }: { name: string; size?: number; color?: string }) {
  if (MCI.has(name)) return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  return <Feather name={name as any} size={size} color={color} />;
}

/* ---------------------------------------------------------------- Type */
type TProps = { children?: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number; center?: boolean };

/** Bold rounded grotesk for headings. */
export function Display({ children, size = 32, color = C.ink, style, numberOfLines, center }: TProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.display, fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: -size * 0.035, color, textAlign: center ? "center" : "left" }, style]}>
      {children}
    </Text>
  );
}
/** Tall condensed caps for poster moments (welcome, promo titles). */
export function Poster({ children, size = 64, color = C.ink, style, numberOfLines, center }: TProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.poster, fontSize: size, lineHeight: Math.round(size * 0.92), letterSpacing: -size * 0.01, color, textTransform: "uppercase", textAlign: center ? "center" : "left" }, style]}>
      {children}
    </Text>
  );
}
export function Body({ children, size = 15, color = C.ink, style, numberOfLines, weight = "regular", center }: TProps & { weight?: "regular" | "medium" | "semi" | "bold" }) {
  const fam = { regular: F.sans, medium: F.sansMedium, semi: F.sansSemi, bold: F.sansBold }[weight];
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: fam, fontSize: size, lineHeight: Math.round(size * 1.42), color, textAlign: center ? "center" : "left" }, style]}>{children}</Text>;
}
/** Small supporting text (dates, counts, captions). */
export function Label({ children, color = C.muted, style, size = 12.5, numberOfLines }: TProps) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.sansMedium, fontSize: size, lineHeight: Math.round(size * 1.35), color }, style]}>{children}</Text>;
}

/* ---------------------------------------------------------------- Press (spring scale + haptics) */
const APressable = Animated.createAnimatedComponent(Pressable);
export function Press({ children, onPress, style, scaleTo = 0.96, haptic = true, disabled, hitSlop }: { children?: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: boolean; disabled?: boolean; hitSlop?: number }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      hitSlop={hitSlop}
      disabled={disabled}
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
  flame: { bg: C.flame, fg: "#fff", border: C.flame },
  ink: { bg: C.ink, fg: "#fff", border: C.ink },
  green: { bg: C.mint, fg: "#fff", border: C.mint },
  mint: { bg: C.mint, fg: "#fff", border: C.mint },
  white: { bg: "#fff", fg: C.ink, border: C.ink },
  light: { bg: "#fff", fg: C.ink, border: "#fff" },
  sun: { bg: C.sun, fg: C.ink, border: C.sun },
  rose: { bg: C.rose, fg: C.ink, border: C.rose },
  violet: { bg: C.violet, fg: C.ink, border: C.violet },
  ghost: { bg: "transparent", fg: C.ink, border: C.ink },
};
export type Variant = keyof typeof VARIANTS;
/** Rounded-rectangle button: icon on the left, label, arrow on the right. */
export function Button({ label, icon, trail = "arrow-up-right", variant = "ink", onPress, block, small, style, disabled }: { label: string; icon?: string | null; trail?: string | null; variant?: Variant; onPress?: () => void; block?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
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
        { height: h, borderRadius: small ? 14 : 18, backgroundColor: v.bg, borderWidth: 1.5, borderColor: v.border, flexDirection: "row", alignItems: "center", paddingHorizontal: small ? 14 : 18, gap: 10, alignSelf: block ? "stretch" : "flex-start", opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 17 : 19} color={v.fg} /> : null}
      <Text numberOfLines={1} style={{ flexShrink: 1, flexGrow: block ? 1 : 0, fontFamily: F.sansSemi, fontSize: small ? 14.5 : 16, color: v.fg, letterSpacing: -0.2 }}>{label}</Text>
      {trail ? <Icon name={trail} size={small ? 16 : 18} color={v.fg} /> : null}
    </Press>
  );
}
/** Rounded-square icon button (back, share, bell…). */
export function IconButton({ name, onPress, bg = "#fff", color = C.ink, size = 44, style, badge, border }: { name: string; onPress?: () => void; bg?: string; color?: string; size?: number; style?: StyleProp<ViewStyle>; badge?: boolean; border?: string }) {
  return (
    <Press onPress={onPress} hitSlop={6} style={[{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: border ? 1.5 : 0, borderColor: border }, style]}>
      <Icon name={name} size={Math.round(size * 0.44)} color={color} />
      {badge ? <View style={{ position: "absolute", top: size * 0.2, right: size * 0.22, width: 9, height: 9, borderRadius: 5, backgroundColor: C.flame, borderWidth: 2, borderColor: bg }} /> : null}
    </Press>
  );
}

/* ---------------------------------------------------------------- Chips */
export function Chip({ label, active, onPress, dark, icon, color }: { label: string; active?: boolean; onPress?: () => void; dark?: boolean; icon?: string; color?: string }) {
  const onBg = color ?? (dark ? "#fff" : C.ink);
  const s = active
    ? { bg: onBg, fg: onColor(onBg), border: onBg }
    : dark
    ? { bg: "transparent", fg: "#fff", border: "rgba(255,255,255,0.3)" }
    : { bg: "#fff", fg: C.ink, border: C.line };
  return (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 15, height: 38, borderRadius: R.pill, backgroundColor: s.bg, borderWidth: 1.5, borderColor: s.border }}>
      {icon ? <Icon name={icon} size={14} color={s.fg} /> : null}
      <Text style={{ fontFamily: F.sansSemi, fontSize: 13.5, color: s.fg }}>{label}</Text>
    </Press>
  );
}

/* ---------------------------------------------------------------- Live */
export function LiveDot({ color = C.red, size = 8 }: { color?: string; size?: number }) {
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.red, paddingHorizontal: small ? 9 : 12, height: small ? 24 : 30, borderRadius: 10, alignSelf: "flex-start" }}>
      <LiveDot color="#fff" size={small ? 6 : 7} />
      <Text style={{ fontFamily: F.sansBold, fontSize: small ? 10.5 : 12, letterSpacing: 0.8, color: "#fff" }}>LIVE</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- Avatar */
export function Avatar({ name, color = C.violet, size = 40, ring }: { name: string; color?: string; size?: number; ring?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center", borderWidth: ring ? 2.5 : 0, borderColor: ring }}>
      <Text style={{ fontFamily: F.sansBold, fontSize: size * 0.36, color: onColor(color) }}>{initials}</Text>
    </View>
  );
}
export function AvatarStack({ names, colors, size = 32, ring = "#fff", extra }: { names: string[]; colors: string[]; size?: number; ring?: string; extra?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {names.map((n, i) => (
        <View key={n + i} style={{ marginLeft: i ? -size * 0.3 : 0 }}><Avatar name={n} color={colors[i % colors.length]} size={size} ring={ring} /></View>
      ))}
      {extra ? (
        <View style={{ marginLeft: -size * 0.3, width: size, height: size, borderRadius: size / 2, backgroundColor: C.ink, borderWidth: 2.5, borderColor: ring, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: size * 0.32, color: "#fff" }}>{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------------- Progress */
const ACircle = Animated.createAnimatedComponent(Circle);
export function Ring({ size = 64, stroke = 6, progress = 0.5, color = C.flame, track = C.faint, children, delay = 200 }: { size?: number; stroke?: number; progress?: number; color?: string; track?: string; children?: React.ReactNode; delay?: number }) {
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
export function Bar({ progress, color = C.flame, track = C.faint, height = 10, delay = 250 }: { progress: number; color?: string; track?: string; height?: number; delay?: number }) {
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
export function ScreenTitle({ title, sub, right, color = C.ink }: { title: string; sub?: string; right?: React.ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Display size={34} color={color}>{title}</Display>
        {sub ? <Label style={{ marginTop: 2 }} color={color === C.ink ? C.muted : "rgba(255,255,255,0.75)"}>{sub}</Label> : null}
      </View>
      {right}
    </View>
  );
}
export function SectionTitle({ title, action, onAction, dark, sub }: { title: string; action?: string; onAction?: () => void; dark?: boolean; sub?: string }) {
  const fg = dark ? "#fff" : C.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Display size={22} color={fg}>{title}</Display>
        {sub ? <Label color={dark ? "rgba(255,255,255,0.7)" : C.muted} style={{ marginTop: 2 }}>{sub}</Label> : null}
      </View>
      {action ? (
        <Press onPress={onAction} style={{ paddingVertical: 6, paddingLeft: 10, flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Body size={14} weight="semi" color={fg}>{action}</Body>
          <Icon name="arrow-up-right" size={15} color={fg} />
        </Press>
      ) : null}
    </View>
  );
}
export function BackHeader({ title, dark, right, transparent }: { title?: string; dark?: boolean; right?: React.ReactNode; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: transparent ? "transparent" : undefined, zIndex: 10 }}>
      <IconButton name="arrow-left" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} bg={dark ? "rgba(255,255,255,0.14)" : "#fff"} color={dark ? "#fff" : C.ink} border={dark ? undefined : C.line} />
      <Body size={17} weight="bold" color={dark ? "#fff" : C.ink} style={{ flex: 1, textAlign: "center" }} numberOfLines={1}>{title}</Body>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

/* ---------------------------------------------------------------- Segmented (sliding pill) */
export function Segmented({ items, value, onChange, dark, accent = C.ink }: { items: string[]; value: number; onChange: (i: number) => void; dark?: boolean; accent?: string }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const seg = w ? (w - 10) / items.length : 0;
  useEffect(() => {
    x.value = withSpring(value * seg, { damping: 18, stiffness: 180 });
  }, [value, seg]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", padding: 4, borderRadius: R.pill, backgroundColor: dark ? "rgba(255,255,255,0.1)" : "#fff", borderWidth: 1.5, borderColor: dark ? "rgba(255,255,255,0.12)" : C.line }}>
      {seg ? <Animated.View style={[{ position: "absolute", top: 4, bottom: 4, left: 4, width: seg, borderRadius: R.pill, backgroundColor: accent }, pill]} /> : null}
      {items.map((it, i) => (
        <Pressable key={it} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(i); }} style={{ flex: 1, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 14, color: i === value ? onColor(accent) : dark ? "#fff" : C.ink }}>{it}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------------- Starburst sticker */
function starPoints(size: number, spikes: number, depth: number) {
  const c = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? c : c * depth;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}
/** Zig-zag badge (“50% SALE” style). Children are centred on top. */
export function Starburst({ size = 90, color = C.sun, spikes = 14, depth = 0.84, rotate = 0, spin, children, style }: { size?: number; color?: string; spikes?: number; depth?: number; rotate?: number; spin?: boolean; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (spin) t.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1);
  }, [spin]);
  const pts = useMemo(() => starPoints(size, spikes, depth), [size, spikes, depth]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, st]}>
        <Svg width={size} height={size}><Polygon points={pts} fill={color} /></Svg>
      </Animated.View>
      {children}
    </View>
  );
}
/** Starburst with two lines of text, gently bobbing. */
export function Sticker({ top, bottom, bg = C.sun, color, size = 96, rotate = -10 }: { top: string; bottom?: string; bg?: string; color?: string; size?: number; rotate?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -t.value * 5 }, { rotate: `${t.value * 6}deg` }] } as any));
  const fg = color ?? onColor(bg);
  return (
    <Animated.View style={st}>
      <Starburst size={size} color={bg} rotate={rotate}>
        <Text style={{ fontFamily: F.poster, fontSize: size * 0.2, lineHeight: size * 0.21, color: fg, textTransform: "uppercase", textAlign: "center" }}>{top}</Text>
        {bottom ? <Text style={{ fontFamily: F.sansBold, fontSize: size * 0.12, lineHeight: size * 0.15, color: fg, textAlign: "center", textTransform: "uppercase" }}>{bottom}</Text> : null}
      </Starburst>
    </Animated.View>
  );
}

/* ---------------------------------------------------------------- Ticket (card with notches) */
/** A flat colour card with ticket-style notches cut into the sides. `cut` should match the page background. */
export function Ticket({ children, color = C.mint, cut = C.bg, notch = 14, at = 0.5, style, radius = R.lg }: { children?: React.ReactNode; color?: string; cut?: string; notch?: number; at?: number | null; style?: StyleProp<ViewStyle>; radius?: number }) {
  const [h, setH] = useState(0);
  return (
    <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[{ backgroundColor: color, borderRadius: radius, overflow: "hidden" }, style]}>
      {children}
      {at != null && h ? (
        <>
          <View pointerEvents="none" style={{ position: "absolute", left: -notch, top: h * at - notch, width: notch * 2, height: notch * 2, borderRadius: notch, backgroundColor: cut }} />
          <View pointerEvents="none" style={{ position: "absolute", right: -notch, top: h * at - notch, width: notch * 2, height: notch * 2, borderRadius: notch, backgroundColor: cut }} />
        </>
      ) : null}
    </View>
  );
}

/** A dashed divider (ticket tear line). */
export function Dashes({ color = C.line, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", gap: 5, overflow: "hidden", height: 2 }, style]}>
      {Array.from({ length: 60 }).map((_, i) => <View key={i} style={{ width: 7, height: 2, borderRadius: 1, backgroundColor: color }} />)}
    </View>
  );
}

/* ---------------------------------------------------------------- Countdown tiles */
/** Split-flap style digits: each digit sits in its own tile, grouped with a caption. */
export function DigitTiles({ groups, tile = "rgba(255,255,255,0.18)", color = "#fff", size = 26 }: { groups: [string, number][]; tile?: string; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      {groups.map(([label, v]) => (
        <View key={label} style={{ alignItems: "center", gap: 6, flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 3, alignSelf: "stretch" }}>
            {String(Math.max(0, v)).padStart(2, "0").slice(-2).split("").map((d, i) => (
              <View key={i} style={{ flex: 1, height: size * 1.7, borderRadius: 8, backgroundColor: tile, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: size, color, fontVariant: ["tabular-nums"] }}>{d}</Text>
                <View style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "rgba(0,0,0,0.12)" }} />
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: F.sansMedium, fontSize: 11.5, color, opacity: 0.85 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------------- Week strip */
export function DayPill({ top, bottom, active, done, onPress }: { top: string; bottom: string; active?: boolean; done?: boolean; onPress?: () => void }) {
  return (
    <Press onPress={onPress} style={{ flex: 1, height: 66, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.ink, backgroundColor: active ? C.ink : "#fff", alignItems: "center", justifyContent: "center", gap: 2 }}>
      {done ? <Icon name="star" size={13} color={active ? "#fff" : C.ink} /> : null}
      <Text style={{ fontFamily: F.sansMedium, fontSize: 11, color: active ? "#fff" : C.muted }}>{top}</Text>
      <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: active ? "#fff" : C.ink }}>{bottom}</Text>
    </Press>
  );
}

/* ---------------------------------------------------------------- Confetti */
const PALETTE = [C.flame, C.sun, C.rose, C.violet, C.mint, C.sky, C.ink];
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
    } as any;
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
export function TypingDots({ color = C.ink }: { color?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }}>
      {[0, 1, 2].map((i) => <Dot key={i} i={i} color={color} />)}
    </View>
  );
}

export const screen = { width: SW, height: SH };

/* ---------------------------------------------------------------- Loading / empty / error states */
export function Loading({ label, dark }: { label?: string; dark?: boolean }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: "center", gap: 10 }}>
      <TypingDots color={dark ? "#fff" : C.ink} />
      {label ? <Text style={{ fontFamily: F.sansMedium, fontSize: 13, color: dark ? "rgba(255,255,255,0.7)" : C.muted }}>{label}</Text> : null}
    </View>
  );
}
export function Empty({ icon = "inbox", title, body, action, onAction, color = C.violet }: { icon?: string; title: string; body?: string; action?: string; onAction?: () => void; color?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, gap: 8 }}>
      <Starburst size={74} color={color} spikes={12} depth={0.8}><Icon name={icon} size={26} color={onColor(color)} /></Starburst>
      <Text style={{ fontFamily: F.display, fontSize: 19, color: C.ink, textAlign: "center", marginTop: 6, letterSpacing: -0.4 }}>{title}</Text>
      {body ? <Text style={{ fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.muted, textAlign: "center", maxWidth: 300 }}>{body}</Text> : null}
      {action ? <Button label={action} small variant="ink" trail={null} onPress={onAction} style={{ marginTop: 8, alignSelf: "center" }} /> : null}
    </View>
  );
}
export function ErrorBox({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  return <Empty icon="wifi-off" color={C.rose} title="Couldn't load this" body={error?.message || "Check your connection and try again."} action={onRetry ? "Try again" : undefined} onAction={onRetry} />;
}
/** Renders loading / error / empty / content for a useQuery result. */
export function Async<T>({ q, empty, children, label }: { q: { data?: T; loading: boolean; error?: Error; reload: () => void }; empty?: (d: T) => React.ReactNode | null; children: (d: T) => React.ReactNode; label?: string }) {
  if (q.data === undefined) return q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : <Loading label={label} />;
  const e = empty ? empty(q.data) : null;
  return <>{e ?? children(q.data)}</>;
}
