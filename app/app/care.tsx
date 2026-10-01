import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { C, F, R } from "@/theme";
import { BackHeader, Body, Button, Chip, Display, Icon, Label, Serif } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/lib/content";
import { requestCare } from "@/lib/api";

const KINDS = [["visit", "A visit"], ["counselling", "Someone to talk to"], ["hospital", "Hospital visit"], ["prayer", "Private prayer"], ["other", "Something else"]] as const;

/** Confidential pastoral care: goes only to staff (row-level security), never to the prayer wall. */
export default function Care() {
  const { needsAccount, profile } = useStore();
  const church = useSiteContent().church;
  const [kind, setKind] = useState<string>("visit");
  const [details, setDetails] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!details.trim() || needsAccount("ask the pastors for care")) return;
    setBusy(true);
    try { await requestCare(kind, details.trim(), phone.trim()); setSent(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e: any) { Alert.alert("Not sent", e?.message || "Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.roseSoft }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Pastoral care" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Display size={52} style={{ lineHeight: 50, marginLeft: 4 }}>We're here{"\n"}<Serif size={56} color={C.rose}>for you.</Serif></Display>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 14 }}>
          <Icon name="lock" size={18} color={C.rose} />
          <Body size={14} color={C.muted} style={{ flex: 1 }}>Private. Only the pastoral team can read this. It never appears on the prayer wall.</Body>
        </View>
        {sent ? (
          <Animated.View entering={ZoomIn.springify()} style={{ marginTop: 18, backgroundColor: C.ink, borderRadius: R.xl, padding: 22 }}>
            <Display size={32} color={C.cream}>Thank you. <Serif size={34} color="#FF9EC2">We'll be in touch.</Serif></Display>
            <Body color={C.creamMuted} style={{ marginTop: 8 }}>A pastor will reach out within a day.{church.phone ? ` If it's urgent, call ${church.phone}.` : ""} In an emergency, call 112.</Body>
            <Button label="Done" icon="check" variant="white" small onPress={() => router.back()} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Label style={{ marginTop: 22, marginBottom: 10, marginLeft: 4 }}>How can we help?</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {KINDS.map(([k, l]) => <Chip key={k} label={l} active={kind === k} color={C.rose} onPress={() => setKind(k)} />)}
            </View>
            <View style={{ marginTop: 14, backgroundColor: "#fff", borderRadius: R.lg, padding: 16 }}>
              <TextInput value={details} onChangeText={setDetails} multiline maxLength={2000} placeholder="Tell us a little about what's going on. Share as much or as little as you like." placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, minHeight: 130, textAlignVertical: "top", color: C.ink }} />
            </View>
            <View style={{ marginTop: 10, backgroundColor: "#fff", borderRadius: R.pill, paddingHorizontal: 18, height: 54, justifyContent: "center" }}>
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Best number to reach you (optional)" placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 16, color: C.ink }} />
            </View>
            <Button label={busy ? "Sending…" : "Send to the pastors"} icon="send" variant="rose" block disabled={!details.trim() || busy} onPress={send} style={{ marginTop: 16 }} />
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
