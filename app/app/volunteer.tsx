import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Chip, Display, Label, LargeTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { applyToVolunteer } from "@/lib/api";
import { t } from "@/lib/i18n";

const TEAMS = [["driving", "Ride ministry driver"], ["welcome", "Welcome team"], ["kids", "Kids church"], ["worship", "Worship & music"], ["tech", "Tech & media"], ["prayer", "Prayer team"]] as const;

/** Apply to serve. Staff approve it in /admin; drivers then see ride requests in the app. */
export default function Volunteer() {
  const { needsAccount, session, isVolunteer, profile } = useStore();
  const [teams, setTeams] = useState<string[]>(["driving"]);
  const [vehicle, setVehicle] = useState(profile?.vehicle || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !session) return;
    supabase.from("volunteer_applications").select("status").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setStatus(data?.[0]?.status ?? null));
  }, [session?.user.id]);

  const toggle = (k: string) => setTeams((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const send = async () => {
    if (!teams.length || needsAccount(t("volunteer"))) return;
    setBusy(true);
    try { await applyToVolunteer(teams, vehicle.trim(), note.trim()); setStatus("pending"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e: any) { Alert.alert(t("Not sent"), e?.message || t("Please try again.")); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.mintSoft }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={t("Volunteer")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <LargeTitle label={t("Join a team")} title={t("Serve someone.")} style={{ paddingHorizontal: 4 }} />
        <Body color={C.muted} style={{ marginTop: 8, marginLeft: 4 }}>{t("Drive a family to church, welcome visitors, lead kids or run the sound. Pick where you'd love to help.")}</Body>
        {isVolunteer ? (
          <Animated.View entering={ZoomIn} style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.xl, padding: 22 }}>
            <Display size={28} color={C.cream}>{t("You're on the team.")}</Display>
            <Body color={C.creamMuted} style={{ marginTop: 6 }}>{t("Ride requests show up under Rides → I'm driving.")}</Body>
            <Button label={t("Open rides")} icon="arrow-right" variant="mint" small onPress={() => router.replace("/rides")} style={{ marginTop: 14 }} />
          </Animated.View>
        ) : status === "pending" ? (
          <Animated.View entering={ZoomIn} style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.xl, padding: 22 }}>
            <Display size={28} color={C.cream}>{t("Thanks! We'll call you.")}</Display>
            <Body color={C.creamMuted} style={{ marginTop: 6 }}>{t("The volunteer team reviews applications every week. You'll get a notification when you're approved.")}</Body>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Label style={{ marginTop: 22, marginBottom: 10, marginLeft: 4 }}>{t("Teams")}</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TEAMS.map(([k, l]) => <Chip key={k} label={t(l)} active={teams.includes(k)} color="#0E9F74" onPress={() => toggle(k)} />)}
            </View>
            {teams.includes("driving") ? (
              <View style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: R.pill, paddingHorizontal: 18, height: 54, justifyContent: "center" }}>
                <TextInput value={vehicle} onChangeText={setVehicle} placeholder={t("Your car · colour · plate")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
              </View>
            ) : null}
            <View style={{ marginTop: 10, backgroundColor: "#fff", borderRadius: R.lg, padding: 16 }}>
              <TextInput value={note} onChangeText={setNote} multiline maxLength={1000} placeholder={t("When are you free? Anything we should know?")} placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, minHeight: 90, textAlignVertical: "top", color: C.ink }} />
            </View>
            <Button label={busy ? t("Sending…") : t("Apply to serve")} icon="send" variant="ink" block disabled={!teams.length || busy} onPress={send} style={{ marginTop: 16 }} />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
