import React, { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/theme";
import { BackHeader, Body, Button, Confetti, ConfettiHandle, Icon } from "@/components/ui";
import { BooksRound, MemoryRound, QuizRound, Result, shuffle, VerseMatchRound } from "@/components/games";
import { gameTitle, GameId } from "@/lib/gamelist";
import { Q, useLocal, usePacks } from "@/lib/more";
import { useGames } from "@/lib/data";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const today = () => new Date().toISOString().slice(0, 10);
const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function Play() {
  const { game, kids } = useLocalSearchParams<{ game: GameId; kids?: string }>();
  const isKids = kids === "1";
  const insets = useSafeAreaInsets();
  const { addScore } = useStore();
  const packs = usePacks();
  const verses = useGames().verses;
  const [best, setBest] = useLocal<Record<string, number>>("game_best", {});
  const [daily, setDaily] = useLocal<Record<string, number>>("game_daily", {});
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ points: number; summary: string; best: number } | null>(null);
  const confetti = useRef<ConfettiHandle>(null);

  const questions: Q[] = useMemo(() => {
    const n = 10;
    if (game === "trivia") return shuffle(isKids ? packs.kidsTrivia : packs.trivia).slice(0, n);
    if (game === "who_said") return shuffle(packs.who_said).slice(0, n);
    if (game === "emoji") return shuffle(packs.emoji).slice(0, n);
    if (game === "true_false") return shuffle(isKids ? packs.kidsTF : packs.true_false);
    if (game === "daily") {
      // everyone gets the same five today
      const pool = [...packs.trivia, ...packs.who_said, ...packs.true_false, ...packs.emoji];
      return shuffle(pool, seedOf(today())).slice(0, 5);
    }
    return [];
  }, [game, round, isKids, packs.trivia.length > 0]);

  const done = (points: number, summary: string) => {
    const key = isKids ? `${game}:kids` : game;
    const prev = best[key] || 0;
    setBest((b) => ({ ...b, [key]: Math.max(prev, points) }));
    if (game === "daily") setDaily((d) => ({ ...d, [today()]: points }));
    addScore(game as any, points);
    if (points >= prev && points > 0) confetti.current?.burst(undefined, 260, 70);
    setResult({ points, summary, best: Math.max(prev, points) });
  };
  const again = () => { setResult(null); setRound((r) => r + 1); };
  const exit = () => (router.canGoBack() ? router.back() : router.replace((isKids ? "/kids" : "/games") as any));
  const playedDaily = game === "daily" && daily[today()] !== undefined && !result;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={gameTitle(game)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {playedDaily ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 24, alignItems: "center", gap: 8 }}>
            <Icon name="check-circle" size={30} color="#16A37B" />
            <Body weight="semi" size={18}>{t("You've played today's challenge")}</Body>
            <Body color={C.muted} center>{t("You scored {n}. A new one unlocks tomorrow.", { n: daily[today()] })}</Body>
            <Button label={t("Back to games")} variant="tonal" onPress={exit} style={{ marginTop: 10 }} />
          </View>
        ) : result ? (
          <Result {...result} onAgain={game === "daily" ? undefined : again} onExit={exit} daily={game === "daily"} />
        ) : (
          <View key={round}>
            {game === "verse_match" ? <VerseMatchRound verses={verses} onDone={done} />
              : game === "books_order" ? <BooksRound onDone={done} kids={isKids} />
              : game === "memory" ? <MemoryRound onDone={done} kids={isKids} />
              : questions.length ? <QuizRound questions={questions} onDone={done} timed={game === "true_false" ? 60 : undefined} accent={game === "daily" ? C.flame : C.violet} big={isKids} />
              : <Body center color={C.muted}>{t("Loading questions…")}</Body>}
          </View>
        )}
      </ScrollView>
      <Confetti ref={confetti} />
    </View>
  );
}
