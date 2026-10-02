import React, { useState } from "react";
import { Alert, Linking, ScrollView, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { C, R } from "@/theme";
import { BackHeader, Body, Button, Display, Icon, IconButton, Label, Loading, Press } from "@/components/ui";
import { useQuery } from "@/lib/query";
import { cancelMeeting, getMeeting, joinMeeting, KIND_COLORS, leaveMeeting, when } from "@/lib/life";

export default function MeetingView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery(`meetings:${id}`, () => getMeeting(id!));
  const [guests, setGuests] = useState(0);
  const [busy, setBusy] = useState(false);
  const m = q.data?.m, place = q.data?.place;
  if (!m) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader />{q.loading ? <Loading /> : null}</View>;
  const full = m.capacity != null && m.going >= m.capacity && !m.joined;
  const run = async (f: () => Promise<any>) => { setBusy(true); try { await f(); await q.reload(); } catch (e: any) { Alert.alert("", e.message); } finally { setBusy(false); } };
  const maps = () => place && Linking.openURL(place.lat && place.lng ? `https://maps.google.com/?q=${place.lat},${place.lng}` : `https://maps.google.com/?q=${encodeURIComponent(place.address)}`);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Meeting" right={<IconButton name="share-2" border={C.line} onPress={() => Share.share({ message: `${m.title} · ${when(m.starts_at)} · ${m.area}. Join on the Agape app.` })} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
        <View style={{ backgroundColor: KIND_COLORS[m.kind] || C.rose, borderRadius: R.xl, padding: 20 }}>
          <Label color={C.ink}>{m.kind.toUpperCase()}{m.repeats ? ` · ${m.repeats}` : ""}{m.women_only ? " · women only" : ""}</Label>
          <Display size={28} style={{ marginTop: 6 }}>{m.title}</Display>
          <Body weight="semi" style={{ marginTop: 10 }}>{when(m.starts_at)}</Body>
          <Body>{m.area}{m.host_name ? ` · hosted by ${m.host_name}` : ""}</Body>
        </View>
        {m.about ? <View style={card}><Label>About</Label><Body style={{ marginTop: 6 }}>{m.about}</Body></View> : null}
        <View style={card}>
          <Label>Who's coming</Label>
          <Body weight="bold" size={22} style={{ marginTop: 4 }}>{m.going}{m.capacity ? ` of ${m.capacity}` : ""} going</Body>
        </View>
        {place ? (
          <Press onPress={maps} style={[card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.mintSoft, alignItems: "center", justifyContent: "center" }}><Icon name="map-pin" size={20} /></View>
            <View style={{ flex: 1 }}><Body weight="semi">{place.address}</Body>{place.notes ? <Label>{place.notes}</Label> : null}<Label color={C.flame}>Open in Maps</Label></View>
          </Press>
        ) : <View style={card}><Body color={C.muted}>The address appears here after you RSVP.</Body></View>}
        {m.is_host ? (
          <Button label="Cancel this meeting" variant="white" icon="x" trail={null} block disabled={busy} onPress={() => Alert.alert("Cancel the meeting?", "Everyone who RSVP'd will be told.", [{ text: "Keep it", style: "cancel" }, { text: "Cancel meeting", style: "destructive", onPress: () => run(async () => { await cancelMeeting(m.id); router.back(); }) }])} />
        ) : m.joined ? (
          <Button label="I can't come anymore" variant="white" trail={null} block disabled={busy} onPress={() => run(() => leaveMeeting(m.id))} />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={[card, { flexDirection: "row", alignItems: "center" }]}>
              <Body style={{ flex: 1 }}>Bringing anyone?</Body>
              <IconButton name="minus" size={38} border={C.line} onPress={() => setGuests(Math.max(0, guests - 1))} />
              <Body weight="bold" style={{ width: 36, textAlign: "center" }}>{guests}</Body>
              <IconButton name="plus" size={38} border={C.line} onPress={() => setGuests(Math.min(10, guests + 1))} />
            </View>
            <Button label={full ? "This meeting is full" : "I'm coming"} variant="ink" trail="check" block disabled={busy || full} onPress={() => run(() => joinMeeting(m.id, guests))} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const card = { backgroundColor: "#fff", borderRadius: R.lg, padding: 16, borderWidth: 1.5, borderColor: C.line } as const;
