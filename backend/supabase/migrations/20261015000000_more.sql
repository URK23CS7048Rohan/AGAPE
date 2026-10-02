-- =====================================================================
-- Agape v5 — everything the app grew in October 2026:
--   Bible (highlights, bookmarks, reading plans for adults/kids/teens, private journal)
--   Worship song book (ChordPro songs, set lists)
--   More Bible games (+ per-game leaderboards, one daily challenge a day)
--   Testimonies, home prayer meetings (address only after RSVP)
--   Kids / Teens / Agape Squad sections (ministry posts)
--   Volunteer opportunities board, QR check-in, new-member checklist
--   Targeted push campaigns from the admin
-- =====================================================================

-- ---------------------------------------------------------------- games
drop view if exists public.leaderboard_weekly;
alter table public.game_scores alter column game type text using game::text;
alter table public.question_packs alter column game type text using game::text;
drop type if exists public.game_kind;
alter table public.game_scores drop constraint if exists game_scores_game_check;
alter table public.game_scores add constraint game_scores_game_check
  check (game in ('trivia', 'verse_match', 'who_said', 'true_false', 'emoji', 'books_order', 'memory', 'daily'));
alter table public.question_packs drop constraint if exists question_packs_game_check;
alter table public.question_packs add constraint question_packs_game_check
  check (game in ('trivia', 'verse_match', 'who_said', 'true_false', 'emoji'));
alter table public.question_packs add column if not exists audience text not null default 'all';
alter table public.question_packs drop constraint if exists question_packs_audience_check;
alter table public.question_packs add constraint question_packs_audience_check check (audience in ('all', 'kids'));
alter table public.game_scores add column if not exists day date not null default (now() at time zone 'Asia/Kuwait')::date;
create unique index if not exists one_daily_challenge on public.game_scores (user_id, day) where game = 'daily';

create view public.leaderboard_weekly with (security_invoker = true) as
  select s.user_id, p.full_name, sum(s.points)::int as points
  from public.game_scores s join public.profiles p on p.id = s.user_id
  where s.created_at > now() - interval '7 days'
  group by s.user_id, p.full_name
  order by points desc;
grant select on public.leaderboard_weekly to authenticated;

-- Top players for one game (or all), with short names only.
create or replace function public.leaderboard(p_game text default null, p_days int default 7)
returns table (user_id uuid, name text, points int, me boolean)
language sql stable security definer set search_path = public as $$
  select s.user_id, public.short_name(coalesce(p.full_name, 'Member')), sum(s.points)::int, coalesce(s.user_id = auth.uid(), false)
  from public.game_scores s join public.profiles p on p.id = s.user_id
  where s.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 366)))
    and (p_game is null or s.game = p_game)
  group by s.user_id, p.full_name
  order by 3 desc
  limit 25;
$$;
grant execute on function public.leaderboard(text, int) to anon, authenticated;

-- ---------------------------------------------------------------- Bible: highlights, bookmarks, verse notes
create table if not exists public.bible_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  kind text not null check (kind in ('highlight', 'bookmark', 'note')),
  book int not null check (book between 1 and 66),
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  color text,
  note text,
  translation text,
  verse_text text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, book, chapter, verse)
);
alter table public.bible_marks enable row level security;
drop policy if exists "own bible marks" on public.bible_marks;
create policy "own bible marks" on public.bible_marks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- reading plans + journal
create table if not exists public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  audience text not null default 'adults' check (audience in ('adults', 'kids', 'teens')),
  image text,
  color text,
  -- [{ "title": "In the beginning", "refs": ["Genesis 1", "John 1:1-5"], "devotion": "…" }]
  days jsonb not null default '[]'::jsonb check (jsonb_typeof(days) = 'array'),
  published boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.plan_progress (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  plan_id uuid not null references public.reading_plans on delete cascade,
  started_at date not null default (now() at time zone 'Asia/Kuwait')::date,
  done int[] not null default '{}',
  reminder text,                 -- "07:30" (local reminders on the phone)
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  plan_id uuid references public.reading_plans on delete set null,
  day int,
  ref text,
  title text,
  body text not null check (length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reading_plans enable row level security;
alter table public.plan_progress enable row level security;
alter table public.journal_entries enable row level security;
drop policy if exists "read plans" on public.reading_plans;
drop policy if exists "staff write plans" on public.reading_plans;
create policy "read plans" on public.reading_plans for select using (published or public.is_staff());
create policy "staff write plans" on public.reading_plans for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "own plan progress" on public.plan_progress;
create policy "own plan progress" on public.plan_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- how many people are on each plan (shown on plan cards)
create or replace function public.plan_counts() returns table (plan_id uuid, readers int)
language sql stable security definer set search_path = public as $$
  select plan_id, count(*)::int from public.plan_progress group by plan_id;
$$;
grant execute on function public.plan_counts() to anon, authenticated;

-- ---------------------------------------------------------------- worship song book
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text,
  original_key text not null default 'G',
  tempo int,
  time_sig text default '4/4',
  language text not null default 'en',
  tags text[] not null default '{}',
  body text not null,              -- ChordPro: "{verse 1}\n[G]Amazing [G7]grace …"
  youtube_id text,
  copyright text,
  published boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.set_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null,
  service_date date,
  items jsonb not null default '[]'::jsonb,   -- [{ "song": "amazing-grace", "key": "A" }]
  shared boolean not null default false,      -- staff/worship-team sets everyone can see
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.songs enable row level security;
alter table public.set_lists enable row level security;
drop policy if exists "read songs" on public.songs;
drop policy if exists "staff write songs" on public.songs;
create policy "read songs" on public.songs for select using (published or public.is_staff());
create policy "staff write songs" on public.songs for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "read set lists" on public.set_lists;
drop policy if exists "own set lists" on public.set_lists;
drop policy if exists "edit own set lists" on public.set_lists;
drop policy if exists "delete own set lists" on public.set_lists;
create policy "read set lists" on public.set_lists for select using (shared or owner_id = auth.uid() or public.is_staff());
create policy "own set lists" on public.set_lists for insert with check (owner_id = auth.uid() and (not shared or public.is_staff()));
create policy "edit own set lists" on public.set_lists for update using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy "delete own set lists" on public.set_lists for delete using (owner_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------- testimonies
create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles on delete set null,
  author_name text,
  title text not null check (length(title) between 2 and 120),
  body text not null check (length(body) between 10 and 6000),
  category text not null default 'answered prayer',
  anonymous boolean not null default false,
  approved boolean not null default false,
  featured boolean not null default false,
  amens int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.testimony_amens (
  testimony_id uuid not null references public.testimonies on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (testimony_id, user_id)
);
alter table public.testimonies enable row level security;
alter table public.testimony_amens enable row level security;
drop policy if exists "read testimonies" on public.testimonies;
drop policy if exists "share testimony" on public.testimonies;
drop policy if exists "edit own testimony" on public.testimonies;
drop policy if exists "delete own testimony" on public.testimonies;
create policy "read testimonies" on public.testimonies for select using (approved or user_id = auth.uid() or public.is_staff());
create policy "share testimony" on public.testimonies for insert to authenticated with check (user_id = auth.uid());
create policy "edit own testimony" on public.testimonies for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "delete own testimony" on public.testimonies for delete using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own amens" on public.testimony_amens;
create policy "own amens" on public.testimony_amens for select using (user_id = auth.uid());

-- members can't approve their own story, feature it or change the amen count
create or replace function public.testimony_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('agape.bypass', true), '') = '1' or public.is_staff() then
    if tg_op = 'UPDATE' and new.approved and not old.approved and new.user_id is not null then
      perform public.notify(new.user_id, 'testimony', 'Your testimony is live', new.title, '/testimonies');
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.approved := false; new.featured := false; new.amens := 0;
  else
    new.approved := case when new.title is distinct from old.title or new.body is distinct from old.body then false else old.approved end;
    new.featured := old.featured; new.amens := old.amens; new.user_id := old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists testimony_guard on public.testimonies;
create trigger testimony_guard before insert or update on public.testimonies for each row execute function public.testimony_guard();

create or replace view public.testimony_wall as
  select t.id, t.title, t.body, t.category, t.featured, t.amens, t.created_at, t.anonymous,
         case when t.anonymous then null else public.short_name(coalesce(p.full_name, t.author_name)) end as author_name,
         coalesce(t.user_id = auth.uid(), false) as mine,
         exists (select 1 from public.testimony_amens a where a.testimony_id = t.id and a.user_id = auth.uid()) as amened
  from public.testimonies t left join public.profiles p on p.id = t.user_id
  where t.approved;
grant select on public.testimony_wall to anon, authenticated;

create or replace function public.amen(t uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int; owner uuid; ttl text;
begin
  if auth.uid() is null then raise exception 'sign in to say amen'; end if;
  insert into public.testimony_amens (testimony_id, user_id) values (t, auth.uid()) on conflict do nothing;
  if not found then select amens into n from public.testimonies where id = t; return n; end if;
  perform set_config('agape.bypass', '1', true);
  update public.testimonies set amens = amens + 1 where id = t and approved returning amens, user_id, title into n, owner, ttl;
  perform set_config('agape.bypass', '', true);
  if owner is not null and owner <> auth.uid() and n in (1, 10, 50, 100) then
    perform public.notify(owner, 'testimony', n || case when n = 1 then ' person said Amen' else ' people said Amen' end, ttl, '/testimonies');
  end if;
  return coalesce(n, 0);
end $$;
grant execute on function public.amen(uuid) to authenticated;

-- ---------------------------------------------------------------- home prayer meetings
create table if not exists public.home_meetings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (length(title) between 3 and 100),
  about text,
  kind text not null default 'prayer' check (kind in ('prayer', 'bible study', 'worship', 'fellowship')),
  starts_at timestamptz not null,
  repeats text check (repeats in ('weekly', 'monthly')),
  area text not null,                          -- public: "Salmiya, Block 10"
  capacity int check (capacity is null or capacity between 2 and 200),
  language text,
  women_only boolean not null default false,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
-- the exact address is only visible to the host, staff and people who RSVP'd
create table if not exists public.home_meeting_places (
  meeting_id uuid primary key references public.home_meetings on delete cascade,
  address text not null,
  lat double precision,
  lng double precision,
  notes text
);
create table if not exists public.home_meeting_rsvps (
  meeting_id uuid not null references public.home_meetings on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  guests int not null default 0 check (guests between 0 and 10),
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);
alter table public.home_meetings enable row level security;
alter table public.home_meeting_places enable row level security;
alter table public.home_meeting_rsvps enable row level security;

create or replace function public.is_meeting_host(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.home_meetings where id = m and host_id = auth.uid());
$$;
create or replace function public.is_meeting_guest(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.home_meeting_rsvps where meeting_id = m and user_id = auth.uid());
$$;

drop policy if exists "members see meetings" on public.home_meetings;
drop policy if exists "host meetings" on public.home_meetings;
drop policy if exists "host edits meeting" on public.home_meetings;
drop policy if exists "host deletes meeting" on public.home_meetings;
create policy "members see meetings" on public.home_meetings for select to authenticated using (true);
create policy "host meetings" on public.home_meetings for insert to authenticated with check (host_id = auth.uid());
create policy "host edits meeting" on public.home_meetings for update using (host_id = auth.uid() or public.is_staff()) with check (host_id = auth.uid() or public.is_staff());
create policy "host deletes meeting" on public.home_meetings for delete using (host_id = auth.uid() or public.is_staff());
drop policy if exists "address after rsvp" on public.home_meeting_places;
drop policy if exists "host writes address" on public.home_meeting_places;
create policy "address after rsvp" on public.home_meeting_places for select using (public.is_meeting_host(meeting_id) or public.is_meeting_guest(meeting_id) or public.is_staff());
create policy "host writes address" on public.home_meeting_places for all using (public.is_meeting_host(meeting_id) or public.is_staff()) with check (public.is_meeting_host(meeting_id) or public.is_staff());
drop policy if exists "see meeting rsvps" on public.home_meeting_rsvps;
drop policy if exists "leave meeting" on public.home_meeting_rsvps;
create policy "see meeting rsvps" on public.home_meeting_rsvps for select using (user_id = auth.uid() or public.is_meeting_host(meeting_id) or public.is_staff());
create policy "leave meeting" on public.home_meeting_rsvps for delete using (user_id = auth.uid() or public.is_staff());

create or replace view public.home_meeting_list as
  select m.id, m.title, m.about, m.kind, m.starts_at, m.repeats, m.area, m.capacity, m.language, m.women_only, m.cancelled, m.created_at,
         public.short_name(p.full_name) as host_name,
         coalesce((select sum(1 + r.guests) from public.home_meeting_rsvps r where r.meeting_id = m.id), 0)::int as going,
         coalesce(m.host_id = auth.uid(), false) as is_host,
         exists (select 1 from public.home_meeting_rsvps r where r.meeting_id = m.id and r.user_id = auth.uid()) as joined
  from public.home_meetings m join public.profiles p on p.id = m.host_id
  where auth.uid() is not null;
grant select on public.home_meeting_list to authenticated;

create or replace function public.host_home_meeting(
  p_title text, p_kind text, p_starts_at timestamptz, p_area text, p_address text,
  p_lat double precision default null, p_lng double precision default null, p_about text default null,
  p_repeats text default null, p_capacity int default null, p_notes text default null, p_language text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid; nm text;
begin
  if auth.uid() is null then raise exception 'sign in to host a meeting'; end if;
  if p_starts_at < now() - interval '1 hour' then raise exception 'pick a time in the future'; end if;
  insert into public.home_meetings (host_id, title, kind, starts_at, area, about, repeats, capacity, language)
  values (auth.uid(), p_title, coalesce(p_kind, 'prayer'), p_starts_at, p_area, p_about, p_repeats, p_capacity, p_language)
  returning id into mid;
  insert into public.home_meeting_places (meeting_id, address, lat, lng, notes) values (mid, p_address, p_lat, p_lng, p_notes);
  return mid;
end $$;
grant execute on function public.host_home_meeting(text, text, timestamptz, text, text, double precision, double precision, text, text, int, text, text) to authenticated;

-- RSVP; returns the address so the app can show directions straight away
create or replace function public.join_home_meeting(m uuid, p_guests int default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mt public.home_meetings; taken int; pl public.home_meeting_places; nm text;
begin
  if auth.uid() is null then raise exception 'sign in to join'; end if;
  select * into mt from public.home_meetings where id = m;
  if mt.id is null or mt.cancelled then raise exception 'this meeting is not happening'; end if;
  select coalesce(sum(1 + guests), 0) into taken from public.home_meeting_rsvps where meeting_id = m and user_id <> auth.uid();
  if mt.capacity is not null and taken + 1 + coalesce(p_guests, 0) > mt.capacity then raise exception 'this meeting is full'; end if;
  insert into public.home_meeting_rsvps (meeting_id, user_id, guests) values (m, auth.uid(), coalesce(p_guests, 0))
  on conflict (meeting_id, user_id) do update set guests = excluded.guests;
  if mt.host_id <> auth.uid() then
    select full_name into nm from public.profiles where id = auth.uid();
    perform public.notify(mt.host_id, 'meeting', coalesce(public.short_name(nm), 'Someone') || ' is coming', mt.title, '/home-prayer/' || m);
  end if;
  select * into pl from public.home_meeting_places where meeting_id = m;
  return jsonb_build_object('address', pl.address, 'lat', pl.lat, 'lng', pl.lng, 'notes', pl.notes);
end $$;
grant execute on function public.join_home_meeting(uuid, int) to authenticated;

-- tell everyone who's coming when the host cancels
create or replace function public.on_meeting_cancelled() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.cancelled and not old.cancelled then
    for r in select user_id from public.home_meeting_rsvps where meeting_id = new.id loop
      perform public.notify(r.user_id, 'meeting', 'Meeting cancelled', new.title, '/home-prayer');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists meeting_cancelled on public.home_meetings;
create trigger meeting_cancelled after update on public.home_meetings for each row execute function public.on_meeting_cancelled();

-- ---------------------------------------------------------------- Kids / Teens / Agape Squad
create table if not exists public.ministry_posts (
  id uuid primary key default gen_random_uuid(),
  ministry text not null check (ministry in ('kids', 'teens', 'squad')),
  kind text not null default 'post' check (kind in ('video', 'story', 'verse', 'event', 'post', 'activity', 'challenge')),
  title text not null,
  body text,
  ref text,                 -- memory verse reference
  youtube_id text,
  image text,
  color text,
  starts_at timestamptz,    -- for events / practices
  link text,
  pinned boolean not null default false,
  published boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ministry_posts enable row level security;
drop policy if exists "read ministry posts" on public.ministry_posts;
drop policy if exists "staff write ministry posts" on public.ministry_posts;
create policy "read ministry posts" on public.ministry_posts for select using (published or public.is_staff());
create policy "staff write ministry posts" on public.ministry_posts for all using (public.is_staff()) with check (public.is_staff());

-- the Teens, Squad, Kids-parents and Worship-team chats can always be joined, even if they aren't on the website
create or replace function public.join_group(group_key text, group_name text, group_color text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; k text := public.slugify(group_key); site jsonb;
begin
  if auth.uid() is null then raise exception 'sign in to join a group'; end if;
  select data into site from public.site_content where key = 'site';
  if k not in ('teens', 'agape-squad', 'kids-parents', 'worship-team') and site is not null and jsonb_typeof(site->'ministries') = 'array' and not exists (
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

-- ---------------------------------------------------------------- volunteer opportunities board
create table if not exists public.serve_opportunities (
  id uuid primary key default gen_random_uuid(),
  team text not null,                      -- ushering | kids | tech | worship | hospitality | driving | prayer
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  slots int not null default 4 check (slots between 1 and 500),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.serve_signups (
  opportunity_id uuid not null references public.serve_opportunities on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);
alter table public.serve_opportunities enable row level security;
alter table public.serve_signups enable row level security;
drop policy if exists "read opportunities" on public.serve_opportunities;
drop policy if exists "staff write opportunities" on public.serve_opportunities;
create policy "read opportunities" on public.serve_opportunities for select using (published or public.is_staff());
create policy "staff write opportunities" on public.serve_opportunities for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "see signups" on public.serve_signups;
drop policy if exists "cancel signup" on public.serve_signups;
create policy "see signups" on public.serve_signups for select using (user_id = auth.uid() or public.is_staff());
create policy "cancel signup" on public.serve_signups for delete using (user_id = auth.uid() or public.is_staff());

create or replace view public.serve_board as
  select o.id, o.team, o.title, o.description, o.starts_at, o.ends_at, o.location, o.slots,
         (select count(*) from public.serve_signups s where s.opportunity_id = o.id)::int as taken,
         exists (select 1 from public.serve_signups s where s.opportunity_id = o.id and s.user_id = auth.uid()) as mine
  from public.serve_opportunities o
  where o.published and coalesce(o.ends_at, o.starts_at) > now() - interval '6 hours';
grant select on public.serve_board to anon, authenticated;

create or replace function public.serve_sign_up(o uuid) returns int
language plpgsql security definer set search_path = public as $$
declare op public.serve_opportunities; n int;
begin
  if auth.uid() is null then raise exception 'sign in to serve'; end if;
  select * into op from public.serve_opportunities where id = o and published;
  if op.id is null then raise exception 'not found'; end if;
  select count(*) into n from public.serve_signups where opportunity_id = o;
  if n >= op.slots and not exists (select 1 from public.serve_signups where opportunity_id = o and user_id = auth.uid()) then
    raise exception 'all spots are taken';
  end if;
  insert into public.serve_signups (opportunity_id, user_id) values (o, auth.uid()) on conflict do nothing;
  perform public.notify(auth.uid(), 'serve', 'You''re on the team', op.title || ' · ' || to_char(op.starts_at at time zone 'Asia/Kuwait', 'Dy DD Mon, HH12:MI AM'), '/serve');
  return n + 1;
end $$;
grant execute on function public.serve_sign_up(uuid) to authenticated;

-- ---------------------------------------------------------------- QR check-in
create table if not exists public.checkin_codes (
  code text primary key default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  event_key text not null,
  title text not null,
  valid_on date not null default (now() at time zone 'Asia/Kuwait')::date,
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  event_key text not null,
  title text,
  day date not null default (now() at time zone 'Asia/Kuwait')::date,
  method text not null default 'self' check (method in ('self', 'staff')),
  checked_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, event_key, day)
);
alter table public.checkin_codes enable row level security;
alter table public.checkins enable row level security;
drop policy if exists "staff manage codes" on public.checkin_codes;
create policy "staff manage codes" on public.checkin_codes for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "see own checkins" on public.checkins;
create policy "see own checkins" on public.checkins for select using (user_id = auth.uid() or public.is_staff());

-- member scans the code shown at church
create or replace function public.check_in_self(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.checkin_codes; already boolean;
begin
  if auth.uid() is null then raise exception 'sign in to check in'; end if;
  select * into c from public.checkin_codes where code = upper(trim(regexp_replace(p_code, '^.*[:/]', '')));
  if c.code is null then raise exception 'that code isn''t valid'; end if;
  if c.valid_on <> (now() at time zone 'Asia/Kuwait')::date then raise exception 'that code was for %', to_char(c.valid_on, 'DD Mon'); end if;
  insert into public.checkins (user_id, event_key, title, method) values (auth.uid(), c.event_key, c.title, 'self') on conflict do nothing;
  already := not found;
  return jsonb_build_object('title', c.title, 'event_key', c.event_key, 'already', already);
end $$;
grant execute on function public.check_in_self(text) to authenticated;

-- a volunteer/staff scans a member's QR card
create or replace function public.check_in_member(p_member text, p_event_key text, p_title text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.profiles; already boolean; k text := coalesce(nullif(p_event_key, ''), 'sunday');
begin
  if not (public.is_staff() or public.is_volunteer()) then raise exception 'only the welcome team can check people in'; end if;
  select * into p from public.profiles where member_no = upper(trim(regexp_replace(p_member, '^.*[:/]', ''))) or id::text = trim(p_member);
  if p.id is null then raise exception 'member not found'; end if;
  insert into public.checkins (user_id, event_key, title, method, checked_by) values (p.id, k, coalesce(p_title, initcap(replace(k, '-', ' '))), 'staff', auth.uid())
  on conflict do nothing;
  already := not found;
  return jsonb_build_object('name', p.full_name, 'member_no', p.member_no, 'already', already);
end $$;
grant execute on function public.check_in_member(text, text, text) to authenticated;

-- ---------------------------------------------------------------- new-member checklist
create or replace function public.welcome_progress() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', exists (select 1 from public.profiles where id = auth.uid() and full_name is not null and phone is not null),
    'group', exists (select 1 from public.conversation_members m join public.conversations c on c.id = m.conversation_id
                     where m.user_id = auth.uid() and c.topic_key like 'group:%'),
    'plan', exists (select 1 from public.plan_progress where user_id = auth.uid()),
    'visit', exists (select 1 from public.checkins where user_id = auth.uid()),
    'event', exists (select 1 from public.event_rsvps where user_id = auth.uid()),
    'serve', exists (select 1 from public.serve_signups where user_id = auth.uid())
          or exists (select 1 from public.volunteer_applications where user_id = auth.uid()),
    'pastor', exists (select 1 from public.care_requests where user_id = auth.uid())
  );
$$;
grant execute on function public.welcome_progress() to authenticated;

-- ---------------------------------------------------------------- targeted push campaigns
create table if not exists public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  route text,
  -- everyone | members | volunteers | staff | group:<key> | ministry:kids|teens|squad | language:<code> | plan:<slug> | event:<key>
  audience text not null default 'everyone',
  send_at timestamptz,
  sent_at timestamptz,
  sent_count int not null default 0,
  created_by uuid default auth.uid() references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table public.push_campaigns enable row level security;
drop policy if exists "staff manage campaigns" on public.push_campaigns;
create policy "staff manage campaigns" on public.push_campaigns for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.campaign_audience(a text) returns setof uuid
language plpgsql stable security definer set search_path = public as $$
declare kind text := split_part(a, ':', 1); val text := nullif(substr(a, length(split_part(a, ':', 1)) + 2), '');
begin
  if kind = 'everyone' or kind = 'members' then return query select id from public.profiles;
  elsif kind = 'volunteers' then return query select id from public.profiles where role in ('volunteer', 'staff', 'admin');
  elsif kind = 'staff' then return query select id from public.profiles where role in ('staff', 'admin');
  elsif kind = 'group' then return query select m.user_id from public.conversation_members m join public.conversations c on c.id = m.conversation_id where c.topic_key = 'group:' || public.slugify(val);
  elsif kind = 'ministry' then return query
    select m.user_id from public.conversation_members m join public.conversations c on c.id = m.conversation_id
    where c.topic_key = 'group:' || case val when 'squad' then 'agape-squad' when 'kids' then 'kids-parents' else val end
    union select id from public.profiles where val = 'kids' and coalesce((settings->>'kidsMode')::boolean, false);
  elsif kind = 'language' then return query select id from public.profiles where coalesce(settings->>'language', 'en') = val;
  elsif kind = 'plan' then return query select pp.user_id from public.plan_progress pp join public.reading_plans r on r.id = pp.plan_id where r.slug = val;
  elsif kind = 'event' then return query select user_id from public.event_rsvps where event_key = val;
  end if;
end $$;
revoke execute on function public.campaign_audience(text) from public, anon, authenticated;

create or replace function public.send_campaign(c uuid) returns int
language plpgsql security definer set search_path = public as $$
declare cp public.push_campaigns; n int := 0; u uuid;
begin
  if auth.uid() is not null and not public.is_staff() then raise exception 'staff only'; end if;
  select * into cp from public.push_campaigns where id = c for update;
  if cp.id is null or cp.sent_at is not null then return 0; end if;
  for u in select distinct x from public.campaign_audience(cp.audience) x loop
    perform public.notify(u, 'campaign', cp.title, cp.body, cp.route, jsonb_build_object('campaign', cp.id));
    n := n + 1;
  end loop;
  update public.push_campaigns set sent_at = now(), sent_count = n where id = c;
  return n;
end $$;
grant execute on function public.send_campaign(uuid) to authenticated;

create or replace function public.send_due_campaigns() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.push_campaigns where sent_at is null and send_at is not null and send_at <= now() loop
    n := n + public.send_campaign(r.id);
  end loop;
  return n;
end $$;
revoke execute on function public.send_due_campaigns() from public, anon, authenticated;

create or replace function public.on_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.send_at is null or new.send_at <= now() then perform public.send_campaign(new.id); end if;
  return new;
end $$;
drop trigger if exists campaign_created on public.push_campaigns;
create trigger campaign_created after insert on public.push_campaigns for each row execute function public.on_campaign();

-- scheduled campaigns go out every minute when pg_cron is available (it is on Supabase)
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('agape-campaigns', '* * * * *', 'select public.send_due_campaigns()');
exception when others then raise notice 'pg_cron not available; scheduled campaigns need send_due_campaigns() to be called';
end $$;

-- ---------------------------------------------------------------- staff dashboard numbers
create or replace view public.staff_stats_more with (security_invoker = true) as
  select
    (select count(*) from public.checkins where day > (now() at time zone 'Asia/Kuwait')::date - 7)::int as checkins_week,
    (select count(*) from public.testimonies where not approved)::int as testimonies_waiting,
    (select count(*) from public.home_meetings where not cancelled and starts_at > now())::int as home_meetings_upcoming,
    (select count(distinct user_id) from public.plan_progress where updated_at > now() - interval '7 days')::int as readers_week,
    (select count(*) from public.serve_signups s join public.serve_opportunities o on o.id = s.opportunity_id where o.starts_at > now())::int as serve_upcoming;
grant select on public.staff_stats_more to authenticated;

-- ---------------------------------------------------------------- realtime
do $$ begin
  alter publication supabase_realtime add table public.testimonies;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.home_meeting_rsvps;
exception when others then null; end $$;
