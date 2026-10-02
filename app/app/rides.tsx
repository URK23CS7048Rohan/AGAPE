import React, { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, R } from "@/theme";
import { Avatar, Body, Button, Chip, Confetti, ConfettiHandle, Display, Icon, IconButton, Label, LiveDot, Press, Segmented } from "@/components/ui";
import { CHURCH, DARK_MAP_STYLE, RIDE } from "@/data/mock";
import { pushRideLocation, requestRide } from "@/lib/api";

type Phase = "request" | "searching" | "enroute" | "arrived";
const TIMES = ["Sun 9:15 AM", "Sun 5:15 PM", "Wed 7:00 PM"];

/** Interpolates a point along a polyline, t ∈ [0,1]. */
function along(route: { latitude: number; longitude: number }[], t: number) {
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
      <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(60,141,94,0.3)" }, ring]} />
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
        <Icon name="car-side" size={26} color="#fff" />
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
  const [mode, setMode] = useState(0); // 0 = rider, 1 = volunteer
  const [phase, setPhase] = useState<Phase>("request");
  const [time, setTime] = useState(TIMES[0]);
  const [seats, setSeats] = useState(1);
  const [t, setT] = useState(0);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const map = useRef<MapView>(null);
  const confetti = useRef<ConfettiHandle>(null);
  const watchSub = useRef<Location.LocationSubscription | null>(null);

  const car = useMemo(() => along(RIDE.route, t), [t]);
  const eta = Math.max(1, Math.ceil((1 - t) * 7));

  // simulate the volunteer's live location feed (swap for subscribeRideLocation in production)
  useEffect(() => {
    if (phase !== "enroute") return;
    const iv = setInterval(() => {
      setT((x) => {
        const n = Math.min(1, x + 0.006);
        if (n >= 1) {
          clearInterval(iv);
          setTimeout(() => { setPhase("arrived"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); confetti.current?.burst(undefined, 420, 90); }, 300);
        }
        return n;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [phase]);

  const fit = () => map.current?.fitToCoordinates([...RIDE.route], { edgePadding: { top: 200, bottom: 420, left: 60, right: 60 }, animated: true });
  useEffect(() => { fit(); }, [mode]);

  useEffect(() => () => { watchSub.current?.remove(); }, []);

  const request = async () => {
    await requestRide({ pickup: RIDE.pickup.label, lat: RIDE.pickup.latitude, lng: RIDE.pickup.longitude, time, seats });
    setPhase("searching");
    setTimeout(() => { setT(0); setPhase("enroute"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, 2600);
  };

  const toggleSharing = async () => {
    if (sharing) { watchSub.current?.remove(); watchSub.current = null; setSharing(false); return; }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    // For screen-locked tracking, add expo-task-manager + Location.startLocationUpdatesAsync in a dev build (see README).
    watchSub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 15 }, (pos) => {
      pushRideLocation("current-ride", pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined);
    });
    setSharing(true);
  };

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
        showsPointsOfInterest={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {mode === 0 ? (
          <>
            <Polyline coordinates={RIDE.route} strokeColor="rgba(255,210,63,0.3)" strokeWidth={10} />
            <Polyline coordinates={phase === "enroute" ? [car, ...RIDE.route.slice(car.index + 1)] : RIDE.route} strokeColor={C.sun} strokeWidth={5} />
            <Marker coordinate={RIDE.pickup} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, borderWidth: 4, borderColor: C.sun }} />
            </Marker>
            <Marker coordinate={CHURCH.coords} anchor={{ x: 0.5, y: 1 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ backgroundColor: "#fff", paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: "center", marginBottom: 6 }}><Body size={11.5} weight="bold">Agape International</Body></View>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.flame, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}><Icon name="cross" size={17} color="#fff" /></View>
              </View>
            </Marker>
            {phase === "enroute" || phase === "arrived" ? (
              <Marker coordinate={car} anchor={{ x: 0.5, y: 0.5 }} flat rotation={car.heading}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,210,63,0.35)", alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.ink }} />
                  </View>
                </View>
              </Marker>
            ) : null}
          </>
        ) : (
          RIDE.requests.map((r) => (
            <Marker key={r.id} coordinate={{ latitude: r.lat, longitude: r.lng }}>
              <Avatar name={r.name} color={r.color} size={36} ring="#fff" />
            </Marker>
          ))
        )}
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
        {mode === 0 && phase === "enroute" ? (
          <Animated.View entering={FadeInDown} style={{ alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Body size={12} color={C.muted}>Arriving in</Body>
            <Display size={30}>{eta} min</Display>
          </Animated.View>
        ) : null}
      </View>

      {/* bottom sheet */}
      <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10 }}>
        {mode === 0 && phase === "request" ? (
          <Animated.View key="req" entering={FadeInUp.springify().damping(18)} style={sheet}>
            <Display size={28}>Need a ride?</Display>
            <Body size={14} color={C.muted} style={{ marginTop: 4 }}>A volunteer from the family will pick you up, for free.</Body>
            <View style={{ marginTop: 14, padding: 14, borderRadius: R.md, backgroundColor: C.bg, gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: C.mint }} />
                <View style={{ flex: 1 }}><Label size={10}>Pickup</Label><Body weight="semi">{RIDE.pickup.label} · current location</Body></View>
              </View>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.flame }} />
                <View style={{ flex: 1 }}><Label size={10}>Destination</Label><Body weight="semi">{CHURCH.address}</Body></View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {TIMES.map((x) => <Chip key={x} label={x} active={time === x} onPress={() => setTime(x)} />)}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <Body weight="semi">Passengers</Body>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <IconButton name="minus" size={38} bg={C.bg} onPress={() => setSeats((s) => Math.max(1, s - 1))} />
                <Display size={26}>{seats}</Display>
                <IconButton name="plus" size={38} bg={C.bg} onPress={() => setSeats((s) => Math.min(6, s + 1))} />
              </View>
            </View>
            <Button label="Request ride" icon="car-side" variant="ink" block onPress={request} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : null}

        {mode === 0 && phase === "searching" ? (
          <Animated.View key="search" entering={FadeInUp.springify()} style={sheet}>
            <Radar />
            <Display size={26} center style={{ marginTop: 10 }}>Finding a volunteer…</Display>
            <Body center color={C.muted} style={{ marginTop: 4 }}>64 drivers are serving this Sunday</Body>
          </Animated.View>
        ) : null}

        {mode === 0 && (phase === "enroute" || phase === "arrived") ? (
          <Animated.View key="enroute" entering={FadeInUp.springify().damping(18)} style={sheet}>
            {phase === "arrived" ? (
              <Animated.View entering={FadeIn}>
                <Display size={28}>You've arrived 🎉</Display>
                <Body color={C.muted} style={{ marginTop: 4, marginBottom: 12 }}>Welcome home! Service starts at 10:00 AM.</Body>
              </Animated.View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={RIDE.driver.name} color={C.mint} size={52} />
              <View style={{ flex: 1 }}>
                <Body weight="bold" size={17}>{RIDE.driver.name}</Body>
                <Body size={13} color={C.muted}>{RIDE.driver.car} · {RIDE.driver.plate}</Body>
              </View>
              <View style={{ backgroundColor: C.sunSoft, paddingHorizontal: 10, height: 30, borderRadius: 14, justifyContent: "center" }}><Body size={13} weight="bold">★ {RIDE.driver.rating}</Body></View>
            </View>
            {phase === "enroute" ? (
              <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.bg, overflow: "hidden" }}>
                  <View style={{ width: `${t * 100}%`, height: 8, backgroundColor: C.mint, borderRadius: 4 }} />
                </View>
                <Body size={13} weight="semi">{eta} min</Body>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Press onPress={() => Linking.openURL(`tel:${RIDE.driver.phone}`)} style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: C.bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="phone" size={17} /><Body weight="semi">Call</Body>
              </Press>
              <Press onPress={() => router.push("/chat/david")} style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon name="message-circle" size={17} color="#fff" /><Body weight="semi" color="#fff">Message</Body>
              </Press>
            </View>
            {phase === "arrived" ? <Button label="Book my ride home" variant="mint" block small onPress={() => { setPhase("request"); setT(0); }} style={{ marginTop: 10 }} /> : null}
          </Animated.View>
        ) : null}

        {mode === 1 ? (
          <Animated.View key="drive" entering={FadeInUp.springify().damping(18)} style={sheet}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Display size={24}>Ride requests</Display>
              <Press onPress={toggleSharing} style={{ paddingHorizontal: 12, height: 34, borderRadius: 14, backgroundColor: sharing ? C.mint : C.bg, flexDirection: "row", alignItems: "center", gap: 6 }}>
                {sharing ? <LiveDot color="#fff" size={6} /> : <Icon name="navigation" size={13} />}
                <Body size={12.5} weight="bold" color={sharing ? "#fff" : C.ink}>{sharing ? "Sharing" : "Share location"}</Body>
              </Press>
            </View>
            <View style={{ gap: 8, marginTop: 12 }}>
              {RIDE.requests.map((r, i) => {
                const on = accepted.has(r.id);
                return (
                  <Animated.View key={r.id} entering={FadeInDown.delay(i * 70)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: R.md, backgroundColor: C.bg }}>
                    <Avatar name={r.name} color={r.color} size={42} />
                    <View style={{ flex: 1 }}>
                      <Body weight="semi">{r.name}</Body>
                      <Body size={12.5} color={C.muted}>{r.pickup} · {r.time} · {r.seats} seat{r.seats > 1 ? "s" : ""}</Body>
                    </View>
                    {on ? (
                      <IconButton name="navigation" size={40} bg={C.ink} color={C.sun} onPress={() => openNavigation(r.lat, r.lng)} />
                    ) : (
                      <Press onPress={() => { setAccepted((s) => new Set(s).add(r.id)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }} style={{ paddingHorizontal: 14, height: 38, borderRadius: 14, backgroundColor: C.mint, justifyContent: "center" }}>
                        <Body size={13} weight="bold" color="#fff">Accept</Body>
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

const sheet = { backgroundColor: "#fff", borderRadius: 28, padding: 18, borderWidth: 2, borderColor: C.ink } as const;
