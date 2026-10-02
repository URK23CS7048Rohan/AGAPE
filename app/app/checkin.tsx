import React, { useState } from "react";
import { Alert, ScrollView, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Display, Empty, Icon, IconButton, Label, Starburst } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { checkIn, makeCode, myCheckins, todaysCode } from "@/lib/life";
import { t as tr } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

export default function CheckIn() {
  const { signedIn, profile } = useAuth();
  const staff = profile?.role === "staff" || profile?.role === "admin";
  const [perm, ask] = useCameraPermissions();
  const [scan, setScan] = useState(false);
  const [code, setCode] = useState("");
  const [done, setDone] = useState<{ title: string; already: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const history = useQuery(signedIn ? "checkins" : null, myCheckins);
  const today = useQuery(staff ? "checkins:code" : null, todaysCode);

  const submit = async (c: string) => {
    if (busy || !c.trim()) return;
    setBusy(true); setScan(false);
    try { setDone(await checkIn(c)); setCode(""); history.reload(); } catch (e: any) { Alert.alert(tr("Couldn't check in"), e.message); } finally { setBusy(false); }
  };
  const openCamera = async () => { const p = perm?.granted ? perm : await ask(); if (p.granted) setScan(true); else Alert.alert(tr("Camera is off"), tr("Allow the camera in your phone's settings, or type the code instead.")); };

  if (!signedIn) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title={tr("Check in")} /><Empty icon="check-circle" title={tr("Check in at church")} body={tr("Sign in, then scan the code on the screen at church.")} action={tr("Sign in")} onAction={() => router.push("/auth")} /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Check in")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={{ backgroundColor: C.mint, borderRadius: R.xl, padding: 22, alignItems: "center", gap: 10 }}>
            <Starburst size={96} color={C.sun} spikes={12} depth={0.7} spin><Icon name="check" size={34} /></Starburst>
            <Display size={28} color="#fff" center>{done.already ? tr("Already checked in") : tr("You're checked in!")}</Display>
            <Body color="#fff" center>{done.title} {tr("· welcome home.")}</Body>
          </View>
        ) : scan ? (
          <View style={{ height: 360, borderRadius: R.xl, overflow: "hidden", backgroundColor: "#000" }}>
            <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={busy ? undefined : (r) => submit(r.data)} />
            <View pointerEvents="none" style={{ position: "absolute", left: "18%", right: "18%", top: "18%", bottom: "18%", borderWidth: 3, borderColor: "#fff", borderRadius: 24 }} />
          </View>
        ) : (
          <View style={{ backgroundColor: C.sky, borderRadius: R.xl, padding: 20 }}>
            <Display size={28}>{tr("Welcome to church")}</Display>
            <Body size={14} style={{ marginTop: 4 }}>{tr("Scan the code on the screen or at the welcome desk, or type it in.")}</Body>
            <Button label={tr("Scan the code")} variant="ink" icon="camera" block onPress={openCamera} style={{ marginTop: 14 }} />
          </View>
        )}
        {scan ? <Button label={tr("Type the code instead")} variant="white" trail={null} block onPress={() => setScan(false)} /> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder={tr("CODE")} placeholderTextColor={C.muted} autoCapitalize="characters" maxLength={12}
            style={{ flex: 1, minWidth: 0, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 16, height: 56, fontFamily: F.mono, fontSize: 20, letterSpacing: 4, color: C.ink }} />
          <IconButton name="check" size={56} bg={C.ink} color="#fff" onPress={() => code.trim().length >= 4 && submit(code)} />
        </View>

        {staff ? (
          <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line, alignItems: "center", gap: 10 }}>
            <Label>{tr("Staff · today's code")}</Label>
            {today.data ? (
              <>
                <QRCode value={`agape://checkin/${today.data.code}`} size={180} />
                <Body weight="bold" size={26} style={{ letterSpacing: 6, fontFamily: F.mono }}>{today.data.code}</Body>
                <Label>{today.data.title} {tr("· show this on the screen")}</Label>
              </>
            ) : <Button label={tr("Make today's code")} variant="ink" icon="plus" trail={null} onPress={async () => { try { await makeCode("Sunday Celebration"); today.reload(); } catch (e: any) { Alert.alert("", e.message); } }} />}
          </View>
        ) : null}

        {history.data?.length ? (
          <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line }}>
            <Label>{history.data.length === 1 ? tr("You've been to church once with the app") : tr("You've been to church {n} times with the app", { n: history.data.length })}</Label>
            {history.data.slice(0, 6).map((h, i) => <Body key={i} size={14} style={{ marginTop: 8 }}>{dateLabel(new Date(h.day), { weekday: "short", day: "numeric", month: "short" })} · {h.title}</Body>)}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
