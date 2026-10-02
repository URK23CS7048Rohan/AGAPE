import React, { useState } from "react";
import { Linking, RefreshControl, ScrollView, Share, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { C, R, onColor } from "@/theme";
import { Async, BackHeader, Body, Button, Display, Empty, Icon, Label, Press, Starburst } from "@/components/ui";
import { imageSource } from "@/lib/content";
import { useQuery } from "@/lib/query";
import { listPosts, MinistryKey, when } from "@/lib/life";
import { say, hush } from "@/lib/audio";
import { t } from "@/lib/i18n";

const META: Record<MinistryKey, { title: string; sub: string; color: string; icon: string }> = {
  kids: { title: "Kids", sub: "Bible stories, memory verses and things to make and do", color: C.sun, icon: "star" },
  teens: { title: "Teens", sub: "Real talk, challenges and a verse for the week", color: C.violet, icon: "zap" },
  squad: { title: "Agape Squad", sub: "Our kids & teens worship team", color: C.rose, icon: "music-note" },
};
const KIND_LABEL: Record<string, string> = { verse: "Memory verse", story: "Bible story", activity: "Make & do", challenge: "Challenge", post: "Post", event: "Coming up", video: "Watch" };

export default function Ministry() {
  const { key } = useLocalSearchParams<{ key: MinistryKey }>();
  const k = (["kids", "teens", "squad"].includes(String(key)) ? key : "kids") as MinistryKey;
  const meta = META[k];
  const q = useQuery(`ministry:${k}`, () => listPosts(k));
  const [open, setOpen] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title={meta.title} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
        <View style={{ backgroundColor: meta.color, borderRadius: R.xl, padding: 20, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -16, top: -16 }}><Starburst size={116} color="#fff" spikes={12} depth={0.65} spin><Icon name={meta.icon} size={30} /></Starburst></View>
          <Display size={34} color={onColor(meta.color)}>{meta.title}</Display>
          <Body size={14} color={onColor(meta.color)} style={{ marginTop: 4, maxWidth: "70%" }}>{meta.sub}</Body>
        </View>
        <Async q={q} empty={(d) => (d.length ? null : <Empty icon="star" title={t("Nothing here yet")} body={t("The team will post stories, verses and news here.")} />)}>
          {(list) => list.map((p, i) => {
            const isOpen = open === p.id || p.kind === "verse";
            const tint = p.color || [C.sunSoft, C.mintSoft, C.lilac, C.roseSoft, C.skySoft][i % 5];
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
                <Press onPress={() => setOpen(open === p.id ? null : p.id)} scaleTo={0.99} style={{ backgroundColor: p.kind === "verse" ? C.ink : "#fff", borderRadius: R.lg, overflow: "hidden", borderWidth: p.kind === "verse" ? 0 : 1.5, borderColor: C.line }}>
                  {p.image && p.kind !== "verse" ? <Image source={imageSource(p.image)} style={{ height: 150 }} contentFit="cover" /> : null}
                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ backgroundColor: p.kind === "verse" ? C.sun : tint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Label size={11} color={C.ink}>{KIND_LABEL[p.kind] || p.kind}</Label></View>
                      {p.pinned ? <Icon name="bookmark" size={13} color={p.kind === "verse" ? C.sun : C.flame} /> : null}
                      <View style={{ flex: 1 }} />
                      {p.starts_at ? <Label>{when(p.starts_at)}</Label> : null}
                    </View>
                    <Body weight="bold" size={18} color={p.kind === "verse" ? "#fff" : C.ink} style={{ marginTop: 8 }}>{p.title}</Body>
                    {p.body ? <Body color={p.kind === "verse" ? "rgba(255,255,255,0.9)" : C.ink} style={{ marginTop: 6, lineHeight: 22 }} numberOfLines={isOpen ? undefined : 3}>{p.body}</Body> : null}
                    {p.ref ? <Label color={p.kind === "verse" ? C.sun : C.flame} style={{ marginTop: 8 }}>{p.ref}</Label> : null}
                    {isOpen ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {p.body && (p.kind === "story" || p.kind === "verse") ? <Button small variant={p.kind === "verse" ? "sun" : "white"} icon={reading === p.id ? "square" : "volume-2"} trail={null} label={reading === p.id ? t("Stop") : t("Read it to me")} onPress={() => { if (reading === p.id) { hush(); setReading(null); } else { setReading(p.id); say(`${p.title}. ${p.body}`, "en-US", 0.95, () => setReading(null)); } }} /> : null}
                        {p.youtube_id ? <Button small variant="ink" icon="play" trail={null} label={t("Watch")} onPress={() => Linking.openURL(`https://youtu.be/${p.youtube_id}`)} /> : null}
                        {p.link ? <Button small variant="white" label={t("Open")} onPress={() => (p.link!.startsWith("/") ? router.push(p.link as any) : Linking.openURL(p.link!))} /> : null}
                        <Button small variant="white" icon="share-2" trail={null} label={t("Share")} onPress={() => Share.share({ message: `${p.title}\n\n${p.body || ""}${p.ref ? `\n${p.ref}` : ""}` })} />
                      </View>
                    ) : null}
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </Async>
        <Button label={`Find the ${meta.title} group chat`} variant="ink" icon="message-circle" block onPress={() => router.push("/community?tab=groups")} />
      </ScrollView>
    </View>
  );
}
