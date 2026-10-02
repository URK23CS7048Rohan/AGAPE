import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Avatar, BackHeader, Badge, Body, Button, Group, Icon, IconButton, Label, ListRow } from "@/components/ui";
import { LiveMap } from "@/components/map/LiveMap";
import { Place, useHomeMeetings } from "@/lib/more";
import { KIND_COLOR, kindLabel } from "@/lib/labels";
import { directions, directionsTo } from "@/lib/nav";
import { remindAt } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { colorFor } from "@/lib/data";
import { dateLabel, t, timeLabel } from "@/lib/i18n";

export default function Meeting() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const m = useHomeMeetings();
  const { needsAccount } = useStore();
  const meeting = m.list.find((x) => x.id === id);
  const [place, setPlace] = useState<Place | null>(null);
  const [guests, setGuests] = useState(0);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<{ name: string; guests: number }[]>([]);
  const canSee = !!meeting && (meeting.isHost || meeting.joined);
  useEffect(() => { if (canSee) m.place(id).then(setPlace).catch(() => {}); else setPlace(null); }, [canSee, id]);
  useEffect(() => { if (meeting?.isHost) m.guests(id).then(setPeople).catch(() => {}); }, [meeting?.isHost, meeting?.going]);
  if (!meeting) return <View style={{ flex: 1, backgroundColor: C.cream }}><BackHeader /></View>;
  const d = new Date(meeting.starts_at);
  const full = meeting.capacity ? meeting.going + 1 + guests > meeting.capacity : false;

  const join = async () => {
    if (needsAccount(t("join a prayer meeting"))) return;
    setBusy(true);
    try {
      const pl = await m.join(meeting.id, guests);
      setPlace(pl);
      remindAt(`meeting:${meeting.id}`, new Date(d.getTime() - 60 * 60e3), meeting.title, t("Starts in an hour · {area}", { area: meeting.area }), `/home-prayer/${meeting.id}`);
    } catch (e: any) { Alert.alert(t("Couldn't RSVP"), e.message); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={kindLabel(meeting.kind)} right={<IconButton name="share" label={t("Share")} onPress={() => Share.share({ message: `${meeting.title}\n${dateLabel(d, { weekday: "long", day: "numeric", month: "long" })} · ${timeLabel(d)}\n${meeting.area}\n\n${t("RSVP in the Agape app to get the address.")}` }).catch(() => {})} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Badge label={kindLabel(meeting.kind)} color={KIND_COLOR[meeting.kind] || C.flame} />
            {meeting.repeats ? <Badge label={t("Every week")} color={C.ink} /> : null}
            {meeting.language ? <Badge label={meeting.language} color={C.violet} /> : null}
          </View>
          <Body style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 33 }}>{meeting.title}</Body>
        </View>

        <Group>
          <ListRow icon="calendar" color={C.flame} title={dateLabel(d, { weekday: "long", day: "numeric", month: "long" })} sub={timeLabel(d)} />
          <ListRow icon="map-pin" color={C.violet} title={meeting.area} sub={canSee ? place?.address || "…" : t("Exact address after you RSVP")} />
          <ListRow icon="users" color="#16A37B" title={t("{n} going", { n: meeting.going })} sub={meeting.capacity ? t("Room for {n}", { n: meeting.capacity }) : undefined} last />
        </Group>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={meeting.host} color={colorFor(meeting.host)} size={40} />
          <View style={{ flex: 1 }}>
            <Label>{t("Hosted by")}</Label>
            <Body weight="semi">{meeting.isHost ? t("You") : meeting.host}</Body>
          </View>
        </View>
        {meeting.about ? <Body style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 26 }}>{meeting.about}</Body> : null}

        {canSee && place ? (
          <View style={{ gap: 10 }}>
            {place.lat && place.lng ? (
              <View style={{ height: 200, borderRadius: 16, overflow: "hidden" }}>
                <LiveMap style={{ flex: 1 }} initial={{ lat: place.lat, lng: place.lng, zoom: 15.5 }} markers={[{ id: "home", kind: "pickup", lat: place.lat, lng: place.lng, label: meeting.area }]} />
              </View>
            ) : null}
            {place.notes ? (
              <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#fff", padding: 12, borderRadius: 12 }}>
                <Icon name="info" size={16} color={C.muted} /><Body size={14} style={{ flex: 1 }}>{place.notes}</Body>
              </View>
            ) : null}
            <Button label={t("Directions")} icon="navigation" variant="ink" block onPress={() => (place.lat && place.lng ? directions(place.lat, place.lng) : directionsTo(place.address))} />
          </View>
        ) : null}

        {meeting.isHost ? (
          <View style={{ gap: 10 }}>
            <Label>{t("Who's coming")}</Label>
            <Group>
              {people.length ? people.map((p, i) => <ListRow key={i} title={p.name} sub={p.guests ? t("+{n} guests", { n: p.guests }) : undefined} last={i === people.length - 1} />) : <ListRow title={t("No RSVPs yet")} sub={t("Share the meeting with friends from church.")} last />}
            </Group>
            <Button label={t("Cancel this meeting")} variant="outline" block onPress={() => Alert.alert(t("Cancel this meeting?"), t("Everyone who RSVP'd will be told."), [{ text: t("Keep it"), style: "cancel" }, { text: t("Cancel meeting"), style: "destructive", onPress: async () => { await m.cancel(meeting.id).catch((e) => Alert.alert(e.message)); router.back(); } }])} />
          </View>
        ) : meeting.joined ? (
          <Button label={t("Can't make it")} variant="tonal" block onPress={() => m.leave(meeting.id)} />
        ) : (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Body style={{ flex: 1 }}>{t("Bringing anyone?")}</Body>
              <IconButton name="minus" size={34} label={t("Fewer guests")} onPress={() => setGuests(Math.max(0, guests - 1))} />
              <Body weight="bold" style={{ width: 34, textAlign: "center" }}>{guests}</Body>
              <IconButton name="plus" size={34} label={t("More guests")} onPress={() => setGuests(Math.min(6, guests + 1))} />
            </View>
            <Button label={full ? t("This meeting is full") : busy ? "…" : t("RSVP — I'm coming")} block disabled={full || busy} onPress={join} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
