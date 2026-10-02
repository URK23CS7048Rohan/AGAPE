-- =====================================================================
-- AGAPE — publish-ready additions (run after the initial schema)
-- • App content managed in /admin: sermons, courses + lessons, study guides,
--   games, groups (each with a group chat)
-- • Member features: saved sermons, sermon live chat, RSVPs to the events
--   staff publish in /admin, direct messages, unpray, account deletion
-- • Privacy: email and phone are never readable by other members
-- =====================================================================

-- ---------- Profiles: private contact details ------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists car text;          -- volunteer drivers: "White Toyota Innova · KW 38 7456"

-- keep the email copy in sync on sign-up (used by the admin member list only)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)), new.raw_user_meta_data->>'avatar_url', new.email)
  on conflict (id) do nothing;
  return new;
end $$;
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

-- other members may read names and roles, never email or phone
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, role, language, kids_mode, created_at, car) on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, phone, language, kids_mode, car) on public.profiles to authenticated;

-- a member's own private details
create or replace function public.my_contact() returns table (email text, phone text)
language sql stable security definer set search_path = public as $$
  select email, phone from public.profiles where id = auth.uid();
$$;

-- staff-only member list (with email) for /admin
create or replace function public.staff_members()
returns table (id uuid, full_name text, email text, phone text, role public.user_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  return query select p.id, p.full_name, p.email, p.phone, p.role, p.created_at from public.profiles p order by p.created_at desc;
end $$;

-- only admins can make admins; staff can set member / volunteer / staff
-- Guards run as the caller (security invoker) so they only restrict requests from the app;
-- the SQL editor, the service role and our own security-definer functions pass straight through.
create or replace function public.guard_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.role is distinct from old.role then
    if not public.is_staff() then raise exception 'not allowed to change roles'; end if;
    if (new.role = 'admin' or old.role = 'admin') and public.my_role() <> 'admin' then raise exception 'only an admin can change admin roles'; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles for each row execute function public.guard_profile_role();
grant update (role) on public.profiles to authenticated;   -- the trigger + "staff manage profiles" policy decide who may

-- Apple requires in-app account deletion
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- cascades to profiles and everything the member owns
end $$;

-- ---------- Sermons ----------------------------------------------------
alter table public.series add column if not exists color text;
alter table public.series add column if not exists position int not null default 0;
alter table public.videos add column if not exists cover_url text;

create table if not exists public.saved_videos (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  video_id uuid not null references public.videos on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
alter table public.saved_videos enable row level security;
create policy "own saved videos" on public.saved_videos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.count_view(video uuid) returns void
language sql security definer set search_path = public as $$
  update public.videos set views = views + 1 where id = video;
$$;

-- live chat beside a sermon / live stream
create table if not exists public.live_chat (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists live_chat_video on public.live_chat (video_id, created_at desc);
alter table public.live_chat enable row level security;
create policy "read live chat" on public.live_chat for select to authenticated using (not hidden or public.is_staff());
create policy "post live chat" on public.live_chat for insert to authenticated with check (user_id = auth.uid());
create policy "staff moderate live chat" on public.live_chat for update using (public.is_staff());
create policy "delete own or staff" on public.live_chat for delete using (user_id = auth.uid() or public.is_staff());

-- ---------- Courses: lessons hang straight off a course ---------------
alter table public.courses add column if not exists color text;
alter table public.courses add column if not exists position int not null default 0;
alter table public.lessons alter column module_id drop not null;
alter table public.lessons add column if not exists course_id uuid references public.courses on delete cascade;
alter table public.lessons add column if not exists url text;        -- YouTube link, PDF link or any web page
alter table public.lessons add column if not exists body text;       -- optional reading / notes
create index if not exists lessons_course on public.lessons (course_id, position);
update public.lessons l set course_id = m.course_id from public.modules m where m.id = l.module_id and l.course_id is null;

-- ---------- Study guides ----------------------------------------------
alter table public.documents alter column r2_key drop not null;
alter table public.documents add column if not exists url text;
alter table public.documents add column if not exists color text;
alter table public.documents add column if not exists position int not null default 0;

-- ---------- Events: RSVPs to the events staff publish in /admin -------
-- Website and app events live in site_content (edited in /admin), so RSVPs key on the event's stable key.
create table if not exists public.rsvps (
  event_key text not null check (char_length(event_key) <= 200),
  event_title text,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (event_key, user_id)
);
alter table public.rsvps enable row level security;
create policy "own rsvps" on public.rsvps for select using (user_id = auth.uid() or public.is_staff());
create policy "rsvp" on public.rsvps for insert with check (user_id = auth.uid());
create policy "cancel rsvp" on public.rsvps for delete using (user_id = auth.uid() or public.is_staff());
create policy "staff check in" on public.rsvps for update using (public.is_staff()) with check (public.is_staff());

create or replace view public.rsvp_counts with (security_invoker = false) as
  select event_key, count(*)::int as going from public.rsvps group by event_key;
grant select on public.rsvp_counts to anon, authenticated;

-- staff: who's coming
create or replace function public.staff_rsvps()
returns table (event_key text, event_title text, user_id uuid, full_name text, email text, phone text, checked_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  return query select r.event_key, r.event_title, r.user_id, p.full_name, p.email, p.phone, r.checked_in_at, r.created_at
    from public.rsvps r join public.profiles p on p.id = r.user_id order by r.created_at desc;
end $$;

-- ---------- Prayer wall -------------------------------------------------
create or replace function public.unpray(request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.prayer_reactions where prayer_reactions.request_id = unpray.request_id and user_id = auth.uid();
  if found then
    update public.prayer_requests set pray_count = greatest(0, pray_count - 1) where id = unpray.request_id;
  end if;
end $$;

-- members may only edit the text / answered flag of their own requests
create or replace function public.guard_prayer_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_staff() then
    new.pray_count := old.pray_count;
    new.hidden := old.hidden;
    new.user_id := old.user_id;
    new.anonymous := old.anonymous;
  end if;
  return new;
end $$;
drop trigger if exists prayer_guard on public.prayer_requests;
create trigger prayer_guard before update on public.prayer_requests for each row execute function public.guard_prayer_update();
create policy "staff delete prayer" on public.prayer_requests for delete using (public.is_staff() or user_id = auth.uid());

-- the wall view also tells the app which requests are mine
create or replace view public.prayer_wall with (security_invoker = true) as
  select r.id, r.body, r.anonymous, r.pray_count, r.answered, r.created_at,
         case when r.anonymous then null else p.full_name end as author_name,
         (r.user_id = auth.uid()) as mine
  from public.prayer_requests r left join public.profiles p on p.id = r.user_id
  where not r.hidden;

-- ---------- Pastoral care: staff can update status --------------------
create policy "staff update care" on public.care_requests for update using (public.is_staff()) with check (public.is_staff());
create or replace function public.staff_care()
returns table (id uuid, kind text, details text, status text, created_at timestamptz, full_name text, email text, phone text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  return query select c.id, c.kind, c.details, c.status, c.created_at, p.full_name, p.email, p.phone
    from public.care_requests c join public.profiles p on p.id = c.user_id order by c.created_at desc;
end $$;

-- ---------- Rides --------------------------------------------------------
-- members may only cancel; volunteers may only move a ride along
create or replace function public.guard_ride_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_staff() then return new; end if;
  if auth.uid() = old.member_id and (old.volunteer_id is distinct from auth.uid()) then
    if new.status <> 'cancelled' then raise exception 'members can only cancel a ride'; end if;
    new := old; new.status := 'cancelled';
    return new;
  end if;
  -- volunteer
  new.member_id := old.member_id; new.pickup_label := old.pickup_label; new.pickup_lat := old.pickup_lat; new.pickup_lng := old.pickup_lng;
  new.requested_for := old.requested_for; new.seats := old.seats; new.notes := old.notes; new.dropoff_label := old.dropoff_label;
  if old.status = 'requested' and new.status = 'cancelled' then raise exception 'only the member can cancel'; end if;
  if new.status = 'requested' then new.volunteer_id := null; end if;   -- volunteer hands the ride back
  return new;
end $$;
drop trigger if exists rides_guard on public.rides;
create trigger rides_guard before update on public.rides for each row execute function public.guard_ride_update();

drop policy if exists "volunteer accepts / updates" on public.rides;
create policy "volunteer accepts / updates" on public.rides for update using (
  public.is_volunteer() and (status = 'requested' or volunteer_id = auth.uid()))
  with check (volunteer_id = auth.uid() or (status = 'requested' and volunteer_id is null));
create policy "staff manage rides" on public.rides for update using (public.is_staff()) with check (public.is_staff());

-- phone number of the other person on a ride (only while the ride is active)
create or replace function public.ride_phone(ride uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when r.member_id = auth.uid() then v.phone when r.volunteer_id = auth.uid() then m.phone end
  from public.rides r
  join public.profiles m on m.id = r.member_id
  left join public.profiles v on v.id = r.volunteer_id
  where r.id = ride and r.status in ('accepted', 'enroute', 'arrived');
$$;

create or replace function public.staff_rides()
returns table (id uuid, pickup_label text, requested_for text, seats int, notes text, status public.ride_status, created_at timestamptz,
               member_id uuid, member text, member_phone text, volunteer_id uuid, volunteer text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  return query select r.id, r.pickup_label, r.requested_for, r.seats, r.notes, r.status, r.created_at,
    r.member_id, m.full_name, m.phone, r.volunteer_id, v.full_name
    from public.rides r join public.profiles m on m.id = r.member_id left join public.profiles v on v.id = r.volunteer_id
    order by r.created_at desc limit 300;
end $$;

-- ---------- Groups (ministries) with a group chat each ----------------
alter table public.ministries add column if not exists position int not null default 0;
alter table public.conversations add column if not exists created_by uuid default auth.uid() references public.profiles on delete set null;

create or replace function public.ministry_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.conversations (kind, name, ministry_id) values ('group', new.name, new.id);
  return new;
end $$;
drop trigger if exists ministries_conversation on public.ministries;
create trigger ministries_conversation after insert on public.ministries for each row execute function public.ministry_conversation();
create or replace function public.ministry_rename() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set name = new.name where ministry_id = new.id and kind = 'group';
  return new;
end $$;
drop trigger if exists ministries_rename on public.ministries;
create trigger ministries_rename after update of name on public.ministries for each row execute function public.ministry_rename();
insert into public.conversations (kind, name, ministry_id)
  select 'group', m.name, m.id from public.ministries m
  where not exists (select 1 from public.conversations c where c.ministry_id = m.id and c.kind = 'group');

-- one church-wide announcements channel
insert into public.conversations (kind, name)
  select 'announcement', 'Agape Family' where not exists (select 1 from public.conversations where kind = 'announcement');

create or replace function public.in_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = conv and user_id = auth.uid());
$$;

-- members see who else is in their conversations (needed for DM names); no recursion via the definer helper
drop policy if exists "see my memberships" on public.conversation_members;
create policy "see conversation members" on public.conversation_members for select using (public.in_conversation(conversation_id) or public.is_staff());
create policy "mark read" on public.conversation_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.join_group(ministry uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare conv uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.ministry_members (ministry_id, user_id) values (ministry, auth.uid()) on conflict do nothing;
  select id into conv from public.conversations where ministry_id = ministry and kind = 'group' limit 1;
  if conv is not null then
    insert into public.conversation_members (conversation_id, user_id, last_read_at) values (conv, auth.uid(), now()) on conflict do nothing;
  end if;
  return conv;
end $$;

create or replace function public.leave_group(ministry uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.ministry_members where ministry_id = ministry and user_id = auth.uid();
  delete from public.conversation_members where user_id = auth.uid()
    and conversation_id in (select id from public.conversations where ministry_id = ministry and kind = 'group');
end $$;

-- start (or reopen) a direct conversation with another member
create or replace function public.start_direct(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare conv uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if other = auth.uid() then raise exception 'cannot message yourself'; end if;
  if not exists (select 1 from public.profiles where id = other) then raise exception 'member not found'; end if;
  select c.id into conv from public.conversations c
    where c.kind = 'direct'
      and exists (select 1 from public.conversation_members a where a.conversation_id = c.id and a.user_id = auth.uid())
      and exists (select 1 from public.conversation_members b where b.conversation_id = c.id and b.user_id = other)
    limit 1;
  if conv is null then
    insert into public.conversations (kind) values ('direct') returning id into conv;
    insert into public.conversation_members (conversation_id, user_id, last_read_at) values (conv, auth.uid(), now()), (conv, other, null);
  end if;
  return conv;
end $$;

-- the member's chat list with the latest message and unread count
create or replace function public.my_chats()
returns table (id uuid, kind public.conversation_kind, name text, ministry_id uuid, last_body text, last_at timestamptz, last_sender text, unread int, members int)
language sql stable security definer set search_path = public as $$
  with mine as (
    select c.*, cm.last_read_at from public.conversations c
    join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = auth.uid()
    union all
    select c.*, null::timestamptz from public.conversations c
    where c.kind = 'announcement' and not exists (select 1 from public.conversation_members cm where cm.conversation_id = c.id and cm.user_id = auth.uid())
  )
  select m.id, m.kind,
    coalesce(m.name, (select p.full_name from public.conversation_members o join public.profiles p on p.id = o.user_id
                      where o.conversation_id = m.id and o.user_id <> auth.uid() limit 1), 'Conversation'),
    m.ministry_id, lm.body, lm.created_at, lm.sender,
    (select count(*)::int from public.messages x where x.conversation_id = m.id and x.sender_id <> auth.uid()
       and (m.last_read_at is null or x.created_at > m.last_read_at)),
    (select count(*)::int from public.conversation_members y where y.conversation_id = m.id)
  from mine m
  left join lateral (
    select msg.body, msg.created_at, p.full_name as sender from public.messages msg join public.profiles p on p.id = msg.sender_id
    where msg.conversation_id = m.id order by msg.created_at desc limit 1
  ) lm on true
  where auth.uid() is not null
  order by coalesce(lm.created_at, m.created_at) desc;
$$;

create or replace function public.mark_read(conv uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversation_members set last_read_at = now() where conversation_id = conv and user_id = auth.uid();
$$;

-- group member counts (readable by anyone browsing groups)
create or replace view public.ministry_counts with (security_invoker = false) as
  select ministry_id, count(*)::int as members from public.ministry_members group by ministry_id;
grant select on public.ministry_counts to anon, authenticated;

-- ---------- Games ---------------------------------------------------------
create or replace view public.my_points with (security_invoker = true) as
  select coalesce(sum(points), 0)::int as points from public.game_scores where user_id = auth.uid();

-- ---------- Announcements reach the app's News tab in real time -------
-- (already in the realtime publication)

-- ---------- Realtime for the new feeds --------------------------------
alter publication supabase_realtime add table public.live_chat, public.rsvps;

-- ---------- Staff dashboard numbers -----------------------------------
drop view if exists public.staff_stats;
create view public.staff_stats with (security_invoker = true) as
  select
    (select count(*) from public.profiles) as members,
    (select count(*) from public.profiles where created_at > now() - interval '30 days') as new_members,
    (select count(distinct user_id) from public.lesson_progress where completed_at > now() - interval '30 days') as active_learners,
    (select coalesce(sum(views),0) from public.videos) as total_views,
    (select count(*) from public.rides where status = 'completed') as rides_completed,
    (select count(*) from public.rides where status = 'requested') as rides_waiting,
    (select count(*) from public.prayer_requests where not hidden) as prayers,
    (select count(*) from public.care_requests where status = 'open') as care_open,
    (select coalesce(sum(amount),0) from public.donations where status = 'succeeded' and created_at > date_trunc('month', now())) as giving_this_month;
