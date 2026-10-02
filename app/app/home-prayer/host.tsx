import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { C, F } from "@/theme";
import { BackHeader, Body, Button, Chip, DayPill, Label } from "@/components/ui";
import { hostMeeting } from "@/lib/life";
import { t as tr } from "@/lib/i18n";
import { dateLabel } from "@/lib/i18n";

const KINDS = ["prayer", "bible study", "worship", "fellowship"];
const TIMES = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "16:00", "17:00", "18:00", "19:00", "19:30", "20:00", "20:30", "21:00"];

export default function Host() {
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const [f, setF] = useState({ title: "", kind: "prayer", day: 0, time: "19:30", area: "", address: "", notes: "", about: "", capacity: "", weekly: false });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    if (f.title.trim().length < 3 || !f.area.trim() || !f.address.trim()) { Alert.alert(tr("A few details are missing"), tr("Add a title, the area and the full address.")); return; }
    const d = new Date(days[f.day]); const [h, m] = f.time.split(":").map(Number); d.setHours(h, m, 0, 0);
    setBusy(true);
    try {
      const id = await hostMeeting({ title: f.title.trim(), kind: f.kind, starts_at: d.toISOString(), area: f.area.trim(), address: f.address.trim(), notes: f.notes.trim() || undefined, about: f.about.trim() || undefined, capacity: Number(f.capacity) || null, repeats: f.weekly ? "weekly" : null });
      router.replace(`/home-prayer/${id}`);
    } catch (e: any) { Alert.alert(tr("Couldn't create it"), e.message); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={tr("Host a meeting")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }} keyboardShouldPersistTaps="handled">
        <TextInput value={f.title} onChangeText={(v) => set("title", v)} placeholder={tr("Title, e.g. “Friday night prayer”")} placeholderTextColor={C.muted} maxLength={100} style={inp} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{KINDS.map((k) => <Chip key={k} label={tr(k[0].toUpperCase() + k.slice(1))} active={f.kind === k} onPress={() => set("kind", k)} />)}</View>
        <Label style={{ marginTop: 6 }}>{tr("Day")}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => <DayPill key={i} top={dateLabel(d, { weekday: "short" })} bottom={String(d.getDate())} active={f.day === i} onPress={() => set("day", i)} />)}
        </ScrollView>
        <Label style={{ marginTop: 6 }}>{tr("Time")}</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{TIMES.map((t) => <Chip key={t} label={new Date(`2000-01-01T${t}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} active={f.time === t} onPress={() => set("time", t)} />)}</View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.line }}>
          <Body style={{ flex: 1 }}>{tr("Every week")}</Body><Switch value={f.weekly} onValueChange={(v) => set("weekly", v)} />
        </View>
        <Label style={{ marginTop: 6 }}>{tr("Where")}</Label>
        <TextInput value={f.area} onChangeText={(v) => set("area", v)} placeholder={tr("Area everyone sees, e.g. “Salmiya, Block 10”")} placeholderTextColor={C.muted} style={inp} />
        <TextInput value={f.address} onChangeText={(v) => set("address", v)} placeholder={tr("Full address (only for people who RSVP)")} placeholderTextColor={C.muted} style={inp} />
        <TextInput value={f.notes} onChangeText={(v) => set("notes", v)} placeholder={tr("Directions or parking (optional)")} placeholderTextColor={C.muted} style={inp} />
        <TextInput value={f.about} onChangeText={(v) => set("about", v)} placeholder={tr("What will you do? (optional)")} placeholderTextColor={C.muted} multiline style={[inp, { height: 100, paddingTop: 12, textAlignVertical: "top" }]} />
        <TextInput value={f.capacity} onChangeText={(v) => set("capacity", v.replace(/\D/g, ""))} placeholder={tr("Max people (optional)")} placeholderTextColor={C.muted} keyboardType="number-pad" style={inp} />
        <Button label={tr("Create meeting")} variant="ink" trail="check" block onPress={submit} disabled={busy} style={{ marginTop: 6 }} />
      </ScrollView>
    </View>
  );
}
const inp = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, height: 52, fontFamily: F.sans, fontSize: 15.5, color: C.ink } as const;
