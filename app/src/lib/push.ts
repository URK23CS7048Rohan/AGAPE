/**
 * Push notifications (Expo). The phone's token is saved in `push_tokens`; the database calls the
 * `push` Edge Function whenever a notification row is created (new message, ride update, announcement…).
 * Needs an EAS project id (`npx eas-cli init`) and, on Android, Firebase credentials — see README.
 */
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

let token: string | null = null;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function registerForPush(): Promise<string | null> {
  if (!supabase || Platform.OS === "web" || !Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Agape", importance: Notifications.AndroidImportance.HIGH, lightColor: "#FF5A1F" });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;
  const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
  if (!projectId) return null; // run `npx eas-cli init` once to enable push
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  token = data;
  const { error } = await supabase.from("push_tokens").upsert({ token: data, platform: Platform.OS }, { onConflict: "user_id,token" });
  if (error) console.warn("[agape] push token", error.message);
  return data;
}

/** Stop pushes to this phone (sign-out, or notifications switched off). */
export async function forgetPushToken() {
  if (!supabase || !token) return;
  await supabase.from("push_tokens").delete().eq("token", token);
  token = null;
}

/** Opens the right screen when a notification is tapped. */
export function listenForTaps(go: (route: string) => void) {
  if (Platform.OS === "web") return () => {};
  const open = (r?: Notifications.NotificationResponse | null) => {
    const route = (r?.notification.request.content.data as any)?.route;
    if (typeof route === "string" && route.startsWith("/")) setTimeout(() => go(route), 500);
  };
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
