import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, Empty, Icon, IconButton, Label, Loading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { getConversation, listMessages, markRead, Message, sendMessage, subscribeMessages } from "@/lib/api";
import { clock } from "@/lib/time";
import { t as tr } from "@/lib/i18n";

const COLORS = [C.violet, C.rose, C.mint, C.sky, C.orange, C.flame];
const colorFor = (id: string) => COLORS[parseInt(id.replace(/-/g, "").slice(0, 6), 16) % COLORS.length];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, isStaff, signedIn } = useAuth();
  const me = session?.user.id;
  const conv = useQuery(signedIn ? `chats:conv:${id}` : null, () => getConversation(id!));
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList>(null);

  useEffect(() => {
    if (!signedIn || !id) return;
    let alive = true;
    const load = () => listMessages(id).then((m) => { if (alive) setMsgs(m); markRead(id).catch(() => {}); }).catch(() => alive && setMsgs((x) => x ?? []));
    load();
    const off = subscribeMessages(id, load);
    return () => { alive = false; off(); };
  }, [id, signedIn]);

  const c = conv.data;
  const readOnly = c?.kind === "announcement" && !isStaff;
  const send = async () => {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    setDraft("");
    try {
      await sendMessage(id!, t);
      setMsgs(await listMessages(id!));
    } catch (e: any) {
      setDraft(t);
      Alert.alert(tr("Message not sent"), e.message);
    } finally {
      setSending(false);
    }
  };

  if (!signedIn) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title={tr("Chat")} /><Empty icon="message-circle" title={tr("Sign in to chat")} action={tr("Sign in")} onAction={() => router.push("/auth")} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={c?.name || tr("Chat")} right={<Avatar name={c?.name || "?"} color={c?.kind === "announcement" ? C.ink : C.violet} size={44} />} />
      {c ? <Label style={{ textAlign: "center" }}>{c.kind === "direct" ? tr("Direct message") : c.kind === "announcement" ? tr("Church announcements") : `${c.members} member${c.members === 1 ? "" : "s"}`}</Label> : null}
      {msgs === null ? <Loading /> : (
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<Empty icon="message-circle" title={tr("No messages yet")} body={readOnly ? tr("Announcements from the church will appear here.") : tr("Say hello 👋")} />}
          renderItem={({ item: m }) => {
            const mine = m.sender_id === me;
            return (
              <Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {!mine ? <Avatar name={m.sender} color={colorFor(m.sender_id)} size={30} /> : null}
                <View style={{ maxWidth: "76%", backgroundColor: mine ? C.sun : C.violet, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 14, paddingVertical: 9 }}>
                  {!mine && c?.kind !== "direct" ? <Body size={12} weight="bold">{m.sender}</Body> : null}
                  <Body size={15}>{m.body}</Body>
                  <Body size={10.5} color="rgba(20,20,20,0.55)" style={{ alignSelf: "flex-end", marginTop: 2 }}>{clock(m.created_at)}</Body>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
      {readOnly ? (
        <View style={{ padding: 16, paddingBottom: insets.bottom + 12, alignItems: "center" }}><Label>{tr("Only church staff can post here.")}</Label></View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
          <View style={{ flex: 1, minHeight: 50, borderRadius: R.pill, backgroundColor: "#ECE9E3", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="message-square" size={16} color={C.muted} />
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} returnKeyType="send" maxLength={4000} placeholder={tr("Type something")} placeholderTextColor="rgba(20,20,20,0.45)" style={{ flex: 1, fontFamily: F.sans, fontSize: 16, color: C.ink, paddingVertical: 12 }} />
          </View>
          <IconButton name="send" size={50} bg={C.mint} color="#fff" onPress={send} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
