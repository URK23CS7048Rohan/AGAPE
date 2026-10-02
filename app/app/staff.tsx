/**
 * Staff tools inside the app: the day-to-day moderation that staff need on the go.
 * Everything else (content, sermons, courses, groups, photos) lives in the web admin at /admin.
 */
import React, { useState } from "react";
import { Alert, Linking, RefreshControl, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { C, F, R } from "@/theme";
import { Async, BackHeader, Body, Button, Chip, Display, Empty, Icon, Label, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/query";
import { deleteAnnouncement, listAnnouncements, postAnnouncement, staffCare, staffPrayers, staffRides, staffSetCare, staffStats, staffUpdatePrayer } from "@/lib/api";
import { ago, fmt } from "@/lib/time";

const TABS = ["Overview", "Prayer", "Rides", "Care", "News"];
const RIDE_COLOR: Record<string, string> = { requested: C.flame, accepted: C.violet, enroute: C.sky, arrived: C.mint, completed: C.line, cancelled: C.line };

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ backgroundColor: "#fff", borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.line, gap: 8 }}>{children}</View>;
}
const run = (f: () => Promise<any>) => f().catch((e) => Alert.alert("Couldn't update", e.message));

export default function Staff() {
  const { isStaff } = useAuth();
  const [tab, setTab] = useState(0);
  const stats = useQuery(isStaff && tab === 0 ? "staff:stats" : null, staffStats);
  const prayers = useQuery(isStaff && tab === 1 ? "staff:prayers" : null, staffPrayers);
  const rides = useQuery(isStaff && tab === 2 ? "staff:rides" : null, staffRides);
  const care = useQuery(isStaff && tab === 3 ? "staff:care" : null, staffCare);
  const news = useQuery(isStaff && tab === 4 ? "news" : null, listAnnouncements);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  if (!isStaff) return <View style={{ flex: 1, backgroundColor: C.bg }}><BackHeader title="Staff tools" /><Empty icon="lock" title="Staff only" body="Ask an admin to give your account the staff role." /></View>;

  const reloadAll = () => { stats.reload(); prayers.reload(); rides.reload(); care.reload(); news.reload(); };
  const post = async () => {
    if (!title.trim()) return Alert.alert("Add a title first");
    setPosting(true);
    try { await postAnnouncement(title.trim(), body.trim()); setTitle(""); setBody(""); }
    catch (e: any) { Alert.alert("Couldn't post", e.message); }
    finally { setPosting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <BackHeader title="Staff tools" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }} style={{ flexGrow: 0 }}>
        {TABS.map((t, i) => <Chip key={t} label={t} active={tab === i} onPress={() => setTab(i)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 60, gap: 10 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={reloadAll} />}>
        {tab === 0 ? (
          <Async q={stats}>
            {(s) => (
              <Animated.View entering={FadeIn} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    ["Members", s.members, C.violet, `+${fmt(s.new_members)} this month`],
                    ["Rides waiting", s.rides_waiting, C.flame, "need a driver"],
                    ["Care requests", s.care_open, C.rose, "open"],
                    ["Prayer requests", s.prayers, C.sun, "on the wall"],
                    ["Active learners", s.active_learners, C.mint, "last 30 days"],
                    ["Sermon views", s.total_views, C.sky, "all time"],
                  ].map(([l, v, c, sub]) => (
                    <View key={l as string} style={{ width: "48.4%", backgroundColor: c as string, borderRadius: R.lg, padding: 14 }}>
                      <Label color={C.ink}>{l as string}</Label>
                      <Display size={30}>{fmt(Number(v) || 0)}</Display>
                      <Label color={C.ink}>{sub as string}</Label>
                    </View>
                  ))}
                </View>
                <Card>
                  <Body weight="semi">Everything else is in the web admin</Body>
                  <Body size={14} color={C.muted}>Photos, promotions, events, sermons, courses, groups, games and member roles are managed at your website's /admin page.</Body>
                  {process.env.EXPO_PUBLIC_SITE_URL ? <Button label="Open web admin" icon="external-link" variant="ink" small onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_SITE_URL!.replace(/\/$/, "")}/admin/`)} /> : null}
                </Card>
              </Animated.View>
            )}
          </Async>
        ) : null}

        {tab === 1 ? (
          <Async q={prayers} empty={(d) => (d.length ? null : <Empty icon="heart" title="No prayer requests" />)}>
            {(list) => list.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 6) * 40)}>
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Label style={{ flex: 1 }} numberOfLines={1}>{p.author} · {ago(p.created_at)} · {p.pray_count} praying</Label>
                    {p.hidden ? <Label color={C.red}>Hidden</Label> : p.answered ? <Label color={C.mint}>Answered</Label> : null}
                  </View>
                  <Body>{p.body}</Body>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Chip label={p.answered ? "Mark open" : "Answered"} icon="star" onPress={() => run(async () => { await staffUpdatePrayer(p.id, { answered: !p.answered }); prayers.reload(); })} />
                    <Chip label={p.hidden ? "Show" : "Hide"} icon={p.hidden ? "eye" : "eye-off"} color={C.red} active={p.hidden} onPress={() => run(async () => { await staffUpdatePrayer(p.id, { hidden: !p.hidden }); prayers.reload(); })} />
                  </View>
                </Card>
              </Animated.View>
            ))}
          </Async>
        ) : null}

        {tab === 2 ? (
          <Async q={rides} empty={(d) => (d.length ? null : <Empty icon="car-side" title="No rides yet" />)}>
            {(list) => list.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(Math.min(i, 6) * 40)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ backgroundColor: RIDE_COLOR[r.status], borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: "center" }}><Body size={11.5} weight="bold">{r.status}</Body></View>
                    <Label style={{ flex: 1 }}>{ago(r.created_at)}</Label>
                  </View>
                  <Body weight="semi">{r.member || "Member"} → {r.requested_for}</Body>
                  <Label>{r.pickup_label} · {r.seats} seat{r.seats > 1 ? "s" : ""}{r.notes ? ` · “${r.notes}”` : ""}</Label>
                  <Label>Driver: {r.volunteer || "not assigned yet"}</Label>
                  {r.member_phone ? <Press onPress={() => Linking.openURL(`tel:${r.member_phone!.replace(/[^+\d]/g, "")}`)}><Body size={14} weight="semi" color={C.flame}>Call {r.member?.split(" ")[0]} · {r.member_phone}</Body></Press> : null}
                </Card>
              </Animated.View>
            ))}
          </Async>
        ) : null}

        {tab === 3 ? (
          <Async q={care} empty={(d) => (d.length ? null : <Empty icon="shield" title="No care requests" body="Requests from Me → Pastoral care appear here." />)}>
            {(list) => list.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(Math.min(i, 6) * 40)}>
                <Card>
                  <Label>{c.kind} · {ago(c.created_at)} · {c.status}</Label>
                  <Body weight="semi">{c.full_name || "Member"}</Body>
                  {c.details ? <Body size={14.5}>{c.details}</Body> : null}
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {c.phone ? <Chip label="Call" icon="phone" onPress={() => Linking.openURL(`tel:${c.phone!.replace(/[^+\d]/g, "")}`)} /> : null}
                    {c.email ? <Chip label="Email" icon="mail" onPress={() => Linking.openURL(`mailto:${c.email}`)} /> : null}
                    {["open", "in progress", "closed"].map((s) => <Chip key={s} label={s} active={c.status === s} onPress={() => run(async () => { await staffSetCare(c.id, s); care.reload(); })} />)}
                  </View>
                </Card>
              </Animated.View>
            ))}
          </Async>
        ) : null}

        {tab === 4 ? (
          <>
            <Card>
              <Body weight="semi">New announcement</Body>
              <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="rgba(20,20,20,0.4)" style={{ height: 48, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, fontFamily: F.sans, fontSize: 15, color: C.ink }} />
              <TextInput value={body} onChangeText={setBody} multiline placeholder="Message" placeholderTextColor="rgba(20,20,20,0.4)" style={{ minHeight: 90, borderRadius: 12, backgroundColor: C.bg, padding: 12, fontFamily: F.sans, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
              <Button label={posting ? "Posting…" : "Post to the News tab"} icon="send" trail={null} variant="ink" small block onPress={post} disabled={posting} />
            </Card>
            <Async q={news} empty={(d) => (d.length ? null : <Empty icon="bell" title="Nothing posted yet" />)}>
              {(list) => list.map((a) => (
                <Card key={a.id}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Body weight="semi">{a.title}</Body>
                      {a.body ? <Body size={14} color={C.muted}>{a.body}</Body> : null}
                      <Label>{ago(a.created_at)}</Label>
                    </View>
                    <Press onPress={() => Alert.alert("Delete this announcement?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => run(() => deleteAnnouncement(a.id)) }])} hitSlop={8}>
                      <Icon name="trash-2" size={18} color={C.red} />
                    </Press>
                  </View>
                </Card>
              ))}
            </Async>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
