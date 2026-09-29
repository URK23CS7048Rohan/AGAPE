import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Extrapolation, FadeInDown, ZoomIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { C, R } from "@/theme";
import { Body, Button, Confetti, ConfettiHandle, Display, Icon, IconButton, Label, Press, Ring, Serif } from "@/components/ui";
import { COURSES } from "@/data/mock";
import { useStore } from "@/lib/store";
import { completeLesson } from "@/lib/api";

const KIND_ICON = { video: "play", pdf: "file-text", quiz: "help-circle" } as const;

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = COURSES.find((x) => x.id === id) ?? COURSES[0];
  const insets = useSafeAreaInsets();
  const { progress, completeNext } = useStore();
  const done = progress[c.id] ?? 0;
  const confetti = useRef<ConfettiHandle>(null);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const hero = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(y.value, [-200, 0, 300], [-100, 0, 120], Extrapolation.CLAMP) }, { scale: interpolate(y.value, [-200, 0], [1.5, 1], Extrapolation.CLAMP) }] }));
  const pct = done / c.lessons.length;

  const complete = () => {
    completeLesson(c.lessons[Math.min(done, c.lessons.length - 1)].id);
    completeNext(c.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    confetti.current?.burst(undefined, 300, done + 1 >= c.lessons.length ? 90 : 36);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.lilac }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 340, overflow: "hidden" }}>
          <Animated.View style={[StyleSheet.absoluteFill, hero]}>
            <Image source={c.image} style={{ flex: 1 }} contentFit="cover" />
          </Animated.View>
          <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent", C.lilac]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: -60 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Label>{c.category} · {c.lessons.length} lessons</Label>
              <Display size={50} style={{ marginTop: 6, lineHeight: 48 }}>{c.title}{"\n"}<Serif size={54} color={c.color}>{c.accent}</Serif></Display>
            </View>
            <Ring size={86} stroke={8} progress={pct} color={c.color} track="rgba(15,11,18,0.08)">
              <Display size={24}>{Math.round(pct * 100)}%</Display>
            </Ring>
          </View>
          <Body size={15.5} color={C.muted} style={{ marginTop: 14, lineHeight: 23 }}>{c.description}</Body>

          <Label style={{ marginTop: 26, marginBottom: 10 }}>Module 1 · Lessons</Label>
          <View style={{ gap: 8 }}>
            {c.lessons.map((l, i) => {
              const isDone = i < done;
              const isNow = i === done;
              return (
                <Animated.View key={l.id} entering={FadeInDown.delay(i * 60).springify().damping(16)}>
                  <Press
                    onPress={() => (isNow ? complete() : isDone ? null : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}))}
                    scaleTo={isNow ? 0.97 : 0.99}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: R.md, backgroundColor: "#fff", borderWidth: isNow ? 2 : 0, borderColor: c.color, opacity: !isDone && !isNow ? 0.6 : 1 }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isDone ? C.mint : isNow ? c.color : "#ECE8F2" }}>
                      {isDone ? (
                        <Animated.View entering={ZoomIn.springify()}><Icon name="check" size={18} color="#fff" /></Animated.View>
                      ) : (
                        <Icon name={isNow ? KIND_ICON[l.kind] : "lock"} size={16} color={isNow ? "#fff" : "#9A93A6"} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body weight="semi">{l.title}</Body>
                      <Body size={12.5} color={C.muted}>{l.kind.toUpperCase()} · {l.minutes} min</Body>
                    </View>
                    {isNow ? <Body size={12} weight="bold" color={c.color}>START</Body> : null}
                  </Press>
                </Animated.View>
              );
            })}
          </View>
          {done >= c.lessons.length ? (
            <Animated.View entering={FadeInDown} style={{ marginTop: 20, padding: 20, borderRadius: R.lg, backgroundColor: C.ink }}>
              <Display size={30} color={C.cream}>Course <Serif size={32} color={C.sun}>complete!</Serif></Display>
              <Body color={C.creamMuted} style={{ marginTop: 6 }}>Well done. Your certificate has been added to your profile.</Body>
            </Animated.View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}>
        <IconButton name="chevron-left" onPress={() => router.back()} bg="rgba(255,255,255,0.92)" />
      </View>
      {done < c.lessons.length ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
          <Button label={done === 0 ? "Start course" : `Complete: ${c.lessons[done].title}`} variant="ink" block onPress={complete} />
        </View>
      ) : null}
      <Confetti ref={confetti} />
    </View>
  );
}
