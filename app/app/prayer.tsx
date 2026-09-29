import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, Button, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { Prayer } from "@/data/mock";
import { fetchPrayers, postPrayer, prayFor } from "@/lib/api";
import { useStore } from "@/lib/store";

function Heart({ a }: { a: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: 700 }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateX: Math.cos(a) * 30 * t.value }, { translateY: Math.sin(a) * 24 * t.value - 10 * t.value }, { scale: 1 - t.value * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 16, top: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: C.rose }, st]} />;
}

function PrayerCard({ p, i }: { p: Prayer; i: number }) {
  const { praying, togglePraying } = useStore();
  const on = praying.has(p.id);
  const [burst, setBurst] = useState(0);
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const tap = () => {
    const now = togglePraying(p.id);
    if (now) { setBurst((b) => b + 1); prayFor(p.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }
    s.value = withSequence(withSpring(0.88, { damping: 10, stiffness: 400 }), withSpring(1, { damping: 8 }));
  };
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(16)} layout={LinearTransition.springify()} style={{ backgroundColor: p.answered ? "rgba(255,194,61,0.14)" : "rgba(255,255,255,0.07)", borderRadius: R.lg, padding: 18, borderWidth: 1, borderColor: p.answered ? "rgba(255,194,61,0.4)" : "rgba(255,255,255,0.08)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.who} color={p.color} size={30} />
        <Body size={13.5} color={C.creamMuted} style={{ flex: 1 }}>{p.who}</Body>
        {p.answered ? <View style={{ backgroundColor: C.sun, paddingHorizontal: 10, height: 24, borderRadius: R.pill, justifyContent: "center" }}><Body size={11} weight="bold">Answered</Body></View> : null}
      </View>
      <Body size={16} color={C.cream} style={{ marginTop: 10, lineHeight: 23 }}>{p.text}</Body>
      <Animated.View style={[{ alignSelf: "flex-start", marginTop: 14 }, st]}>
        <Press onPress={tap} haptic={false} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 40, borderRadius: R.pill, backgroundColor: on ? C.rose : "rgba(255,255,255,0.1)" }}>
          <Icon name="hands-pray" size={17} color="#fff" />
          <Body size={13.5} weight="semi" color="#fff">{on ? `You're praying · ${p.count + 1}` : `Praying · ${p.count}`}</Body>
        </Press>
        {Array.from({ length: burst ? 10 : 0 }).map((_, k) => <Heart key={`${burst}-${k}`} a={(k / 10) * Math.PI * 2} />)}
      </Animated.View>
    </Animated.View>
  );
}

export default function PrayerWall() {
  const [list, setList] = useState<Prayer[]>([]);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [posted, setPosted] = useState(false);
  useEffect(() => { fetchPrayers().then(setList); }, []);

  const post = async () => {
    const t = text.trim();
    if (!t) return;
    await postPrayer(t, anon);
    setList((l) => [{ id: String(Date.now()), who: anon ? "Anonymous" : "You", text: t, count: 0, color: C.flame }, ...l]);
    setText("");
    setPosted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setPosted(false), 2600);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.deepViolet }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={{ position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: C.rose, opacity: 0.22, top: -120, right: -140 }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: C.violet, opacity: 0.3, bottom: 40, left: -160 }} />
      <BackHeader title="Prayer wall" dark />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 4, marginBottom: 6 }}>
          <Display size={50} color={C.cream} style={{ lineHeight: 48 }}>You don't have to{"\n"}<Serif size={54} color="#FF9EC2">carry it alone.</Serif></Display>
        </View>
        <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <TextInput value={text} onChangeText={setText} multiline maxLength={220} placeholder="What can we pray with you about?" placeholderTextColor="rgba(244,238,228,0.45)" style={{ fontFamily: F.sans, fontSize: 16, color: C.cream, minHeight: 70, textAlignVertical: "top" }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Switch value={anon} onValueChange={setAnon} trackColor={{ true: C.rose, false: "rgba(255,255,255,0.2)" }} />
              <Body size={13.5} color={C.creamMuted}>Anonymous</Body>
            </View>
            <Button label="Share" icon="send" variant="rose" small onPress={post} />
          </View>
        </View>
        {posted ? (
          <Animated.View entering={ZoomIn.springify()} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.mint, borderRadius: R.pill, paddingHorizontal: 16, height: 48 }}>
            <Icon name="check-circle" size={18} color={C.ink} />
            <Body weight="semi">Posted. The family is praying with you.</Body>
          </Animated.View>
        ) : null}
        <Label color={C.creamMuted} style={{ marginTop: 8 }}>18,432 prayers prayed this year</Label>
        {list.map((p, i) => <PrayerCard key={p.id} p={p} i={i} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
