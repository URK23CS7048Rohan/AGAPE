import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Avatar, BackHeader, Body, Button, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { SwipeDeck } from "@/components/Motion";
import { markAnswered, postPrayer, prayFor } from "@/lib/api";
import { useStore } from "@/lib/store";
import { LivePrayer, usePrayers } from "@/lib/data";
import { useSiteContent } from "@/lib/content";
import { fmt } from "@/lib/time";
import { t } from "@/lib/i18n";

type Prayer = LivePrayer;

function Heart({ a }: { a: number }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: 700 }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - k.value, transform: [{ translateX: Math.cos(a) * 30 * k.value }, { translateY: Math.sin(a) * 24 * k.value - 10 * k.value }, { scale: 1 - k.value * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 16, top: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: C.rose }, st]} />;
}

const PAPER = ["#FFE680", "#FFC2D8", "#BDF3DC", "#D9CCFF", "#FFD2B8", "#C7E9FF"];

/** A paper note in the swipe stack: fling right to pray, left to skip. */
function DeckNote({ p, i, top, tx }: { p: Prayer; i: number; top: boolean; tx: any }) {
  const pray = useAnimatedStyle(() => ({ opacity: top ? Math.max(0, Math.min(1, tx.value / 120)) : 0, transform: [{ rotate: "-12deg" }, { scale: 0.8 + Math.max(0, Math.min(1, tx.value / 120)) * 0.2 }] }));
  const skip = useAnimatedStyle(() => ({ opacity: top ? Math.max(0, Math.min(1, -tx.value / 120)) : 0, transform: [{ rotate: "12deg" }] }));
  return (
    <View style={{ flex: 1, backgroundColor: PAPER[i % PAPER.length], borderRadius: 8, borderBottomRightRadius: 34, padding: 22, paddingTop: 30, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 12 }}>
      <View style={{ position: "absolute", top: -10, alignSelf: "center", width: 90, height: 24, backgroundColor: "rgba(255,255,255,0.55)", transform: [{ rotate: "-3deg" }] }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.who} color={p.color} size={32} />
        <Body size={14} weight="semi" color="rgba(15,11,18,0.7)" style={{ flex: 1 }}>{p.who}</Body>
        <Label size={10} color="rgba(15,11,18,0.5)">{t("{n} praying", { n: p.count })}</Label>
      </View>
      <Serif size={30} color={C.ink} style={{ marginTop: 18, lineHeight: 34 }}>{p.text}</Serif>
      <View style={{ position: "absolute", left: 22, right: 22, bottom: 20, flexDirection: "row", justifyContent: "space-between" }}>
        <Label size={10} color="rgba(15,11,18,0.45)">← {t("Next")}</Label>
        <Label size={10} color="rgba(15,11,18,0.45)">{t("Pray")} →</Label>
      </View>
      <Animated.View style={[{ position: "absolute", left: 20, top: 60, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 3, borderColor: C.rose }, pray]}>
        <Display size={30} color={C.rose} style={{ textTransform: "uppercase" }}>{t("Praying")} ♥</Display>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", right: 20, top: 60, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 3, borderColor: "rgba(15,11,18,0.5)" }, skip]}>
        <Display size={30} color="rgba(15,11,18,0.55)" style={{ textTransform: "uppercase" }}>{t("Next")}</Display>
      </Animated.View>
    </View>
  );
}

function PrayerCard({ p, i, onPray, onAnswered }: { p: Prayer; i: number; onPray: (p: Prayer) => boolean; onAnswered: (p: Prayer) => void }) {
  const { praying } = useStore();
  const on = praying.has(p.id) || !!p.prayed;
  const [burst, setBurst] = useState(0);
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const tap = () => {
    if (on) return;
    if (onPray(p)) { setBurst((b) => b + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }
    s.value = withSequence(withSpring(0.88, { damping: 10, stiffness: 400 }), withSpring(1, { damping: 8 }));
  };
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(16)} layout={LinearTransition.springify()} style={{ backgroundColor: PAPER[i % PAPER.length], borderRadius: 6, borderBottomRightRadius: 26, padding: 18, transform: [{ rotate: `${(i % 3 - 1) * 1.2}deg` }] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.who} color={p.color} size={30} />
        <Body size={13.5} weight="semi" color="rgba(15,11,18,0.65)" style={{ flex: 1 }}>{p.who}</Body>
        {p.answered ? <View style={{ backgroundColor: C.sun, paddingHorizontal: 10, height: 24, borderRadius: R.pill, justifyContent: "center" }}><Body size={11} weight="bold">{t("Answered")}</Body></View> : null}
      </View>
      <Serif size={22} color={C.ink} style={{ marginTop: 10, lineHeight: 26 }}>{p.text}</Serif>
      <Animated.View style={[{ alignSelf: "flex-start", marginTop: 14 }, st]}>
        <Button small icon="hands-pray" variant={on ? "rose" : "ink"} label={on ? t("You're praying · {n}", { n: p.count }) : t("Pray · {n}", { n: p.count })} onPress={tap} />
        {Array.from({ length: burst ? 10 : 0 }).map((_, k) => <Heart key={`${burst}-${k}`} a={(k / 10) * Math.PI * 2} />)}
      </Animated.View>
      {p.mine && !p.answered ? (
        <Press onPress={() => onAnswered(p)} style={{ position: "absolute", right: 14, bottom: 16 }}>
          <Body size={12.5} weight="semi" color="rgba(15,11,18,0.6)">{t("Mark answered")} ✓</Body>
        </Press>
      ) : null}
    </Animated.View>
  );
}

export default function PrayerWall() {
  const q = usePrayers();
  const list = q.data;
  const stats = useSiteContent().stats;
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [posted, setPosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prayed, setPrayed] = useState(0);
  const { praying, markPraying, needsAccount, live } = useStore();
  const total = list.reduce((a, p) => a + (p.count || 0), 0);

  const post = async () => {
    const msg = text.trim();
    if (!msg || needsAccount(t("share a prayer request"))) return;
    setBusy(true);
    try {
      await postPrayer(msg, anon);
      if (!live) q.setData([{ id: String(Date.now()), who: anon ? t("Anonymous") : t("You"), text: msg, count: 0, color: C.flame, mine: true }, ...list]);
      else q.reload();
      setText("");
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setPosted(false), 2600);
    } catch (e: any) { Alert.alert(t("Not posted"), e?.message || t("Please try again.")); }
    finally { setBusy(false); }
  };

  // returns true when the prayer was counted
  const pray = (p: Prayer) => {
    if (praying.has(p.id) || p.prayed) return false;
    if (needsAccount(t("pray for requests"))) return false;
    markPraying(p.id);
    q.setData(list.map((x) => (x.id === p.id ? { ...x, count: x.count + 1, prayed: true } : x)));
    prayFor(p.id).catch(() => {});
    setPrayed((n) => n + 1);
    return true;
  };
  const answered = (p: Prayer) => {
    q.setData(list.map((x) => (x.id === p.id ? { ...x, answered: true } : x)));
    markAnswered(p.id, true).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.deepViolet }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={{ position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: C.rose, opacity: 0.22, top: -120, right: -140 }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 320, height: 320, borderRadius: 160, backgroundColor: C.violet, opacity: 0.3, bottom: 40, left: -160 }} />
      <BackHeader title={t("Prayer wall")} dark />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 4, marginBottom: 6 }}>
          <Display size={34} color={C.cream}>{t("You don't have to carry it alone.")}</Display>
        </View>
        <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: R.xl, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <TextInput value={text} onChangeText={setText} multiline maxLength={220} placeholder={t("What can we pray with you about?")} placeholderTextColor="rgba(244,238,228,0.45)" style={{ fontFamily: F.sans, fontSize: 16, color: C.cream, minHeight: 70, textAlignVertical: "top" }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Switch value={anon} onValueChange={setAnon} trackColor={{ true: C.rose, false: "rgba(255,255,255,0.2)" }} />
              <Body size={13.5} color={C.creamMuted}>{t("Anonymous")}</Body>
            </View>
            <Button label={busy ? t("Sharing…") : t("Share")} icon="send" variant="rose" small onPress={post} disabled={busy} />
          </View>
        </View>
        {posted ? (
          <Animated.View entering={ZoomIn.springify()} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.mint, borderRadius: R.pill, paddingHorizontal: 16, height: 48 }}>
            <Icon name="check-circle" size={18} color={C.ink} />
            <Body weight="semi">{t("Posted. The family is praying with you.")}</Body>
          </Animated.View>
        ) : null}
        <Label color={C.creamMuted} style={{ marginTop: 8, marginBottom: 22 }}>{t("Pray through the wall · swipe right to pray")}</Label>
        {list.length ? (
          <SwipeDeck
            items={list}
            height={340}
            keyOf={(p) => p.id}
            onSwipe={(p, dir) => { if (dir === 1 && pray(p)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }}
            render={(p, top, tx) => <DeckNote p={p} i={list.indexOf(p)} top={top} tx={tx} />}
          />
        ) : null}
        {prayed ? <Animated.View entering={ZoomIn.springify()} style={{ alignSelf: "center", marginTop: 14, paddingHorizontal: 16, height: 38, borderRadius: R.pill, backgroundColor: C.rose, flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="hands-pray" size={16} color="#fff" /><Body size={13.5} weight="semi" color="#fff">{prayed === 1 ? t("You've prayed for 1 person today") : t("You've prayed for {n} people today", { n: prayed })}</Body></Animated.View> : null}
        <Label color={C.creamMuted} style={{ marginTop: 26 }}>{t("{n} prayers prayed on this wall", { n: fmt(total || stats.prayers) })}</Label>
        {list.length === 0 && !q.loading ? <Body color={C.creamMuted} center style={{ marginTop: 10 }}>{t("Be the first to share a request.")}</Body> : null}
        {list.map((p, i) => <PrayerCard key={p.id} p={p} i={i} onPray={pray} onAnswered={answered} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
