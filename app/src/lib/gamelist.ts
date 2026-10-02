import { C } from "@/theme";
import { t } from "./i18n";

export type GameId = "daily" | "trivia" | "verse_match" | "who_said" | "true_false" | "emoji" | "books_order" | "memory";
export const GAMES: { id: GameId; title: () => string; sub: () => string; icon: string; color: string; kids: boolean }[] = [
  { id: "trivia", title: () => t("Bible Trivia"), sub: () => t("10 questions, faster is better"), icon: "help-circle", color: C.violet, kids: true },
  { id: "verse_match", title: () => t("Verse Match"), sub: () => t("Fill in the missing words"), icon: "book-open", color: C.flame, kids: false },
  { id: "who_said", title: () => t("Who Said It?"), sub: () => t("Match the quote to the person"), icon: "message-circle", color: "#2F7DE1", kids: false },
  { id: "true_false", title: () => t("True or False"), sub: () => t("60-second speed round"), icon: "zap", color: "#E5484D", kids: true },
  { id: "emoji", title: () => t("Emoji Bible"), sub: () => t("Guess the story from emojis"), icon: "smile", color: "#B7791F", kids: true },
  { id: "books_order", title: () => t("Books in Order"), sub: () => t("Genesis to Revelation"), icon: "layers", color: "#16A37B", kids: true },
  { id: "memory", title: () => t("Memory Match"), sub: () => t("Pair verses and references"), icon: "grid", color: C.rose, kids: true },
];
export const gameTitle = (id: string) => (id === "daily" ? t("Daily Challenge") : GAMES.find((g) => g.id === id)?.title() || id);
