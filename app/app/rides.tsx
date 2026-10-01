import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, TextInput, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R, shadow } from "@/theme";
import { Avatar, Body, Button, Chip, Confetti, ConfettiHandle, Display, Icon, IconButton, Label, LiveDot, Press, Segmented, Serif } from "@/components/ui";
import { LiveMap, MapMarker } from "@/components/map/LiveMap";
import { RIDE } from "@/data/mock";
import { useStore } from "@/lib/store";
import { useSiteContent } from "@/lib/content";
import { Ride, colorFor, useDriverBoard, useMyRide, useRideLocation } from "@/lib/data";
import { along, remaining, useRoute } from "@/lib/route";
import { acceptRide, pushRideLocation, requestRide, setRideStatus, startDirect } from "@/lib/api";

type LatLng = { latitude: number; longitude: number };
type Phase = "request" | "searching" | "enroute" | "arrived";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ll = (p: LatLng | null | undefined) => (p ? { lat: p.latitude, lng: p.longitude } : null);

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

export default function Rides() {
  const insets = useSafeAreaInsets();
  const { live, session, isVolunteer, needsAccount, profile } = useStore();
  const site = useSiteContent();
  const church = site.church;
  const uid = session?.user.id ?? null;
  const [mode, setMode] = useState(0); // 0 = rider, 1 = volunteer
  const confetti = useRef<ConfettiHandle>(null);
  const [sheetH, setSheetH] = useState(380);

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
  const [me, setMe] = useState<LatLng | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [pickupLabel, setPickupLabel] = useState(live ? "Locating you…" : RIDE.pickup.label);
  const geoTimer = useRef<any>(null);
  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied" }));
    if (status !== "granted") { setPickupLabel("Drag the map to your pickup point"); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (!pos) { setPickupLabel("Drag the map to your pickup point"); return; }
    const at = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setMe(at); setPickup(at); setRecenter((n) => n + 1);
    label(at);
  };
  useEffect(() => { if (live) locate(); }, [live]);
  const label = (at: LatLng) => {
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      const r = await Location.reverseGeocodeAsync(at).catch(() => []);
      const a = r?.[0];
      setPickupLabel(a ? [a.name && a.name !== a.street ? a.name : null, a.street, a.district || a.subregion || a.city].filter(Boolean).join(", ") || "Pinned location" : "Pinned location");
    }, 500);
  };

  // ---------------------------------------------------------------- demo: a real road route, driven by a simulated car
  const [demoPhase, setDemoPhase] = useState<Phase>("request");
  const [t, setT] = useState(0);
  const [demoAccepted, setDemoAccepted] = useState<Set<string>>(new Set());
  const demoStart = useMemo(() => ({ lat: RIDE.route[0].latitude + 0.012, lng: RIDE.route[0].longitude - 0.018 }), []);
  const demoRoute = useRoute(live ? null : demoStart, live ? null : ll(RIDE.pickup));
  const demoCoords = demoRoute?.coords ?? RIDE.route.map((p) => [p.longitude, p.latitude] as [number, number]);
  const demoCar = useMemo(() => along(demoCoords, t), [t, demoCoords]);
  useEffect(() => {
    if (live || demoPhase !== "enroute") return;
    const iv = setInterval(() => {
      setT((x) => {
        const n = Math.min(1, x + 0.004);
        if (n >= 1) {
          clearInterval(iv);
          setTimeout(() => { setDemoPhase("arrived"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); confetti.current?.burst(undefined, 420, 90); }, 300);
        }
        return n;
      });
    }, 120);
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
  const carPt = live
    ? (driverPos ? { lat: driverPos.latitude, lng: driverPos.longitude, heading: driverPos.heading || undefined } : null)
    : phase === "enroute" || phase === "arrived" ? demoCar : null;
  // live road route: driver → pickup while they're coming, pickup → church once you're in the car
  const liveLeg = useRoute(live && phase === "enroute" && carPt ? carPt : live && (phase === "searching" || phase === "arrived") ? ll(ridePickup) : null,
    live && phase === "enroute" ? ll(ridePickup) : live && (phase === "searching" || phase === "arrived") ? { lat: church.coords.latitude, lng: church.coords.longitude } : null);
  const eta = live ? (phase === "enroute" && liveLeg ? liveLeg.minutes : null) : Math.max(1, Math.ceil((1 - t) * (demoRoute?.minutes ?? 7)));
  const driver = live ? ride?.driver : { full_name: RIDE.driver.name, phone: RIDE.driver.phone, vehicle: `${RIDE.driver.car} · ${RIDE.driver.plate}` };

  // ---------------------------------------------------------------- driver's own position (while sharing) + route to the rider
  const [myPos, setMyPos] = useState<LatLng | null>(null);
  const driving = live ? board.data.mine.find((r) => r.status !== "arrived") ?? board.data.mine[0] : null;
  const driveLeg = useRoute(mode === 1 && driving && myPos ? ll(myPos) : null, mode === 1 && driving ? { lat: driving.pickup_lat, lng: driving.pickup_lng } : null);

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
      setMyPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
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

  // ---------------------------------------------------------------- the map
  const pickMode = live && mode === 0 && phase === "request";
  const churchPt = { lat: church.coords.latitude, lng: church.coords.longitude };
  const churchMarker: MapMarker = { id: "church", kind: "church", ...churchPt, label: church.short === "Agape" ? "Agape International" : church.short || "Church" };
  let markers: MapMarker[] = [churchMarker];
  let route: { coords: [number, number][]; dashed?: boolean; color?: string } | null = null;
  let fit: { lat: number; lng: number }[] | undefined;
  let fitKey = "";
  if (mode === 0) {
    if (me && pickMode) markers.push({ id: "you", kind: "you", lat: me.latitude, lng: me.longitude });
    if (!pickMode) markers.push({ id: "pickup", kind: "pickup", ...ll(ridePickup)! });
    if (carPt) markers.push({ id: "car", kind: "car", lat: carPt.lat, lng: carPt.lng, heading: carPt.heading });
    if (live) {
      if (liveLeg) route = { coords: phase === "enroute" ? remaining(liveLeg, carPt) ?? liveLeg.coords : liveLeg.coords, dashed: !liveLeg.real, color: phase === "searching" ? "#8AB4F8" : undefined };
      fit = pickMode ? undefined : [ll(ridePickup)!, ...(carPt ? [carPt] : [churchPt])];
      fitKey = pickMode ? "" : `${ride?.id}:${phase}`;
    } else {
      route = { coords: phase === "enroute" ? remaining({ coords: demoCoords, minutes: 0, km: 0, real: true }, demoCar) ?? demoCoords : demoCoords };
      fit = [...demoCoords.map(([lng, lat]) => ({ lat, lng })), churchPt];
      fitKey = `demo:${demoCoords.length}`;
    }
  } else {
    const rows: { id: string; lat: number; lng: number; name: string; color: string; mine?: boolean }[] = live
      ? [...board.data.mine.map((r) => ({ id: r.id, lat: r.pickup_lat, lng: r.pickup_lng, name: r.member?.full_name || "Member", color: "#188038", mine: true })),
         ...board.data.open.map((r) => ({ id: r.id, lat: r.pickup_lat, lng: r.pickup_lng, name: r.member?.full_name || "Member", color: colorFor(r.member_id) }))]
      : RIDE.requests.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, name: r.name, color: r.color, mine: demoAccepted.has(r.id) }));
    rows.forEach((r) => markers.push({ id: `p:${r.id}`, kind: "person", lat: r.lat, lng: r.lng, letter: r.name, color: r.color, label: r.mine ? r.name.split(" ")[0] : undefined }));
    if (myPos) markers.push({ id: "me", kind: "car", lat: myPos.latitude, lng: myPos.longitude });
    if (driveLeg) route = { coords: driveLeg.coords, dashed: !driveLeg.real };
    fit = [...rows.map((r) => ({ lat: r.lat, lng: r.lng })), churchPt];
    fitKey = `drive:${rows.map((r) => r.id).join()}`;
  }
  const top = insets.top + (mode === 0 && phase === "enroute" && eta ? 190 : 118);

  return (
    <View style={{ flex: 1, backgroundColor: "#F2EFE9" }}>
      <StatusBar style="dark" />
      <LiveMap
        style={StyleSheet.absoluteFill}
        initial={{ lat: church.coords.latitude, lng: church.coords.longitude, zoom: 13 }}
        markers={markers}
        route={route}
        padding={{ top, bottom: sheetH + insets.bottom + 20, left: 10, right: 10 }}
        fit={fit} fitKey={fitKey}
        center={pickMode && me ? { lat: me.latitude, lng: me.longitude, zoom: 16 } : undefined} centerKey={pickMode ? `me:${recenter}` : undefined}
        follow={mode === 0 && carPt ? "car" : undefined}
        pick={pickMode}
        onCenter={(p) => { if (pickMode) { const at = { latitude: p.lat, longitude: p.lng }; setPickup(at); label(at); } }}
      />

      {/* top bar */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconButton name="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} bg="#fff" style={shadow(4, 10, 0.18)} />
          <View style={[{ flex: 1, height: 44, borderRadius: 22, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 }, shadow(4, 10, 0.18)]}>
            <Icon name="car-side" size={18} color="#188038" />
            <Body size={15.5} weight="semi" style={{ flex: 1 }} numberOfLines={1}>Ride ministry</Body>
            {sharingFor ? (<><LiveDot color="#188038" size={6} /><Body size={12} weight="bold" color="#188038">Sharing</Body></>) : null}
          </View>
          {pickMode ? <IconButton name="crosshair" onPress={locate} bg="#fff" color="#1A73E8" style={shadow(4, 10, 0.18)} label="My location" /> : null}
        </View>
        <View style={[{ borderRadius: R.pill, backgroundColor: "#fff" }, shadow(4, 10, 0.15)]}>
          <Segmented items={["I need a ride", "I'm driving"]} value={mode} onChange={setMode} accent={C.ink} />
        </View>
        {mode === 0 && phase === "enroute" && eta ? (
          <Animated.View entering={FadeInDown} style={[{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }, shadow(6, 14, 0.18)]}>
            <Body size={12} color={C.muted}>{live && ride?.status === "accepted" ? "Driver is" : "Arriving in"}</Body>
            <Display size={30} color="#188038">{live && ride?.status === "accepted" ? `${eta} min away` : `${eta} min`}</Display>
          </Animated.View>
        ) : null}
      </View>

      {/* bottom sheet */}
      <View onLayout={(e) => setSheetH(e.nativeEvent.layout.height)} style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10 }}>
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
