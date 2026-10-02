import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, IconButton, Press, TypingDots } from "@/components/ui";
import { CHATS } from "@/data/mock";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/data";
import { leaveConversation, markRead, sendMessage } from "@/lib/api";
import { t } from "@/lib/i18n";

type Msg = { id: string; me?: boolean; who?: string; color?: string; text: string; time: string; pending?: boolean };
const hhmm = (iso?: string) => new Date(iso || Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const SEED: Msg[] = [
  { id: "1", who: "Daniel", color: C.violet, text: "Hey everyone! Friday night is at 7, same place 🙌", time: "6:02 PM" },
  { id: "2", who: "Grace", color: C.rose, text: "Can someone give me a ride? I'm in Salmiya.", time: "6:05 PM" },
  { id: "3", me: true, text: "Request one in the app! It's on the Rides tab 🚗", time: "6:06 PM" },
  { id: "4", who: "Joel", color: C.mint, text: "Bringing snacks. Anyone allergic to peanuts?", time: "6:11 PM" },
  { id: "5", who: "Daniel", color: C.violet, text: "See you all tomorrow! 🙌", time: "7:43 PM" },
];
const REPLIES = ["Amen 🙏", "Love this!", "See you there!", "Praying for you ❤️", "Haha yes 😂"];

/** A conversation: group chat or direct message, live over Supabase Realtime. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useStore();
  const me = session?.user.id;
  const live = !!supabase && !!me;
  const demo = CHATS.find((c) => c.id === id) ?? CHATS[0];
  const [meta, setMeta] = useState<{ name: string; sub: string; color: string; kind: string; topic?: string | null }>(
    live ? { name: "", sub: "", color: C.ink, kind: "group" } : { name: demo.name, sub: demo.group ? t("{n} members", { n: demo.members }) : t("Direct message"), color: demo.color, kind: demo.group ? "group" : "direct" },
  );
  const [msgs, setMsgs] = useState<Msg[]>(live ? [] : SEED);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [err, setErr] = useState("");
  const names = useRef<Record<string, string>>({});
  const list = useRef<FlatList>(null);

  const toMsg = (m: any): Msg => {
    const who = m.sender?.full_name || names.current[m.sender_id] || t("Member");
    names.current[m.sender_id] = who;
    return { id: m.id, me: m.sender_id === me, who, color: colorFor(m.sender_id), text: m.body, time: hhmm(m.created_at) };
  };

  // load conversation + history, then listen for new messages
  useEffect(() => {
    if (!live || !id) { setTimeout(() => list.current?.scrollToEnd({ animated: false }), 50); return; }
    let alive = true;
    (async () => {
      const [c, mem, hist] = await Promise.all([
        supabase!.from("conversations").select("id, kind, name, color, topic_key").eq("id", id).maybeSingle(),
        supabase!.from("conversation_members").select("user_id, profiles(full_name)").eq("conversation_id", id),
        supabase!.from("messages").select("id, body, created_at, sender_id, sender:profiles(full_name)").eq("conversation_id", id).order("created_at", { ascending: false }).limit(150),
      ]);
      if (!alive) return;
      if (c.error || !c.data) { setErr(t("This chat isn't available.")); return; }
      (mem.data || []).forEach((m: any) => { names.current[m.user_id] = m.profiles?.full_name || t("Member"); });
      const others = (mem.data || []).filter((m: any) => m.user_id !== me);
      const name = c.data.name || others.map((m: any) => names.current[m.user_id]).join(", ") || t("Chat");
      setMeta({ name, kind: c.data.kind, topic: c.data.topic_key, color: c.data.color || colorFor(name), sub: c.data.kind === "direct" ? t("Direct message") : (mem.data || []).length === 1 ? t("1 member") : t("{n} members", { n: (mem.data || []).length }) });
      setMsgs((hist.data || []).reverse().map(toMsg));
      markRead(id);
    })();
    const ch = supabase!.channel(`chat:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, async (p: any) => {
        const row = p.new;
        if (!names.current[row.sender_id]) {
          const { data } = await supabase!.from("profiles").select("full_name").eq("id", row.sender_id).maybeSingle();
          names.current[row.sender_id] = data?.full_name || t("Member");
        }
        setMsgs((m) => (m.some((x) => x.id === row.id) ? m : [...m.filter((x) => !(x.pending && x.me && x.text === row.body)), toMsg(row)]));
        markRead(id);
      })
      .subscribe();
    return () => { alive = false; supabase!.removeChannel(ch); };
  }, [id, live]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    if (!live) {
      setMsgs((m) => [...m, { id: String(Date.now()), me: true, text: body, time: hhmm() }]);
      setTimeout(() => setTyping(true), 600);
      setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { id: String(Date.now() + 1), who: "Grace", color: C.rose, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], time: hhmm() }]); }, 2200);
      return;
    }
    const temp: Msg = { id: `tmp-${Date.now()}`, me: true, text: body, time: hhmm(), pending: true };
    setMsgs((m) => [...m, temp]);
    try { await sendMessage(id!, body); }
    catch (e: any) { setMsgs((m) => m.filter((x) => x.id !== temp.id)); setDraft(body); Alert.alert(t("Not sent"), e?.message || t("Please try again.")); }
  };

  const leave = () => Alert.alert(t("Leave {name}?", { name: meta.name }), t("You can join again from Community → Groups."), [
    { text: t("Cancel"), style: "cancel" },
    { text: t("Leave"), style: "destructive", onPress: async () => { await leaveConversation(id!).catch(() => {}); router.back(); } },
  ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={meta.name || t("Chat")} right={
        <Press onPress={live && meta.kind === "group" && meta.topic !== "family" ? leave : undefined}>
          <Avatar name={meta.name || "?"} color={meta.color} size={38} />
        </Press>
      } />
      <Body size={12} color={C.muted} center>{err || meta.sub}</Body>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Body color={C.muted} center style={{ marginTop: 40 }}>{live ? t("No messages yet. Say hello 👋") : ""}</Body>}
        ListFooterComponent={typing ? <View style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 10 }}><TypingDots color={C.rose} /></View> : null}
        renderItem={({ item: m }) => (
          <Animated.View entering={FadeInDown.springify().damping(18)} style={{ flexDirection: "row", justifyContent: m.me ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
            {!m.me ? <Avatar name={m.who ?? "?"} color={m.color} size={30} /> : null}
            <View style={{ maxWidth: "76%", backgroundColor: m.me ? C.ink : "#fff", borderRadius: 22, borderBottomRightRadius: m.me ? 6 : 22, borderBottomLeftRadius: m.me ? 22 : 6, paddingHorizontal: 15, paddingVertical: 10, opacity: m.pending ? 0.6 : 1 }}>
              {!m.me && meta.kind !== "direct" ? <Body size={12} weight="semi" color={m.color}>{m.who}</Body> : null}
              <Body size={15} color={m.me ? "#fff" : C.ink}>{m.text}</Body>
              <Body size={10.5} color={m.me ? "rgba(255,255,255,0.5)" : C.muted} style={{ alignSelf: "flex-end", marginTop: 2 }}>{m.pending ? t("Sending…") : m.time}</Body>
            </View>
          </Animated.View>
        )}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
        <View style={{ flex: 1, minHeight: 50, maxHeight: 120, borderRadius: 25, backgroundColor: "#fff", paddingHorizontal: 18, paddingVertical: 10, justifyContent: "center" }}>
          <TextInput value={draft} onChangeText={setDraft} multiline maxLength={4000} placeholder={t("Message")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
        </View>
        <IconButton name="send" label={t("Send")} size={50} bg={draft.trim() ? C.flame : "rgba(15,11,18,0.15)"} color="#fff" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
