/** Daily reading-plan reminders and shift reminders, scheduled on the phone (no server needed). */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { t } from "./i18n";

const KEY = "agape.reminders";
type Map = Record<string, string>;
const load = async (): Promise<Map> => { try { return JSON.parse((await AsyncStorage.getItem(KEY)) || "{}"); } catch { return {}; } };
const save = (m: Map) => AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});

async function allowed() {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reminders", { name: t("Reminders"), importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  return status === "granted";
}

/** "07:30" every day; null cancels. Returns false when notifications aren't allowed. */
export async function setDailyReminder(id: string, time: string | null, title: string, body: string, route: string) {
  const m = await load();
  if (m[id]) { await Notifications.cancelScheduledNotificationAsync(m[id]).catch(() => {}); delete m[id]; }
  if (!time) { await save(m); return true; }
  if (!(await allowed())) return false;
  const [hour, minute] = time.split(":").map(Number);
  m[id] = await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { route } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: "reminders" } as any,
  });
  await save(m);
  return true;
}

/** One-off reminder (e.g. an hour before a serving shift or a home meeting). */
export async function remindAt(id: string, when: Date, title: string, body: string, route: string) {
  const m = await load();
  if (m[id]) await Notifications.cancelScheduledNotificationAsync(m[id]).catch(() => {});
  if (when.getTime() < Date.now() + 60e3 || !(await allowed())) return false;
  m[id] = await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { route } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: "reminders" } as any,
  });
  await save(m);
  return true;
}
export async function cancelReminder(id: string) {
  const m = await load();
  if (m[id]) { await Notifications.cancelScheduledNotificationAsync(m[id]).catch(() => {}); delete m[id]; await save(m); }
}
