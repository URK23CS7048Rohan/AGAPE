-- =====================================================================
-- AGAPE INTERNATIONAL — Supabase schema (Postgres + RLS + Realtime)
-- Run in the Supabase SQL editor, or save as a migration.
-- Mirrors the data model in the proposal: users, courses→modules→lessons,
-- videos/documents, messaging, rides (+ live location log), games,
-- events, giving and notifications.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Users & roles --------------------------------------------
create type public.user_role as enum ('member', 'volunteer', 'staff', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  role public.user_role not null default 'member',
  language text not null default 'en',
  kids_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'));
$$;

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_volunteer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('volunteer','staff','admin'));
$$;

-- create a profile automatically on sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Ministries / small groups --------------------------------
create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  meets text,
  cover_url text,
  created_at timestamptz not null default now()
);
create table public.ministry_members (
  ministry_id uuid references public.ministries on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  is_leader boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (ministry_id, user_id)
);

-- ---------- Content: series, videos, documents -----------------------
create table public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  book text,                       -- organise by book of the Bible…
  topic text,                      -- …or by topic
  cover_url text,
  created_at timestamptz not null default now()
);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references public.series on delete set null,
  title text not null,
  speaker text,
  description text,
  stream_uid text,                 -- Cloudflare Stream / Mux playback id
  youtube_id text,                 -- or embedded YouTube (live)
  duration_sec int,
  is_live boolean not null default false,
  views int not null default 0,
  published_at timestamptz default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  r2_key text not null,            -- object key in Cloudflare R2
  pages int,
  created_at timestamptz not null default now()
);

-- ---------- Courses → modules → lessons ------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  title text not null,
  position int not null default 0
);
create type public.lesson_kind as enum ('video', 'pdf', 'quiz');
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules on delete cascade,
  title text not null,
  kind public.lesson_kind not null,
  video_id uuid references public.videos on delete set null,
  document_id uuid references public.documents on delete set null,
  quiz jsonb,                      -- [{prompt, options[], answer}]
  minutes int,
  position int not null default 0
);
create table public.lesson_progress (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create table public.sermon_notes (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  video_id uuid not null references public.videos on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- ---------- Messaging -----------------------------------------------
create type public.conversation_kind as enum ('direct', 'group', 'announcement');
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  name text,
  ministry_id uuid references public.ministries on delete set null,
  created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid references public.conversations on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at desc);

-- ---------- Prayer wall ---------------------------------------------
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) <= 500),
  anonymous boolean not null default false,
  pray_count int not null default 0,
  answered boolean not null default false,
  hidden boolean not null default false,  -- moderation
  created_at timestamptz not null default now()
);
create table public.prayer_reactions (
  request_id uuid references public.prayer_requests on delete cascade,
  user_id uuid default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
-- public view that never exposes who posted an anonymous request
create view public.prayer_wall with (security_invoker = true) as
  select r.id, r.body, r.anonymous, r.pray_count, r.answered, r.created_at,
         case when r.anonymous then null else p.full_name end as author_name
  from public.prayer_requests r left join public.profiles p on p.id = r.user_id
  where not r.hidden;

create or replace function public.pray_for(request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.prayer_reactions (request_id, user_id) values (pray_for.request_id, auth.uid())
  on conflict do nothing;
  if found then
    update public.prayer_requests set pray_count = pray_count + 1 where id = pray_for.request_id;
  end if;
end $$;

-- confidential pastoral care (staff-only visibility)
create table public.care_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null default 'visit',     -- visit | counselling | other
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------- Bible games ---------------------------------------------
create type public.game_kind as enum ('trivia', 'verse_match');
create table public.question_packs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  game public.game_kind not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.question_packs on delete cascade,
  prompt text not null,            -- trivia question, or verse with ___ blanks
  options jsonb not null,          -- ["Moses","Noah",…]
  answer jsonb not null,           -- 1  or  ["world","Son"]
  reference text                   -- "John 3:16"
);
create table public.game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  game public.game_kind not null,
  points int not null check (points between 0 and 1000),
  created_at timestamptz not null default now()
);
create view public.leaderboard_weekly with (security_invoker = true) as
  select s.user_id, p.full_name, sum(s.points)::int as points
  from public.game_scores s join public.profiles p on p.id = s.user_id
  where s.created_at > now() - interval '7 days'
  group by s.user_id, p.full_name
  order by points desc;

-- ---------- Events ---------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  cover_url text,
  capacity int,
  ministry_id uuid references public.ministries on delete set null,
  is_home_meeting boolean not null default false,   -- home prayer invites
  created_at timestamptz not null default now()
);
create table public.event_rsvps (
  event_id uuid references public.events on delete cascade,
  user_id uuid default auth.uid() references public.profiles on delete cascade,
  checked_in_at timestamptz,                         -- QR check-in
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------- Ride ministry -------------------------------------------
create type public.ride_status as enum ('requested', 'accepted', 'enroute', 'arrived', 'completed', 'cancelled');
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.profiles on delete cascade,
  volunteer_id uuid references public.profiles on delete set null,
  pickup_label text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_label text not null default 'Agape International Church',
  requested_for text not null,     -- e.g. "Sun 9:15 AM" (or change to timestamptz)
  seats int not null default 1 check (seats between 1 and 8),
  notes text,
  status public.ride_status not null default 'requested',
  created_at timestamptz not null default now()
);
create table public.ride_locations (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  recorded_at timestamptz not null default now()
);
create index on public.ride_locations (ride_id, recorded_at desc);
create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  team text not null,              -- driving | ushering | kids | tech …
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

-- ---------- Giving ---------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  goal numeric(12,3) not null,
  raised numeric(12,3) not null default 0,
  cover_url text,
  active boolean not null default true
);
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles on delete set null,
  campaign_id uuid references public.campaigns on delete set null,
  fund text not null default 'Tithe',
  amount numeric(12,3) not null check (amount > 0),
  currency text not null default 'KWD',
  frequency text not null default 'once',   -- once | monthly
  status text not null default 'pending',   -- set to 'succeeded' by the payment webhook
  provider_ref text,
  created_at timestamptz not null default now()
);
create or replace function public.apply_donation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'succeeded' and (old is null or old.status <> 'succeeded') and new.campaign_id is not null then
    update public.campaigns set raised = raised + new.amount where id = new.campaign_id;
  end if;
  return new;
end $$;
create trigger donations_apply after insert or update on public.donations
  for each row execute function public.apply_donation();

-- ---------- Notifications, AI usage ---------------------------------
create table public.push_tokens (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  token text not null,
  platform text,
  primary key (user_id, token)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade,   -- null = broadcast
  kind text not null,              -- new_lesson | ride_assigned | message | announcement
  payload jsonb not null default '{}',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  tokens int,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
do $$ declare t text; begin
  foreach t in array array['profiles','ministries','ministry_members','series','videos','documents','courses','modules','lessons',
    'lesson_progress','sermon_notes','conversations','conversation_members','messages','prayer_requests','prayer_reactions',
    'care_requests','question_packs','questions','game_scores','events','event_rsvps','rides','ride_locations','volunteer_shifts',
    'campaigns','donations','push_tokens','notifications','ai_usage']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- public, read-only content (staff manage it)
do $$ declare t text; begin
  foreach t in array array['ministries','series','videos','documents','courses','modules','lessons','question_packs','questions','events','campaigns']
  loop
    execute format('create policy "read %1$s" on public.%1$I for select using (true)', t);
    execute format('create policy "staff write %1$s" on public.%1$I for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- profiles
create policy "profiles readable by members" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());  -- members can't promote themselves
create policy "staff manage profiles" on public.profiles for all using (public.is_staff());

-- own-row tables
do $$ declare t text; begin
  foreach t in array array['lesson_progress','sermon_notes','push_tokens','volunteer_shifts']
  loop execute format('create policy "own %1$s" on public.%1$I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t); end loop;
end $$;

-- ministries membership
create policy "see memberships" on public.ministry_members for select to authenticated using (true);
create policy "join/leave" on public.ministry_members for all using (user_id = auth.uid()) with check (user_id = auth.uid() and is_leader = false);

-- messaging: members of a conversation only; announcements readable by everyone, written by staff
create policy "see my conversations" on public.conversations for select using (
  kind = 'announcement' or exists (select 1 from public.conversation_members m where m.conversation_id = conversations.id and m.user_id = auth.uid()) or public.is_staff());
create policy "see my memberships" on public.conversation_members for select using (user_id = auth.uid() or public.is_staff());
create policy "read messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.kind = 'announcement'
    or exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid()))));
create policy "send messages" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and (
    (c.kind <> 'announcement' and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid()))
    or (c.kind = 'announcement' and public.is_staff()))));

-- prayer
create policy "read prayer wall" on public.prayer_requests for select to authenticated using (not hidden or user_id = auth.uid() or public.is_staff());
create policy "post prayer" on public.prayer_requests for insert with check (user_id = auth.uid());
create policy "edit own prayer" on public.prayer_requests for update using (user_id = auth.uid() or public.is_staff());
create policy "own reactions" on public.prayer_reactions for select using (user_id = auth.uid());
create policy "own care requests" on public.care_requests for insert with check (user_id = auth.uid());
create policy "staff read care" on public.care_requests for select using (public.is_staff() or user_id = auth.uid());

-- games
create policy "scores readable" on public.game_scores for select to authenticated using (true);
create policy "post own score" on public.game_scores for insert with check (user_id = auth.uid());

-- events
create policy "own rsvps" on public.event_rsvps for all using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- rides
create policy "member sees own rides; volunteers see open + assigned" on public.rides for select using (
  member_id = auth.uid() or volunteer_id = auth.uid() or (public.is_volunteer() and status = 'requested') or public.is_staff());
create policy "member requests ride" on public.rides for insert with check (member_id = auth.uid());
create policy "member cancels own" on public.rides for update using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "volunteer accepts / updates" on public.rides for update using (
  public.is_volunteer() and (status = 'requested' or volunteer_id = auth.uid())) with check (volunteer_id = auth.uid());
create policy "volunteer posts location" on public.ride_locations for insert with check (
  exists (select 1 from public.rides r where r.id = ride_id and r.volunteer_id = auth.uid()));
create policy "ride parties read location" on public.ride_locations for select using (
  exists (select 1 from public.rides r where r.id = ride_id and (r.member_id = auth.uid() or r.volunteer_id = auth.uid())));

-- giving
create policy "own donations" on public.donations for select using (user_id = auth.uid() or public.is_staff());
create policy "create pending donation" on public.donations for insert with check (user_id = auth.uid() and status = 'pending');

-- notifications
create policy "own notifications" on public.notifications for select using (user_id = auth.uid() or user_id is null);
create policy "own ai usage" on public.ai_usage for select using (user_id = auth.uid());

-- realtime feeds (messaging, live ride tracking)
alter publication supabase_realtime add table public.messages, public.ride_locations, public.rides, public.prayer_requests;

-- =====================================================================
-- CMS: website + app content edited in /admin
-- =====================================================================
create table public.site_content (
  key text primary key,                 -- 'site'
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles on delete set null
);
alter table public.site_content enable row level security;
create policy "anyone reads site content" on public.site_content for select using (true);
create policy "staff edit site content" on public.site_content for all using (public.is_staff()) with check (public.is_staff());

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "members read announcements" on public.announcements for select using (true);
create policy "staff manage announcements" on public.announcements for all using (public.is_staff()) with check (public.is_staff());

-- Public image bucket for uploads from /admin (Supabase Storage)
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
    execute 'create policy "public read media" on storage.objects for select using (bucket_id = ''media'')';
    execute 'create policy "staff upload media" on storage.objects for insert with check (bucket_id = ''media'' and public.is_staff())';
    execute 'create policy "staff update media" on storage.objects for update using (bucket_id = ''media'' and public.is_staff())';
    execute 'create policy "staff delete media" on storage.objects for delete using (bucket_id = ''media'' and public.is_staff())';
  end if;
end $$;

alter publication supabase_realtime add table public.site_content, public.announcements;

-- =====================================================================
-- STAFF ANALYTICS (admin dashboard)
-- =====================================================================
create view public.staff_stats with (security_invoker = true) as
  select
    (select count(*) from public.profiles) as members,
    (select count(distinct user_id) from public.lesson_progress where completed_at > now() - interval '30 days') as active_learners,
    (select coalesce(sum(views),0) from public.videos) as total_views,
    (select count(*) from public.rides where status = 'completed') as rides_completed,
    (select coalesce(sum(amount),0) from public.donations where status = 'succeeded' and created_at > date_trunc('month', now())) as giving_this_month;
