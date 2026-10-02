/**
 * QR check-in. Members show their card (welcome team scans it) or scan the code on the screen at church.
 * Volunteers and staff get a scanner for checking people in at the door.
 */
import React, { useRef, useState } from "react";
import { Alert, Platform, ScrollView, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { BackHeader, Body, Button, Group, Icon, Label, ListRow, Segmented } from "@/components/ui";
import { useCheckins } from "@/lib/more";
import { useStore } from "@/lib/store";
import { dateLabel, t } from "@/lib/i18n";

export default function CheckIn() {
  const insets = useSafeAreaInsets();
  const { profile, name, isVolunteer, isStaff, live } = useStore();
  const ci = useCheckins();
  const team = isVolunteer || isStaff;
  const [tab, setTab] = useState(0);
  const [perm, requestPerm] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const lock = useRef(false);
  const memberNo = profile?.member_no || (live ? "" : "AGP-26-1001");

  const handle = async (data: string) => {
    if (lock.current) return;
    lock.current = true;
    setScanning(false);
    try {
      if (tab === 2) {
        const r = await ci.checkInMember(data);
        setMsg({ ok: true, text: r.already ? t("{name} was already checked in", { name: r.name }) : t("Welcome, {name}!", { name: r.name || r.member_no }) });
      } else {
        const r = await ci.selfCheckIn(data);
        setMsg({ ok: true, text: r.already ? t("You're already checked in to {e}", { e: r.title }) : t("Checked in to {e}. Welcome!", { e: r.title }) });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally { setTimeout(() => (lock.current = false), 1500); }
  };
  const startScan = async () => {
    setMsg(null);
    if (Platform.OS === "web") return Alert.alert(t("Type the code"), t("Scanning needs the phone app. Type the code shown at church instead."));
    if (!perm?.granted) { const r = await requestPerm(); if (!r.granted) return Alert.alert(t("Camera is off"), t("Allow the camera for Agape in your phone settings, or type the code.")); }
    setScanning(true);
  };

  const tabs = team ? [t("My card"), t("Scan at church"), t("Welcome team")] : [t("My card"), t("Scan at church")];
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Check in")} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}><Segmented items={tabs} value={tab} onChange={(i) => { setTab(i); setScanning(false); setMsg(null); }} /></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
        {tab === 0 ? (
          <View style={{ backgroundColor: C.ink, borderRadius: 22, padding: 22, alignItems: "center", gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" }}>
              <Body weight="bold" color={C.cream} style={{ flex: 1 }}>Agape International Ministries</Body>
              <Label color={C.sun}>{t("Member")}</Label>
            </View>
            <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 16 }}>
              {memberNo ? <QRCode value={`AGAPE:MEMBER:${memberNo}`} size={200} logo={IMG.logoMark} logoSize={34} logoBackgroundColor="#fff" /> : <View style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}><Body center color={C.muted}>{t("Sign in to get your member card")}</Body></View>}
            </View>
            <Body style={{ fontFamily: F.displayBold, fontSize: 24, color: C.cream }}>{name || t("Member")}</Body>
            <Body color={C.creamMuted} style={{ fontFamily: F.mono, letterSpacing: 1.5 }}>{memberNo || "—"}</Body>
            <Body size={13} center color={C.creamMuted}>{t("Show this at the welcome desk to check in.")}</Body>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Body color={C.muted}>{tab === 1 ? t("Scan the check-in code on the screen at church, or type it.") : t("Scan a member's card to check them in to today's service.")}</Body>
            {scanning && Platform.OS !== "web" ? (
              <View style={{ height: 320, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => handle(data)} />
                <View pointerEvents="none" style={{ position: "absolute", left: 60, right: 60, top: 60, bottom: 60, borderWidth: 3, borderColor: "rgba(255,255,255,0.85)", borderRadius: 20 }} />
              </View>
            ) : (
              <Button label={t("Open camera")} icon="camera" block onPress={startScan} />
            )}
            {msg ? (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: msg.ok ? "#D5F5E8" : "#FFE0E3", borderRadius: 14, padding: 14 }}>
                <Icon name={msg.ok ? "check-circle" : "alert-circle"} size={20} color={msg.ok ? "#16A37B" : "#E5484D"} />
                <Body weight="semi" style={{ flex: 1 }}>{msg.text}</Body>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder={tab === 1 ? t("Code, e.g. 7F3A9C21") : t("Member no., e.g. AGP-26-1001")} placeholderTextColor="rgba(15,11,18,0.4)"
                style={{ flex: 1, height: 50, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 14, fontFamily: F.mono, fontSize: 16, color: C.ink }} />
              <Button label={t("Go")} onPress={() => { if (code.trim()) { setMsg(null); handle(code.trim()); setCode(""); } }} />
            </View>
          </View>
        )}

        {ci.list.length ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <Label>{t("Your visits")}</Label>
            <Group>
              {ci.list.slice(0, 12).map((c, i, a) => <ListRow key={`${c.event_key}${c.day}`} icon="check" color="#16A37B" title={c.title || c.event_key} sub={dateLabel(new Date(c.day + "T12:00:00"), { weekday: "long", day: "numeric", month: "short" })} last={i === a.length - 1} />)}
            </Group>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
