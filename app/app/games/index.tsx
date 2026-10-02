import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Avatar, BackHeader, Body, Chip, Empty, Icon, Label, Press } from "@/components/ui";
import { GAMES, gameTitle } from "@/lib/gamelist";
import { useLeaders, useLocal } from "@/lib/more";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/time";
import { t } from "@/lib/i18n";

const today = () => new Date().toISOString().slice(0, 10);

export default function GamesHub() {
  const insets = useSafeAreaInsets();
  const { session, live, firstName } = useStore();
  const [best] = useLocal<Record<string, number>>("game_best", {});
  const [daily] = useLocal<Record<string, number>>("game_daily", {});
  const [board, setBoard] = useState<string | null>(null);
  const leaders = useLeaders(board).data;
  const playedToday = daily[today()] !== undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Bible games")} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Daily challenge */}
        <Press onPress={() => router.push("/games/daily" as any)} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 4, borderRadius: 18, backgroundColor: C.ink, padding: 18, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="calendar" size={15} color={C.sun} />
            <Label color={C.sun}>{t("Daily Challenge")}</Label>
          </View>
          <Body style={{ fontFamily: F.displayBold, fontSize: 24, lineHeight: 29, color: C.cream }}>{playedToday ? t("Done for today — {n} points", { n: daily[today()] }) : t("5 questions. One try a day.")}</Body>
          <Body size={13.5} color={C.creamMuted}>{playedToday ? t("Come back tomorrow for a new daily challenge.") : t("Everyone in the church gets the same questions today.")}</Body>
        </Press>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 12 }}>
          {GAMES.map((g) => (
            <Press key={g.id} onPress={() => router.push(`/games/${g.id}` as any)} scaleTo={0.97} style={{ width: "48.4%", backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 10, minHeight: 132 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: g.color + "1F", alignItems: "center", justifyContent: "center" }}><Icon name={g.icon} size={19} color={g.color} /></View>
              <View style={{ flex: 1, justifyContent: "flex-end" }}>
                <Body weight="semi" size={15}>{g.title()}</Body>
                <Body size={12.5} color={C.muted} numberOfLines={2}>{g.sub()}</Body>
              </View>
              {best[g.id] ? <Body size={12} weight="semi" color={g.color}>{t("Best {n}", { n: best[g.id] })}</Body> : null}
            </Press>
          ))}
        </View>

        {/* Leaderboard */}
        <View style={{ marginHorizontal: 16, marginTop: 24, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
            <Body weight="semi" size={17} style={{ flex: 1 }}>{t("Leaderboard")}</Body>
            <Body size={13} color={C.muted}>{t("This week")}</Body>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
            <Chip label={t("All games")} active={!board} onPress={() => setBoard(null)} />
            {["daily", ...GAMES.map((g) => g.id)].map((id) => <Chip key={id} label={gameTitle(id)} active={board === id} onPress={() => setBoard(id)} />)}
          </ScrollView>
          {!live ? <Empty icon="award" title={t("Leaderboards are live when you sign in")} sub={t("Scores from everyone at Agape appear here.")} /> : null}
          {live && !leaders.length ? <Empty icon="award" title={t("No scores yet this week")} sub={session ? t("Play a round to top the board!") : t("Sign in to appear on the leaderboard.")} /> : null}
          {leaders.map((p, i) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: p.me ? "rgba(255,90,31,0.07)" : "transparent" }}>
              <Body weight="bold" color={i < 3 ? C.flame : C.muted} style={{ width: 22 }}>{i + 1}</Body>
              <Avatar name={p.me ? firstName || p.name : p.name} color={p.color} size={34} />
              <Body weight={p.me ? "bold" : "medium"} style={{ flex: 1 }}>{p.me ? `${p.name} (${t("you")})` : p.name}</Body>
              <Body weight="bold">{fmt(p.points)}</Body>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
