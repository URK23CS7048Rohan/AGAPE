import { C } from "@/theme";
import { t } from "./i18n";

export const KIND_COLOR: Record<string, string> = { prayer: C.flame, "bible study": C.violet, worship: C.rose, fellowship: "#16A37B" };
export const kindLabel = (k: string) => t(k === "bible study" ? "Bible study" : k[0].toUpperCase() + k.slice(1));
export const TEAM: Record<string, { icon: string; color: string; label: () => string }> = {
  ushering: { icon: "users", color: C.violet, label: () => t("Ushering") },
  kids: { icon: "smile", color: "#B7791F", label: () => t("Kids") },
  tech: { icon: "monitor", color: "#2F7DE1", label: () => t("Tech & media") },
  worship: { icon: "music", color: C.rose, label: () => t("Worship") },
  hospitality: { icon: "coffee", color: "#16A37B", label: () => t("Hospitality") },
  driving: { icon: "truck", color: C.flame, label: () => t("Driving") },
  prayer: { icon: "heart", color: "#E5484D", label: () => t("Prayer") },
  cleanup: { icon: "trash-2", color: C.ink, label: () => t("Clean-up") },
};
export const team = (k: string) => TEAM[k] || { icon: "star", color: C.ink, label: () => k };
