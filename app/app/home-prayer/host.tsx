import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { BackHeader, Body, Button, Chip, IconButton, Label } from "@/components/ui";
import { LiveMap } from "@/components/map/LiveMap";
import { useHomeMeetings } from "@/lib/more";
import { KIND_COLOR, kindLabel } from "@/lib/labels";
import { dateLabel, t } from "@/lib/i18n";

const TIMES = ["07:00", "09:00", "10:30", "16:00", "18:00", "19:00", "19:30", "20:00", "20:30"];
const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; });

export default function Host() {
  const insets = useSafeAreaInsets();
  const { host } = useHomeMeetings();
  const [f, setF] = useState({ title: "", kind: "prayer", about: "", area: "", address: "", notes: "", language: "", weekly: true, capacity: 12 });
  const [day, setDay] = useState(1);
  const [time, setTime] = useState("19:30");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return Alert.alert(t("Location is off"), t("You can still type the address."));
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (!p) return;
    setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
    if (!f.area) {
      const g = await Location.reverseGeocodeAsync({ latitude: p.coords.latitude, longitude: p.coords.longitude }).catch(() => []);
      const a = g[0];
      if (a) set("area", [a.district || a.subregion, a.city].filter(Boolean).join(", "));
    }
  };

  const submit = async () => {
    if (f.title.trim().length < 3 || !f.area.trim() || !f.address.trim()) return Alert.alert(t("A few details are missing"), t("Add a title, the area and the full address."));
    const [h, mi] = time.split(":").map(Number);
    const when = new Date(days[day]); when.setHours(h, mi, 0, 0);
    if (when.getTime() < Date.now()) return Alert.alert(t("Pick a time in the future"));
    setBusy(true);
    try {
      const id = await host({ title: f.title.trim(), kind: f.kind, starts_at: when.toISOString(), area: f.area.trim(), address: f.address.trim(), lat: pin?.lat, lng: pin?.lng, about: f.about.trim() || undefined, repeats: f.weekly ? "weekly" : null, capacity: f.capacity, notes: f.notes.trim() || undefined, language: f.language.trim() || undefined });
      router.replace(`/home-prayer/${id}` as any);
    } catch (e: any) { Alert.alert(t("Couldn't create the meeting"), e.message); }
    finally { setBusy(false); }
  };

  const input = { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: F.sans, fontSize: 15.5, color: C.ink } as const;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title={t("Host a meeting")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <TextInput value={f.title} onChangeText={(v) => set("title", v)} placeholder={t("Title — e.g. Thursday prayer & worship")} placeholderTextColor="rgba(15,11,18,0.4)" style={input} />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {Object.keys(KIND_COLOR).map((k) => <Chip key={k} label={kindLabel(k)} active={f.kind === k} color={KIND_COLOR[k]} onPress={() => set("kind", k)} />)}
        </View>
        <TextInput value={f.about} onChangeText={(v) => set("about", v)} multiline placeholder={t("What will you do? Who is it for?")} placeholderTextColor="rgba(15,11,18,0.4)" style={[input, { minHeight: 80, textAlignVertical: "top" }]} />

        <Label style={{ marginTop: 8 }}>{t("When")}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => <Chip key={i} label={i === 0 ? t("Today") : i === 1 ? t("Tomorrow") : dateLabel(d)} active={day === i} onPress={() => setDay(i)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TIMES.map((x) => <Chip key={x} label={x} active={time === x} onPress={() => setTime(x)} />)}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12 }}>
          <Body style={{ flex: 1 }}>{t("Repeat every week")}</Body>
          <Switch value={f.weekly} onValueChange={(v: boolean) => set("weekly", v)} trackColor={{ true: C.flame }} />
        </View>

        <Label style={{ marginTop: 8 }}>{t("Where")}</Label>
        <TextInput value={f.area} onChangeText={(v) => set("area", v)} placeholder={t("Area everyone sees — e.g. Salmiya, Block 10")} placeholderTextColor="rgba(15,11,18,0.4)" style={input} />
        <TextInput value={f.address} onChangeText={(v) => set("address", v)} multiline placeholder={t("Full address — only shared with people who RSVP")} placeholderTextColor="rgba(15,11,18,0.4)" style={[input, { minHeight: 64, textAlignVertical: "top" }]} />
        <TextInput value={f.notes} onChangeText={(v) => set("notes", v)} placeholder={t("Directions for guests — parking, which bell…")} placeholderTextColor="rgba(15,11,18,0.4)" style={input} />
        {pin ? (
          <View style={{ height: 170, borderRadius: 14, overflow: "hidden" }}>
            <LiveMap style={{ flex: 1 }} initial={{ ...pin, zoom: 16 }} markers={[]} pick onCenter={(p) => setPin(p)} />
          </View>
        ) : null}
        <Button label={pin ? t("Drag the map to move the pin") : t("Add a map pin (my location)")} icon="map-pin" variant="tonal" block onPress={locate} disabled={!!pin} />

        <Label style={{ marginTop: 8 }}>{t("Details")}</Label>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 10, paddingLeft: 14 }}>
          <Body style={{ flex: 1 }}>{t("Room for")}</Body>
          <IconButton name="minus" size={32} label="−" onPress={() => set("capacity", Math.max(2, f.capacity - 1))} />
          <Body weight="bold" style={{ width: 40, textAlign: "center" }}>{f.capacity}</Body>
          <IconButton name="plus" size={32} label="+" onPress={() => set("capacity", Math.min(100, f.capacity + 1))} />
        </View>
        <TextInput value={f.language} onChangeText={(v) => set("language", v)} placeholder={t("Language — e.g. Malayalam / English")} placeholderTextColor="rgba(15,11,18,0.4)" style={input} />

        <Button label={busy ? "…" : t("Create meeting")} block onPress={submit} disabled={busy} style={{ marginTop: 10 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
