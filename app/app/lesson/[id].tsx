import React, { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { C, R } from "@/theme";
import { BackHeader, Body, Button, Confetti, ConfettiHandle, Display, Icon, Label, Press } from "@/components/ui";
import { YouTube } from "@/components/YouTube";
import { useCourses } from "@/lib/data";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const KIND = { video: { icon: "play", label: "Video" }, pdf: { icon: "file-text", label: "Study guide" }, quiz: { icon: "help-circle", label: "Quiz" } } as const;

/** One lesson: watch the video / read the guide / take the quiz, then mark it complete. */
export default function LessonScreen() {
  const { id, course } = useLocalSearchParams<{ id: string; course?: string }>();
  const { courses } = useCourses();
  const { done, completeLesson } = useStore();
  const insets = useSafeAreaInsets();
  const confetti = useRef<ConfettiHandle>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [playing, setPlaying] = useState(false);
  const c = courses.find((x) => x.id === course) ?? courses.find((x) => x.lessons.some((l) => l.id === id));
  const idx = c ? c.lessons.findIndex((l) => l.id === id) : -1;
  const l = c && idx > -1 ? c.lessons[idx] : null;
  if (!c || !l) return <View style={{ flex: 1, backgroundColor: C.lilac }}><BackHeader title={t("Lesson")} /></View>;

  const isDone = done.has(l.id);
  const quiz = l.quiz || [];
  const answered = Object.keys(answers).length;
  const correct = quiz.filter((q, i) => answers[i] === q.answer).length;
  const quizFinished = quiz.length > 0 && answered === quiz.length;
  const canComplete = l.kind !== "quiz" || quiz.length === 0 || quizFinished;
  const next = c.lessons[idx + 1];

  const finish = () => {
    if (!isDone) completeLesson(l.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const last = c.lessons.every((x) => x.id === l.id || done.has(x.id));
    confetti.current?.burst(undefined, 320, last ? 110 : 50);
    setTimeout(() => (next ? router.replace(`/lesson/${next.id}?course=${c.id}`) : router.back()), last ? 1600 : 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.lilac }}>
      <BackHeader title={`${c.title} ${c.accent}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* media */}
        {l.kind === "video" ? (
          <View style={{ marginHorizontal: 16, height: 210, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.ink }}>
            {playing && l.youtubeId ? (
              <YouTube embed={`https://www.youtube.com/embed/${l.youtubeId}?autoplay=1&playsinline=1&rel=0`} />
            ) : (
              <Press onPress={() => (l.youtubeId ? setPlaying(true) : null)} scaleTo={0.98} style={{ flex: 1 }}>
                <Image source={c.image} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
                <LinearGradient colors={["rgba(15,11,18,0.2)", "rgba(15,11,18,0.85)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: l.youtubeId ? C.flame : "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={l.youtubeId ? "play" : "clock"} size={28} color="#fff" />
                  </View>
                  {!l.youtubeId ? <Body size={13} color="#fff" style={{ marginTop: 10 }}>{t("Video coming soon")}</Body> : null}
                </View>
              </Press>
            )}
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(500)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 28, borderRadius: R.pill, backgroundColor: c.color }}>
              <Icon name={KIND[l.kind].icon} size={13} color="#fff" />
              <Body size={12} weight="bold" color="#fff">{t(KIND[l.kind].label)}</Body>
            </View>
            <Label>{t("Lesson {i} of {n}", { i: idx + 1, n: c.lessons.length })}{l.minutes ? ` · ${t("{n} min", { n: l.minutes })}` : ""}</Label>
          </View>
          <Display size={34} style={{ marginTop: 12 }}>{l.title}</Display>
          {isDone ? <Animated.View entering={ZoomIn} style={{ alignSelf: "flex-start", marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.mint, paddingHorizontal: 12, height: 30, borderRadius: R.pill }}><Icon name="check" size={14} color={C.ink} /><Body size={12.5} weight="bold">{t("Completed")}</Body></Animated.View> : null}
          {l.body ? <Body size={16} style={{ marginTop: 16, lineHeight: 25 }}>{l.body}</Body> : null}

          {l.kind === "pdf" ? (
            <Press onPress={() => (l.pdfUrl ? WebBrowser.openBrowserAsync(l.pdfUrl) : null)} style={{ marginTop: 18, padding: 18, borderRadius: R.lg, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.color, alignItems: "center", justifyContent: "center" }}><Icon name="file-text" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Body weight="semi">{l.pdfUrl ? t("Open the study guide") : t("Study guide coming soon")}</Body>
                <Body size={13} color={C.muted}>{l.pdfUrl ? t("PDF · opens in your browser") : t("The Institute team is uploading it")}</Body>
              </View>
              {l.pdfUrl ? <Icon name="arrow-up-right" size={18} color={C.ink} /> : null}
            </Press>
          ) : null}

          {l.kind === "quiz" && quiz.length ? (
            <View style={{ marginTop: 18, gap: 14 }}>
              {quiz.map((q, qi) => {
                const picked = answers[qi];
                return (
                  <Animated.View key={qi} entering={FadeInDown.delay(qi * 80)} style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 16 }}>
                    <Label>{t("Question {n}", { n: qi + 1 })}</Label>
                    <Body size={17} weight="semi" style={{ marginTop: 6 }}>{q.prompt}</Body>
                    <View style={{ gap: 8, marginTop: 12 }}>
                      {q.options.map((o, oi) => {
                        const state = picked === undefined ? "idle" : oi === q.answer ? "right" : oi === picked ? "wrong" : "dim";
                        return (
                          <Press key={oi} onPress={() => { if (picked !== undefined) return; setAnswers((a) => ({ ...a, [qi]: oi })); Haptics.notificationAsync(oi === q.answer ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {}); }}
                            style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: state === "right" ? C.mint : state === "wrong" ? C.rose : "#F4F1EC", opacity: state === "dim" ? 0.5 : 1 }}>
                            <Body weight="semi" color={state === "wrong" ? "#fff" : C.ink} style={{ flex: 1 }}>{o}</Body>
                            {state === "right" ? <Icon name="check" size={16} /> : state === "wrong" ? <Icon name="x" size={16} color="#fff" /> : null}
                          </Press>
                        );
                      })}
                    </View>
                  </Animated.View>
                );
              })}
              {quizFinished ? (
                <Animated.View entering={FadeIn} style={{ padding: 18, borderRadius: R.lg, backgroundColor: C.ink }}>
                  <Display size={28} color={C.cream}>{correct === quiz.length ? t("{c} of {n}, perfect!", { c: correct, n: quiz.length }) : t("{c} of {n} right", { c: correct, n: quiz.length })}</Display>
                  <Body color={C.creamMuted} style={{ marginTop: 4 }}>{correct === quiz.length ? t("Beautifully done.") : t("Good effort. Review the lesson any time.")}</Body>
                </Animated.View>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
        <Button
          label={isDone ? (next ? t("Next: {title}", { title: next.title }) : t("Back to the course")) : canComplete ? t("Mark as complete") : t("Answer all {n} questions", { n: quiz.length })}
          icon={isDone ? "arrow-right" : "check"} variant="ink" block disabled={!canComplete}
          onPress={() => (isDone ? (next ? router.replace(`/lesson/${next.id}?course=${c.id}`) : router.back()) : finish())}
        />
      </View>
      <Confetti ref={confetti} />
    </View>
  );
}
