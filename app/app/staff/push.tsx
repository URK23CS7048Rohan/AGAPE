/** Staff: targeted push campaigns ("your small group starts in 1 hour"). Also available in the web admin. */
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { C, F } from "@/theme";
import { BackHeader, Body, Button, Chip, Label } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useSiteContent } from "@/lib/content";
import { LANGS, t } from "@/lib/i18n";
import { slug } from "@/lib/keys";

const ROUTES = [["/", "Home"], ["/bible", "Bible"], ["/events", "Events"], ["/prayer", "Prayer wall"], ["/testimonies", "Testimonies"], ["/serve", "Serve"], ["/home-prayer", "Home groups"], ["/watch", "Watch"], ["/give", "Give"]];

export default function Push() {
  const groups = useSiteContent().groups;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [route, setRoute] = useState("/");
  const [aud, setAud] = useState("everyone");
  const [when, setWhen] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const audiences: [string, string][] = [
    ["everyone", t("Everyone")], ["volunteers", t("Volunteers")], ["staff", t("Staff")],
    ["ministry:teens", t("Teens")], ["ministry:squad", t("Agape Squad")], ["ministry:kids", t("Kids' parents")],
    ...groups.map((g) => [`group:${slug(g.name)}`, g.name] as [string, string]),
    ...LANGS.filter((l) => l.code !== "en").map((l) => [`language:${l.code}`, `${t("Language")}: ${l.name}`] as [string, string]),
  ];
  const send = async () => {
    if (!title.trim() || !body.trim()) return Alert.alert(t("Add a title and a message"));
    if (!supabase) return Alert.alert(t("Demo mode"), t("Connect the app to Supabase to send real notifications."));
    setBusy(true);
    const send_at = when === 0 ? null : when === 1 ? new Date(Date.now() + 3600e3).toISOString() : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); })();
    const r = await supabase.from("push_campaigns").insert({ title: title.trim(), body: body.trim(), route, audience: aud, send_at }).select("id").single();
    let sent = 0;
    if (!r.error && !send_at) { const c = await supabase.from("push_campaigns").select("sent_count").eq("id", r.data.id).single(); sent = c.data?.sent_count || 0; }
    setBusy(false);
    if (r.error) return Alert.alert(t("Couldn't send"), r.error.message);
    Alert.alert(send_at ? t("Scheduled") : t("Sent"), send_at ? t("It will go out at {time}.", { time: new Date(send_at).toLocaleString() }) : t("Sent to {n} people.", { n: sent }), [{ text: "OK", onPress: () => router.back() }]);
  };
  const input = { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontFamily: F.sans, fontSize: 15.5, color: C.ink } as const;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={t("Send a notification")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <TextInput value={title} onChangeText={setTitle} placeholder={t("Title — e.g. Small group starts in 1 hour")} placeholderTextColor="rgba(15,11,18,0.4)" style={[input, { fontFamily: F.sansSemi }]} />
        <TextInput value={body} onChangeText={setBody} multiline placeholder={t("Message")} placeholderTextColor="rgba(15,11,18,0.4)" style={[input, { minHeight: 100, textAlignVertical: "top" }]} />
        <Label style={{ marginTop: 6 }}>{t("Who gets it")}</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{audiences.map(([k, l]) => <Chip key={k} label={l} active={aud === k} onPress={() => setAud(k)} />)}</View>
        <Label style={{ marginTop: 6 }}>{t("Opens")}</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{ROUTES.map(([k, l]) => <Chip key={k} label={t(l)} active={route === k} onPress={() => setRoute(k)} />)}</View>
        <Label style={{ marginTop: 6 }}>{t("When")}</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label={t("Now")} active={when === 0} onPress={() => setWhen(0)} />
          <Chip label={t("In 1 hour")} active={when === 1} onPress={() => setWhen(1)} />
          <Chip label={t("Tomorrow 8:00")} active={when === 2} onPress={() => setWhen(2)} />
        </View>
        <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4, marginTop: 6 }}>
          <Label>{t("Preview")}</Label>
          <Body weight="semi">{title || t("Title")}</Body>
          <Body size={14} color={C.muted}>{body || t("Message")}</Body>
        </View>
        <Button label={busy ? "…" : when ? t("Schedule") : t("Send now")} icon="send" block disabled={busy} onPress={send} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
