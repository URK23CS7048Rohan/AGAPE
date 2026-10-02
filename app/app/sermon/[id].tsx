import React, { useEffect, useRef, useState } from "react";
import { Dimensions, KeyboardAvoidingView, Linking, Platform, Share, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, FadeIn, FadeInDown, FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, Body, Display, Icon, IconButton, Label, LiveBadge, Press, Segmented, Sticker } from "@/components/ui";
import { CHURCH, SERMONS, SERIES } from "@/data/mock";
import { useStore } from "@/lib/store";
import { saveNote } from "@/lib/api";
import { fmt } from "@/lib/time";

const { width: SW } = Dimensions.get("window");
const HERO = 380;
const CHAT_LINES = [
  ["Grace", C.flame, "Amen! 🙌"], ["Daniel", C.violet, "Watching from Salmiya, good morning family!"], ["Mariam", C.mint, "Grace upon grace. Needed this today."],
  ["Joel", C.sun, "That worship set though 🔥"], ["Anita", C.rose, "Praying for everyone watching from hospital ❤️"], ["Samuel", C.sky, "Romans 5:20 hits different"],
] as const;

export default function SermonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = SERMONS.find((s) => s.id === id) ?? SERMONS[0];
  const series = SERIES.find((s) => s.id === m.seriesId);
  const insets = useSafeAreaInsets();
  const { saved, toggleSaved, notes, setNote } = useStore();
  const [tab, setTab] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [chat, setChat] = useState<{ n: string; c: string; t: string; k: number }[]>([]);
  const [draft, setDraft] = useState("");
  const noteTimer = useRef<any>(null);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const heroSt = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.45], Extrapolation.CLAMP) }, { scale: interpolate(y.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP) }],
  } as any));
  const topBar = useAnimatedStyle(() => ({ backgroundColor: `rgba(246,244,239,${interpolate(y.value, [HERO - 160, HERO - 80], [0, 0.96], Extrapolation.CLAMP)})` }));
  const titleSt = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO - 120, HERO - 70], [0, 1], Extrapolation.CLAMP) }));

  useEffect(() => {
    let k = 0;
    const t = setInterval(() => {
      const [n, c, line] = CHAT_LINES[k % CHAT_LINES.length];
      setChat((cs) => [...cs.slice(-7), { n, c, t: line, k: k++ }]);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  // Specific video → embed it. Otherwise: live stream (if live now) or the channel's latest uploads.
  const uploads = "UU" + CHURCH.youtubeChannelId.slice(2);
  const embed = m.youtubeId
    ? `https://www.youtube.com/embed/${m.youtubeId}?autoplay=1&playsinline=1&rel=0`
    : m.live && liveMode
    ? `https://www.youtube.com/embed/live_stream?channel=${CHURCH.youtubeChannelId}&autoplay=1&playsinline=1`
    : `https://www.youtube.com/embed/videoseries?list=${uploads}&autoplay=1&playsinline=1&rel=0`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO, overflow: "hidden", backgroundColor: C.ink, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl }}>
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
              {m.live ? <View style={{ position: "absolute", left: 20, bottom: 20 }}><LiveBadge /></View> : null}
              {series ? <View pointerEvents="none" style={{ position: "absolute", right: 14, bottom: 14 }}><Sticker top={series.book} bottom={m.duration} bg={C.sun} size={84} /></View> : null}
              <Press onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setPlaying(true); }} style={{ position: "absolute", alignSelf: "center", top: HERO / 2 - 20, width: 76, height: 76, borderRadius: 24, backgroundColor: C.flame, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={30} color="#fff" />
              </Press>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Animated.View entering={FadeInDown.delay(80)}>
            <Label>{series ? `${series.book} · ` : ""}{m.date} · {m.duration}</Label>
            <Display size={32} style={{ marginTop: 4 }}>{m.title} {m.accent}</Display>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
              <Avatar name={m.speaker.replace("Ps. ", "")} color={C.sun} size={34} />
              <Body size={14} weight="semi">{m.speaker}</Body>
              <Body size={13} color={C.muted}>· {fmt(m.views)} views</Body>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160)} style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Press onPress={() => setPlaying(true)} style={{ flex: 1, height: 54, borderRadius: 18, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="play" size={18} color="#fff" />
              <Body weight="semi" color="#fff">{m.live ? "Watch live" : "Play message"}</Body>
            </Press>
            <IconButton name="bookmark" size={54} bg={saved.has(m.id) ? C.sun : "#fff"} border={saved.has(m.id) ? C.sun : C.line} onPress={() => toggleSaved(m.id)} />
            <IconButton name={downloaded ? "check" : "download"} size={54} bg={downloaded ? C.mint : "#fff"} color={downloaded ? "#fff" : C.ink} border={downloaded ? C.mint : C.line} onPress={() => setDownloaded(true)} />
            <IconButton name="share-2" size={54} border={C.line} onPress={() => Share.share({ message: `${m.title} ${m.accent} — ${CHURCH.name}\n${CHURCH.youtubeUrl}` })} />
          </Animated.View>
          {m.live ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Press onPress={() => { setLiveMode(false); setPlaying(true); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, justifyContent: "center" }}><Body size={13} weight="semi">Latest uploads</Body></Press>
              <Press onPress={() => { setLiveMode(true); setPlaying(true); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: C.red, justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">Live stream</Body></Press>
              <Press onPress={() => Linking.openURL(CHURCH.youtubeUrl)} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: C.ink, justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">YouTube ↗</Body></Press>
            </View>
          ) : null}
          {downloaded ? <Animated.View entering={FadeInUp}><Body size={13} color={C.muted} style={{ marginTop: 10 }}>Saved for offline listening · 142 MB</Body></Animated.View> : null}

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
              <Press onPress={() => router.push("/assistant")} style={{ marginTop: 18, padding: 16, borderRadius: R.lg, backgroundColor: C.sky, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Icon name="creation" size={22} />
                <Body weight="semi" style={{ flex: 1 }}>Ask Agape about this sermon</Body>
                <Icon name="arrow-up-right" size={18} />
              </Press>
            </Animated.View>
          ) : null}

          {tab === 1 ? (
            <Animated.View entering={FadeIn} style={{ marginTop: 18 }}>
              <View style={{ backgroundColor: C.sunSoft, borderRadius: R.lg, padding: 16, minHeight: 200 }}>
                <Body size={13} weight="semi" style={{ marginBottom: 8 }}>My notes · syncs to all devices</Body>
                <TextInput
                  multiline
                  value={notes[m.id] ?? ""}
                  onChangeText={(t) => {
                    setNote(m.id, t);
                    clearTimeout(noteTimer.current);
                    noteTimer.current = setTimeout(() => saveNote(m.id, t), 800);
                  }}
                  placeholder={"Grace isn't just a gift. It's a way of life.\n\nTap to start writing…"}
                  placeholderTextColor="rgba(20,20,20,0.35)"
                  style={{ fontFamily: F.sans, fontSize: 16, lineHeight: 24, color: C.ink, minHeight: 150, textAlignVertical: "top" }}
                />
              </View>
            </Animated.View>
          ) : null}

          {tab === 2 && m.live ? (
            <View style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.lg, padding: 14 }}>
              {chat.map((c) => (
                <Animated.View key={c.k} entering={FadeInDown.springify().damping(16)} style={{ flexDirection: "row", gap: 10, paddingVertical: 7 }}>
                  <Avatar name={c.n} color={c.c} size={28} />
                  <View style={{ flex: 1 }}>
                    <Body size={12} color="rgba(255,255,255,0.6)">{c.n}</Body>
                    <Body size={14} color="#fff">{c.t}</Body>
                  </View>
                </Animated.View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.pill, paddingLeft: 16, paddingRight: 5, height: 48 }}>
                <TextInput value={draft} onChangeText={setDraft} placeholder="Say something kind…" placeholderTextColor="rgba(255,255,255,0.45)" style={{ flex: 1, color: "#fff", fontFamily: F.sans, fontSize: 15 }} />
                <IconButton name="send" size={38} bg={C.sun} color={C.ink} onPress={() => { if (!draft.trim()) return; setChat((cs) => [...cs.slice(-7), { n: "You", c: C.flame, t: draft.trim(), k: Date.now() }]); setDraft(""); }} />
              </View>
            </View>
          ) : null}

          {tab === 2 && !m.live ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              {SERMONS.filter((s) => s.id !== m.id).slice(0, 3).map((s) => (
                <Press key={s.id} onPress={() => router.replace(`/sermon/${s.id}`)} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", padding: 8, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line }}>
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
        <IconButton name="arrow-left" onPress={() => router.back()} />
        <Animated.View style={[{ flex: 1 }, titleSt]}>
          <Body weight="semi" numberOfLines={1}>{m.title} {m.accent}</Body>
        </Animated.View>
        {playing ? <IconButton name="x" onPress={() => setPlaying(false)} /> : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
