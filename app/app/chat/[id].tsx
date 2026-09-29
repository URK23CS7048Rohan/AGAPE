import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, IconButton, TypingDots } from "@/components/ui";
import { CHATS } from "@/data/mock";

type Msg = { id: string; me?: boolean; who?: string; color?: string; text: string; time: string };

const SEED: Msg[] = [
  { id: "1", who: "Daniel", color: C.violet, text: "Hey everyone! Friday night is at 7, same place 🙌", time: "6:02 PM" },
  { id: "2", who: "Grace", color: C.rose, text: "Can someone give me a ride? I'm in Salmiya.", time: "6:05 PM" },
  { id: "3", me: true, text: "Request one in the app! It's on the Rides tab 🚗", time: "6:06 PM" },
  { id: "4", who: "Joel", color: C.mint, text: "Bringing snacks. Anyone allergic to peanuts?", time: "6:11 PM" },
  { id: "5", who: "Daniel", color: C.violet, text: "See you all tomorrow! 🙌", time: "7:43 PM" },
];
const REPLIES = ["Amen 🙏", "Love this!", "See you there!", "Praying for you ❤️", "Haha yes 😂"];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = CHATS.find((c) => c.id === id) ?? CHATS[0];
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const list = useRef<FlatList>(null);

  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: false }), 50); }, []);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMsgs((m) => [...m, { id: String(Date.now()), me: true, text: t, time: now }]);
    setDraft("");
    setTimeout(() => setTyping(true), 600);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { id: String(Date.now() + 1), who: "Grace", color: C.rose, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], time: now }]);
    }, 2200);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={chat.name} right={<Avatar name={chat.name} color={chat.color} size={38} />} />
      <Body size={12} color={C.muted} center>{chat.group ? `${chat.members} members` : "Direct message"}</Body>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={typing ? <View style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 10 }}><TypingDots color={C.rose} /></View> : null}
        renderItem={({ item: m }) => (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: "row", justifyContent: m.me ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {!m.me ? <Avatar name={m.who ?? "?"} color={m.color} size={30} /> : null}
            <View style={{ maxWidth: "76%", backgroundColor: m.me ? C.ink : "#fff", borderRadius: 22, borderBottomRightRadius: m.me ? 6 : 22, borderBottomLeftRadius: m.me ? 22 : 6, paddingHorizontal: 15, paddingVertical: 10 }}>
              {!m.me ? <Body size={12} weight="semi" color={m.color}>{m.who}</Body> : null}
              <Body size={15} color={m.me ? "#fff" : C.ink}>{m.text}</Body>
              <Body size={10.5} color={m.me ? "rgba(255,255,255,0.5)" : C.muted} style={{ alignSelf: "flex-end", marginTop: 2 }}>{m.time}</Body>
            </View>
          </Animated.View>
        )}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
        <IconButton name="plus" size={46} />
        <View style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: "#fff", paddingHorizontal: 18, justifyContent: "center" }}>
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} returnKeyType="send" placeholder="Message" placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
        </View>
        <IconButton name="send" size={50} bg={C.flame} color="#fff" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
