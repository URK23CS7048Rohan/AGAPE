import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, IMG } from "@/theme";
import { Bar, Body, Button, Icon, Label, LargeTitle, Press, SectionTitle, Tile } from "@/components/ui";
import { ShareCard } from "@/components/ShareCard";
import { PlanCard } from "@/components/PlanCard";
import { book, lastPosition, parseRef, passage, Position, refLabel, translation, useBookNames, verseOfDay } from "@/lib/bible";
import { planToday, usePlanProgress, usePlans, Plan } from "@/lib/more";
import { useStore, streakOf } from "@/lib/store";
import { langInfo, t } from "@/lib/i18n";

export default function BibleTab() {
  const insets = useSafeAreaInsets();
  const { settings, activeDays } = useStore();
  const tr = settings.bible || langInfo().bible;
  const names = useBookNames(tr);
  const [pos, setPos] = useState<Position | null>(null);
  useFocusEffect(React.useCallback(() => { lastPosition(tr).then(setPos); }, [tr]));
  const votd = verseOfDay();
  const [vText, setVText] = useState("");
  useEffect(() => { passage(tr, votd).then(setVText).catch(() => setVText("")); }, [tr]);
  const [share, setShare] = useState(false);
  const plans = usePlans().data;
  const { progress } = usePlanProgress();
  const mine = plans.filter((p) => progress[p.id]);
  const streak = streakOf(activeDays);
  const T = translation(pos?.tr || tr);
  const open = (q: string) => router.push(q as any);

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}>
        <LargeTitle label={streak > 1 ? t("{n}-day streak", { n: streak }) : t("Read · Listen · Grow")} title={t("Bible")} right={
          <Press onPress={() => open(`/bible/read?tr=${tr}`)} style={{ height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(15,11,18,0.06)", justifyContent: "center" }}>
            <Body weight="semi" size={13.5}>{translation(tr).short}</Body>
          </Press>
        } />

        {/* Continue reading */}
        <Press onPress={() => open(`/bible/read?b=${pos?.book || 43}&c=${pos?.chapter || 1}&tr=${pos?.tr || tr}`)} scaleTo={0.985} style={{ marginHorizontal: 16, marginTop: 18, borderRadius: 18, overflow: "hidden", backgroundColor: C.ink }}>
          <Image source={IMG.bibleDark} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.45 }} contentFit="cover" />
          <View style={{ padding: 18, gap: 4 }}>
            <Label color={C.creamMuted}>{t("Continue reading")}</Label>
            <Body style={{ fontFamily: F.displayBold, fontSize: 28, lineHeight: 34, color: C.cream }}>{pos ? `${names[pos.book] || book(pos.book).name} ${pos.chapter}` : "…"}</Body>
            <Body size={13} color={C.creamMuted}>{T.name}</Body>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Button small label={t("Read")} variant="white" icon="book-open" onPress={() => open(`/bible/read?b=${pos?.book || 43}&c=${pos?.chapter || 1}&tr=${pos?.tr || tr}`)} />
              <Button small label={t("Listen")} variant="glass" icon="headphones" onPress={() => open(`/bible/read?b=${pos?.book || 43}&c=${pos?.chapter || 1}&tr=${pos?.tr || tr}&audio=1`)} />
            </View>
          </View>
        </Press>

        {/* Verse of the day */}
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 18, padding: 18 }}>
          <Label>{t("Verse of the day")}</Label>
          <Body style={{ fontFamily: F.serif, fontSize: 21, lineHeight: 29, marginTop: 10, textAlign: T.rtl ? "right" : "left" }}>{vText ? `“${vText}”` : "…"}</Body>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Body weight="semi" color={C.flame} style={{ flex: 1 }}>{refLabel(votd, names)}</Body>
            <Press onPress={() => setShare(true)} hitSlop={8} style={{ padding: 6 }} label={t("Share as image")}><Icon name="image" size={19} /></Press>
            <Press onPress={() => open(`/bible/read?b=${votd.book}&c=${votd.chapter}&v=${votd.from || 1}&tr=${tr}`)} hitSlop={8} style={{ padding: 6 }} label={t("Read chapter")}><Icon name="book-open" size={19} /></Press>
          </View>
        </View>

        {/* Tools */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 12 }}>
          <Tile style={{ width: "31.5%" }} icon="calendar" color={C.flame} label={t("Plans")} sub={t("{n} plans", { n: plans.length })} onPress={() => open("/plans")} />
          <Tile style={{ width: "31.5%" }} icon="headphones" color={C.violet} label={t("Audio")} sub={t("Listen")} onPress={() => open(`/bible/read?b=${pos?.book || 43}&c=${pos?.chapter || 1}&tr=${tr}&audio=1`)} />
          <Tile style={{ width: "31.5%" }} icon="edit-3" color="#16A37B" label={t("Journal")} sub={t("Private")} onPress={() => open("/journal")} />
          <Tile style={{ width: "31.5%" }} icon="bookmark" color={C.rose} label={t("Saved")} sub={t("Highlights")} onPress={() => open("/bible/marks")} />
          <Tile style={{ width: "31.5%" }} icon="award" color="#2F7DE1" label={t("Courses")} sub={t("Institute")} onPress={() => open("/learn")} />
          <Tile style={{ width: "31.5%" }} icon="music-clef-treble" color="#B7791F" label={t("Songs")} sub={t("With chords")} onPress={() => open("/songs")} />
        </View>

        {/* My plans */}
        {mine.length ? (
          <View style={{ marginTop: 30 }}>
            <SectionTitle title={t("My plans")} action={t("All plans")} onAction={() => open("/plans")} />
            <View style={{ marginHorizontal: 16, gap: 10 }}>
              {mine.map((p) => {
                const pr = progress[p.id];
                const day = planToday(pr, p.days.length);
                return (
                  <Press key={p.id} onPress={() => open(`/plans/day?slug=${p.slug}&d=${day}`)} scaleTo={0.985} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 10 }}>
                    <Image source={p.image} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Body weight="semi" numberOfLines={1}>{p.title}</Body>
                      <Body size={13} color={C.muted} numberOfLines={1}>{t("Day {d} of {n}", { d: day, n: p.days.length })} · {p.days[day - 1]?.title}</Body>
                      <Bar progress={pr.done.length / Math.max(1, p.days.length)} color={p.color} height={5} />
                    </View>
                    <Icon name="chevron-right" size={18} color="rgba(15,11,18,0.3)" />
                  </Press>
                );
              })}
            </View>
          </View>
        ) : null}

        <PlanRow title={t("Reading plans")} plans={plans.filter((p) => p.audience === "adults" && !progress[p.id])} />
        <PlanRow title={t("For teens")} plans={plans.filter((p) => p.audience === "teens" && !progress[p.id])} />
        <PlanRow title={t("For kids")} plans={plans.filter((p) => p.audience === "kids" && !progress[p.id])} />
      </ScrollView>
      <ShareCard visible={share} onClose={() => setShare(false)} text={vText} reference={`${refLabel(votd, names)} · ${translation(tr).short}`} rtl={translation(tr).rtl} />
    </View>
  );
}

function PlanRow({ title, plans }: { title: string; plans: Plan[] }) {
  if (!plans.length) return null;
  return (
    <View style={{ marginTop: 30 }}>
      <SectionTitle title={title} action={t("See all")} onAction={() => router.push("/plans" as any)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {plans.map((p) => <PlanCard key={p.id} p={p} />)}
      </ScrollView>
    </View>
  );
}
