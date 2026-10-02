import React, { useState } from "react";
import { Alert, Modal, ScrollView, Switch, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { C, F, IMG } from "@/theme";
import { Avatar, Body, Button, Group, Icon, Label, ListRow, Press } from "@/components/ui";
import { useStore, streakOf } from "@/lib/store";
import { isLive } from "@/lib/supabase";
import { TRANSLATIONS, translation } from "@/lib/bible";
import { LANGS, langInfo, normalizeLang, t } from "@/lib/i18n";
import { fmt } from "@/lib/time";
import { colorFor } from "@/lib/data";

/** Membership card — tilts as you drag it (wallet-pass style). Tap for the QR check-in card. */
function MemberCard({ name, no, since, role }: { name: string; no: string; since: string; role: string }) {
  const rx = useSharedValue(0), ry = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => { ry.value = Math.max(-14, Math.min(14, e.translationX / 9)); rx.value = Math.max(-10, Math.min(10, -e.translationY / 9)); })
    .onEnd(() => { rx.value = withSpring(0); ry.value = withSpring(0); });
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ marginHorizontal: 16, marginTop: 18, borderRadius: 18, overflow: "hidden" }, st]}>
        <Press onPress={() => router.push("/checkin" as any)} scaleTo={0.99}>
          <LinearGradient colors={["#1B1424", "#2C1F3F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, height: 180, justifyContent: "space-between" }}>
            <View style={{ position: "absolute", right: -60, top: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,90,31,0.18)" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Image source={IMG.logoMarkLight} style={{ width: 22, height: 28 }} contentFit="contain" />
                <Body weight="semi" size={14} color="#fff">Agape International</Body>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="maximize" size={14} color={C.sun} />
                <Label color={C.sun} size={10}>{t("Tap for QR")}</Label>
              </View>
            </View>
            <View>
              <Label color="rgba(255,255,255,0.6)">{since}</Label>
              <Body style={{ fontFamily: F.displayBold, fontSize: 26, lineHeight: 32, color: "#fff", marginTop: 2 }} numberOfLines={1}>{name}</Body>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Body size={13} color="rgba(255,255,255,0.8)" style={{ fontFamily: F.mono, letterSpacing: 1 }}>{no}</Body>
                <Body size={13} weight="semi" color="rgba(255,255,255,0.8)">{role}</Body>
              </View>
            </View>
          </LinearGradient>
        </Press>
      </Animated.View>
    </GestureDetector>
  );
}

export default function Me() {
  const insets = useSafeAreaInsets();
  const { settings, setSetting, signOut, deleteAccount, score, guest, live, member, profile, name, saved, activeDays, isVolunteer, isStaff } = useStore();
  const [sheet, setSheet] = useState<null | "lang" | "bible">(null);
  const ROLE: Record<string, string> = { member: t("Member"), volunteer: t("Volunteer"), staff: t("Staff"), admin: t("Admin") };
  const since = profile?.created_at ? t("Member since {y}", { y: new Date(profile.created_at).getFullYear() }) : live ? t("Guest") : t("Member since {y}", { y: 2024 });
  const role = profile ? ROLE[profile.role] : live ? t("Guest") : t("Member");
  const lang = langInfo(normalizeLang(settings.language));
  const go = (r: string) => router.push(r as any);

  const toggleFaceId = async (v: boolean) => {
    if (v) {
      const ok = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = ok && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      if (!enrolled) { Alert.alert(t("Not available"), t("Set up Face ID, Touch ID or a fingerprint on this phone first.")); return; }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: t("Lock Agape with Face ID") }).catch(() => ({ success: false }));
      if (!r.success) return;
    }
    setSetting("faceId", v);
  };
  const confirmDelete = () => Alert.alert(t("Delete your account?"), t("This permanently removes your profile, notes, progress, prayer requests and messages. Gifts stay on record for the church's accounts."), [
    { text: t("Cancel"), style: "cancel" },
    { text: t("Delete"), style: "destructive", onPress: async () => { try { await deleteAccount(); router.replace("/welcome"); } catch (e: any) { Alert.alert(t("Couldn't delete"), e?.message || t("Please try again.")); } } },
  ]);
  const sw = (v: boolean, on: (v: boolean) => void) => <Switch value={v} onValueChange={on} trackColor={{ true: C.flame, false: "#ddd" }} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20 }}>
          <Avatar name={guest ? "Guest" : name || "A"} color={colorFor(name || "a")} size={56} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontFamily: F.displayBold, fontSize: 24, lineHeight: 29 }} numberOfLines={1}>{guest ? t("Guest") : name}</Body>
            <Body size={13.5} color={C.muted} numberOfLines={1}>{role}{profile?.email ? ` · ${profile.email}` : ""}</Body>
          </View>
          {member || !live ? <Button small variant="tonal" label={t("Edit")} onPress={() => go("/onboarding?edit=1")} /> : <Button small label={t("Sign in")} onPress={() => go("/welcome")} />}
        </View>

        <MemberCard name={guest ? t("Guest") : name} no={profile?.member_no || (live ? t("Sign in for your card") : "AGP-24-0187")} since={since} role={role} />

        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14 }}>
          {[[String(streakOf(activeDays)), t("day streak")], [String(saved.size), t("saved sermons")], [fmt(score), t("game points")]].map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: "center", borderLeftWidth: i ? 1 : 0, borderLeftColor: "rgba(15,11,18,0.08)" }}>
              <Body style={{ fontFamily: F.displayBold, fontSize: 22 }}>{v}</Body>
              <Body size={12} color={C.muted}>{l}</Body>
            </View>
          ))}
        </View>

        <Label style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{t("My faith")}</Label>
        <Group style={{ marginHorizontal: 16 }}>
          <ListRow icon="calendar" color={C.flame} title={t("Reading plans")} onPress={() => go("/plans")} />
          <ListRow icon="edit-3" color="#16A37B" title={t("Journal")} sub={t("Private")} onPress={() => go("/journal")} />
          <ListRow icon="bookmark" color={C.rose} title={t("Highlights & notes")} onPress={() => go("/bible/marks")} />
          <ListRow icon="flag" color={C.violet} title={t("Getting started")} onPress={() => go("/getting-started")} last />
        </Group>

        <Label style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{t("Church life")}</Label>
        <Group style={{ marginHorizontal: 16 }}>
          <ListRow icon="check-square" color="#16A37B" title={t("Check in")} sub={t("Member card & QR")} onPress={() => go("/checkin")} />
          <ListRow icon="users" color={C.flame} title={t("Serve")} sub={t("Volunteer shifts")} onPress={() => go("/serve")} />
          {!isVolunteer ? <ListRow icon="steering" color="#2F7DE1" title={t("Become a driver")} onPress={() => go("/volunteer")} /> : null}
          <ListRow icon="calendar" color={C.violet} title={t("My events")} onPress={() => go("/events")} />
          <ListRow icon="heart" color={C.ink} title={t("Giving")} onPress={() => go("/give")} />
          <ListRow icon="bell" color="#E08A00" title={t("Notifications")} onPress={() => go("/notifications")} />
          <ListRow icon="shield" color="#8B5CF6" title={t("Confidential pastoral care")} onPress={() => go("/care")} last />
        </Group>

        <Label style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{t("Family")}</Label>
        <Group style={{ marginHorizontal: 16 }}>
          <ListRow icon="smile" color="#B7791F" title={t("Agape Kids")} sub={t("Kid-safe stories, videos and games")} onPress={() => go("/kids")} />
          <ListRow icon="shield" color="#B7791F" title={t("Kids mode")} sub={t("Locks the phone to Agape Kids with a parent PIN")} right={sw(settings.kidsMode, (v) => (v ? go("/kids") : setSetting("kidsMode", false)))} />
          <ListRow icon="zap" color="#2F7DE1" title={t("Agape Teens")} onPress={() => go("/ministry/teens")} />
          <ListRow icon="music" color={C.rose} title={t("Agape Squad")} onPress={() => go("/ministry/squad")} last />
        </Group>

        <Label style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{t("Settings")}</Label>
        <Group style={{ marginHorizontal: 16 }}>
          <ListRow icon="globe" color={C.violet} title={t("Language")} right={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Body color={C.muted}>{lang.name}</Body><Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" /></View>} onPress={() => setSheet("lang")} />
          <ListRow icon="book-open" color={C.flame} title={t("Bible translation")} right={<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Body color={C.muted}>{translation(settings.bible || lang.bible).short}</Body><Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" /></View>} onPress={() => setSheet("bible")} />
          <ListRow icon="type" color={C.ink} title={t("Larger text")} right={sw(settings.largeText, (v) => setSetting("largeText", v))} />
          <ListRow icon="bell" color="#E08A00" title={t("Push notifications")} right={sw(settings.notifications, (v) => setSetting("notifications", v))} />
          <ListRow icon="lock" color="#16A37B" title={t("Lock with Face ID")} right={sw(settings.faceId, toggleFaceId)} last={!member} />
          {member ? <ListRow icon="trash-2" color="#9A93A6" title={t("Delete my account")} onPress={confirmDelete} last /> : null}
        </Group>

        {isStaff ? (
          <>
            <Label style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{t("Staff")}</Label>
            <Group style={{ marginHorizontal: 16 }}>
              <ListRow icon="send" color={C.flame} title={t("Send a notification")} sub={t("To everyone, a group, a language…")} onPress={() => go("/staff/push")} />
              <ListRow icon="maximize" color="#16A37B" title={t("Check people in")} onPress={() => go("/checkin")} last />
            </Group>
          </>
        ) : null}

        <Button label={guest ? t("Leave guest mode") : t("Sign out")} variant="outline" block onPress={async () => { await signOut(); router.replace("/welcome"); }} style={{ marginHorizontal: 16, marginTop: 24, alignSelf: "auto" }} />
        <Body size={12} color={C.muted} center style={{ marginTop: 14 }}>Agape International Ministries · v2.0 · {isLive ? t("Connected") : t("Demo data")}</Body>
      </ScrollView>

      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Press onPress={() => setSheet(null)} scaleTo={1} haptic={false} style={{ flex: 1, backgroundColor: "rgba(15,11,18,0.4)" }} />
        <View style={{ backgroundColor: C.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: insets.bottom + 16 }}>
          <Body weight="semi" size={17} style={{ marginBottom: 10 }}>{sheet === "lang" ? t("Language") : t("Bible translation")}</Body>
          <Group>
            {sheet === "lang"
              ? LANGS.map((l, i) => (
                  <ListRow key={l.code} title={l.name} sub={l.english} last={i === LANGS.length - 1}
                    right={lang.code === l.code ? <Icon name="check" size={18} color={C.flame} /> : null}
                    onPress={() => { setSheet(null); setSetting("language", l.code); if (!settings.bible) setSetting("bible", l.bible); else if (translation(settings.bible).lang !== l.code && l.code !== "en") setSetting("bible", l.bible); setTimeout(() => router.navigate("/me" as any), 120); }} />
                ))
              : TRANSLATIONS.map((x, i) => (
                  <ListRow key={x.code} title={x.short} sub={x.name} last={i === TRANSLATIONS.length - 1}
                    right={(settings.bible || lang.bible) === x.code ? <Icon name="check" size={18} color={C.flame} /> : null}
                    onPress={() => { setSetting("bible", x.code); setSheet(null); }} />
                ))}
          </Group>
        </View>
      </Modal>
    </View>
  );
}
