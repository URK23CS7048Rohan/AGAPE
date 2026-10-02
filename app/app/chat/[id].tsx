import React, { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, Icon, IconButton, Label, TypingDots } from "@/components/ui";
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={chat.name} right={<Avatar name={chat.name} color={chat.color} size={44} />} />
      <Label style={{ textAlign: "center" }}>{chat.group ? `${chat.members} members` : "Direct message"}</Label>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={typing ? <View style={{ alignSelf: "flex-start", backgroundColor: C.violet, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, marginTop: 10 }}><TypingDots /></View> : null}
        renderItem={({ item: m }) => (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: "row", justifyContent: m.me ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {!m.me ? <Avatar name={m.who ?? "?"} color={m.color} size={30} /> : null}
            <View style={{ maxWidth: "76%", backgroundColor: m.me ? C.sun : C.violet, borderRadius: 16, borderBottomRightRadius: m.me ? 4 : 16, borderBottomLeftRadius: m.me ? 16 : 4, paddingHorizontal: 14, paddingVertical: 9 }}>
              {!m.me ? <Body size={12} weight="bold">{m.who}</Body> : null}
              <Body size={15}>{m.text}</Body>
              <Body size={10.5} color="rgba(20,20,20,0.55)" style={{ alignSelf: "flex-end", marginTop: 2 }}>{m.time}</Body>
            </View>
          </Animated.View>
        )}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
        <IconButton name="plus" size={48} border={C.line} />
        <View style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: "#ECE9E3", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="message-square" size={16} color={C.muted} />
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} returnKeyType="send" placeholder="Type something" placeholderTextColor="rgba(20,20,20,0.45)" style={{ flex: 1, fontFamily: F.sans, fontSize: 16, color: C.ink }} />
        </View>
        <IconButton name="send" size={50} bg={C.mint} color="#fff" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
