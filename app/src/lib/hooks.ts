/** Small hooks shared by several screens. */
import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import { useAuth, useNeedsAccount } from "./auth";
import { useQuery } from "./query";
import { myRsvps, rsvpCounts, setRsvp } from "./api";
import type { EventItem } from "./content";

/** RSVP state for the events published in /admin, with optimistic toggling. */
export function useRsvps() {
  const { signedIn } = useAuth();
  const needs = useNeedsAccount();
  const mine = useQuery(signedIn ? "rsvp:mine" : null, myRsvps);
  const counts = useQuery("rsvp:counts", rsvpCounts);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const going = (key: string) => (key in pending ? pending[key] : !!mine.data?.has(key));
  const toggle = useCallback(async (e: EventItem) => {
    if (needs("RSVP to events")) return;
    const on = !going(e.key);
    setPending((p) => ({ ...p, [e.key]: on }));
    Haptics.notificationAsync(on ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try { await setRsvp(e.key, e.title, on); }
    catch (err: any) { Alert.alert("Couldn't update your RSVP", err.message); }
    finally { setPending((p) => { const n = { ...p }; delete n[e.key]; return n; }); }
  }, [mine.data, pending, needs]);
  return { going, toggle, count: (key: string) => counts.data?.[key] ?? 0 };
}
