import React from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { C, IMG, R, shadow } from "@/theme";
import { Body, Display, Icon, Label, Press, Serif } from "@/components/ui";
import { useStore, streakOf } from "@/lib/store";
import { isLive } from "@/lib/supabase";
import { fmt } from "@/lib/time";

const TOOLS = [
  { icon: "car-side", label: "Ride ministry", sub: "Request or give a ride", color: C.mint, route: "/rides" },
  { icon: "heart", label: "Give", sub: "Tithes, offerings & campaigns", color: C.flame, route: "/give" },
  { icon: "calendar", label: "Events", sub: "RSVP & check in", color: C.violet, route: "/events" },
  { icon: "gamepad-variant", label: "Bible games", sub: "Verse Match & trivia", color: C.sun, route: "/games" },
  { icon: "creation", label: "Ask Agape", sub: "AI Bible assistant", color: C.sky, route: "/assistant" },
  { icon: "hands-pray", label: "Prayer wall", sub: "Pray with the family", color: C.rose, route: "/prayer" },
  { icon: "bell", label: "Notifications", sub: "Rides, chats & news", color: C.ink, route: "/notifications" },
  { icon: "shield", label: "Pastoral care", sub: "Private, to the pastors", color: "#B98AFF", route: "/care" },
];
const ROLE: Record<string, string> = { member: "Member", volunteer: "Volunteer", staff: "Staff", admin: "Admin" };

/** Membership card — tilts as you drag it (wallet-pass style). */
function MemberCard({ name, no, since, role }: { name: string; no: string; since: string; role: string }) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => { ry.value = Math.max(-18, Math.min(18, e.translationX / 8)); rx.value = Math.max(-14, Math.min(14, -e.translationY / 8)); })
    .onEnd(() => { rx.value = withSpring(0); ry.value = withSpring(0); });
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ marginHorizontal: 16, marginTop: 20, borderRadius: R.xl, overflow: "hidden" }, shadow(24, 30, 0.35, C.violet), st]}>
        <LinearGradient colors={[C.flame, C.rose, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 22, height: 210, justifyContent: "space-between" }}>
          <View style={{ position: "absolute", right: -50, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.14)" }} />
          <View style={{ position: "absolute", left: -40, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(0,0,0,0.12)" }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image source={IMG.logoMarkLight} style={{ width: 30, height: 38 }} contentFit="contain" />
              <View>
                <Display size={22} color="#fff">Agape</Display>
                <Label color={C.sun} size={8.5}>International Ministries</Label>
              </View>
            </View>
            <Icon name="cross" size={26} color="#fff" />
          </View>
          <View>
            <Label color="rgba(255,255,255,0.8)">{since}</Label>
            <Display size={34} color="#fff" style={{ marginTop: 4 }} numberOfLines={1}>{name}</Display>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Label color="#fff">{no}</Label>
              <Label color="#fff">{role}</Label>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
}

function Row({ icon, label, children, color = C.ink }: { icon: string; label: string; children?: React.ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color="#fff" />
      </View>
      <Body weight="medium" style={{ flex: 1 }}>{label}</Body>
      {children}
    </View>
  );
}

export default function Me() {
  const insets = useSafeAreaInsets();
  const { settings, setSetting, signOut, deleteAccount, score, guest, live, member, profile, name, firstName, saved, activeDays, isVolunteer } = useStore();
  const since = profile?.created_at ? `Member since ${new Date(profile.created_at).getFullYear()}` : live ? "Guest" : "Member since 2024";
  const role = profile ? ROLE[profile.role] : live ? "Guest" : "Member";
  const tools = isVolunteer ? TOOLS : [...TOOLS.slice(0, 1), { icon: "steering", label: "Volunteer", sub: "Drive, serve, welcome", color: C.mint, route: "/volunteer" }, ...TOOLS.slice(1)];

  const toggleFaceId = async (v: boolean) => {
    if (v) {
      const ok = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = ok && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
      if (!enrolled) { Alert.alert("Not available", "Set up Face ID, Touch ID or a fingerprint on this phone first."); return; }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Lock Agape with Face ID" }).catch(() => ({ success: false }));
      if (!r.success) return;
    }
    setSetting("faceId", v);
  };
  const confirmDelete = () => Alert.alert("Delete your account?", "This permanently removes your profile, notes, progress, prayer requests and messages. Gifts stay on record for the church's accounts.", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => { try { await deleteAccount(); router.replace("/welcome"); } catch (e: any) { Alert.alert("Couldn't delete", e?.message || "Please try again."); } } },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 150 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 20 }}>
          <Label>{guest ? "Guest" : `${role}${profile?.email ? ` · ${profile.email}` : ""}`}</Label>
          <Display size={52} style={{ marginTop: 8, lineHeight: 50 }}>Hi, {guest ? "friend" : firstName}{"\n"}<Serif size={56} color={C.flame}>welcome home.</Serif></Display>
        </Animated.View>

        <MemberCard name={guest ? "Guest" : name} no={profile?.member_no || (live ? "Sign in for your card" : "AGP-24-0187")} since={since} role={role} />
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 10 }}>
          {member || !live ? (
            <Press onPress={() => router.push("/onboarding?edit=1")} style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon name="edit-3" size={17} color="#fff" />
              <Body weight="semi" color="#fff" size={14}>Edit profile</Body>
            </Press>
          ) : (
            <Press onPress={() => router.push("/welcome")} style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: C.flame, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon name="log-in" size={17} color="#fff" />
              <Body weight="semi" color="#fff" size={14}>Sign in</Body>
            </Press>
          )}
          <Press onPress={() => router.push("/events")} style={{ flex: 1, height: 48, borderRadius: R.pill, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="calendar" size={17} color={C.ink} />
            <Body weight="semi" size={14}>My events</Body>
          </Press>
        </View>

        {/* stats */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 10 }}>
          {[[String(saved.size), "sermons saved", C.peach], [String(streakOf(activeDays)), "day streak", C.sunSoft], [fmt(score), "points this week", C.lilac]].map(([v, l, bg]) => (
            <View key={l} style={{ flex: 1, backgroundColor: bg, borderRadius: R.lg, padding: 14 }}>
              <Display size={30}>{v}</Display>
              <Body size={12} color={C.muted}>{l}</Body>
            </View>
          ))}
        </View>

        {/* tools */}
        <Label style={{ marginHorizontal: 20, marginTop: 26, marginBottom: 10 }}>Everything else</Label>
        <View style={{ marginHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {tools.map((t, i) => (
            <Animated.View key={t.label} entering={FadeInDown.delay(i * 60)} style={{ width: "48.4%" }}>
              <Press onPress={() => router.push(t.route as any)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, height: 138, justifyContent: "space-between" }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.color, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={t.icon} size={22} color={t.color === C.sun ? C.ink : "#fff"} />
                </View>
                <View>
                  <Body weight="semi" size={15.5}>{t.label}</Body>
                  <Body size={12.5} color={C.muted} numberOfLines={1}>{t.sub}</Body>
                </View>
              </Press>
            </Animated.View>
          ))}
        </View>

        {/* settings */}
        <Label style={{ marginHorizontal: 20, marginTop: 26, marginBottom: 10 }}>Settings</Label>
        <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: R.xl, paddingVertical: 6 }}>
          <Row icon="face-recognition" label="Lock with Face ID" color={C.ink}><Switch value={settings.faceId} onValueChange={toggleFaceId} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Row icon="bell" label="Push notifications" color={C.flame}><Switch value={settings.notifications} onValueChange={(v) => setSetting("notifications", v)} trackColor={{ true: C.flame, false: "#ddd" }} /></Row>
          <Press onPress={() => router.push("/care")}>
            <Row icon="shield" label="Confidential pastoral care" color={C.rose}><Icon name="chevron-right" size={18} color={C.muted} /></Row>
          </Press>
          {member ? (
            <Press onPress={confirmDelete}>
              <Row icon="trash-2" label="Delete my account" color="#9A93A6"><Icon name="chevron-right" size={18} color={C.muted} /></Row>
            </Press>
          ) : null}
        </View>

        <Press onPress={async () => { await signOut(); router.replace("/welcome"); }} style={{ marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: R.pill, borderWidth: 1.5, borderColor: "rgba(15,11,18,0.15)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Icon name="log-out" size={17} color={C.ink} />
          <Body weight="semi">{guest ? "Leave guest mode" : "Sign out"}</Body>
        </Press>
        <Body size={12} color={C.muted} center style={{ marginTop: 14 }}>Agape International Ministries · v1.0 · {isLive ? "Connected" : "Demo data"}</Body>
      </ScrollView>
    </View>
  );
}
