import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Display, IconButton, TypingDots } from "@/components/ui";
import { askAgape, ChatMsg } from "@/lib/api";
import { t } from "@/lib/i18n";

const SUGGEST = ["What does Romans 8:28 mean?", "Give me a devotional on anxiety", "Where's the verse about “be still”?", "Summarize Sunday's sermon"];

export function Orb({ size = 46 }: { size?: number }) {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", shadowColor: C.violet, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6 }}>
      <Animated.View style={[{ width: size, height: size }, st]}>
        <LinearGradient colors={[C.violet, C.sky, C.rose, C.sun]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
      <View style={{ position: "absolute", top: size * 0.18, left: size * 0.18, right: size * 0.18, bottom: size * 0.18, borderRadius: size, backgroundColor: "rgba(255,255,255,0.55)" }} />
    </View>
  );
}

type Msg = ChatMsg & { id: string; shown?: string; streaming?: boolean };

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList>(null);

  const stream = (id: string, full: string) => {
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(full.length, i + 3 + Math.floor(Math.random() * 4));
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, shown: full.slice(0, i), streaming: i < full.length } : x)));
      if (i >= full.length) { clearInterval(timer); setBusy(false); }
    }, 22);
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    const history: Msg[] = [...msgs, { id: String(Date.now()), role: "user", content: text }];
    const botId = String(Date.now() + 1);
    setMsgs([...history, { id: botId, role: "assistant", content: "", shown: "", streaming: true }]);
    const reply = await askAgape(history.map(({ role, content }) => ({ role, content })));
    setMsgs((m) => m.map((x) => (x.id === botId ? { ...x, content: reply } : x)));
    stream(botId, reply);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[C.skySoft, C.lilac, C.roseSoft]} locations={[0, 0.6, 1]} style={{ flex: 1 }}>
        <BackHeader title={t("Ask Agape")} right={<Orb size={40} />} />
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.duration(700)} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
              <Orb size={96} />
              <Display size={34} center style={{ marginTop: 22 }}>{t("Ask anything. At 2 AM too.")}</Display>
              <Body center color={C.muted} style={{ marginTop: 10, maxWidth: 300 }}>{t("Bible questions, verse lookups, devotionals, and anything from this week's sermon.")}</Body>
            </Animated.View>
          }
          renderItem={({ item: m }) => (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "86%" }}>
              <View style={{ backgroundColor: m.role === "user" ? C.ink : "#fff", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomRightRadius: m.role === "user" ? 6 : 22, borderBottomLeftRadius: m.role === "user" ? 22 : 6 }}>
                {m.role === "assistant" && !m.shown ? <TypingDots /> : <Body size={15.5} color={m.role === "user" ? "#fff" : C.ink} style={{ lineHeight: 23 }}>{m.role === "user" ? m.content : m.shown}</Body>}
              </View>
            </Animated.View>
          )}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 10 }} style={{ flexGrow: 0 }}>
          {SUGGEST.map((s) => (
            <Button key={s} small variant="white" label={t(s)} disabled={busy} onPress={() => ask(t(s))} />
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: insets.bottom + 10 }}>
          <View style={{ flex: 1, minHeight: 54, borderRadius: R.pill, backgroundColor: "#fff", paddingHorizontal: 20, justifyContent: "center" }}>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => ask(draft)} returnKeyType="send" placeholder={t("Type your question…")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
          </View>
          <IconButton name="send" label={t("Send")} size={54} bg={C.violet} color="#fff" onPress={() => ask(draft)} />
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
