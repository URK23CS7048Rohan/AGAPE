import React from "react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { C } from "@/theme";
import { Body, Press } from "./ui";
import { Plan } from "@/lib/more";
import { t } from "@/lib/i18n";

export function PlanCard({ p, wide }: { p: Plan; wide?: boolean }) {
  return (
    <Press onPress={() => router.push(`/plans/${p.slug}` as any)} scaleTo={0.97} style={{ width: wide ? undefined : 220 }}>
      <Image source={p.image} style={{ width: "100%", height: wide ? 150 : 130, borderRadius: 14 }} contentFit="cover" />
      <Body weight="semi" style={{ marginTop: 8 }} numberOfLines={1}>{p.title}</Body>
      <Body size={13} color={C.muted} numberOfLines={1}>{t("{n} days", { n: p.days.length })}{p.readers ? ` · ${t("{n} reading", { n: p.readers })}` : ""}</Body>
    </Press>
  );
}
