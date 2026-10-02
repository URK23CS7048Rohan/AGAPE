import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { C, R, onColor } from "@/theme";
import { Body, Button, Confetti, ConfettiHandle, Display, Icon, IconButton, Label, Press, Ring, Sticker } from "@/components/ui";
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
  const pct = done / c.lessons.length;
  const fg = onColor(c.color);

  const complete = () => {
    completeLesson(c.lessons[Math.min(done, c.lessons.length - 1)].id);
    completeNext(c.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    confetti.current?.burst(undefined, 300, done + 1 >= c.lessons.length ? 90 : 36);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: c.color, paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl }}>
          <View style={{ height: 200, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: C.ink }}>
            <Image source={c.image} style={{ flex: 1 }} contentFit="cover" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Label color={fg} style={{ opacity: 0.85 }}>{c.category} · {c.lessons.length} lessons</Label>
              <Display size={30} color={fg} style={{ marginTop: 2 }}>{c.title} {c.accent}</Display>
            </View>
            <View style={{ backgroundColor: "#fff", borderRadius: 50, padding: 4 }}>
              <Ring size={76} stroke={7} progress={pct} color={C.ink}>
                <Display size={20}>{Math.round(pct * 100)}%</Display>
              </Ring>
            </View>
          </View>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", right: 10, top: insets.top + 40 }}>
          <Sticker top={`${c.lessons.length}`} bottom="lessons" bg={c.color === C.sun ? C.flame : C.sun} size={78} />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Body size={15.5} color={C.muted} style={{ marginTop: 18, lineHeight: 23, paddingHorizontal: 4 }}>{c.description}</Body>

          <Display size={22} style={{ marginTop: 24, marginBottom: 12, paddingHorizontal: 4 }}>Module 1 · Lessons</Display>
          <View style={{ gap: 8 }}>
            {c.lessons.map((l, i) => {
              const isDone = i < done;
              const isNow = i === done;
              return (
                <Animated.View key={l.id} entering={FadeInDown.delay(i * 50).springify().damping(16)}>
                  <Press
                    onPress={() => (isNow ? complete() : isDone ? null : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}))}
                    scaleTo={isNow ? 0.97 : 0.99}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: R.md, backgroundColor: isNow ? c.color : "#fff", borderWidth: 1.5, borderColor: isNow ? C.ink : C.line, opacity: !isDone && !isNow ? 0.6 : 1 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isDone ? C.mint : isNow ? C.ink : C.bg }}>
                      {isDone ? (
                        <Animated.View entering={ZoomIn.springify()}><Icon name="check" size={18} color="#fff" /></Animated.View>
                      ) : (
                        <Icon name={isNow ? KIND_ICON[l.kind] : "lock"} size={16} color={isNow ? "#fff" : C.muted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body weight="semi" color={isNow ? fg : C.ink}>{l.title}</Body>
                      <Label color={isNow ? fg : C.muted}>{l.kind.toUpperCase()} · {l.minutes} min</Label>
                    </View>
                    {isNow ? <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, height: 26, justifyContent: "center" }}><Body size={12} weight="bold">Start</Body></View> : null}
                  </Press>
                </Animated.View>
              );
            })}
          </View>
          {done >= c.lessons.length ? (
            <Animated.View entering={FadeInDown} style={{ marginTop: 18, padding: 18, borderRadius: R.lg, backgroundColor: C.sun }}>
              <Display size={24}>Course complete! 🎉</Display>
              <Body style={{ marginTop: 4 }}>Well done. Your certificate has been added to your profile.</Body>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}>
        <IconButton name="arrow-left" onPress={() => router.back()} />
      </View>
      {done < c.lessons.length ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
          <Button label={done === 0 ? "Start course" : `Complete: ${c.lessons[done].title}`} icon="play" variant="ink" block onPress={complete} />
        </View>
      ) : null}
      <Confetti ref={confetti} />
    </View>
  );
}
