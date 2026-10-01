import React, { useEffect, useRef, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Linking, Platform, Share, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, FadeIn, FadeInDown, FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, Body, Display, Icon, IconButton, Label, LiveBadge, Press, Segmented, Serif } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colorFor, useSermons } from "@/lib/data";
import { useSiteContent } from "@/lib/content";
import { countView } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { fmt } from "@/lib/time";

const { width: SW } = Dimensions.get("window");
const HERO = 380;
const CHAT_LINES = [
  ["Grace", C.flame, "Amen! 🙌"], ["Daniel", C.violet, "Watching from Salmiya, good morning family!"], ["Mariam", C.mint, "Grace upon grace. Needed this today."],
  ["Joel", C.sun, "That worship set though 🔥"], ["Anita", C.rose, "Praying for everyone watching from hospital ❤️"], ["Samuel", C.sky, "Romans 5:20 hits different"],
] as const;

type ChatLine = { n: string; c: string; t: string; k: number };

/** Live chat beside the stream: Supabase Realtime broadcast (not stored) + presence for "watching now". */
function useLiveChat(room: string, name: string, on: boolean) {
  const [msgs, setMsgs] = useState<ChatLine[]>([]);
  const [watching, setWatching] = useState(0);
  const ch = useRef<any>(null);
  useEffect(() => {
    if (!on) return;
    if (!supabase) {
      // demo: a friendly simulated chat
      let k = 0;
      const t = setInterval(() => { const [n, c, line] = CHAT_LINES[k % CHAT_LINES.length]; setMsgs((cs) => [...cs.slice(-7), { n, c, t: line, k: k++ }]); }, 2200);
      return () => clearInterval(t);
    }
    const c = supabase.channel(`live:${room}`, { config: { broadcast: { self: true }, presence: { key: Math.random().toString(36).slice(2) } } });
    c.on("broadcast", { event: "msg" }, ({ payload }: any) => setMsgs((m) => [...m.slice(-40), payload]));
    c.on("presence", { event: "sync" }, () => setWatching(Object.keys(c.presenceState()).length));
    c.subscribe(async (st: string) => { if (st === "SUBSCRIBED") await c.track({ name }); });
    ch.current = c;
    return () => { supabase!.removeChannel(c); ch.current = null; };
  }, [room, on]);
  const send = (t: string) => {
    const line = { n: name, c: colorFor(name), t: t.slice(0, 280), k: Date.now() + Math.random() };
    if (ch.current) ch.current.send({ type: "broadcast", event: "msg", payload: line });
    else setMsgs((m) => [...m.slice(-7), { ...line, n: "You" }]);
  };
  return { msgs, watching, send };
}

export default function SermonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sermons: SERMONS, series: SERIES } = useSermons();
  const CHURCH = useSiteContent().church;
  const m = SERMONS.find((s) => s.id === id || (s as any).slug === id) ?? SERMONS[0];
  const series = m ? SERIES.find((s) => s.id === m.seriesId) : undefined;
  const insets = useSafeAreaInsets();
  const { saved, toggleSaved, notes, setNote, firstName, name, member, needsAccount } = useStore();
  const [tab, setTab] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [draft, setDraft] = useState("");
  const live = useLiveChat(m?.id ?? "none", member ? name : "Guest", !!m?.live && tab === 2);
  const chat = live.msgs;
  useEffect(() => { if (m?.id) countView(m.id); }, [m?.id]);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const heroSt = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.45], Extrapolation.CLAMP) }, { scale: interpolate(y.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP) }],
  }));
  const topBar = useAnimatedStyle(() => ({ backgroundColor: `rgba(244,238,228,${interpolate(y.value, [HERO - 160, HERO - 80], [0, 0.96], Extrapolation.CLAMP)})` }));
  const titleSt = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO - 120, HERO - 70], [0, 1], Extrapolation.CLAMP) }));

  if (!m) return <View style={{ flex: 1, backgroundColor: C.cream }}><Body center color={C.muted} style={{ marginTop: 120 }}>Loading…</Body></View>;
  // Specific video → embed it. Otherwise: live stream (if live now) or the channel's latest uploads.
  const uploads = "UU" + CHURCH.youtubeChannelId.slice(2);
  const embed = m.youtubeId
    ? `https://www.youtube.com/embed/${m.youtubeId}?autoplay=1&playsinline=1&rel=0`
    : m.live && liveMode
    ? `https://www.youtube.com/embed/live_stream?channel=${CHURCH.youtubeChannelId}&autoplay=1&playsinline=1`
    : `https://www.youtube.com/embed/videoseries?list=${uploads}&autoplay=1&playsinline=1&rel=0`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO, overflow: "hidden", backgroundColor: C.ink }}>
          {playing ? (
            <Animated.View entering={FadeIn} style={{ flex: 1, paddingTop: insets.top + 56, backgroundColor: "#000" }}>
              <WebView
                // YouTube's embedded player needs a web origin/referrer; loading it inside a small HTML page with a baseUrl provides one.
                source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${embed}&enablejsapi=1&origin=${encodeURIComponent(CHURCH.webOrigin)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`, baseUrl: CHURCH.webOrigin }}
                allowsInlineMediaPlayback
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                style={{ flex: 1, backgroundColor: "#000" }}
              />
            </Animated.View>
          ) : (
            <Animated.View style={[StyleSheet.absoluteFill, heroSt]}>
              <Image source={m.image} style={{ flex: 1 }} contentFit="cover" transition={250} />
              <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent", "transparent", C.cream]} locations={[0, 0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
              {m.live ? <View style={{ position: "absolute", left: 20, bottom: 70 }}><LiveBadge /></View> : null}
              <Press onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setPlaying(true); }} style={{ position: "absolute", alignSelf: "center", top: HERO / 2 - 30, width: 76, height: 76, borderRadius: 38, backgroundColor: C.flame, alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={30} color="#fff" />
              </Press>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -24 }}>
          <Animated.View entering={FadeInDown.delay(80)}>
            <Label>{series ? `${series.book} · ` : ""}{m.date} · {m.duration}</Label>
            <Display size={48} style={{ marginTop: 8, lineHeight: 46 }}>{m.title}{"\n"}<Serif size={52} color={C.flame}>{m.accent}</Serif></Display>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
              <Avatar name={(m.speaker || "Agape").replace("Ps. ", "")} color={C.ink} size={34} />
              <Body size={14} weight="semi">{m.speaker}</Body>
              <Body size={13} color={C.muted}>· {fmt(m.views)} views</Body>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160)} style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Press onPress={() => setPlaying(true)} style={{ flex: 1, height: 54, borderRadius: R.pill, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="play" size={18} color="#fff" />
              <Body weight="semi" color="#fff">{m.live ? "Watch live" : "Play message"}</Body>
            </Press>
            <IconButton name="bookmark" size={54} bg={saved.has(m.id) ? C.flame : "#fff"} color={saved.has(m.id) ? "#fff" : C.ink} onPress={() => toggleSaved(m.id)} />
            <IconButton name="youtube" size={54} onPress={() => Linking.openURL(m.youtubeId ? `https://www.youtube.com/watch?v=${m.youtubeId}` : CHURCH.youtubeUrl)} />
            <IconButton name="share-2" size={54} onPress={() => Share.share({ message: `${m.title} ${m.accent} · ${CHURCH.name}\n${m.youtubeId ? `https://youtu.be/${m.youtubeId}` : CHURCH.youtubeUrl}` })} />
          </Animated.View>
          {m.live ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Press onPress={() => { setLiveMode(false); setPlaying(true); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: R.pill, backgroundColor: "#fff", justifyContent: "center" }}><Body size={13} weight="semi">Latest uploads</Body></Press>
              <Press onPress={() => { setLiveMode(true); setPlaying(true); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: R.pill, backgroundColor: "#FF2E4D", justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">Live stream</Body></Press>
              <Press onPress={() => Linking.openURL(CHURCH.youtubeUrl)} style={{ paddingHorizontal: 14, height: 36, borderRadius: R.pill, backgroundColor: C.ink, justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">YouTube ↗</Body></Press>
            </View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <Segmented items={["About", "Notes", m.live ? "Live chat" : "Related"]} value={tab} onChange={setTab} />
          </View>

          {tab === 0 ? (
            <Animated.View entering={FadeIn} style={{ marginTop: 18 }}>
              <Body size={16} style={{ lineHeight: 25 }}>{m.about}</Body>
              <View style={{ flexDirection: "row", gap: 24, marginTop: 18 }}>
                <Body color={C.muted}><Body weight="bold">{fmt(m.views)}</Body> views</Body>
                <Body color={C.muted}><Body weight="bold">{fmt(m.likes)}</Body> likes</Body>
              </View>
              <Press onPress={() => router.push("/assistant")} style={{ marginTop: 18, padding: 16, borderRadius: R.lg, backgroundColor: C.lilac, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Icon name="creation" size={22} color={C.violet} />
                <Body weight="semi" style={{ flex: 1 }}>Ask Agape about this sermon</Body>
                <Icon name="arrow-right" size={18} color={C.violet} />
              </Press>
            </Animated.View>
          ) : null}

          {tab === 1 ? (
            <Animated.View entering={FadeIn} style={{ marginTop: 18 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, minHeight: 200 }}>
                <Label style={{ marginBottom: 8 }}>{member ? "My notes · synced to your account" : "My notes · sign in to keep them on every device"}</Label>
                <TextInput
                  multiline
                  value={notes[m.id] ?? ""}
                  onChangeText={(t) => setNote(m.id, t)}
                  placeholder={"Grace isn't just a gift. It's a way of life.\n\nTap to start writing…"}
                  placeholderTextColor="rgba(15,11,18,0.35)"
                  style={{ fontFamily: F.sans, fontSize: 16, lineHeight: 24, color: C.ink, minHeight: 150, textAlignVertical: "top" }}
                />
              </View>
            </Animated.View>
          ) : null}

          {tab === 2 && m.live ? (
            <View style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.lg, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <LiveBadge small />
                <Body size={12.5} color={C.creamMuted}>{live.watching ? `${live.watching} here now` : "Be kind · messages aren't saved"}</Body>
              </View>
              {chat.length === 0 ? <Body size={14} color={C.creamMuted} style={{ paddingVertical: 10 }}>Say hello to everyone watching 👋</Body> : null}
              {chat.map((c) => (
                <Animated.View key={c.k} entering={FadeInDown.springify().damping(16)} style={{ flexDirection: "row", gap: 10, paddingVertical: 7 }}>
                  <Avatar name={c.n} color={c.c} size={28} />
                  <View style={{ flex: 1 }}>
                    <Body size={12} color={C.creamMuted}>{c.n}</Body>
                    <Body size={14} color={C.cream}>{c.t}</Body>
                  </View>
                </Animated.View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.pill, paddingLeft: 16, paddingRight: 5, height: 48 }}>
                <TextInput value={draft} onChangeText={setDraft} placeholder="Say something kind…" placeholderTextColor="rgba(244,238,228,0.45)" style={{ flex: 1, color: C.cream, fontFamily: F.sans, fontSize: 15 }} />
                <IconButton name="send" size={38} bg={C.rose} color="#fff" onPress={() => { if (!draft.trim() || needsAccount("chat during the live stream")) return; live.send(draft.trim()); setDraft(""); }} />
              </View>
            </View>
          ) : null}

          {tab === 2 && !m.live ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              {SERMONS.filter((s) => s.id !== m.id).slice(0, 3).map((s) => (
                <Press key={s.id} onPress={() => router.replace(`/sermon/${s.id}`)} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", padding: 8, borderRadius: R.md }}>
                  <Image source={s.image} style={{ width: 64, height: 64, borderRadius: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Body weight="semi">{s.title} {s.accent}</Body>
                    <Body size={13} color={C.muted}>{s.speaker} · {s.duration}</Body>
                  </View>
                </Press>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* top bar */}
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }, topBar]}>
        <IconButton name="chevron-left" onPress={() => router.back()} bg="rgba(255,255,255,0.9)" />
        <Animated.View style={[{ flex: 1 }, titleSt]}>
          <Body weight="semi" numberOfLines={1}>{m.title} {m.accent}</Body>
        </Animated.View>
        {playing ? <IconButton name="x" onPress={() => setPlaying(false)} bg="rgba(255,255,255,0.9)" /> : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
