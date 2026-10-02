import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch, TextInput, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import QRCode from "react-native-qrcode-svg";
import { C, F, IMG, R, onColor } from "@/theme";
import { Body, Button, Dashes, Display, Empty, Icon, Label, Press, ScreenTitle, Segmented, Sticker, Ticket } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { deleteAccount, myContact, myStats, requestCare, updateProfile } from "@/lib/api";
import { fmt } from "@/lib/time";
import { t as tr, langInfo, normalizeLang } from "@/lib/i18n";
import { LanguageSheet } from "@/components/LanguagePicker";

const TOOLS = [
  { icon: "edit-3", label: "Journal", sub: "Private notes with God", color: C.sun, route: "/journal" },
  { icon: "hands-pray", label: "Prayer list", sub: "Pray & mark answered", color: C.rose, route: "/prayer-list" },
  { icon: "check-circle", label: "Check in", sub: "At church today", color: C.sky, route: "/checkin" },
  { icon: "arrow-up-right", label: "Next steps", sub: "Baptism, membership & more", color: C.lilac, route: "/next-steps" },
  { icon: "heart", label: "Serve", sub: "Join a team", color: C.orange, route: "/serve" },
  { icon: "grid", label: "Everything", sub: "All of church life", color: C.peach, route: "/church" },
  { icon: "car-side", label: "Ride ministry", sub: "Request or give a ride", color: C.mint, route: "/rides" },
  { icon: "gift", label: "Give", sub: "Tithes, offerings & campaigns", color: C.orange, route: "/give" },
  { icon: "calendar", label: "Events", sub: "RSVP & tickets", color: C.violet, route: "/events" },
  { icon: "gamepad-variant", label: "Bible games", sub: "Verse Match & trivia", color: C.sun, route: "/games" },
  { icon: "creation", label: "Ask Agape", sub: "AI Bible assistant", color: C.sky, route: "/assistant" },
  { icon: "hands-pray", label: "Prayer wall", sub: "Pray with the family", color: C.rose, route: "/prayer" },
];
const memberNo = (id: string) => `AGP-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const roleName = { member: "Member", volunteer: "Volunteer", staff: "Church staff", admin: "Admin" } as const;

/** Membership card — tilts as you drag it (wallet-pass style). The QR identifies the member at check-in. */
function MemberCard({ onQr }: { onQr: () => void }) {
  const { profile, session } = useAuth();
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const pan = Gesture.Pan()
    .onUpdate((e) => { ry.value = Math.max(-18, Math.min(18, e.translationX / 8)); rx.value = Math.max(-14, Math.min(14, -e.translationY / 8)); })
    .onEnd(() => { rx.value = withSpring(0); ry.value = withSpring(0); });
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }] } as any));
  const id = session!.user.id;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ marginHorizontal: 16, marginTop: 22 }, st]}>
        <Ticket color={C.violet} at={0.58} notch={13}>
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Image source={IMG.logoMark} style={{ width: 24, height: 30 }} contentFit="contain" />
                </View>
                <View>
                  <Body size={16} weight="bold">{tr("Agape")}</Body>
                  <Label color={C.ink} size={11.5}>{tr("International Ministries")}</Label>
                </View>
              </View>
              <Press onPress={onQr} style={{ padding: 6, borderRadius: 12, backgroundColor: "#fff" }}>
                <QRCode value={`agape:member:${id}`} size={46} />
              </Press>
            </View>
            <Dashes color="rgba(20,20,20,0.25)" style={{ marginVertical: 18 }} />
            <Label color={C.ink}>{tr("Member since")} {new Date(profile?.created_at || Date.now()).getFullYear()}</Label>
            <Display size={30} style={{ marginTop: 2 }} numberOfLines={1}>{profile?.full_name || session?.user.email}</Display>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: C.ink, borderRadius: 8, paddingHorizontal: 9, height: 26, justifyContent: "center" }}><Body size={12} weight="semi" color="#fff">{memberNo(id)}</Body></View>
              <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 9, height: 26, justifyContent: "center" }}><Body size={12} weight="semi">{roleName[profile?.role ?? "member"]}</Body></View>
            </View>
          </View>
        </Ticket>
        <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -18 }}>
          <Sticker top="Member" bottom="card" bg={C.sun} size={74} rotate={-14} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Row({ icon, label, children, color = C.ink, last }: { icon: string; label: string; children?: React.ReactNode; color?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={onColor(color)} />
      </View>
      <Body weight="medium" style={{ flex: 1 }}>{label}</Body>
      {children}
    </View>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,20,20,0.45)" }}>
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Display size={22} style={{ flex: 1 }}>{title}</Display>
            <Press onPress={onClose} hitSlop={10}><Icon name="x" size={22} /></Press>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const input = { height: 52, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, fontFamily: F.sans, fontSize: 16, color: C.ink } as const;

export default function Me() {
  const insets = useSafeAreaInsets();
  const { signedIn, profile, session, isStaff, isVolunteer, settings, setSetting, signOut, refreshProfile, firstName } = useAuth();
  const stats = useQuery(signedIn ? "points:stats" : null, myStats);
  const [qr, setQr] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [care, setCare] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", car: "" });
  const [careKind, setCareKind] = useState(0);
  const [careText, setCareText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!edit) return;
    setForm({ name: profile?.full_name || "", phone: "", car: profile?.car || "" });
    myContact().then((c) => setForm((f) => ({ ...f, phone: c.phone || "" }))).catch(() => {});
  }, [edit]);

  const toggleFaceId = async (v: boolean) => {
    if (v) {
      const has = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (!has || !enrolled) return Alert.alert(tr("Not available"), tr("Set up Face ID, Touch ID or a fingerprint on this phone first."));
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Turn on app lock" }).catch(() => ({ success: false }));
      if (!r.success) return;
    }
    setSetting("faceId", v);
  };
  const saveProfile = async () => {
    if (form.name.trim().length < 2) return Alert.alert(tr("Add your name"));
    setBusy(true);
    try { await updateProfile({ full_name: form.name.trim(), phone: form.phone.trim() || null, ...(isVolunteer ? { car: form.car.trim() || null } : {}) }); await refreshProfile(); setEdit(false); }
    catch (e: any) { Alert.alert(tr("Couldn't save"), e.message); }
    finally { setBusy(false); }
  };
  const sendCare = async () => {
    setBusy(true);
    try { await requestCare(["visit", "counselling", "other"][careKind], careText.trim()); setCare(false); setCareText(""); Alert.alert(tr("Request sent"), tr("Your request is private and goes only to the pastoral team. Someone will reach out soon.")); }
    catch (e: any) { Alert.alert(tr("Couldn't send"), e.message); }
    finally { setBusy(false); }
  };
  const confirmDelete = () => Alert.alert(tr("Delete your account?"), tr("This permanently deletes your account, notes, prayer requests, messages and progress. It can't be undone."), [
    { text: tr("Cancel"), style: "cancel" },
    { text: tr("Delete account"), style: "destructive", onPress: async () => {
      try { await deleteAccount(); await signOut(); router.replace("/welcome"); }
      catch (e: any) { Alert.alert(tr("Couldn't delete the account"), e.message); }
    } },
  ]);
  const track = { true: C.mint, false: "#DCD8D0" };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScreenTitle title={signedIn ? `Hi, ${firstName}` : tr("Hi there")} sub={signedIn ? tr("Welcome home") : tr("You're exploring as a guest")} />
        </Animated.View>

        {signedIn ? (
          <>
            <MemberCard onQr={() => setQr(true)} />
            <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 26, gap: 10 }}>
              <Press onPress={() => setQr(true)} style={{ flex: 1, height: 50, borderRadius: 16, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="qrcode" size={18} color="#fff" />
                <Body weight="semi" color="#fff" size={14}>{tr("Check-in code")}</Body>
              </Press>
              <Press onPress={() => setEdit(true)} style={{ flex: 1, height: 50, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="edit-3" size={18} />
                <Body weight="semi" size={14}>{tr("Edit profile")}</Body>
              </Press>
            </View>
            <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 10 }}>
              {[[stats.data?.saved, "sermons saved", C.peach], [stats.data?.lessons, "lessons done", C.sunSoft], [stats.data?.points, "game points", C.lilac]].map(([v, l, bg]) => (
                <View key={l as string} style={{ flex: 1, backgroundColor: bg as string, borderRadius: R.md, padding: 14 }}>
                  <Display size={26}>{v === undefined ? "–" : fmt(v as number)}</Display>
                  <Label>{l as string}</Label>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 20, backgroundColor: C.violet, borderRadius: R.xl, padding: 20, gap: 12 }}>
            <Display size={26}>{tr("Join the Agape family")}</Display>
            <Body>{tr("Create a free account to save sermons, take courses, post prayers, chat with your groups and book rides.")}</Body>
            <Button label={tr("Create account")} icon="user-plus" variant="ink" block onPress={() => router.push("/auth?mode=signup")} />
            <Button label={tr("Sign in")} icon="log-in" variant="light" block onPress={() => router.push("/auth")} />
          </View>
        )}

        {isStaff ? (
          <Press onPress={() => router.push("/staff")} style={{ marginHorizontal: 16, marginTop: 16, borderRadius: R.lg, backgroundColor: C.ink, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.sun, alignItems: "center", justifyContent: "center" }}><Icon name="shield" size={20} /></View>
            <View style={{ flex: 1 }}>
              <Body weight="semi" color="#fff">{tr("Staff tools")}</Body>
              <Label color="rgba(255,255,255,0.7)">{tr("Prayer moderation, rides, care requests, news")}</Label>
            </View>
            <Icon name="arrow-up-right" size={20} color="#fff" />
          </Press>
        ) : null}

        {/* tools */}
        <Display size={22} style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>{tr("Everything else")}</Display>
        <View style={{ marginHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {TOOLS.map((t, i) => {
            const fg = onColor(t.color);
            return (
              <Animated.View key={t.label} entering={FadeInDown.delay(i * 50)} style={{ width: "48.4%" }}>
                <Press onPress={() => router.push(t.route as any)} style={{ backgroundColor: t.color, borderRadius: R.lg, padding: 14, height: 132, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={t.icon} size={20} />
                    </View>
                    <Icon name="arrow-up-right" size={18} color={fg} />
                  </View>
                  <View>
                    <Body weight="semi" size={15.5} color={fg}>{tr(t.label)}</Body>
                    <Label numberOfLines={1} color={fg} style={{ opacity: 0.8 }}>{tr(t.sub)}</Label>
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>

        {/* settings */}
        <Display size={22} style={{ marginHorizontal: 20, marginTop: 28, marginBottom: 12 }}>{tr("Settings")}</Display>
        <View style={{ marginHorizontal: 16, backgroundColor: "#fff", borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line }}>
          <Press onPress={() => setLangOpen(true)}>
            <Row icon="globe" label={tr("Language")} color={C.sky}><Body size={14} color={C.muted}>{langInfo(normalizeLang(settings.language)).name}</Body><Icon name="chevron-right" size={18} color={C.muted} /></Row>
          </Press>
          {signedIn ? <Row icon="face-recognition" label={tr("Lock app with Face ID")} color={C.ink}><Switch value={settings.faceId} onValueChange={toggleFaceId} trackColor={track} thumbColor="#fff" /></Row> : null}
          <Press onPress={() => (signedIn ? setCare(true) : router.push("/auth"))}>
            <Row icon="shield" label={tr("Confidential pastoral care")} color={C.rose}><Icon name="chevron-right" size={18} color={C.muted} /></Row>
          </Press>
          {signedIn ? (
            <Press onPress={confirmDelete}>
              <Row icon="trash-2" label={tr("Delete my account")} color={C.red} last><Icon name="chevron-right" size={18} color={C.muted} /></Row>
            </Press>
          ) : null}
        </View>

        <Press onPress={async () => { await signOut(); router.replace("/welcome"); }} style={{ marginHorizontal: 16, marginTop: 16, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: C.ink, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Icon name="log-out" size={17} />
          <Body weight="semi">{signedIn ? tr("Sign out") : tr("Leave guest mode")}</Body>
        </Press>
        <Label style={{ marginTop: 14, textAlign: "center" }}>{tr("Agape International Ministries · v1.0")}{session?.user.email ? ` · ${session.user.email}` : ""}</Label>
      </ScrollView>

      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />

      {/* check-in code */}
      <Sheet visible={qr} onClose={() => setQr(false)} title={tr("Check-in code")}>
        <Body color={C.muted}>{tr("Show this at the welcome desk or an event.")}</Body>
        {session ? (
          <View style={{ alignSelf: "center", padding: 16, backgroundColor: "#fff", borderRadius: 24, borderWidth: 1.5, borderColor: C.line, marginVertical: 8 }}>
            <QRCode value={`agape:member:${session.user.id}`} size={220} />
          </View>
        ) : null}
        <Body weight="semi" center>{profile?.full_name} · {session ? memberNo(session.user.id) : ""}</Body>
      </Sheet>

      {/* edit profile */}
      <Sheet visible={edit} onClose={() => setEdit(false)} title={tr("Edit profile")}>
        <TextInput value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder={tr("Full name")} placeholderTextColor="rgba(20,20,20,0.4)" style={input} />
        <TextInput value={form.phone} onChangeText={(phone) => setForm((f) => ({ ...f, phone }))} placeholder={tr("Phone (shared only with your ride driver)")} keyboardType="phone-pad" placeholderTextColor="rgba(20,20,20,0.4)" style={input} />
        {isVolunteer ? <TextInput value={form.car} onChangeText={(car) => setForm((f) => ({ ...f, car }))} placeholder={tr("Your car, e.g. White Toyota · KW 12 3456")} placeholderTextColor="rgba(20,20,20,0.4)" style={input} /> : null}
        <Label>{tr("Your phone number is private: only the volunteer driving you (or the member you're driving) can see it, during the ride.")}</Label>
        <Button label={busy ? tr("Saving…") : tr("Save")} icon="check" trail={null} variant="ink" block onPress={saveProfile} disabled={busy} />
      </Sheet>

      {/* pastoral care */}
      <Sheet visible={care} onClose={() => setCare(false)} title={tr("Pastoral care")}>
        <Body color={C.muted}>{tr("Private. Only the pastoral team sees this request.")}</Body>
        <Segmented items={[tr("A visit"), tr("Counselling"), tr("Other")]} value={careKind} onChange={setCareKind} />
        <TextInput value={careText} onChangeText={setCareText} multiline maxLength={2000} placeholder={tr("Tell us a little about how we can help (optional)")} placeholderTextColor="rgba(20,20,20,0.4)" style={[input, { height: 120, paddingTop: 12, textAlignVertical: "top" }]} />
        <Button label={busy ? tr("Sending…") : tr("Send request")} icon="send" trail={null} variant="ink" block onPress={sendCare} disabled={busy} />
      </Sheet>
    </View>
  );
}
