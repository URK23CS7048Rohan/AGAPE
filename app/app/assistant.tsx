import React, { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Display, Icon, IconButton, Press, Starburst, TypingDots } from "@/components/ui";
import { askAgape, ChatMsg } from "@/lib/api";
import { useNeedsAccount } from "@/lib/auth";

const SUGGEST = ["What does Romans 8:28 mean?", "Give me a devotional on anxiety", "Where's the verse about “be still”?", "Summarize Sunday's sermon"];

/** Ask Agape's badge: a slowly turning blue starburst with a sparkle. */
export function Orb({ size = 46 }: { size?: number }) {
  return (
    <Starburst size={size} color={C.sky} spikes={12} depth={0.78} spin>
      <Icon name="creation" size={size * 0.42} color={C.ink} />
    </Starburst>
  );
}

type Msg = ChatMsg & { id: string; shown?: string; streaming?: boolean };

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList>(null);
  const needs = useNeedsAccount();

  const stream = (id: string, full: string) => {
    let i = 0;
    const t = setInterval(() => {
      i = Math.min(full.length, i + 3 + Math.floor(Math.random() * 4));
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, shown: full.slice(0, i), streaming: i < full.length } : x)));
      if (i >= full.length) { clearInterval(t); setBusy(false); }
    }, 22);
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy || needs("ask Agape questions")) return;
    setBusy(true);
    setDraft("");
    const history: Msg[] = [...msgs, { id: String(Date.now()), role: "user", content: text }];
    const botId = String(Date.now() + 1);
    setMsgs([...history, { id: botId, role: "assistant", content: "", shown: "", streaming: true }]);
    let reply: string;
    try { reply = await askAgape(history.filter((m) => !m.content.startsWith("⚠️")).map(({ role, content }) => ({ role, content }))); }
    catch (e: any) { reply = `⚠️ ${e.message}`; }
    setMsgs((m) => m.map((x) => (x.id === botId ? { ...x, content: reply } : x)));
    stream(botId, reply);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Ask Agape" right={<Orb size={44} />} />
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.duration(600)} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 30 }}>
            <Orb size={120} />
            <Display size={34} center style={{ marginTop: 22 }}>Ask anything.{"\n"}At 2 AM too.</Display>
            <Body center color={C.muted} style={{ marginTop: 10, maxWidth: 300 }}>Bible questions, verse lookups, devotionals, and anything from this week's sermon.</Body>
          </Animated.View>
        }
        renderItem={({ item: m }) => {
          const me = m.role === "user";
          return (
            <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "86%" }}>
              <View style={{ backgroundColor: me ? C.violet : "#fff", borderWidth: me ? 0 : 1.5, borderColor: C.line, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18, borderBottomRightRadius: me ? 6 : 18, borderBottomLeftRadius: me ? 18 : 6 }}>
                {!me && !m.shown ? <TypingDots /> : <Body size={15.5} style={{ lineHeight: 23 }}>{me ? m.content : m.shown}</Body>}
              </View>
            </Animated.View>
          );
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 10 }} style={{ flexGrow: 0 }}>
        {SUGGEST.map((s) => (
          <Press key={s} disabled={busy} onPress={() => ask(s)} style={{ paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, justifyContent: "center", opacity: busy ? 0.5 : 1 }}>
            <Body size={13.5} weight="medium">{s}</Body>
          </Press>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingBottom: insets.bottom + 10 }}>
        <View style={{ flex: 1, minHeight: 52, borderRadius: R.pill, backgroundColor: "#ECE9E3", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="message-square" size={17} color={C.muted} />
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => ask(draft)} returnKeyType="send" placeholder="Type something" placeholderTextColor="rgba(20,20,20,0.45)" style={{ flex: 1, fontFamily: F.sans, fontSize: 16, color: C.ink, paddingVertical: 12 }} />
        </View>
        <IconButton name="send" size={52} bg={C.ink} color="#fff" onPress={() => ask(draft)} />
      </View>
    </KeyboardAvoidingView>
  );
}
