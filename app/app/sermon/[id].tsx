import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Share, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { C, F, IMG, R } from "@/theme";
import { Avatar, Body, Display, Empty, ErrorBox, Icon, IconButton, Label, LiveBadge, Loading, Press, Segmented, Sticker } from "@/components/ui";
import { imageSource, useSiteContent } from "@/lib/content";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { countView, getNote, getVideo, listVideos, liveChat, LiveLine, postLiveChat, savedVideoIds, saveNote, setSaved, subscribeLiveChat, videoThumb } from "@/lib/api";
import { clock, duration, fmt } from "@/lib/time";
import { t as tr } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

const HERO = 380;

function LiveChat({ videoId }: { videoId: string }) {
  const { signedIn } = useAuth();
  const [lines, setLines] = useState<LiveLine[] | null>(null);
  const [draft, setDraft] = useState("");
  const load = () => liveChat(videoId).then(setLines).catch(() => setLines([]));
  useEffect(() => {
    if (!signedIn) return;
    load();
    return subscribeLiveChat(videoId, load);
  }, [videoId, signedIn]);
  if (!signedIn) return <Empty icon="message-circle" title={tr("Join the live chat")} body={tr("Sign in to chat with everyone watching.")} action={tr("Sign in")} onAction={() => router.push("/auth")} />;
  const send = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    try { await postLiveChat(videoId, t); } catch { setDraft(t); }
  };
  return (
    <View style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.lg, padding: 14 }}>
      {lines === null ? <Loading dark /> : lines.length === 0 ? <Body color="rgba(255,255,255,0.6)" center style={{ paddingVertical: 16 }}>{tr("Say hello to everyone watching 👋")}</Body> : null}
      {(lines ?? []).slice(-30).map((c) => (
        <Animated.View key={c.id} entering={FadeInDown.springify().damping(16)} style={{ flexDirection: "row", gap: 10, paddingVertical: 7 }}>
          <Avatar name={c.name} color={C.violet} size={28} />
          <View style={{ flex: 1 }}>
            <Body size={12} color="rgba(255,255,255,0.6)">{c.name} · {clock(c.created_at)}</Body>
            <Body size={14} color="#fff">{c.body}</Body>
          </View>
        </Animated.View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.pill, paddingLeft: 16, paddingRight: 5, height: 48 }}>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} maxLength={300} placeholder={tr("Say something kind…")} placeholderTextColor="rgba(255,255,255,0.45)" style={{ flex: 1, color: "#fff", fontFamily: F.sans, fontSize: 15 }} />
        <IconButton name="send" size={38} bg={C.sun} color={C.ink} onPress={send} />
      </View>
    </View>
  );
}

function Notes({ videoId }: { videoId: string }) {
  const { signedIn } = useAuth();
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const timer = useRef<any>(null);
  useEffect(() => {
    if (signedIn) getNote(videoId).then(setText).catch(() => setText(""));
    return () => clearTimeout(timer.current);
  }, [videoId, signedIn]);
  if (!signedIn) return <Empty icon="edit-3" title={tr("Take notes as you listen")} body={tr("Sign in and your notes are saved to your account, on every device.")} action={tr("Sign in")} onAction={() => router.push("/auth")} />;
  if (text === null) return <Loading />;
  return (
    <View style={{ marginTop: 18, backgroundColor: C.sunSoft, borderRadius: R.lg, padding: 16, minHeight: 200 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Body size={13} weight="semi">{tr("My notes")}</Body>
        <Label>{state === "saving" ? tr("Saving…") : state === "saved" ? tr("Saved") : state === "error" ? tr("Not saved, check connection") : tr("Syncs to your account")}</Label>
      </View>
      <TextInput
        multiline
        value={text}
        onChangeText={(t) => {
          setText(t);
          setState("saving");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => saveNote(videoId, t).then(() => setState("saved")).catch(() => setState("error")), 800);
        }}
        placeholder={tr("Tap to start writing…")}
        placeholderTextColor="rgba(20,20,20,0.35)"
        style={{ fontFamily: F.sans, fontSize: 16, lineHeight: 24, color: C.ink, minHeight: 150, textAlignVertical: "top" }}
      />
    </View>
  );
}

export default function SermonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isChannel = id === "live";
  const insets = useSafeAreaInsets();
  const { church } = useSiteContent();
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const video = useQuery(isChannel ? null : `sermons:video:${id}`, () => getVideo(id!));
  const all = useQuery("sermons:videos", listVideos);
  const saved = useQuery(signedIn ? "saved:videos" : null, savedVideoIds);
  const [savedNow, setSavedNow] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [tab, setTab] = useState(0);
  const m = video.data;
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const heroSt = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.45], Extrapolation.CLAMP) }, { scale: interpolate(y.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP) }],
  } as any));
  const topBar = useAnimatedStyle(() => ({ backgroundColor: `rgba(246,244,239,${interpolate(y.value, [HERO - 160, HERO - 80], [0, 0.96], Extrapolation.CLAMP)})` }));
  const titleSt = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO - 120, HERO - 70], [0, 1], Extrapolation.CLAMP) }));

  if (!isChannel && !m) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 60 }}>
        {video.loading ? <Loading label={tr("Loading sermon…")} /> : video.error ? <ErrorBox error={video.error} onRetry={video.reload} /> : <Empty icon="video-off" title={tr("This sermon isn't available")} body={tr("It may have been removed.")} action={tr("Back")} onAction={() => router.back()} />}
        <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}><IconButton name="arrow-left" onPress={() => router.back()} /></View>
      </View>
    );
  }

  const title = isChannel ? "Live services" : m!.title;
  const live = isChannel || m!.is_live;
  const isSaved = savedNow ?? !!(m && saved.data?.has(m.id));
  const channel = church.youtubeChannelId || "";
  const uploads = channel.startsWith("UC") ? "UU" + channel.slice(2) : "";
  // A specific video → embed it. Otherwise: the live stream (when live) or the channel's latest uploads.
  const embed = m?.youtube_id
    ? `https://www.youtube.com/embed/${m.youtube_id}?autoplay=1&playsinline=1&rel=0`
    : live && liveMode && channel
    ? `https://www.youtube.com/embed/live_stream?channel=${channel}&autoplay=1&playsinline=1`
    : `https://www.youtube.com/embed/videoseries?list=${uploads}&autoplay=1&playsinline=1&rel=0`;
  const webOrigin = process.env.EXPO_PUBLIC_SITE_URL || "https://www.youtube.com";
  const play = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPlaying(true);
    if (m) countView(m.id).catch(() => {});
  };
  const toggleSave = async () => {
    if (!m || needs("save sermons")) return;
    const on = !isSaved;
    setSavedNow(on);
    try { await setSaved(m.id, on); } catch { setSavedNow(!on); }
  };
  const related = (all.data ?? []).filter((v) => v.id !== m?.id && (!m?.series_id || v.series_id === m.series_id)).slice(0, 4);
  const shareUrl = m?.youtube_id ? `https://youtu.be/${m.youtube_id}` : church.youtube;
  const tabs = ["About", "Notes", live && m ? "Live chat" : "More"];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO, overflow: "hidden", backgroundColor: C.ink, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl }}>
          {playing ? (
            <Animated.View entering={FadeIn} style={{ flex: 1, paddingTop: insets.top + 56, backgroundColor: "#000" }}>
              <WebView
                // YouTube's embedded player needs a web origin/referrer; loading it inside a small HTML page with a baseUrl provides one.
                source={{ html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${embed}&enablejsapi=1&origin=${encodeURIComponent(webOrigin)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`, baseUrl: webOrigin }}
                allowsInlineMediaPlayback
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                style={{ flex: 1, backgroundColor: "#000" }}
              />
            </Animated.View>
          ) : (
            <Animated.View style={[StyleSheet.absoluteFill, heroSt]}>
              <Image source={imageSource(m ? videoThumb(m) : null, IMG.homeWorship)} style={{ flex: 1 }} contentFit="cover" transition={250} />
              {live ? <View style={{ position: "absolute", left: 20, bottom: 20 }}><LiveBadge /></View> : null}
              {m?.series?.book ? <View pointerEvents="none" style={{ position: "absolute", right: 14, bottom: 14 }}><Sticker top={m.series.book} bottom={duration(m.duration_sec) || "Sermon"} bg={C.sun} size={84} /></View> : null}
              <Press onPress={play} style={{ position: "absolute", alignSelf: "center", top: HERO / 2 - 20, width: 76, height: 76, borderRadius: 24, backgroundColor: C.flame, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={30} color="#fff" />
              </Press>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Animated.View entering={FadeInDown.delay(80)}>
            <Label>{[m?.series?.title, m?.published_at ? dateLabel(new Date(m.published_at), { day: "numeric", month: "short", year: "numeric" }) : null, duration(m?.duration_sec)].filter(Boolean).join(" · ") || church.name}</Label>
            <Display size={30} style={{ marginTop: 4 }}>{title}</Display>
            {m ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
                <Avatar name={(m.speaker || church.short || "Agape").replace("Ps. ", "")} color={C.sun} size={34} />
                <Body size={14} weight="semi" numberOfLines={1} style={{ flexShrink: 1 }}>{m.speaker || church.name}</Body>
                <Body size={13} color={C.muted}>· {fmt(m.views)} {tr("views")}</Body>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160)} style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Press onPress={play} style={{ flex: 1, height: 54, borderRadius: 18, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="play" size={18} color="#fff" />
              <Body weight="semi" color="#fff">{live ? tr("Watch live") : tr("Play message")}</Body>
            </Press>
            {m ? <IconButton name="bookmark" size={54} bg={isSaved ? C.sun : "#fff"} border={isSaved ? C.sun : C.line} onPress={toggleSave} /> : null}
            <IconButton name="share-2" size={54} border={C.line} onPress={() => Share.share({ message: `${title} — ${church.name}\n${shareUrl}` })} />
          </Animated.View>
          {live && !m?.youtube_id ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Press onPress={() => { setLiveMode(true); play(); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: C.red, justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">{tr("Live stream")}</Body></Press>
              <Press onPress={() => { setLiveMode(false); play(); }} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, justifyContent: "center" }}><Body size={13} weight="semi">{tr("Latest uploads")}</Body></Press>
              {church.youtube ? <Press onPress={() => Linking.openURL(church.youtube)} style={{ paddingHorizontal: 14, height: 36, borderRadius: 12, backgroundColor: C.ink, justifyContent: "center" }}><Body size={13} weight="semi" color="#fff">{tr("YouTube ↗")}</Body></Press> : null}
            </View>
          ) : null}

          <View style={{ marginTop: 24 }}>
            <Segmented items={tabs} value={tab} onChange={setTab} />
          </View>

          {tab === 0 ? (
            <Animated.View entering={FadeIn} style={{ marginTop: 18 }}>
              <Body size={16} style={{ lineHeight: 25 }}>{m?.description || (isChannel ? tr("Watch our services live when we're streaming, or catch up on the latest messages from our YouTube channel.") : tr("No description yet."))}</Body>
              <Press onPress={() => router.push("/assistant")} style={{ marginTop: 18, padding: 16, borderRadius: R.lg, backgroundColor: C.sky, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Icon name="creation" size={22} />
                <Body weight="semi" style={{ flex: 1 }}>{tr("Ask Agape about this sermon")}</Body>
                <Icon name="arrow-up-right" size={18} />
              </Press>
            </Animated.View>
          ) : null}

          {tab === 1 ? (m ? <Notes videoId={m.id} /> : <Empty icon="edit-3" title={tr("Notes are for sermons")} body={tr("Open a sermon from the library to take notes on it.")} />) : null}

          {tab === 2 && live && m ? <LiveChat videoId={m.id} /> : null}

          {tab === 2 && !(live && m) ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              {related.length === 0 ? <Empty icon="film" title={tr("Nothing else yet")} body={tr("More messages will appear here.")} /> : null}
              {related.map((s) => (
                <Press key={s.id} onPress={() => router.replace(`/sermon/${s.id}`)} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", padding: 8, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line }}>
                  <Image source={imageSource(videoThumb(s), IMG.homeWorship)} style={{ width: 64, height: 64, borderRadius: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Body weight="semi" numberOfLines={2}>{s.title}</Body>
                    <Body size={13} color={C.muted} numberOfLines={1}>{[s.speaker, duration(s.duration_sec)].filter(Boolean).join(" · ")}</Body>
                  </View>
                </Press>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }, topBar]}>
        <IconButton name="arrow-left" onPress={() => router.back()} />
        <Animated.View style={[{ flex: 1 }, titleSt]}>
          <Body weight="semi" numberOfLines={1}>{title}</Body>
        </Animated.View>
        {playing ? <IconButton name="x" onPress={() => setPlaying(false)} /> : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
