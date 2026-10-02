import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, Button, Display, Icon, Label, Press, Starburst } from "@/components/ui";
import { Prayer } from "@/data/mock";
import { fetchPrayers, postPrayer, prayFor } from "@/lib/api";
import { useStore } from "@/lib/store";

function Heart({ a }: { a: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: 700 }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateX: Math.cos(a) * 30 * t.value }, { translateY: Math.sin(a) * 24 * t.value - 10 * t.value }, { scale: 1 - t.value * 0.6 }] } as any));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 16, top: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: C.flame }, st]} />;
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
    <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(16)} layout={LinearTransition.springify()} style={{ backgroundColor: p.answered ? C.sunSoft : "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: p.answered ? C.sun : C.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.who} color={p.color} size={32} />
        <Body size={14} weight="semi" style={{ flex: 1 }}>{p.who}</Body>
        {p.answered ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.ink, paddingHorizontal: 10, height: 26, borderRadius: 9 }}>
            <Icon name="star" size={12} color={C.sun} />
            <Body size={11.5} weight="bold" color="#fff">Answered</Body>
          </View>
        ) : null}
      </View>
      <Body size={16} style={{ marginTop: 10, lineHeight: 23 }}>{p.text}</Body>
      <Animated.View style={[{ alignSelf: "flex-start", marginTop: 14 }, st]}>
        <Press onPress={tap} haptic={false} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 13, backgroundColor: on ? C.ink : p.answered ? C.sun : C.roseSoft }}>
          <Icon name="hands-pray" size={17} color={on ? "#fff" : C.ink} />
          <Body size={13.5} weight="semi" color={on ? "#fff" : C.ink}>{on ? `You're praying · ${p.count + 1}` : `Praying · ${p.count}`}</Body>
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <BackHeader title="Prayer wall" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: C.rose, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -14, top: -14 }}>
            <Starburst size={110} color={C.ink} spikes={10} depth={0.7} spin><Icon name="hands-pray" size={34} color={C.rose} /></Starburst>
          </View>
          <Display size={30} style={{ maxWidth: "72%" }}>You don't have to carry it alone.</Display>
          <Label color={C.ink} style={{ marginTop: 6 }}>18,432 prayers prayed this year</Label>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, marginTop: 16 }}>
            <TextInput value={text} onChangeText={setText} multiline maxLength={220} placeholder="What can we pray with you about?" placeholderTextColor="rgba(20,20,20,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink, minHeight: 70, textAlignVertical: "top" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Switch value={anon} onValueChange={setAnon} trackColor={{ true: C.mint, false: "#DCD8D0" }} thumbColor="#fff" />
                <Body size={13.5} color={C.muted}>Anonymous</Body>
              </View>
              <Button label="Share" icon="send" trail={null} variant="ink" small onPress={post} />
            </View>
          </View>
        </View>
        {posted ? (
          <Animated.View entering={ZoomIn.springify()} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.mint, borderRadius: 16, paddingHorizontal: 16, height: 50 }}>
            <Icon name="check-circle" size={18} color="#fff" />
            <Body weight="semi" color="#fff">Posted. The family is praying with you.</Body>
          </Animated.View>
        ) : null}
        <Display size={22} style={{ marginTop: 10, marginBottom: 2, marginLeft: 4 }}>Pray with others</Display>
        {list.map((p, i) => <PrayerCard key={p.id} p={p} i={i} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
