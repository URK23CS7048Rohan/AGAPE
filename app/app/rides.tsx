import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, Body, Button, Chip, Confetti, ConfettiHandle, Display, Empty, Icon, IconButton, Label, LiveDot, Loading, Press, Segmented } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useSiteContent } from "@/lib/content";
import { DARK_MAP_STYLE } from "@/lib/mapStyle";
import { acceptRide, lastRideLocation, myActiveRide, myDrives, openRides, pushRideLocation, requestRide, Ride, ridePhone, setRideStatus, startDirect, subscribeRideLocation, subscribeRides } from "@/lib/api";

type Pt = { latitude: number; longitude: number };

function km(a: Pt, b: Pt) {
  const R0 = 6371, toR = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toR, dLng = (b.longitude - a.longitude) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * toR) * Math.cos(b.latitude * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R0 * Math.asin(Math.sqrt(h));
}
const etaMin = (a: Pt, b: Pt) => Math.max(1, Math.round((km(a, b) * 1.3) / 30 * 60)); // ~30 km/h city driving, road factor 1.3

function Radar() {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1); }, []);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.4 + t.value * 1.6 }] }));
  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(60,141,94,0.3)" }, ring]} />
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
        <Icon name="car-side" size={26} color="#fff" />
      </View>
    </View>
  );
}

function openNavigation(lat: number, lng: number) {
  const google = Platform.select({ ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, default: `google.navigation:q=${lat},${lng}` });
  const fallback = Platform.select({ ios: `http://maps.apple.com/?daddr=${lat},${lng}`, default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` });
  Linking.openURL(google!).catch(() => Linking.openURL(fallback!));
}
async function call(rideId: string) {
  const phone = await ridePhone(rideId).catch(() => null);
  if (phone) Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
  else Alert.alert("No phone number", "They haven't added a phone number. Send a message instead.");
}
async function message(otherId: string | null) {
  if (!otherId) return;
  try { const conv = await startDirect(otherId); router.push(`/chat/${conv}`); }
  catch (e: any) { Alert.alert("Couldn't open chat", e.message); }
}

/* ------------------------------------------------------------------ rider */
function RiderSheet({ ride, here, reload, onArrive }: { ride: Ride | null | undefined; here: (Pt & { label: string }) | null; reload: () => void; onArrive: () => void }) {
  const { services, church } = useSiteContent();
  const times = services.length ? services.map((s) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.day]} ${s.time}`) : ["Next service"];
  const [time, setTime] = useState(times[0]);
  const [seats, setSeats] = useState(1);
  const [pickup, setPickup] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (here && !pickup) setPickup(here.label); }, [here]);
  const prev = useRef(ride?.status);
  useEffect(() => { if (prev.current !== "arrived" && ride?.status === "arrived") onArrive(); prev.current = ride?.status; }, [ride?.status]);

  if (ride === undefined) return <View style={sheet}><Loading /></View>;

  if (!ride) {
    const request = async () => {
      if (!here) return Alert.alert("Location needed", "Allow location access so your driver knows where to pick you up.");
      setBusy(true);
      try { await requestRide({ pickup: pickup.trim() || here.label, lat: here.latitude, lng: here.longitude, time, seats, notes }); reload(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
      catch (e: any) { Alert.alert("Couldn't request a ride", e.message); }
      finally { setBusy(false); }
    };
    return (
      <Animated.View key="req" entering={FadeInUp.springify().damping(18)} style={sheet}>
        <Display size={28}>Need a ride?</Display>
        <Body size={14} color={C.muted} style={{ marginTop: 4 }}>A volunteer from the church family will pick you up, for free.</Body>
        <View style={{ marginTop: 14, padding: 12, borderRadius: R.md, backgroundColor: C.bg, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: C.mint }} />
            <View style={{ flex: 1 }}>
              <Label size={11}>Pickup</Label>
              <TextInput value={pickup} onChangeText={setPickup} placeholder={here ? "Add a landmark or building" : "Finding your location…"} placeholderTextColor="rgba(20,20,20,0.4)" style={{ fontFamily: F.sansSemi, fontSize: 15, color: C.ink, paddingVertical: 2 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.flame }} />
            <View style={{ flex: 1 }}><Label size={11}>Destination</Label><Body weight="semi" numberOfLines={1}>{church.address || church.name}</Body></View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
          {times.map((x) => <Chip key={x} label={x} active={time === x} onPress={() => setTime(x)} />)}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <Body weight="semi">Passengers</Body>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <IconButton name="minus" size={38} bg={C.bg} onPress={() => setSeats((s) => Math.max(1, s - 1))} />
            <Display size={24}>{seats}</Display>
            <IconButton name="plus" size={38} bg={C.bg} onPress={() => setSeats((s) => Math.min(8, s + 1))} />
          </View>
        </View>
        <TextInput value={notes} onChangeText={setNotes} maxLength={200} placeholder="Note for the driver (optional)" placeholderTextColor="rgba(20,20,20,0.4)" style={{ marginTop: 10, height: 44, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, fontFamily: F.sans, fontSize: 14, color: C.ink }} />
        <Button label={busy ? "Requesting…" : "Request ride"} icon="car-side" variant="ink" block onPress={request} disabled={busy || !here} style={{ marginTop: 12 }} />
      </Animated.View>
    );
  }

  const cancel = () => Alert.alert("Cancel this ride?", undefined, [
    { text: "Keep it", style: "cancel" },
    { text: "Cancel ride", style: "destructive", onPress: () => setRideStatus(ride.id, "cancelled").then(reload).catch((e) => Alert.alert("Couldn't cancel", e.message)) },
  ]);

  if (ride.status === "requested") {
    return (
      <Animated.View key="search" entering={FadeInUp.springify()} style={sheet}>
        <Radar />
        <Display size={24} center style={{ marginTop: 10 }}>Finding a volunteer…</Display>
        <Body center color={C.muted} style={{ marginTop: 4 }}>{ride.requested_for} · {ride.seats} seat{ride.seats > 1 ? "s" : ""} · we'll notify you here as soon as a driver accepts.</Body>
        <Button label="Cancel request" icon="x" trail={null} variant="ghost" block small onPress={cancel} style={{ marginTop: 14 }} />
      </Animated.View>
    );
  }

  const v = ride.volunteer;
  const statusText = ride.status === "accepted" ? "Your driver accepted and will set off soon." : ride.status === "enroute" ? "Your driver is on the way." : "Your driver has arrived. 🎉";
  return (
    <Animated.View key="ride" entering={FadeInUp.springify().damping(18)} style={sheet}>
      <Body weight="semi" color={ride.status === "arrived" ? C.mint : C.ink}>{statusText}</Body>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
        <Avatar name={v?.full_name || "Driver"} color={C.mint} size={52} />
        <View style={{ flex: 1 }}>
          <Body weight="bold" size={17}>{v?.full_name || "Volunteer driver"}</Body>
          {v?.car ? <Body size={13} color={C.muted}>{v.car}</Body> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Press onPress={() => call(ride.id)} style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: C.bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="phone" size={17} /><Body weight="semi">Call</Body>
        </Press>
        <Press onPress={() => message(ride.volunteer_id)} style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="message-circle" size={17} color="#fff" /><Body weight="semi" color="#fff">Message</Body>
        </Press>
      </View>
      {ride.status !== "arrived" ? <Button label="Cancel ride" icon="x" trail={null} variant="ghost" block small onPress={cancel} style={{ marginTop: 10 }} /> : null}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ volunteer */
function DriverSheet({ open, mine, reload, sharingFor, setSharingFor }: { open?: Ride[]; mine?: Ride[]; reload: () => void; sharingFor: string | null; setSharingFor: (id: string | null) => void }) {
  const { isVolunteer } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  if (!isVolunteer) {
    return (
      <View style={sheet}>
        <Empty icon="car-side" color={C.mint} title="Drive for the ride ministry" body="Volunteer drivers are approved by the church team. Ask a staff member to add you as a volunteer, then this screen shows ride requests." />
      </View>
    );
  }
  if (!open || !mine) return <View style={sheet}><Loading /></View>;
  const act = async (id: string, f: () => Promise<any>) => {
    setBusy(id);
    try { await f(); reload(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
    catch (e: any) { Alert.alert("Couldn't update the ride", e.message); }
    finally { setBusy(null); }
  };
  return (
    <Animated.View key="drive" entering={FadeInUp.springify().damping(18)} style={[sheet, { maxHeight: 460 }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {mine.length ? <Display size={22}>My rides</Display> : null}
        {mine.map((r) => (
          <View key={r.id} style={{ marginTop: 10, padding: 12, borderRadius: R.md, backgroundColor: C.mintSoft, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar name={r.member?.full_name || "?"} color={C.violet} size={42} />
              <View style={{ flex: 1 }}>
                <Body weight="semi">{r.member?.full_name || "Member"}</Body>
                <Label numberOfLines={2}>{r.pickup_label} · {r.requested_for} · {r.seats} seat{r.seats > 1 ? "s" : ""}{r.notes ? ` · “${r.notes}”` : ""}</Label>
              </View>
              <IconButton name="navigation" size={40} bg={C.ink} color={C.sun} onPress={() => openNavigation(r.pickup_lat, r.pickup_lng)} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {r.status === "accepted" ? <Chip label="Start driving" icon="play" color={C.ink} active onPress={() => act(r.id, async () => { await setRideStatus(r.id, "enroute"); setSharingFor(r.id); })} /> : null}
              {r.status === "enroute" ? <Chip label="I've arrived" icon="map-pin" color={C.ink} active onPress={() => act(r.id, () => setRideStatus(r.id, "arrived"))} /> : null}
              {r.status === "arrived" ? <Chip label="Ride complete" icon="check" color={C.mint} active onPress={() => act(r.id, async () => { await setRideStatus(r.id, "completed"); setSharingFor(null); })} /> : null}
              <Chip label="Call" icon="phone" onPress={() => call(r.id)} />
              <Chip label="Message" icon="message-circle" onPress={() => message(r.member_id)} />
              {r.status === "accepted" ? <Chip label="Hand back" icon="corner-up-left" onPress={() => act(r.id, () => setRideStatus(r.id, "requested"))} /> : null}
            </View>
            {sharingFor === r.id ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><LiveDot color={C.mint} size={6} /><Label>Sharing your live location with {r.member?.full_name?.split(" ")[0] || "the rider"}</Label></View> : null}
          </View>
        ))}
        <Display size={22} style={{ marginTop: mine.length ? 18 : 0 }}>Ride requests</Display>
        {open.length === 0 ? <Label style={{ marginTop: 6 }}>No one is waiting for a ride right now. 🙌</Label> : null}
        {open.map((r, i) => (
          <Animated.View key={r.id} entering={FadeInDown.delay(i * 60)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: R.md, backgroundColor: C.bg, marginTop: 8 }}>
            <Avatar name={r.member?.full_name || "?"} color={C.rose} size={42} />
            <View style={{ flex: 1 }}>
              <Body weight="semi">{r.member?.full_name || "Member"}</Body>
              <Label numberOfLines={2}>{r.pickup_label} · {r.requested_for} · {r.seats} seat{r.seats > 1 ? "s" : ""}</Label>
            </View>
            <Press onPress={() => act(r.id, () => acceptRide(r.id))} disabled={busy === r.id} style={{ paddingHorizontal: 14, height: 38, borderRadius: 12, backgroundColor: C.mint, justifyContent: "center", opacity: busy === r.id ? 0.6 : 1 }}>
              <Body size={13} weight="bold" color="#fff">Accept</Body>
            </Press>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ screen */
export default function Rides() {
  const insets = useSafeAreaInsets();
  const { signedIn, isVolunteer } = useAuth();
  const { church } = useSiteContent();
  const [mode, setMode] = useState(0); // 0 = rider, 1 = volunteer
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [open, setOpen] = useState<Ride[] | undefined>();
  const [mine, setMine] = useState<Ride[] | undefined>();
  const [here, setHere] = useState<(Pt & { label: string }) | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const [car, setCar] = useState<(Pt & { heading: number | null }) | null>(null);
  const [sharingFor, setSharingFor] = useState<string | null>(null);
  const map = useRef<MapView>(null);
  const confetti = useRef<ConfettiHandle>(null);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const churchPt: Pt | null = church.lat && church.lng ? { latitude: Number(church.lat), longitude: Number(church.lng) } : null;

  const reload = useCallback(() => {
    if (!signedIn) return;
    myActiveRide().then(setRide).catch(() => setRide(null));
    if (isVolunteer) { openRides().then(setOpen).catch(() => setOpen([])); myDrives().then(setMine).catch(() => setMine([])); }
  }, [signedIn, isVolunteer]);

  useEffect(() => {
    reload();
    if (!signedIn) return;
    return subscribeRides(reload);
  }, [reload, signedIn]);

  // Where am I? (pickup point)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocDenied(true); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pt = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let label = "Current location";
      try {
        const [g] = await Location.reverseGeocodeAsync(pt);
        if (g) label = [g.name, g.street, g.district || g.subregion || g.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(", ") || label;
      } catch {}
      setHere({ ...pt, label });
      map.current?.animateToRegion({ ...pt, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 600);
    })().catch(() => setLocDenied(true));
  }, []);

  // Rider: follow the driver's live location
  useEffect(() => {
    if (!ride || !["accepted", "enroute", "arrived"].includes(ride.status)) { setCar(null); return; }
    lastRideLocation(ride.id).then((p) => p && setCar({ latitude: p.lat, longitude: p.lng, heading: p.heading })).catch(() => {});
    return subscribeRideLocation(ride.id, (p) => setCar({ latitude: p.lat, longitude: p.lng, heading: p.heading }));
  }, [ride?.id, ride?.status]);

  // Volunteer: share live location for the ride being driven
  useEffect(() => {
    watchSub.current?.remove();
    watchSub.current = null;
    if (!sharingFor) return;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      // Keep the app open while driving; background tracking needs a dev build with expo-task-manager.
      watchSub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 5000 }, (pos) => {
        pushRideLocation(sharingFor, pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined);
      });
    })();
    return () => { cancelled = true; watchSub.current?.remove(); };
  }, [sharingFor]);
  // resume sharing if the app restarts mid-ride
  useEffect(() => { const d = mine?.find((r) => r.status === "enroute"); if (d && !sharingFor) setSharingFor(d.id); }, [mine]);

  const pickupPt: Pt | null = ride ? { latitude: ride.pickup_lat, longitude: ride.pickup_lng } : here;
  const eta = car && pickupPt && ride?.status === "enroute" ? etaMin(car, pickupPt) : null;

  if (!signedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 60 }}>
        <Empty icon="car-side" color={C.mint} title="Get a ride to church" body="Sign in to request a free ride from a volunteer driver, or to volunteer as a driver." action="Sign in" onAction={() => router.push("/auth")} />
        <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}><IconButton name="arrow-left" onPress={() => router.back()} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={churchPt ? { ...churchPt, latitudeDelta: 0.08, longitudeDelta: 0.08 } : { latitude: 29.34, longitude: 48.0, latitudeDelta: 0.4, longitudeDelta: 0.4 }}
        showsUserLocation
        showsPointsOfInterest={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {churchPt ? (
          <Marker coordinate={churchPt} anchor={{ x: 0.5, y: 1 }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: "center", marginBottom: 6 }}><Body size={11.5} weight="bold">{church.short || church.name}</Body></View>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}><Icon name="cross" size={17} color="#fff" /></View>
            </View>
          </Marker>
        ) : null}
        {mode === 0 && ride ? (
          <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, borderWidth: 4, borderColor: C.sun }} />
          </Marker>
        ) : null}
        {mode === 0 && car ? (
          <Marker coordinate={car} anchor={{ x: 0.5, y: 0.5 }} flat rotation={car.heading ?? 0}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,210,63,0.35)", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="car-side" size={15} /></View>
            </View>
          </Marker>
        ) : null}
        {mode === 1 ? [...(open ?? []), ...(mine ?? [])].map((r) => (
          <Marker key={r.id} coordinate={{ latitude: r.pickup_lat, longitude: r.pickup_lng }}>
            <Avatar name={r.member?.full_name || "?"} color={r.volunteer_id ? C.mint : C.rose} size={36} ring="#fff" />
          </Marker>
        )) : null}
      </MapView>

      {/* top bar */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconButton name="arrow-left" onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 36, justifyContent: "center" }}><Body size={15} weight="bold">Ride ministry</Body></View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.sun, paddingHorizontal: 12, height: 36, borderRadius: 12 }}>
            <LiveDot color={C.ink} size={6} />
            <Body size={12} weight="bold">Live</Body>
          </View>
        </View>
        <Segmented items={["I need a ride", "I'm driving"]} value={mode} onChange={setMode} />
        {mode === 0 && eta ? (
          <Animated.View entering={FadeInDown} style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Body size={12} color={C.muted}>Arriving in about</Body>
            <Display size={28}>{eta} min</Display>
          </Animated.View>
        ) : null}
        {mode === 0 && locDenied && !ride ? (
          <Animated.View entering={FadeIn} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="map-pin" size={18} />
            <Body size={13.5} style={{ flex: 1 }}>Allow location so your driver can find you.</Body>
            <Press onPress={() => Linking.openSettings()}><Body size={13.5} weight="bold" color={C.flame}>Settings</Body></Press>
          </Animated.View>
        ) : null}
      </View>

      {/* bottom sheet */}
      <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10 }}>
        {mode === 0 ? (
          <RiderSheet ride={ride} here={here} reload={reload} onArrive={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); confetti.current?.burst(undefined, 420, 90); }} />
        ) : (
          <DriverSheet open={open} mine={mine} reload={reload} sharingFor={sharingFor} setSharingFor={setSharingFor} />
        )}
      </View>
      <Confetti ref={confetti} />
    </View>
  );
}

const sheet = { backgroundColor: "#fff", borderRadius: 28, padding: 18, borderWidth: 2, borderColor: C.ink } as const;
