-- =====================================================================
-- AGAPE — "go live" migration
-- Everything the website, app and admin need to run on real data:
--   • guest prayer requests from the website (held for review)
--   • keys that link member actions to admin-edited content
--     (events, giving campaigns, groups are edited in /admin as site content)
--   • groups ⇄ group chats, direct messages, inbox RPCs
--   • ride ministry RPCs (accept, status updates) with guard rails
--   • notifications + push dispatch (Expo) via pg_net
--   • visitor cards, volunteer applications, saved sermons, account deletion
--   • richer sermon / course / document fields for the admin
-- =====================================================================

-- pg_net lets the database call the push Edge Function (available on every Supabase project)
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then raise notice 'pg_net not available: push notifications will not be dispatched';
end $$;

-- Same slug rule as the website and app (lowercase, non-alphanumerics → "-").
create or replace function public.slugify(s text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(s, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------- profiles
create sequence if not exists public.member_no_seq start 1001;
alter table public.profiles
  add column if not exists email text,
  add column if not exists member_no text unique,
  add column if not exists vehicle text,                  -- volunteer drivers: "Toyota Innova · White · KW 38 7456"
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists notifications_seen_at timestamptz not null default now();

update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
update public.profiles set member_no = 'AGP-' || to_char(created_at, 'YY') || '-' || lpad(nextval('public.member_no_seq')::text, 4, '0') where member_no is null;
-- the old trigger stored the e-mail as the name; clear it so the app asks for a real name
update public.profiles set full_name = null where full_name = email;

-- members can't change their own role, member number or e-mail
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.role := old.role;
    new.member_no := old.member_no;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile();

-- ---------------------------------------------------------------- content tables (admin-managed)
alter table public.series
  add column if not exists slug text unique,
  add column if not exists accent text,
  add column if not exists speaker text,
  add column if not exists color text,
  add column if not exists position int not null default 0;

alter table public.videos
  add column if not exists slug text unique,
  add column if not exists accent text,
  add column if not exists cover_url text,
  add column if not exists likes int not null default 0,
  add column if not exists published boolean not null default true;

alter table public.courses
  add column if not exists slug text unique,
  add column if not exists accent text,
  add column if not exists color text,
  add column if not exists position int not null default 0;

alter table public.lessons
  add column if not exists body text,           -- reading / notes shown under the lesson
  add column if not exists youtube_id text,
  add column if not exists pdf_url text;

alter table public.documents
  alter column r2_key drop not null,
  add column if not exists url text,
  add column if not exists color text,
  add column if not exists published boolean not null default true;

-- unpublished courses and sermons are only visible to staff
drop policy if exists "read courses" on public.courses;
create policy "read courses" on public.courses for select using (published or public.is_staff());
drop policy if exists "read videos" on public.videos;
create policy "read videos" on public.videos for select using (published or public.is_staff());
drop policy if exists "read question_packs" on public.question_packs;
create policy "read question_packs" on public.question_packs for select using (published or public.is_staff());

create table if not exists public.saved_videos (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  video_id uuid not null references public.videos on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
alter table public.saved_videos enable row level security;
create policy "own saved videos" on public.saved_videos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.view_video(video_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.videos set views = views + 1 where id = view_video.video_id and published;
$$;

-- ---------------------------------------------------------------- prayer wall
alter table public.prayer_requests
  alter column user_id drop not null,
  add column if not exists guest_name text check (guest_name is null or char_length(guest_name) <= 60),
  add column if not exists guest_contact text check (guest_contact is null or char_length(guest_contact) <= 120),
  add column if not exists source text not null default 'app';

drop policy if exists "post prayer" on public.prayer_requests;
create policy "member posts prayer" on public.prayer_requests for insert to authenticated
  with check (user_id = auth.uid() and pray_count = 0);
-- website visitors can post without an account; their requests wait for a pastor to approve them
create policy "guest posts prayer for review" on public.prayer_requests for insert to anon
  with check (user_id is null and hidden and pray_count = 0 and not answered);
create policy "anyone reads visible prayers" on public.prayer_requests for select to anon using (not hidden);

create or replace function public.prayer_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('agape.bypass', true), '') = '1' or public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.pray_count := 0;
    if auth.uid() is null then
      new.user_id := null; new.hidden := true; new.answered := false; new.source := 'web';
    end if;
  else
    new.pray_count := old.pray_count;
    new.hidden := old.hidden;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists prayer_requests_guard on public.prayer_requests;
create trigger prayer_requests_guard before insert or update on public.prayer_requests
  for each row execute function public.prayer_guard();

-- "Priya Raman" → "Priya R." (what the public wall shows)
create or replace function public.short_name(s text) returns text
language sql immutable as $$
  select nullif(trim(split_part(trim(coalesce(s, '')), ' ', 1) || coalesce(' ' || nullif(left(split_part(trim(coalesce(s, '')), ' ', 2), 1), '') || '.', '')), '');
$$;

-- The wall: safe columns only, never reveals who posted an anonymous request.
-- Runs with the owner's rights so visitors and members see the same wall.
drop view if exists public.prayer_wall;
create view public.prayer_wall as
  select r.id, r.body, r.anonymous, r.pray_count, r.answered, r.created_at, r.source,
         case when r.anonymous then null else public.short_name(coalesce(p.full_name, r.guest_name)) end as author_name,
         coalesce(r.user_id = auth.uid(), false) as mine,
         exists (select 1 from public.prayer_reactions x where x.request_id = r.id and x.user_id = auth.uid()) as prayed
  from public.prayer_requests r left join public.profiles p on p.id = r.user_id
  where not r.hidden;
grant select on public.prayer_wall to anon, authenticated;

-- ---------------------------------------------------------------- notifications (+ push)
alter table public.notifications
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists route text;

create or replace function public.notify(target uuid, kind text, title text, body text, route text default null, payload jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, route, payload)
  values (target, kind, title, left(body, 240), route, payload);
$$;
revoke execute on function public.notify(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

-- Calls the `push` Edge Function for every new notification.
-- Needs two Vault secrets (see README → Push notifications): project_url, service_role_key.
create or replace function public.dispatch_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare u text; k text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = ''project_url''' into u;
    execute 'select decrypted_secret from vault.decrypted_secrets where name = ''service_role_key''' into k;
  exception when others then return new;
  end;
  if u is null or k is null then return new; end if;
  perform net.http_post(
    url := rtrim(u, '/') || '/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || k),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  return new;   -- never block the write because push failed
end $$;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications for each row execute function public.dispatch_push();

create or replace function public.mark_notifications_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set notifications_seen_at = now() where id = auth.uid();
$$;

-- announcements → everyone
create or replace function public.on_announcement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(null, 'announcement', new.title, coalesce(new.body, ''), '/community');
  return new;
end $$;
drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify after insert on public.announcements for each row execute function public.on_announcement();

-- pray_for: count once per member, tell the requester at a few milestones
drop function if exists public.pray_for(uuid);
create function public.pray_for(request_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int; owner uuid;
begin
  if auth.uid() is null then raise exception 'sign in to pray for a request'; end if;
  perform set_config('agape.bypass', '1', true);
  insert into public.prayer_reactions (request_id, user_id) values (pray_for.request_id, auth.uid()) on conflict do nothing;
  if found then
    update public.prayer_requests set pray_count = pray_count + 1 where id = pray_for.request_id and not hidden
    returning pray_count, user_id into n, owner;
    if owner is not null and owner <> auth.uid() and n in (1, 10, 25, 50, 100, 250, 500, 1000) then
      perform public.notify(owner, 'prayed', case when n = 1 then 'Someone is praying for you' else n || ' people are praying for you' end,
        'Your church family is standing with you in prayer.', '/prayer');
    end if;
  end if;
  perform set_config('agape.bypass', '', true);
  return (select pray_count from public.prayer_requests where id = pray_for.request_id);
end $$;

-- website visitors (no account): adds one to the count; the site limits it to once per request per browser
create or replace function public.pray_anon(request_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('agape.bypass', '1', true);
  update public.prayer_requests set pray_count = pray_count + 1 where id = pray_anon.request_id and not hidden returning pray_count into n;
  perform set_config('agape.bypass', '', true);
  return n;
end $$;

-- ---------------------------------------------------------------- events (keyed by admin content)
alter table public.event_rsvps drop constraint if exists event_rsvps_pkey;
alter table public.event_rsvps alter column event_id drop not null;
alter table public.event_rsvps add column if not exists event_key text;
alter table public.event_rsvps add column if not exists event_title text;
update public.event_rsvps set event_key = event_id::text where event_key is null;
alter table public.event_rsvps alter column event_key set not null;
alter table public.event_rsvps alter column user_id set not null;
alter table public.event_rsvps add primary key (event_key, user_id);

create or replace function public.rsvp_counts() returns table (event_key text, going int)
language sql stable security definer set search_path = public as $$
  select event_key, count(*)::int from public.event_rsvps group by event_key;
$$;

-- ---------------------------------------------------------------- messaging: groups, DMs, inbox
alter table public.conversations
  add column if not exists topic_key text unique,      -- 'family', 'group:agape-squad', …
  add column if not exists is_open boolean not null default false,
  add column if not exists color text;

create or replace function public.is_member(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = conv and user_id = auth.uid());
$$;

drop policy if exists "see my conversations" on public.conversations;
create policy "see my conversations" on public.conversations for select using (
  kind = 'announcement' or is_open or public.is_member(id) or public.is_staff());
drop policy if exists "see my memberships" on public.conversation_members;
create policy "see members of my conversations" on public.conversation_members for select using (
  user_id = auth.uid() or public.is_member(conversation_id) or public.is_staff());
drop policy if exists "read messages" on public.messages;
create policy "read messages" on public.messages for select using (
  public.is_member(conversation_id) or public.is_staff()
  or exists (select 1 from public.conversations c where c.id = conversation_id and c.kind = 'announcement'));
drop policy if exists "send messages" on public.messages;
create policy "send messages" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (
    (c.kind <> 'announcement' and public.is_member(c.id)) or (c.kind = 'announcement' and public.is_staff()))));
create policy "delete own messages" on public.messages for delete using (sender_id = auth.uid() or public.is_staff());
create policy "staff manage conversations" on public.conversations for all using (public.is_staff()) with check (public.is_staff());

-- Join the chat for a group listed on the website/app (groups are edited in /admin).
create or replace function public.join_group(group_key text, group_name text, group_color text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; k text := public.slugify(group_key); site jsonb;
begin
  if auth.uid() is null then raise exception 'sign in to join a group'; end if;
  select data into site from public.site_content where key = 'site';
  if site is not null and jsonb_typeof(site->'ministries') = 'array' and not exists (
    select 1 from jsonb_array_elements(site->'ministries') m where public.slugify(m->>'name') = k) then
    raise exception 'unknown group %', group_key;
  end if;
  insert into public.conversations (kind, name, topic_key, is_open, color)
  values ('group', left(group_name, 80), 'group:' || k, true, group_color)
  on conflict (topic_key) do update set topic_key = excluded.topic_key
  returning id into cid;
  insert into public.conversation_members (conversation_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

create or replace function public.join_conversation(conv uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversations where id = conv and is_open) then raise exception 'this conversation is invite-only'; end if;
  insert into public.conversation_members (conversation_id, user_id) values (conv, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.leave_conversation(conv uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.conversation_members where conversation_id = conv and user_id = auth.uid();
$$;

create or replace function public.start_direct(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null or other is null or other = auth.uid() then raise exception 'pick someone else to message'; end if;
  select c.id into cid from public.conversations c
   where c.kind = 'direct'
     and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid())
     and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = other)
   limit 1;
  if cid is null then
    insert into public.conversations (kind) values ('direct') returning id into cid;
    insert into public.conversation_members (conversation_id, user_id) values (cid, auth.uid()), (cid, other);
  end if;
  return cid;
end $$;

create or replace function public.mark_read(conv uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversation_members set last_read_at = now() where conversation_id = conv and user_id = auth.uid();
$$;

create or replace function public.group_member_counts() returns table (topic_key text, members int)
language sql stable security definer set search_path = public as $$
  select c.topic_key, count(m.user_id)::int from public.conversations c
  left join public.conversation_members m on m.conversation_id = c.id
  where c.topic_key is not null group by c.topic_key;
$$;

-- The inbox: one row per conversation I'm in, with the last message and my unread count.
create or replace function public.my_conversations()
returns table (id uuid, kind public.conversation_kind, name text, topic_key text, color text,
               last_body text, last_at timestamptz, last_sender text, unread int, members int)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind,
    coalesce(c.name, (select p.full_name from public.conversation_members m2 join public.profiles p on p.id = m2.user_id
                      where m2.conversation_id = c.id and m2.user_id <> auth.uid() limit 1), 'Conversation'),
    c.topic_key, c.color, lm.body, coalesce(lm.created_at, c.created_at), lp.full_name,
    (select count(*)::int from public.messages x where x.conversation_id = c.id
       and x.created_at > coalesce(m.last_read_at, 'epoch'::timestamptz) and x.sender_id <> auth.uid()),
    (select count(*)::int from public.conversation_members y where y.conversation_id = c.id)
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  left join lateral (select body, created_at, sender_id from public.messages where conversation_id = c.id order by created_at desc limit 1) lm on true
  left join public.profiles lp on lp.id = lm.sender_id
  where m.user_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- new message → notify the other members (not for the all-church "family" chat)
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; sender text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if c.topic_key = 'family' then return new; end if;
  select coalesce(full_name, 'Someone') into sender from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, kind, title, body, route, payload)
  select m.user_id, 'message', case when c.kind = 'direct' then sender else coalesce(c.name, 'Group') end,
         left(case when c.kind = 'direct' then new.body else sender || ': ' || new.body end, 240),
         '/chat/' || c.id, jsonb_build_object('conversation_id', c.id)
  from public.conversation_members m where m.conversation_id = c.id and m.user_id <> new.sender_id;
  return new;
end $$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages for each row execute function public.on_message();

-- everyone joins the all-church chat when they sign up
insert into public.conversations (kind, name, topic_key, is_open, color)
values ('group', 'Agape Family', 'family', true, '#0F0B12') on conflict (topic_key) do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare fam uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, email, member_no)
  values (new.id,
          nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
          new.raw_user_meta_data->>'avatar_url', new.email,
          'AGP-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.member_no_seq')::text, 4, '0'))
  on conflict (id) do nothing;
  select id into fam from public.conversations where topic_key = 'family';
  if fam is not null then
    insert into public.conversation_members (conversation_id, user_id) values (fam, new.id) on conflict do nothing;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- ride ministry
alter table public.rides
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_at timestamptz;

-- direct updates are replaced by the two RPCs below
drop policy if exists "member cancels own" on public.rides;
drop policy if exists "volunteer accepts / updates" on public.rides;
drop policy if exists "member requests ride" on public.rides;
create policy "member requests ride" on public.rides for insert with check (member_id = auth.uid() and status = 'requested' and volunteer_id is null);
create policy "staff manage rides" on public.rides for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.accept_ride(ride_id uuid) returns public.rides
language plpgsql security definer set search_path = public as $$
declare r public.rides; v record;
begin
  if not public.is_volunteer() then raise exception 'only volunteer drivers can accept rides'; end if;
  update public.rides set volunteer_id = auth.uid(), status = 'accepted', accepted_at = now()
   where id = accept_ride.ride_id and status = 'requested' returning * into r;
  if r.id is null then raise exception 'this ride was already taken'; end if;
  select full_name, vehicle into v from public.profiles where id = auth.uid();
  perform public.notify(r.member_id, 'ride', coalesce(v.full_name, 'A volunteer') || ' is driving you',
    coalesce(v.vehicle, 'Your ride to church is confirmed') || ' · ' || r.requested_for, '/rides', jsonb_build_object('ride_id', r.id));
  return r;
end $$;

create or replace function public.set_ride_status(ride_id uuid, new_status public.ride_status) returns public.rides
language plpgsql security definer set search_path = public as $$
declare r public.rides; who text;
begin
  select * into r from public.rides where id = set_ride_status.ride_id;
  if r.id is null then raise exception 'ride not found'; end if;
  if new_status = 'cancelled' and r.member_id = auth.uid() and r.status in ('requested', 'accepted', 'enroute') then
    null;  -- member cancels
  elsif r.volunteer_id = auth.uid() and new_status in ('enroute', 'arrived', 'completed', 'cancelled') then
    null;  -- assigned driver moves the ride along (or hands it back)
  elsif public.is_staff() then
    null;
  else
    raise exception 'you can''t change this ride';
  end if;

  if new_status = 'cancelled' and r.volunteer_id = auth.uid() and r.member_id <> auth.uid() then
    -- driver hands the ride back to the pool
    update public.rides set status = 'requested', volunteer_id = null, accepted_at = null where id = r.id returning * into r;
    perform public.notify(r.member_id, 'ride', 'Finding you another driver', 'Your driver couldn''t make it. Another volunteer will pick up your ride.', '/rides');
    return r;
  end if;

  update public.rides set status = new_status, completed_at = case when new_status = 'completed' then now() else completed_at end
   where id = r.id returning * into r;
  select coalesce(full_name, 'Your driver') into who from public.profiles where id = r.volunteer_id;
  if new_status = 'enroute' then
    perform public.notify(r.member_id, 'ride', who || ' is on the way', 'Track the car live in the app.', '/rides', jsonb_build_object('ride_id', r.id));
  elsif new_status = 'arrived' then
    perform public.notify(r.member_id, 'ride', who || ' has arrived', 'Your ride is outside.', '/rides', jsonb_build_object('ride_id', r.id));
  elsif new_status = 'cancelled' and r.volunteer_id is not null and r.volunteer_id <> auth.uid() then
    perform public.notify(r.volunteer_id, 'ride', 'Ride cancelled', 'The member cancelled their ride for ' || r.requested_for || '.', '/rides');
  end if;
  return r;
end $$;

-- a new ride request → every volunteer driver
create or replace function public.on_ride_requested() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, route, payload)
  select p.id, 'ride_request', 'New ride request', new.pickup_label || ' · ' || new.requested_for || ' · ' || new.seats || ' seat' || case when new.seats > 1 then 's' else '' end,
         '/rides', jsonb_build_object('ride_id', new.id)
  from public.profiles p where p.role in ('volunteer', 'staff', 'admin') and p.id <> new.member_id;
  return new;
end $$;
drop trigger if exists rides_requested on public.rides;
create trigger rides_requested after insert on public.rides for each row execute function public.on_ride_requested();

-- volunteers only post locations while the ride is live
drop policy if exists "volunteer posts location" on public.ride_locations;
create policy "volunteer posts location" on public.ride_locations for insert with check (
  exists (select 1 from public.rides r where r.id = ride_id and r.volunteer_id = auth.uid() and r.status in ('accepted', 'enroute', 'arrived')));

create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  teams text[] not null default '{}',
  vehicle text,
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'pending',     -- pending | approved | declined
  created_at timestamptz not null default now()
);
alter table public.volunteer_applications enable row level security;
create policy "apply to volunteer" on public.volunteer_applications for insert with check (user_id = auth.uid() and status = 'pending');
create policy "see own application" on public.volunteer_applications for select using (user_id = auth.uid() or public.is_staff());
create policy "staff review applications" on public.volunteer_applications for update using (public.is_staff()) with check (public.is_staff());

-- approving an application makes the member a volunteer
create or replace function public.on_application_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.profiles set role = 'volunteer', vehicle = coalesce(new.vehicle, vehicle) where id = new.user_id and role = 'member';
    perform public.notify(new.user_id, 'volunteer', 'Welcome to the team!', 'You can now see and accept ride requests in the app.', '/rides');
  end if;
  return new;
end $$;
drop trigger if exists volunteer_applications_review on public.volunteer_applications;
create trigger volunteer_applications_review after update on public.volunteer_applications for each row execute function public.on_application_review();

-- ---------------------------------------------------------------- giving
alter table public.donations
  add column if not exists campaign_key text,
  add column if not exists campaign_title text,
  add column if not exists provider text,
  add column if not exists checkout_url text,
  add column if not exists donor_name text,
  add column if not exists donor_email text,
  add column if not exists paid_at timestamptz;
-- donations are created by the create-checkout Edge Function (service role), never directly by clients
drop policy if exists "create pending donation" on public.donations;
create policy "staff manage donations" on public.donations for update using (public.is_staff()) with check (public.is_staff());

create or replace function public.giving_totals() returns table (campaign_key text, raised numeric, gifts int)
language sql stable security definer set search_path = public as $$
  select campaign_key, sum(amount), count(*)::int from public.donations
  where status = 'succeeded' and campaign_key is not null group by campaign_key;
$$;

-- ---------------------------------------------------------------- visitor cards (website "plan a visit")
create table if not exists public.visitor_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text check (email is null or char_length(email) <= 120),
  phone text check (phone is null or char_length(phone) <= 40),
  visit_date text,
  party_size int check (party_size is null or party_size between 1 and 20),
  needs_ride boolean not null default false,
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'new',   -- new | contacted | visited
  created_at timestamptz not null default now()
);
alter table public.visitor_cards enable row level security;
create policy "anyone can send a visitor card" on public.visitor_cards for insert to anon, authenticated with check (status = 'new');
create policy "staff read visitor cards" on public.visitor_cards for select using (public.is_staff());
create policy "staff update visitor cards" on public.visitor_cards for update using (public.is_staff()) with check (public.is_staff());
create policy "staff delete visitor cards" on public.visitor_cards for delete using (public.is_staff());

-- care requests: staff can update status
alter table public.care_requests add column if not exists phone text;
create policy "staff update care" on public.care_requests for update using (public.is_staff()) with check (public.is_staff());
-- staff moderate the prayer wall
create policy "staff delete prayers" on public.prayer_requests for delete using (public.is_staff() or user_id = auth.uid());
-- staff can send a notification to one member or (user_id null) to everyone
create policy "staff send notifications" on public.notifications for insert with check (public.is_staff());

-- ---------------------------------------------------------------- account deletion (required by the App Store)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------- admin dashboard numbers
drop view if exists public.staff_stats;
create view public.staff_stats with (security_invoker = true) as
  select
    (select count(*) from public.profiles) as members,
    (select count(*) from public.profiles where created_at > now() - interval '30 days') as new_members,
    (select count(*) from public.profiles where role in ('volunteer', 'staff', 'admin')) as volunteers,
    (select count(distinct user_id) from public.lesson_progress where completed_at > now() - interval '30 days') as active_learners,
    (select coalesce(sum(views), 0) from public.videos) as total_views,
    (select count(*) from public.rides where status = 'completed') as rides_completed,
    (select count(*) from public.rides where status = 'requested') as rides_open,
    (select count(*) from public.prayer_requests where hidden) as prayers_pending,
    (select count(*) from public.prayer_requests) as prayers_total,
    (select count(*) from public.visitor_cards where status = 'new') as visitors_new,
    (select count(*) from public.care_requests where status = 'open') as care_open,
    (select count(*) from public.volunteer_applications where status = 'pending') as applications_pending,
    (select coalesce(sum(amount), 0) from public.donations where status = 'succeeded' and created_at > date_trunc('month', now())) as giving_this_month;

-- ---------------------------------------------------------------- function grants
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.pray_for(uuid) from anon;
revoke execute on function public.accept_ride(uuid) from anon;
revoke execute on function public.set_ride_status(uuid, public.ride_status) from anon;
revoke execute on function public.join_group(text, text, text) from anon;
revoke execute on function public.start_direct(uuid) from anon;
grant execute on function public.pray_anon(uuid) to anon, authenticated;
grant execute on function public.rsvp_counts() to anon, authenticated;
grant execute on function public.giving_totals() to anon, authenticated;
grant execute on function public.group_member_counts() to anon, authenticated;

-- ---------------------------------------------------------------- realtime
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;
