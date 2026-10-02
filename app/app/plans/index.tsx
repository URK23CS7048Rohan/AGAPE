import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { BackHeader, Segmented } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";
import { usePlans } from "@/lib/more";
import { t } from "@/lib/i18n";
import { C } from "@/theme";

export default function Plans() {
  const plans = usePlans().data;
  const [tab, setTab] = useState(0);
  const aud = (["adults", "teens", "kids"] as const)[tab];
  const list = plans.filter((p) => p.audience === aud);
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <BackHeader title={t("Reading plans")} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Segmented items={[t("Adults"), t("Teens"), t("Kids")]} value={tab} onChange={setTab} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 60 }}>
        {list.map((p) => <PlanCard key={p.id} p={p} wide />)}
      </ScrollView>
    </View>
  );
}
