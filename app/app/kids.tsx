/**
 * Agape Kids — a kid-safe corner of the app: memory verse, stories (read aloud), videos, kids' games and
 * reading plans. No chat, no prayer wall, no rides. With Kids mode on, the phone stays here until a grown-up
 * enters the parent PIN.
 */
import React, { useState } from "react";
import { Alert, Modal, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Body, Button, Icon, IconButton, Label, Press } from "@/components/ui";
import { PostCard, VideoModal } from "@/components/PostCard";
import { useMinistry, usePlans } from "@/lib/more";
import { GAMES } from "@/lib/gamelist";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function Kids() {
  const insets = useSafeAreaInsets();
  const { settings, setSetting } = useStore();
  const locked = settings.kidsMode;
  const posts = useMinistry("kids").data;
  const plans = usePlans().data.filter((p) => p.audience === "kids");
  const [video, setVideo] = useState<string | null>(null);
  const [pin, setPin] = useState<null | "unlock" | "set">(null);
  const [code, setCode] = useState("");
  const verse = posts.find((p) => p.kind === "verse");
  const videos = posts.filter((p) => p.kind === "video" && p.youtubeId);
  const rest = posts.filter((p) => p !== verse && !videos.includes(p));
  const games = GAMES.filter((g) => g.kids);

  const leave = () => {
    if (!locked) return router.canGoBack() ? router.back() : router.replace("/");
    if (!settings.kidsPin) { setSetting("kidsMode", false); router.replace("/"); return; }
    setCode(""); setPin("unlock");
  };
  const submit = () => {
    if (pin === "set") {
      if (!/^\d{4}$/.test(code)) return Alert.alert(t("Use 4 numbers"));
      setSetting("kidsPin", code); setSetting("kidsMode", true); setPin(null);
      return;
    }
    if (code === settings.kidsPin) { setPin(null); setSetting("kidsMode", false); router.replace("/"); }
    else { setCode(""); Alert.alert(t("That's not the PIN")); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF7E8" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 250 + insets.top }}>
          <Image source={IMG.kidsHearts} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" />
          <LinearGradient colors={["rgba(255,247,232,0)", "rgba(255,247,232,0.2)", "#FFF7E8"]} locations={[0, 0.55, 1]} style={{ position: "absolute", width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: insets.top + 8, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" }}>
            <IconButton name={locked ? "lock" : "chevron-left"} bg="rgba(255,255,255,0.92)" label={locked ? t("Grown-ups") : t("Back")} onPress={leave} />
            {!locked ? <Button small variant="white" icon="shield" label={t("Turn on Kids mode")} onPress={() => { setCode(""); setPin("set"); }} /> : null}
          </View>
          <View style={{ position: "absolute", left: 20, bottom: 6 }}>
            <Label color={C.flame}>{t("Agape Kids")}</Label>
            <Body style={{ fontFamily: F.displayBold, fontSize: 34, lineHeight: 40, color: C.ink }}>{t("Hello, friend!")}</Body>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 10 }}>
          {verse ? <PostCard p={verse} big onVideo={setVideo} /> : null}

          <Body weight="semi" size={19} style={{ marginTop: 8 }}>{t("Play")}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {games.map((g) => (
              <Press key={g.id} onPress={() => router.push(`/games/${g.id}?kids=1` as any)} scaleTo={0.95} style={{ width: "48.3%", height: 100, borderRadius: 20, backgroundColor: g.color, padding: 14, justifyContent: "space-between" }}>
                <Icon name={g.icon} size={26} color="#fff" />
                <Body weight="bold" size={16} color="#fff">{g.title()}</Body>
              </Press>
            ))}
          </View>

          {videos.length ? <Body weight="semi" size={19} style={{ marginTop: 8 }}>{t("Watch")}</Body> : null}
          {videos.map((p) => <PostCard key={p.id} p={p} big onVideo={setVideo} />)}

          {plans.length ? <Body weight="semi" size={19} style={{ marginTop: 8 }}>{t("Read with me")}</Body> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {plans.map((p) => (
              <Press key={p.id} onPress={() => router.push(`/plans/${p.slug}` as any)} scaleTo={0.96} style={{ width: 200, backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" }}>
                <Image source={p.image} style={{ width: "100%", height: 110 }} contentFit="cover" />
                <View style={{ padding: 12 }}>
                  <Body weight="bold" size={15.5} numberOfLines={1}>{p.title}</Body>
                  <Body size={13} color={C.muted}>{t("{n} days", { n: p.days.length })}</Body>
                </View>
              </Press>
            ))}
          </ScrollView>

          {rest.length ? <Body weight="semi" size={19} style={{ marginTop: 8 }}>{t("Stories & things to do")}</Body> : null}
          {rest.map((p) => <PostCard key={p.id} p={p} big onVideo={setVideo} />)}
        </View>
      </ScrollView>

      <VideoModal id={video} onClose={() => setVideo(null)} />
      <Modal visible={!!pin} transparent animationType="fade" onRequestClose={() => setPin(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,11,18,0.5)", justifyContent: "center", padding: 28 }}>
          <View style={{ backgroundColor: C.paper, borderRadius: 20, padding: 20, gap: 12 }}>
            <Body weight="semi" size={18}>{pin === "set" ? t("Set a parent PIN") : t("Grown-ups only")}</Body>
            <Body size={14} color={C.muted}>{pin === "set" ? t("Kids mode keeps the phone in Agape Kids. You'll need this 4-number PIN to leave.") : t("Enter the parent PIN to leave Kids mode.")}</Body>
            <TextInput value={code} onChangeText={(x) => setCode(x.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry autoFocus maxLength={4} onSubmitEditing={submit}
              style={{ height: 54, borderRadius: 12, backgroundColor: "rgba(15,11,18,0.06)", textAlign: "center", fontFamily: F.sansBold, fontSize: 26, letterSpacing: 14, color: C.ink }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label={t("Cancel")} variant="tonal" onPress={() => setPin(null)} style={{ flex: 1 }} />
              <Button label={pin === "set" ? t("Turn on") : t("Unlock")} onPress={submit} style={{ flex: 1 }} disabled={code.length !== 4} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
