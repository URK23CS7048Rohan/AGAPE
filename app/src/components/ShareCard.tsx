/** Shareable verse / quote image: pick a background, preview, share to WhatsApp, Instagram… */
import React, { useRef, useState } from "react";
import { Modal, Platform, ScrollView, Share, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { C, F, IMG } from "@/theme";
import { Body, Button, Icon, Press } from "./ui";
import { t } from "@/lib/i18n";

const BACKS: { image?: any; colors?: [string, string]; ink?: boolean }[] = [
  { image: IMG.crossDusk },
  { colors: ["#1D1233", "#3B1F6B"] },
  { image: IMG.mountainPeaks },
  { colors: ["#FFF4E6", "#FFE3D6"], ink: true },
  { image: IMG.sunrise },
  { colors: ["#FF5A1F", "#D9430F"] },
  { image: IMG.womanForest },
];

export function ShareCard({ visible, onClose, text, reference, rtl }: { visible: boolean; onClose: () => void; text: string; reference: string; rtl?: boolean }) {
  const [bg, setBg] = useState(0);
  const [busy, setBusy] = useState(false);
  const card = useRef<View>(null);
  const b = BACKS[bg];
  const size = text.length > 260 ? 17 : text.length > 160 ? 20 : text.length > 90 ? 24 : 28;

  const share = async () => {
    const message = `“${text}”\n— ${reference}\n\n${t("Shared from the Agape app")}`;
    if (Platform.OS === "web" || !(await Sharing.isAvailableAsync().catch(() => false))) {
      await Share.share({ message }).catch(() => {});
      return;
    }
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: "png", quality: 1, width: 1080, height: 1350 });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: reference });
    } catch {
      await Share.share({ message }).catch(() => {});
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={Platform.OS === "web"}>
      <View style={{ flex: 1, backgroundColor: C.paper, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
          <Body weight="semi" size={17} style={{ flex: 1 }}>{t("Share as image")}</Body>
          <Press onPress={onClose} hitSlop={10} label={t("Close")}><Icon name="x" size={22} /></Press>
        </View>
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }}>
          <View ref={card} collapsable={false} style={{ width: 320, height: 400, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
            {b.image ? <Image source={b.image} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" /> : null}
            {b.colors ? <LinearGradient colors={b.colors} style={{ position: "absolute", width: "100%", height: "100%" }} /> : null}
            {b.image ? <LinearGradient colors={["rgba(10,6,14,0.35)", "rgba(10,6,14,0.72)"]} style={{ position: "absolute", width: "100%", height: "100%" }} /> : null}
            <View style={{ flex: 1, padding: 28, justifyContent: "center" }}>
              <Body style={{ fontFamily: F.serif, fontSize: size, lineHeight: size * 1.28, color: b.ink ? C.ink : "#fff", textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" } as any}>“{text}”</Body>
              <Body weight="semi" size={14} color={b.ink ? C.flame : "#FFC23D"} style={{ marginTop: 16, textAlign: rtl ? "right" : "left" }}>{reference}</Body>
            </View>
            <View style={{ position: "absolute", left: 20, bottom: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Image source={b.ink ? IMG.logoMark : IMG.logoMarkLight} style={{ width: 14, height: 18 }} contentFit="contain" />
              <Body size={11} weight="semi" color={b.ink ? C.muted : "rgba(255,255,255,0.8)"}>Agape International Ministries</Body>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, padding: 16 }}>
            {BACKS.map((x, i) => (
              <Press key={i} onPress={() => setBg(i)} style={{ width: 52, height: 64, borderRadius: 10, overflow: "hidden", borderWidth: 2.5, borderColor: i === bg ? C.flame : "transparent" }}>
                {x.image ? <Image source={x.image} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <LinearGradient colors={x.colors!} style={{ flex: 1 }} />}
              </Press>
            ))}
          </ScrollView>
          <Button label={busy ? t("Preparing…") : t("Share")} icon="share" onPress={share} disabled={busy} style={{ width: 320 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
