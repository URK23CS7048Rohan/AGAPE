import React, { useRef, useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { C, IMG, R, onColor } from "@/theme";
import { Body, Button, Confetti, ConfettiHandle, Display, Empty, ErrorBox, Icon, IconButton, Label, Loading, Press, Ring, Sticker } from "@/components/ui";
import { useAuth, useNeedsAccount } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { imageSource } from "@/lib/content";
import { completedLessons, completeLesson, Lesson, listCourses } from "@/lib/api";

const KIND_ICON = { video: "play", pdf: "file-text", quiz: "help-circle" } as const;

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const courses = useQuery("courses", listCourses);
  const doneQ = useQuery(signedIn ? "progress:lessons" : null, completedLessons);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confetti = useRef<ConfettiHandle>(null);
  const c = courses.data?.find((x) => x.id === id);

  if (!c) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 60 }}>
        {courses.loading ? <Loading label="Loading course…" /> : courses.error ? <ErrorBox error={courses.error} onRetry={courses.reload} /> : <Empty icon="book" title="This course isn't available" action="Back" onAction={() => router.back()} />}
        <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}><IconButton name="arrow-left" onPress={() => router.back()} /></View>
      </View>
    );
  }

  const color = c.color || C.violet;
  const fg = onColor(color);
  const isDone = (l: Lesson) => !!doneQ.data?.has(l.id);
  const done = c.lessons.filter(isDone).length;
  const nextIdx = c.lessons.findIndex((l) => !isDone(l));
  const pct = c.lessons.length ? done / c.lessons.length : 0;
  const finished = c.lessons.length > 0 && done >= c.lessons.length;

  const complete = async (l: Lesson) => {
    if (needs("track your progress")) return;
    setBusy(true);
    try {
      await completeLesson(l.id);
      await doneQ.reload();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      confetti.current?.burst(undefined, 300, done + 1 >= c.lessons.length ? 90 : 36);
      setOpen(null);
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: color, paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl }}>
          <View style={{ height: 200, borderRadius: 22, overflow: "hidden", borderWidth: 3, borderColor: C.ink }}>
            <Image source={imageSource(c.cover_url, IMG.institute)} style={{ flex: 1 }} contentFit="cover" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Label color={fg} style={{ opacity: 0.85 }}>{[c.category, `${c.lessons.length} lessons`].filter(Boolean).join(" · ")}</Label>
              <Display size={30} color={fg} style={{ marginTop: 2 }}>{c.title}</Display>
            </View>
            {signedIn ? (
              <View style={{ backgroundColor: "#fff", borderRadius: 50, padding: 4 }}>
                <Ring size={76} stroke={7} progress={pct} color={C.ink}>
                  <Display size={20}>{Math.round(pct * 100)}%</Display>
                </Ring>
              </View>
            ) : null}
          </View>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", right: 10, top: insets.top + 40 }}>
          <Sticker top={`${c.lessons.length}`} bottom="lessons" bg={color === C.sun ? C.flame : C.sun} size={78} />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {c.description ? <Body size={15.5} color={C.muted} style={{ marginTop: 18, lineHeight: 23, paddingHorizontal: 4 }}>{c.description}</Body> : null}

          <Display size={22} style={{ marginTop: 24, marginBottom: 12, paddingHorizontal: 4 }}>Lessons</Display>
          {c.lessons.length === 0 ? <Empty icon="list" title="Lessons coming soon" /> : null}
          <View style={{ gap: 8 }}>
            {c.lessons.map((l, i) => {
              const d = isDone(l);
              const now = signedIn ? i === nextIdx : i === 0;
              const locked = signedIn && !d && !now;
              const expanded = open === l.id;
              return (
                <Animated.View key={l.id} entering={FadeInDown.delay(i * 50).springify().damping(16)}>
                  <Press
                    onPress={() => (locked ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}) : setOpen(expanded ? null : l.id))}
                    scaleTo={now ? 0.97 : 0.99}
                    style={{ padding: 12, borderRadius: R.md, backgroundColor: now ? color : "#fff", borderWidth: 1.5, borderColor: now ? C.ink : C.line, opacity: locked ? 0.6 : 1 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: d ? C.mint : now ? C.ink : C.bg }}>
                        {d ? <Animated.View entering={ZoomIn.springify()}><Icon name="check" size={18} color="#fff" /></Animated.View> : <Icon name={locked ? "lock" : KIND_ICON[l.kind] ?? "play"} size={16} color={now ? "#fff" : C.muted} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body weight="semi" color={now ? fg : C.ink}>{l.title}</Body>
                        <Label color={now ? fg : C.muted}>{[l.kind.toUpperCase(), l.minutes ? `${l.minutes} min` : null].filter(Boolean).join(" · ")}</Label>
                      </View>
                      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} color={now ? fg : C.muted} />
                    </View>
                    {expanded ? (
                      <Animated.View entering={FadeIn} style={{ marginTop: 12, gap: 10 }}>
                        {l.body ? <Body size={15} color={now ? fg : C.ink} style={{ lineHeight: 22 }}>{l.body}</Body> : null}
                        {l.url ? <Button label={l.kind === "pdf" ? "Open the study guide" : l.kind === "video" ? "Watch the lesson" : "Open"} icon={KIND_ICON[l.kind] ?? "external-link"} variant="white" small block onPress={() => Linking.openURL(l.url!)} /> : null}
                        {!d ? <Button label={busy ? "Saving…" : "Mark as complete"} icon="check" trail={null} variant="ink" small block disabled={busy} onPress={() => complete(l)} /> : <Label color={now ? fg : C.muted}>Completed ✓</Label>}
                      </Animated.View>
                    ) : null}
                  </Press>
                </Animated.View>
              );
            })}
          </View>
          {finished ? (
            <Animated.View entering={FadeInDown} style={{ marginTop: 18, padding: 18, borderRadius: R.lg, backgroundColor: C.sun }}>
              <Display size={24}>Course complete! 🎉</Display>
              <Body style={{ marginTop: 4 }}>Well done. Speak to the Agape Institute team about your certificate.</Body>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}>
        <IconButton name="arrow-left" onPress={() => router.back()} />
      </View>
      {!finished && c.lessons.length ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
          {signedIn ? (
            <Button label={`${done === 0 ? "Start" : "Continue"}: ${c.lessons[Math.max(0, nextIdx)].title}`} icon="play" variant="ink" block onPress={() => setOpen(c.lessons[Math.max(0, nextIdx)].id)} />
          ) : (
            <Button label="Sign in to take this course" icon="log-in" variant="ink" block onPress={() => router.push("/auth")} />
          )}
        </View>
      ) : null}
      <Confetti ref={confetti} />
    </View>
  );
}
