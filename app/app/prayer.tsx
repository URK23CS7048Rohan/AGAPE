import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { Async, Avatar, BackHeader, Body, Button, Display, Empty, Icon, Label, Press, Starburst } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { useSiteContent } from "@/lib/content";
import { deletePrayer, fetchPrayers, markAnswered, postPrayer, Prayer, setPraying } from "@/lib/api";
import { ago, fmt } from "@/lib/time";
import { t as tr } from "@/lib/i18n";

const COLORS = [C.rose, C.violet, C.mint, C.sky, C.orange, C.flame];

function Heart({ a }: { a: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withTiming(1, { duration: 700 }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateX: Math.cos(a) * 30 * t.value }, { translateY: Math.sin(a) * 24 * t.value - 10 * t.value }, { scale: 1 - t.value * 0.6 }] } as any));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 16, top: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: C.flame }, st]} />;
}

function PrayerCard({ p, i }: { p: Prayer; i: number }) {
  const [on, setOn] = useState(p.praying);
  const [count, setCount] = useState(p.count);
  const [burst, setBurst] = useState(0);
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  useEffect(() => { setOn(p.praying); setCount(p.count); }, [p.praying, p.count]);
  const tap = async () => {
    const now = !on;
    setOn(now); setCount((c) => c + (now ? 1 : -1));
    if (now) { setBurst((b) => b + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }
    s.value = withSequence(withSpring(0.88, { damping: 10, stiffness: 400 }), withSpring(1, { damping: 8 }));
    try { await setPraying(p.id, now); } catch { setOn(!now); setCount((c) => c + (now ? -1 : 1)); }
  };
  const manage = () => Alert.alert(tr("Your prayer request"), undefined, [
    { text: p.answered ? "Mark as still praying" : "Mark as answered 🙏", onPress: () => markAnswered(p.id, !p.answered).catch((e) => Alert.alert(tr("Couldn't update"), e.message)) },
    { text: tr("Delete"), style: "destructive", onPress: () => deletePrayer(p.id).catch((e) => Alert.alert(tr("Couldn't delete"), e.message)) },
    { text: tr("Cancel"), style: "cancel" },
  ]);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 6) * 60).springify().damping(16)} layout={LinearTransition.springify()} style={{ backgroundColor: p.answered ? C.sunSoft : "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: p.answered ? C.sun : C.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.who} color={COLORS[i % COLORS.length]} size={32} />
        <View style={{ flex: 1 }}>
          <Body size={14} weight="semi">{p.mine ? `You${p.anonymous ? " (anonymous)" : ""}` : p.who}</Body>
          <Label size={11.5}>{ago(p.created_at)}</Label>
        </View>
        {p.answered ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.ink, paddingHorizontal: 10, height: 26, borderRadius: 9 }}>
            <Icon name="star" size={12} color={C.sun} />
            <Body size={11.5} weight="bold" color="#fff">{tr("Answered")}</Body>
          </View>
        ) : null}
        {p.mine ? <Press onPress={manage} hitSlop={8}><Icon name="more-horizontal" size={20} color={C.muted} /></Press> : null}
      </View>
      <Body size={16} style={{ marginTop: 10, lineHeight: 23 }}>{p.text}</Body>
      <Animated.View style={[{ alignSelf: "flex-start", marginTop: 14 }, st]}>
        <Press onPress={tap} haptic={false} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 40, borderRadius: 13, backgroundColor: on ? C.ink : p.answered ? C.sun : C.roseSoft }}>
          <Icon name="hands-pray" size={17} color={on ? "#fff" : C.ink} />
          <Body size={13.5} weight="semi" color={on ? "#fff" : C.ink}>{on ? `You're praying · ${count}` : `Pray · ${count}`}</Body>
        </Press>
        {Array.from({ length: burst ? 10 : 0 }).map((_, k) => <Heart key={`${burst}-${k}`} a={(k / 10) * Math.PI * 2} />)}
      </Animated.View>
    </Animated.View>
  );
}

export default function PrayerWall() {
  const { signedIn } = useAuth();
  const { stats } = useSiteContent();
  const list = useQuery(signedIn ? "prayers" : null, fetchPrayers);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const post = async () => {
    const t = text.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      await postPrayer(t, anon);
      setText("");
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setPosted(false), 2600);
    } catch (e: any) {
      Alert.alert(tr("Couldn't post"), e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={tr("Prayer wall")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={false} onRefresh={() => list.reload()} />}>
        <View style={{ backgroundColor: C.rose, borderRadius: R.xl, padding: 18, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -14, top: -14 }}>
            <Starburst size={110} color={C.ink} spikes={10} depth={0.7} spin><Icon name="hands-pray" size={34} color={C.rose} /></Starburst>
          </View>
          <Display size={30} style={{ maxWidth: "72%" }}>{tr("You don't have to carry it alone.")}</Display>
          {stats.prayers ? <Label color={C.ink} style={{ marginTop: 6 }}>{fmt(stats.prayers)} {tr("prayers prayed this year")}</Label> : null}
          {signedIn ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, marginTop: 16 }}>
              <TextInput value={text} onChangeText={setText} multiline maxLength={500} placeholder={tr("What can we pray with you about?")} placeholderTextColor="rgba(20,20,20,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink, minHeight: 70, textAlignVertical: "top" }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Switch value={anon} onValueChange={setAnon} trackColor={{ true: C.mint, false: "#DCD8D0" }} thumbColor="#fff" />
                  <Body size={13.5} color={C.muted}>{tr("Post anonymously")}</Body>
                </View>
                <Button label={posting ? tr("Posting…") : tr("Share")} icon="send" trail={null} variant="ink" small onPress={post} disabled={!text.trim() || posting} />
              </View>
            </View>
          ) : (
            <Button label={tr("Sign in to share and pray")} icon="log-in" variant="ink" small onPress={() => router.push("/auth")} style={{ marginTop: 16 }} />
          )}
        </View>
        {posted ? (
          <Animated.View entering={ZoomIn.springify()} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.mint, borderRadius: 16, paddingHorizontal: 16, height: 50 }}>
            <Icon name="check-circle" size={18} color="#fff" />
            <Body weight="semi" color="#fff">{tr("Posted. The family is praying with you.")}</Body>
          </Animated.View>
        ) : null}
        {signedIn ? (
          <>
            <Display size={22} style={{ marginTop: 10, marginBottom: 2, marginLeft: 4 }}>{tr("Pray with others")}</Display>
            <Async q={list} empty={(d) => (d.length ? null : <Empty icon="heart" color={C.rose} title={tr("No requests yet")} body={tr("Be the first to share one.")} />)}>
              {(d) => d.map((p, i) => <PrayerCard key={p.id} p={p} i={i} />)}
            </Async>
          </>
        ) : (
          <Empty icon="lock" color={C.rose} title={tr("The wall is for members")} body={tr("Prayer requests are only visible to signed-in members of the church family.")} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
