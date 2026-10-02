/** A post from the Kids / Teens / Squad feed: memory verse, story, video, event, challenge or activity. */
import React, { useState } from "react";
import { Modal, Platform, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "@/theme";
import { Body, Button, Icon, IconButton, Label, Press } from "./ui";
import { YouTube } from "./YouTube";
import { Post } from "@/lib/more";
import { say, hush } from "@/lib/audio";
import { dateLabel, t, timeLabel } from "@/lib/i18n";

const KIND: Record<string, { icon: string; label: () => string }> = {
  verse: { icon: "bookmark", label: () => t("Memory verse") },
  story: { icon: "book-open", label: () => t("Bible story") },
  video: { icon: "play-circle", label: () => t("Video") },
  event: { icon: "calendar", label: () => t("Event") },
  challenge: { icon: "target", label: () => t("Challenge") },
  activity: { icon: "scissors", label: () => t("Activity") },
  post: { icon: "message-square", label: () => t("Update") },
};

export function VideoModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!id} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 10 }}>
          <IconButton name="x" bg="rgba(255,255,255,0.15)" color="#fff" label={t("Close")} onPress={onClose} />
        </View>
        <View style={{ width: "100%", aspectRatio: 16 / 9 }}>{id ? <YouTube embed={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&autoplay=1`} /> : null}</View>
      </View>
    </Modal>
  );
}

export function PostCard({ p, big, onVideo }: { p: Post; big?: boolean; onVideo: (id: string) => void }) {
  const k = KIND[p.kind] || KIND.post;
  const [reading, setReading] = useState(false);
  const [open, setOpen] = useState(false);
  const long = (p.body || "").length > 220;
  const read = () => {
    if (reading) { hush(); setReading(false); return; }
    setReading(true);
    say(`${p.title}. ${p.body || ""}${p.ref ? `. ${p.ref}` : ""}`, "en-US", big ? 0.9 : 1, () => setReading(false));
  };

  if (p.kind === "video" && p.youtubeId) {
    return (
      <Press onPress={() => (Platform.OS === "web" ? WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${p.youtubeId}`) : onVideo(p.youtubeId!))} scaleTo={0.985} style={{ backgroundColor: "#fff", borderRadius: 18, overflow: "hidden" }}>
        <View>
          <Image source={{ uri: `https://img.youtube.com/vi/${p.youtubeId}/hqdefault.jpg` }} style={{ width: "100%", aspectRatio: 16 / 9 }} contentFit="cover" />
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}><Icon name="play" size={24} color="#fff" /></View>
          </View>
        </View>
        <View style={{ padding: 14, gap: 4 }}>
          <Label color={p.color}>{k.label()}</Label>
          <Body weight="semi" size={big ? 18 : 16}>{p.title}</Body>
          {p.body ? <Body size={13.5} color={C.muted} numberOfLines={2}>{p.body}</Body> : null}
        </View>
      </Press>
    );
  }

  if (p.kind === "verse") {
    return (
      <View style={{ backgroundColor: p.color, borderRadius: 18, padding: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="bookmark" size={15} color="#fff" />
          <Label color="rgba(255,255,255,0.9)">{k.label()}</Label>
        </View>
        <Body style={{ fontFamily: F.serif, fontSize: big ? 26 : 22, lineHeight: big ? 34 : 30, color: "#fff" }}>“{p.body}”</Body>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Body weight="bold" color="#fff" style={{ flex: 1 }}>{p.ref}</Body>
          <Button small variant="glass" icon={reading ? "square" : "volume-2"} label={reading ? t("Stop") : t("Listen")} onPress={read} />
        </View>
      </View>
    );
  }

  const when = p.startsAt ? new Date(p.startsAt) : null;
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, overflow: "hidden" }}>
      {p.image && (p.kind === "story" || p.kind === "event" || p.pinned) ? <Image source={p.image} style={{ width: "100%", height: big ? 170 : 140 }} contentFit="cover" /> : null}
      <View style={{ padding: 16, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name={p.pinned ? "map-pin" : k.icon} size={14} color={p.color} />
          <Label color={p.color}>{p.pinned ? t("Pinned") : k.label()}</Label>
        </View>
        <Body weight="semi" size={big ? 19 : 16.5}>{p.title}</Body>
        {when ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="clock" size={14} color={C.muted} />
            <Body size={13.5} color={C.muted}>{dateLabel(when, { weekday: "long", day: "numeric", month: "short" })} · {timeLabel(when)}</Body>
          </View>
        ) : null}
        {p.body ? <Body size={big ? 16.5 : 15} color={C.ink} numberOfLines={open || !long ? undefined : 5} style={{ lineHeight: big ? 25 : 22 }}>{p.body}</Body> : null}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 4, alignItems: "center" }}>
          {long ? <Press onPress={() => setOpen(!open)}><Body size={13.5} weight="semi" color={p.color}>{open ? t("Show less") : t("Read more")}</Body></Press> : null}
          {p.kind === "story" || p.kind === "activity" || big ? (
            <Press onPress={read} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name={reading ? "square" : "volume-2"} size={15} color={p.color} />
              <Body size={13.5} weight="semi" color={p.color}>{reading ? t("Stop") : t("Read it to me")}</Body>
            </Press>
          ) : null}
        </View>
      </View>
    </View>
  );
}
