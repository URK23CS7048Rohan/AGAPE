import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, TextInput, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R } from "@/theme";
import { Avatar, Body, Button, Chip, Confetti, ConfettiHandle, Display, Icon, IconButton, Label, LiveDot, Press, Segmented, Serif } from "@/components/ui";
import { DARK_MAP_STYLE, RIDE } from "@/data/mock";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/lib/content";
import { Ride, colorFor, etaMinutes, useDriverBoard, useMyRide, useRideLocation } from "@/lib/data";
import { acceptRide, pushRideLocation, requestRide, setRideStatus, startDirect } from "@/lib/api";

type LatLng = { latitude: number; longitude: number };
type Phase = "request" | "searching" | "enroute" | "arrived";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Interpolates a point along a polyline, t ∈ [0,1] (demo mode only). */
function along(route: LatLng[], t: number) {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const d = Math.hypot(route[i].latitude - route[i - 1].latitude, route[i].longitude - route[i - 1].longitude);
    seg.push(d); total += d;
  }
  let dist = t * total;
  for (let i = 0; i < seg.length; i++) {
    if (dist <= seg[i]) {
      const k = seg[i] ? dist / seg[i] : 0;
      const a = route[i], b = route[i + 1];
      return { latitude: a.latitude + (b.latitude - a.latitude) * k, longitude: a.longitude + (b.longitude - a.longitude) * k, heading: (Math.atan2(b.longitude - a.longitude, b.latitude - a.latitude) * 180) / Math.PI, index: i };
    }
    dist -= seg[i];
  }
  const last = route[route.length - 1];
  return { ...last, heading: 0, index: route.length - 2 };
}

function Radar() {
  const t = useSharedValue(0);
  useEffect(() => { t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1); }, []);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.4 + t.value * 1.6 }] }));
  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(46,211,160,0.35)" }, ring]} />
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
        <Icon name="car-side" size={26} color={C.ink} />
      </View>
    </View>
  );
}

function openNavigation(lat: number, lng: number) {
  const google = Platform.select({ ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, default: `google.navigation:q=${lat},${lng}` });
  const waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  Linking.openURL(google!).catch(() => Linking.openURL(waze));
}

const CarMarker = ({ at }: { at: LatLng & { heading?: number } }) => (
  <Marker coordinate={at} anchor={{ x: 0.5, y: 0.5 }} flat rotation={at.heading || 0}>
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(46,211,160,0.3)", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.mint }} />
      </View>
    </View>
  </Marker>
);

export default function Rides() {
  const insets = useSafeAreaInsets();
  const { live, session, isVolunteer, needsAccount, profile } = useStore();
  const site = useSiteContent();
  const church = site.church;
  const uid = session?.user.id ?? null;
  const [mode, setMode] = useState(0); // 0 = rider, 1 = volunteer
  const map = useRef<MapView>(null);
  const confetti = useRef<ConfettiHandle>(null);

  // service times → ride slots ("Sun 10:00 AM")
  const TIMES = useMemo(() => {
    const t = church.services.map((s) => `${DAYS[s.day]} ${s.time}`);
    return t.length ? t : ["Sun 9:15 AM", "Sun 5:15 PM", "Wed 7:00 PM"];
  }, [church.services]);
  const [time, setTime] = useState(TIMES[0]);
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // ---------------------------------------------------------------- live data
  const my = useMyRide(live ? uid : null);
  const ride = my.data;
  const driverPos = useRideLocation(live && ride && ride.status !== "requested" ? ride.id : null);
  const board = useDriverBoard(uid, live && isVolunteer && mode === 1);

  // pickup = centre of the map (drag the map to adjust), starting from the phone's location
  const [pickup, setPickup] = useState<LatLng>(live ? church.coords : RIDE.pickup);
  const [pickupLabel, setPickupLabel] = useState(live ? "Locating you…" : RIDE.pickup.label);
  const geoTimer = useRef<any>(null);
  useEffect(() => {
    if (!live) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied" }));
      if (status !== "granted") { setPickupLabel("Drag the map to your pickup point"); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (!pos) return;
      const at = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setPickup(at);
      map.current?.animateToRegion({ ...at, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
      label(at);
    })();
  }, [live]);
  const label = (at: LatLng) => {
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      const r = await Location.reverseGeocodeAsync(at).catch(() => []);
      const a = r?.[0];
      setPickupLabel(a ? [a.name && a.name !== a.street ? a.name : null, a.street, a.district || a.subregion || a.city].filter(Boolean).join(", ") || "Pinned location" : "Pinned location");
    }, 500);
  };

  // ---------------------------------------------------------------- demo simulation
  const [demoPhase, setDemoPhase] = useState<Phase>("request");
  const [t, setT] = useState(0);
  const [demoAccepted, setDemoAccepted] = useState<Set<string>>(new Set());
  const demoCar = useMemo(() => along(RIDE.route, t), [t]);
  useEffect(() => {
    if (live || demoPhase !== "enroute") return;
    const iv = setInterval(() => {
      setT((x) => {
        const n = Math.min(1, x + 0.006);
        if (n >= 1) {
          clearInterval(iv);
          setTimeout(() => { setDemoPhase("arrived"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); confetti.current?.burst(undefined, 420, 90); }, 300);
        }
        return n;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [demoPhase, live]);

  // ---------------------------------------------------------------- derived state
  const phase: Phase = live
    ? !ride ? "request" : ride.status === "requested" ? "searching" : ride.status === "arrived" ? "arrived" : "enroute"
    : demoPhase;
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const s = ride?.status;
    if (s && s !== prevStatus.current && prevStatus.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (s === "arrived") confetti.current?.burst(undefined, 420, 90);
    }
    prevStatus.current = s;
  }, [ride?.status]);

  const ridePickup: LatLng = live && ride ? { latitude: ride.pickup_lat, longitude: ride.pickup_lng } : RIDE.pickup;
  const car = live ? driverPos : phase === "enroute" || phase === "arrived" ? demoCar : null;
  const eta = live ? (driverPos ? etaMinutes(driverPos, ridePickup) : null) : Math.max(1, Math.ceil((1 - t) * 7));
  const driver = live ? ride?.driver : { full_name: RIDE.driver.name, phone: RIDE.driver.phone, vehicle: `${RIDE.driver.car} · ${RIDE.driver.plate}` };

  const fit = () => {
    if (mode === 1 && live) {
      const pts = [...board.data.mine, ...board.data.open].map((r) => ({ latitude: r.pickup_lat, longitude: r.pickup_lng }));
      if (pts.length) map.current?.fitToCoordinates([...pts, church.coords], { edgePadding: { top: 200, bottom: 420, left: 60, right: 60 }, animated: true });
      return;
    }
    if (!live) { map.current?.fitToCoordinates([...RIDE.route], { edgePadding: { top: 200, bottom: 420, left: 60, right: 60 }, animated: true }); return; }
    if (ride) map.current?.fitToCoordinates([ridePickup, church.coords, ...(driverPos ? [driverPos] : [])], { edgePadding: { top: 200, bottom: 420, left: 60, right: 60 }, animated: true });
  };
  useEffect(() => { fit(); }, [mode, ride?.id, ride?.status, board.data.open.length, board.data.mine.length]);

  // ---------------------------------------------------------------- member actions
  const request = async () => {
    if (needsAccount("request a ride")) return;
    if (!live) { setDemoPhase("searching"); setTimeout(() => { setT(0); setDemoPhase("enroute"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, 2600); return; }
    setBusy(true);
    try {
      await requestRide({ pickup: /^(Locating|Drag)/.test(pickupLabel) ? "Pinned location" : pickupLabel, lat: pickup.latitude, lng: pickup.longitude, time, seats, notes: note.trim() });
      await my.reload();
    } catch (e: any) { Alert.alert("Couldn't request", e?.message || "Please try again."); }
    finally { setBusy(false); }
  };
  const cancel = () => Alert.alert("Cancel this ride?", "Your driver will be told.", [
    { text: "Keep it", style: "cancel" },
    { text: "Cancel ride", style: "destructive", onPress: async () => {
      if (!live) { setDemoPhase("request"); setT(0); return; }
      try { await setRideStatus(ride!.id, "cancelled"); await my.reload(); } catch (e: any) { Alert.alert("Couldn't cancel", e?.message || ""); }
    } },
  ]);
  const message = async (otherId?: string | null) => {
    if (!live || !otherId) { router.push("/chat/david"); return; }
    try { const id = await startDirect(otherId); if (id) router.push(`/chat/${id}`); } catch (e: any) { Alert.alert("Couldn't open chat", e?.message || ""); }
  };

  // ---------------------------------------------------------------- driver actions + location sharing
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const [sharingFor, setSharingFor] = useState<string | null>(null);
  const lastSent = useRef(0);
  const stopSharing = () => { watchSub.current?.remove(); watchSub.current = null; setSharingFor(null); };
  const startSharing = async (rideId: string) => {
    stopSharing();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { Alert.alert("Location needed", "Allow location so your rider can see you coming."); return; }
    // Keeps sharing while the app is open. For screen-locked tracking add expo-task-manager background updates (README).
    watchSub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 4000 }, (pos) => {
      const now = Date.now();
      if (now - lastSent.current < 4000) return;
      lastSent.current = now;
      pushRideLocation(rideId, pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined);
    });
    setSharingFor(rideId);
  };
  useEffect(() => () => stopSharing(), []);
  // keep sharing for the ride that's under way
  useEffect(() => {
    if (!live) return;
    const going = board.data.mine.find((r) => r.status === "enroute" || r.status === "arrived");
    if (going && sharingFor !== going.id) startSharing(going.id).catch(() => {});
    if (!going && sharingFor) stopSharing();
  }, [board.data.mine.map((r) => r.id + r.status).join()]);

  const drive = async (r: Ride, to: "accept" | "enroute" | "arrived" | "completed" | "cancelled") => {
    try {
      if (to === "accept") await acceptRide(r.id); else await setRideStatus(r.id, to);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (to === "enroute") openNavigation(r.pickup_lat, r.pickup_lng);
      if (to === "completed") confetti.current?.burst(undefined, 420, 90);
      await board.reload();
    } catch (e: any) { Alert.alert("Ride", e?.message || "Please try again."); board.reload(); }
  };

  // ---------------------------------------------------------------- render
  const showCenterPin = live && mode === 0 && phase === "request";
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <StatusBar style="light" />
      <MapView
        ref={map}
        onMapReady={fit}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={{ latitude: 29.3305, longitude: 48.068, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation={live}
        showsPointsOfInterest={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(r: any) => { if (showCenterPin) { const at = { latitude: r.latitude, longitude: r.longitude }; setPickup(at); label(at); } }}
      >
        {mode === 0 ? (
          <>
            {!live ? (
              <>
                <Polyline coordinates={RIDE.route} strokeColor="rgba(46,211,160,0.25)" strokeWidth={10} />
                <Polyline coordinates={phase === "enroute" ? [demoCar, ...RIDE.route.slice(demoCar.index + 1)] : RIDE.route} strokeColor={C.mint} strokeWidth={5} />
              </>
            ) : car ? (
              <Polyline coordinates={[car, ridePickup]} strokeColor={C.mint} strokeWidth={4} lineDashPattern={[6, 8]} />
            ) : null}
            {!showCenterPin ? (
              <Marker coordinate={ridePickup} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, borderWidth: 4, borderColor: C.mint }} />
              </Marker>
            ) : null}
            <Marker coordinate={church.coords} anchor={{ x: 0.5, y: 1 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: "center", marginBottom: 6 }}><Body size={11.5} weight="bold">{church.short || "Agape"}</Body></View>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}><Icon name="cross" size={17} color="#fff" /></View>
              </View>
            </Marker>
            {car ? <CarMarker at={car} /> : null}
          </>
        ) : live ? (
          [...board.data.mine, ...board.data.open].map((r) => (
            <Marker key={r.id} coordinate={{ latitude: r.pickup_lat, longitude: r.pickup_lng }}>
              <Avatar name={r.member?.full_name || "Member"} color={r.volunteer_id ? C.mint : colorFor(r.member_id)} size={36} ring="#fff" />
            </Marker>
          ))
        ) : (
          RIDE.requests.map((r) => (
            <Marker key={r.id} coordinate={{ latitude: r.lat, longitude: r.lng }}>
              <Avatar name={r.name} color={r.color} size={36} ring="#fff" />
            </Marker>
          ))
        )}
      </MapView>

      {/* drag-the-map pickup pin */}
      {showCenterPin ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <View style={{ backgroundColor: "#fff", paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: "center", marginBottom: 6 }}><Body size={12} weight="bold">Pickup here</Body></View>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, borderWidth: 5, borderColor: C.mint }} />
          </View>
        </View>
      ) : null}

      {/* top bar */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} bg="rgba(255,255,255,0.15)" color="#fff" />
          <Body size={17} weight="semi" color="#fff" style={{ flex: 1 }}>Ride ministry</Body>
          {sharingFor ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.mint, paddingHorizontal: 12, height: 30, borderRadius: R.pill }}>
              <LiveDot color={C.ink} size={6} />
              <Body size={12} weight="bold">Sharing location</Body>
            </View>
          ) : null}
        </View>
        <Segmented items={["I need a ride", "I'm driving"]} value={mode} onChange={setMode} dark accent={C.mint} />
        {mode === 0 && phase === "enroute" && eta ? (
          <Animated.View entering={FadeInDown} style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Body size={12} color={C.muted}>{live && ride?.status === "accepted" ? "Driver is" : "Arriving in"}</Body>
            <Display size={30}>{live && ride?.status === "accepted" ? `${eta} min away` : `${eta} min`}</Display>
          </Animated.View>
        ) : null}
      </View>

      {/* bottom sheet */}
      <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10 }}>
        {mode === 0 && phase === "request" ? (
          <Animated.View key="req" entering={FadeInUp.springify().damping(18)} style={sheet}>
            <Display size={34}>Need a <Serif size={36} color="#0E9F74">ride?</Serif></Display>
            <Body size={14} color={C.muted} style={{ marginTop: 4 }}>A volunteer from the family will pick you up, for free.</Body>
            <View style={{ marginTop: 14, padding: 14, borderRadius: R.md, backgroundColor: "#F4F1EC", gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: C.mint }} />
                <View style={{ flex: 1 }}><Label size={10}>Pickup{live ? " · drag the map to adjust" : ""}</Label><Body weight="semi" numberOfLines={1}>{pickupLabel}</Body></View>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.flame }} />
                <View style={{ flex: 1 }}><Label size={10}>Destination</Label><Body weight="semi" numberOfLines={1}>{church.address}</Body></View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {TIMES.map((x) => <Chip key={x} label={x} active={time === x} onPress={() => setTime(x)} />)}
            </View>
            {live ? (
              <View style={{ marginTop: 10, height: 46, borderRadius: R.pill, backgroundColor: "#F4F1EC", paddingHorizontal: 16, justifyContent: "center" }}>
                <TextInput value={note} onChangeText={setNote} maxLength={200} placeholder="Note for the driver (building, landmark…)" placeholderTextColor="rgba(15,11,18,0.4)" style={{ fontFamily: F.sans, fontSize: 14.5, color: C.ink }} />
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <Body weight="semi">Passengers</Body>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <IconButton name="minus" size={38} bg="#F4F1EC" onPress={() => setSeats((s) => Math.max(1, s - 1))} />
                <Display size={26}>{seats}</Display>
                <IconButton name="plus" size={38} bg="#F4F1EC" onPress={() => setSeats((s) => Math.min(6, s + 1))} />
              </View>
            </View>
            <Button label={busy ? "Requesting…" : "Request ride"} icon="car-side" variant="ink" block onPress={request} disabled={busy} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : null}

        {mode === 0 && phase === "searching" ? (
          <Animated.View key="search" entering={FadeInUp.springify()} style={sheet}>
            <Radar />
            <Display size={30} center style={{ marginTop: 10 }}>Finding a <Serif size={32} color="#0E9F74">volunteer…</Serif></Display>
            <Body center color={C.muted} style={{ marginTop: 4 }}>{live ? `${ride?.requested_for} · ${ride?.seats} seat${(ride?.seats ?? 1) > 1 ? "s" : ""}. We'll notify you when a driver accepts.` : `${site.stats.drivers} drivers are serving this Sunday`}</Body>
            <Press onPress={cancel} style={{ alignSelf: "center", marginTop: 12 }}><Body weight="semi" color={C.rose}>Cancel request</Body></Press>
          </Animated.View>
        ) : null}

        {mode === 0 && (phase === "enroute" || phase === "arrived") ? (
          <Animated.View key="enroute" entering={FadeInUp.springify().damping(18)} style={sheet}>
            {phase === "arrived" ? (
              <Animated.View entering={FadeIn}>
                <Display size={34}>{live ? "Your ride is " : "You've "}<Serif size={36} color={C.flame}>{live ? "here." : "arrived."}</Serif></Display>
                <Body color={C.muted} style={{ marginTop: 4, marginBottom: 12 }}>{live ? "Your driver is outside. See you at church!" : "Welcome home! Service starts at 10:00 AM."}</Body>
              </Animated.View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={driver?.full_name || "Driver"} color={C.mint} size={52} />
              <View style={{ flex: 1 }}>
                <Body weight="bold" size={17}>{driver?.full_name || "Your driver"}</Body>
                <Body size={13} color={C.muted} numberOfLines={1}>{driver?.vehicle || "Volunteer driver"}</Body>
              </View>
              {live ? (
                <View style={{ backgroundColor: C.mintSoft, paddingHorizontal: 10, height: 30, borderRadius: R.pill, justifyContent: "center" }}><Body size={12.5} weight="bold">{ride?.status === "accepted" ? "Confirmed" : ride?.status === "enroute" ? "On the way" : "Arrived"}</Body></View>
              ) : (
                <View style={{ backgroundColor: C.sunSoft, paddingHorizontal: 10, height: 30, borderRadius: R.pill, justifyContent: "center" }}><Body size={13} weight="bold">★ {RIDE.driver.rating}</Body></View>
              )}
            </View>
            {phase === "enroute" && !live ? (
              <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#EEE9E2", overflow: "hidden" }}>
                  <View style={{ width: `${t * 100}%`, height: 8, backgroundColor: C.mint, borderRadius: 4 }} />
                </View>
                <Body size={13} weight="semi">{eta} min</Body>
              </View>
            ) : null}
            {live && phase === "enroute" && !driverPos ? <Body size={13} color={C.muted} style={{ marginTop: 10 }}>{ride?.status === "accepted" ? `Pickup ${ride?.requested_for}. You'll see the car here once your driver sets off.` : "Waiting for your driver's location…"}</Body> : null}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Press onPress={() => (driver?.phone ? Linking.openURL(`tel:${driver.phone}`) : Alert.alert("No number", "Your driver hasn't added a phone number. Send a message instead."))} style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: "#F4F1EC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="phone" size={17} /><Body weight="semi">Call</Body>
              </Press>
              <Press onPress={() => message(ride?.volunteer_id)} style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="message-circle" size={17} color="#fff" /><Body weight="semi" color="#fff">Message</Body>
              </Press>
            </View>
            {phase === "arrived" && !live ? <Button label="Book my ride home" variant="mint" block small onPress={() => { setDemoPhase("request"); setT(0); }} style={{ marginTop: 10 }} /> : null}
            {phase === "enroute" ? <Press onPress={cancel} style={{ alignSelf: "center", marginTop: 12 }}><Body weight="semi" color={C.rose}>Cancel ride</Body></Press> : null}
          </Animated.View>
        ) : null}

        {mode === 1 && live && !isVolunteer ? (
          <Animated.View key="become" entering={FadeInUp.springify().damping(18)} style={sheet}>
            <Display size={30}>Drive with <Serif size={32} color="#0E9F74">us?</Serif></Display>
            <Body color={C.muted} style={{ marginTop: 6 }}>Volunteer drivers bring families to church every week. Apply once, and requests near you appear here.</Body>
            <Button label="Become a volunteer driver" icon="arrow-right" variant="mint" block onPress={() => (needsAccount("volunteer") ? null : router.push("/volunteer"))} style={{ marginTop: 14 }} />
          </Animated.View>
        ) : null}

        {mode === 1 && live && isVolunteer ? (
          <Animated.View key="drive" entering={FadeInUp.springify().damping(18)} style={[sheet, { maxHeight: 460 }]}>
            {board.data.mine.length ? (
              <>
                <Label>Your rides</Label>
                <View style={{ gap: 8, marginTop: 8, marginBottom: 12 }}>
                  {board.data.mine.map((r) => (
                    <View key={r.id} style={{ padding: 12, borderRadius: R.md, backgroundColor: C.mintSoft }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Avatar name={r.member?.full_name || "Member"} color={colorFor(r.member_id)} size={42} />
                        <View style={{ flex: 1 }}>
                          <Body weight="semi">{r.member?.full_name || "Member"}</Body>
                          <Body size={12.5} color={C.muted} numberOfLines={1}>{r.pickup_label} · {r.requested_for} · {r.seats} seat{r.seats > 1 ? "s" : ""}</Body>
                          {r.notes ? <Body size={12.5} color={C.ink} numberOfLines={2}>“{r.notes}”</Body> : null}
                        </View>
                        <IconButton name="navigation" size={40} bg={C.ink} color={C.mint} onPress={() => openNavigation(r.pickup_lat, r.pickup_lng)} />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        {r.status === "accepted" ? <Button label="Start driving" icon="navigation" variant="ink" small onPress={() => drive(r, "enroute")} style={{ flex: 1 }} /> : null}
                        {r.status === "enroute" ? <Button label="I've arrived" icon="map-pin" variant="ink" small onPress={() => drive(r, "arrived")} style={{ flex: 1 }} /> : null}
                        {r.status === "arrived" ? <Button label="Ride complete" icon="check" variant="ink" small onPress={() => drive(r, "completed")} style={{ flex: 1 }} /> : null}
                        <IconButton name="message-circle" size={46} bg="#fff" onPress={() => message(r.member_id)} />
                        {r.member?.phone ? <IconButton name="phone" size={46} bg="#fff" onPress={() => Linking.openURL(`tel:${r.member!.phone}`)} /> : null}
                        <IconButton name="x" size={46} bg="#fff" onPress={() => Alert.alert("Hand this ride back?", "It goes back to the other drivers.", [{ text: "Keep it", style: "cancel" }, { text: "Hand back", style: "destructive", onPress: () => drive(r, "cancelled") }])} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Display size={30}>Ride <Serif size={32} color="#0E9F74">requests</Serif></Display>
              {profile?.vehicle ? null : <Press onPress={() => router.push("/onboarding?edit=1")}><Body size={12.5} weight="semi" color={C.flame}>Add your car</Body></Press>}
            </View>
            {board.data.open.length === 0 ? <Body color={C.muted} style={{ marginTop: 8 }}>{board.loading ? "Loading…" : "No open requests right now. We'll notify you when one comes in."}</Body> : null}
            <View style={{ gap: 8, marginTop: 12 }}>
              {board.data.open.slice(0, 6).map((r, i) => (
                <Animated.View key={r.id} entering={FadeInDown.delay(i * 70)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: R.md, backgroundColor: "#F4F1EC" }}>
                  <Avatar name={r.member?.full_name || "Member"} color={colorFor(r.member_id)} size={42} />
                  <View style={{ flex: 1 }}>
                    <Body weight="semi">{r.member?.full_name || "Member"}</Body>
                    <Body size={12.5} color={C.muted} numberOfLines={1}>{r.pickup_label} · {r.requested_for} · {r.seats} seat{r.seats > 1 ? "s" : ""}</Body>
                  </View>
                  <Press onPress={() => drive(r, "accept")} style={{ paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: C.mint, justifyContent: "center" }}>
                    <Body size={13} weight="bold">Accept</Body>
                  </Press>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {mode === 1 && !live ? (
          <Animated.View key="drive-demo" entering={FadeInUp.springify().damping(18)} style={sheet}>
            <Display size={30}>Ride <Serif size={32} color="#0E9F74">requests</Serif></Display>
            <View style={{ gap: 8, marginTop: 12 }}>
              {RIDE.requests.map((r, i) => {
                const on = demoAccepted.has(r.id);
                return (
                  <Animated.View key={r.id} entering={FadeInDown.delay(i * 70)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: R.md, backgroundColor: "#F4F1EC" }}>
                    <Avatar name={r.name} color={r.color} size={42} />
                    <View style={{ flex: 1 }}>
                      <Body weight="semi">{r.name}</Body>
                      <Body size={12.5} color={C.muted}>{r.pickup} · {r.time} · {r.seats} seat{r.seats > 1 ? "s" : ""}</Body>
                    </View>
                    {on ? (
                      <IconButton name="navigation" size={40} bg={C.ink} color={C.mint} onPress={() => openNavigation(r.lat, r.lng)} />
                    ) : (
                      <Press onPress={() => { setDemoAccepted((s) => new Set(s).add(r.id)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }} style={{ paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: C.mint, justifyContent: "center" }}>
                        <Body size={13} weight="bold">Accept</Body>
                      </Press>
                    )}
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
      <Confetti ref={confetti} />
    </View>
  );
}

const sheet = { backgroundColor: "#fff", borderRadius: 30, padding: 18, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 } as const;
