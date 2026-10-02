-- Church life: reading plans + journal, personal prayer list, testimonies, home prayer meetings,
-- Kids / Teens / Agape Squad, serving, service check-in, next steps, and in-app notifications.
-- Safe to run more than once. On an existing project paste this file into Supabase → SQL Editor → Run.

-- ---------------------------------------------------------------- helpers
create or replace function public.short_name(full_name text) returns text
language sql immutable as $$
  select case when coalesce(trim(full_name), '') = '' then null
              when position(' ' in trim(full_name)) = 0 then trim(full_name)
              else split_part(trim(full_name), ' ', 1) || ' ' || left(split_part(trim(full_name), ' ', 2), 1) || '.' end;
$$;
-- a personal notification in the app's Notifications screen
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_route text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, payload) values (p_user, p_kind, jsonb_build_object('title', p_title, 'body', p_body, 'route', p_route));
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
alter table public.notifications add column if not exists read_at timestamptz;
drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

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
  -- [{ "title": "In the beginning", "refs": ["Genesis 1", "John 1:1-5"], "devotion": "…", "prompt": "…" }]
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
grant select on public.reading_plans to anon, authenticated;
grant insert, update, delete on public.reading_plans to authenticated;
grant select, insert, update, delete on public.plan_progress, public.journal_entries to authenticated;
create or replace function public.plan_counts() returns table (plan_id uuid, readers int)
language sql stable security definer set search_path = public as $$
  select plan_id, count(*)::int from public.plan_progress group by plan_id;
$$;
grant execute on function public.plan_counts() to anon, authenticated;

-- ---------------------------------------------------------------- personal prayer list
create table if not exists public.prayer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (length(title) between 1 and 200),
  details text,
  person text,
  answered_at timestamptz,
  answer_note text,
  created_at timestamptz not null default now()
);
alter table public.prayer_items enable row level security;
drop policy if exists "own prayer items" on public.prayer_items;
create policy "own prayer items" on public.prayer_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.prayer_items to authenticated;

-- ---------------------------------------------------------------- testimonies (a pastor approves each one)
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
create policy "share testimony" on public.testimonies for insert to authenticated with check (user_id = auth.uid() or public.is_staff());
create policy "edit own testimony" on public.testimonies for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "delete own testimony" on public.testimonies for delete using (user_id = auth.uid() or public.is_staff());
drop policy if exists "own amens" on public.testimony_amens;
create policy "own amens" on public.testimony_amens for select using (user_id = auth.uid());
grant select, insert, update, delete on public.testimonies to authenticated;
grant select on public.testimony_amens to authenticated;

-- tells the writer their story is live (staff only, approved stories only)
create or replace function public.notify_testimony_live(t uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.testimonies;
begin
  select * into r from public.testimonies where id = t;
  if r.id is null or not r.approved or r.user_id is null then return; end if;
  if not public.is_staff() and current_user in ('authenticated', 'anon') then return; end if;
  perform public.notify(r.user_id, 'testimony', 'Your testimony is live', r.title, '/testimonies');
end $$;
grant execute on function public.notify_testimony_live(uuid) to authenticated;

-- members can't approve or feature their own story or change the amen count
create or replace function public.testimony_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') or coalesce(current_setting('agape.bypass', true), '') = '1' or public.is_staff() then
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
create or replace function public.on_testimony_approved() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.approved and not old.approved then perform public.notify_testimony_live(new.id); end if;
  return new;
end $$;
drop trigger if exists testimony_approved on public.testimonies;
create trigger testimony_approved after update on public.testimonies for each row execute function public.on_testimony_approved();

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
grant select, insert, update, delete on public.home_meetings, public.home_meeting_places to authenticated;
grant select, delete on public.home_meeting_rsvps to authenticated;

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
declare mid uuid;
begin
  if auth.uid() is null then raise exception 'sign in to host a meeting'; end if;
  if p_starts_at < now() - interval '1 hour' then raise exception 'pick a time in the future'; end if;
  if coalesce(trim(p_area), '') = '' or coalesce(trim(p_address), '') = '' then raise exception 'add the area and the address'; end if;
  insert into public.home_meetings (host_id, title, kind, starts_at, area, about, repeats, capacity, language)
  values (auth.uid(), p_title, coalesce(p_kind, 'prayer'), p_starts_at, p_area, p_about, p_repeats, p_capacity, p_language)
  returning id into mid;
  insert into public.home_meeting_places (meeting_id, address, lat, lng, notes) values (mid, p_address, p_lat, p_lng, p_notes);
  return mid;
end $$;
grant execute on function public.host_home_meeting(text, text, timestamptz, text, text, double precision, double precision, text, text, int, text, text) to authenticated;

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
grant select on public.ministry_posts to anon, authenticated;
grant insert, update, delete on public.ministry_posts to authenticated;

-- ---------------------------------------------------------------- serving: opportunities board
create table if not exists public.serve_opportunities (
  id uuid primary key default gen_random_uuid(),
  team text not null,                      -- ushering | kids | tech | worship | hospitality | driving | prayer | cleanup
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
grant select on public.serve_opportunities to anon, authenticated;
grant insert, update, delete on public.serve_opportunities to authenticated;
grant select, delete on public.serve_signups to authenticated;

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

-- staff see who signed up
create or replace function public.staff_serve_signups() returns table (opportunity_id uuid, user_id uuid, full_name text, phone text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.opportunity_id, s.user_id, p.full_name, p.phone, s.created_at
  from public.serve_signups s join public.profiles p on p.id = s.user_id
  where public.is_staff() order by s.created_at;
$$;
grant execute on function public.staff_serve_signups() to authenticated;

-- ---------------------------------------------------------------- service check-in (a code shown at church)
create table if not exists public.checkin_codes (
  code text primary key default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  event_key text not null default 'sunday',
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
grant select, insert, update, delete on public.checkin_codes to authenticated;
grant select on public.checkins to authenticated;

create or replace function public.check_in_self(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.checkin_codes; already boolean;
begin
  if auth.uid() is null then raise exception 'sign in to check in'; end if;
  select * into c from public.checkin_codes where code = upper(trim(regexp_replace(coalesce(p_code, ''), '^.*[:/=]', '')));
  if c.code is null then raise exception 'that code isn''t valid'; end if;
  if c.valid_on <> (now() at time zone 'Asia/Kuwait')::date then raise exception 'that code was for %', to_char(c.valid_on, 'DD Mon'); end if;
  insert into public.checkins (user_id, event_key, title, method) values (auth.uid(), c.event_key, c.title, 'self') on conflict do nothing;
  already := not found;
  return jsonb_build_object('title', c.title, 'event_key', c.event_key, 'already', already);
end $$;
grant execute on function public.check_in_self(text) to authenticated;

create or replace function public.staff_checkins(p_day date default null) returns table (day date, title text, user_id uuid, full_name text, method text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.day, c.title, c.user_id, p.full_name, c.method, c.created_at
  from public.checkins c join public.profiles p on p.id = c.user_id
  where public.is_staff() and (p_day is null or c.day = p_day)
  order by c.created_at desc limit 2000;
$$;
grant execute on function public.staff_checkins(date) to authenticated;

-- ---------------------------------------------------------------- next steps (salvation, baptism, membership…)
create table if not exists public.next_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles on delete set null,
  kind text not null check (kind in ('salvation', 'baptism', 'membership', 'dedication', 'counselling', 'wedding', 'visit')),
  name text,
  phone text,
  details text,
  status text not null default 'new' check (status in ('new', 'contacted', 'done')),
  created_at timestamptz not null default now()
);
alter table public.next_steps enable row level security;
drop policy if exists "request next step" on public.next_steps;
drop policy if exists "see own next steps" on public.next_steps;
drop policy if exists "staff manage next steps" on public.next_steps;
create policy "request next step" on public.next_steps for insert to authenticated with check (user_id = auth.uid());
create policy "see own next steps" on public.next_steps for select using (user_id = auth.uid() or public.is_staff());
create policy "staff manage next steps" on public.next_steps for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff delete next steps" on public.next_steps;
create policy "staff delete next steps" on public.next_steps for delete using (public.is_staff());
grant select, insert, update, delete on public.next_steps to authenticated;

-- ---------------------------------------------------------------- starter content
-- Reading plans (Scripture with short devotions).
-- ---------------------------------------------------------------- reading plans
-- days: [{ title, refs: ["Book 1:1-5", ...], devotion, prompt }]
insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$gospel-of-john$t$, $t$The Gospel of John$t$, $t$21 days with Jesus$t$,
  $t$Walk through John's Gospel one chapter a day, with a short psalm or proverb on some days. Meet Jesus as the Word, the Bread, the Light, the Shepherd and the risen Lord.$t$,
  $t$adults$t$, $t$assets/img/bible-coffee.jpg$t$, $t$#FF5A1F$t$,
  $j$[
  {
    "title": "The Word became flesh",
    "refs": [
      "John 1",
      "Psalm 19"
    ],
    "devotion": "John begins before the beginning: before anything was made, the Word was with God and was God. Then comes the surprise of the whole Bible - that Word became a real man and lived among us. God did not shout instructions from a distance; he moved into the neighbourhood. Wherever you are reading this today, in a flat in Salmiya or on a break at work, Jesus is not far from your ordinary life.",
    "prompt": "Where in my everyday routine do I most need to remember that Jesus came close?"
  },
  {
    "title": "Water into wine",
    "refs": [
      "John 2"
    ],
    "devotion": "Jesus' first sign happens at a family wedding, rescuing a host from embarrassment. Mary's instruction to the servants is simple: whatever he says to you, do it. The servants filled the jars to the brim without knowing what would happen next. Obedience often comes before understanding, and Jesus still loves to turn the ordinary into something rich.",
    "prompt": "What is one simple thing Jesus has asked of me that I have been waiting to understand before obeying?"
  },
  {
    "title": "Born again",
    "refs": [
      "John 3",
      "Psalm 51:10-12"
    ],
    "devotion": "Nicodemus was a respected teacher, yet he came to Jesus at night with honest questions. Jesus told him that no amount of religious effort can replace a new birth from God's Spirit. John 3:16 shows us the heart behind it all: God loved, so God gave. You are not invited to improve yourself into God's family, but to receive new life as a gift.",
    "prompt": "If I explained to a friend what it means to be born again, what would I say?"
  },
  {
    "title": "Living water at the well",
    "refs": [
      "John 4",
      "Psalm 42"
    ],
    "devotion": "Jesus crossed every boundary of his day to speak with a Samaritan woman at noon. He knew her whole story and still offered her living water that would never run dry. She ran back to the very people she had been avoiding, saying, come and see. Our past does not disqualify us from carrying good news; often it becomes the doorway for it.",
    "prompt": "What thirst in my life have I been trying to satisfy with things that never last?"
  },
  {
    "title": "Do you want to be healed?",
    "refs": [
      "John 5"
    ],
    "devotion": "For thirty-eight years a man lay by the pool, waiting for a chance that never came. Jesus asked him a question that sounds strange: do you want to be made well? Sometimes we grow so used to our struggle that hope feels risky. Jesus does not need the stirring of the water; his word is enough.",
    "prompt": "Is there an area of my life where I have stopped hoping for change?"
  },
  {
    "title": "The bread of life",
    "refs": [
      "John 6",
      "Psalm 34:8-10"
    ],
    "devotion": "A boy's small lunch became a meal for thousands in Jesus' hands. The next day the crowd wanted more bread, but Jesus offered himself: I am the bread of life. Many walked away when his words became hard, and Peter answered, Lord, to whom shall we go? When faith feels costly, remember that there is no one else who has the words of eternal life.",
    "prompt": "What small thing can I place in Jesus' hands this week?"
  },
  {
    "title": "Rivers of living water",
    "refs": [
      "John 7"
    ],
    "devotion": "People argued about Jesus - his family, the crowds, the leaders - everyone had an opinion. On the last day of the feast Jesus stood and called out to anyone who was thirsty. He promised that the Spirit would flow out of believers like rivers. Faith is not only about what we receive; God wants his life to flow through us to others.",
    "prompt": "Who around me might be refreshed if God's life flowed through me today?"
  },
  {
    "title": "The light of the world",
    "refs": [
      "John 8",
      "Psalm 27"
    ],
    "devotion": "A woman was dragged before Jesus to be shamed, and he quietly turned the accusers' attention to their own hearts. He did not condemn her, and he did not leave her where she was: go and sin no more. Then he declared, I am the light of the world. His light exposes, but it exposes in order to heal and lead.",
    "prompt": "Where do I need both Jesus' mercy and his call to walk differently?"
  },
  {
    "title": "Once I was blind",
    "refs": [
      "John 9"
    ],
    "devotion": "The disciples wanted someone to blame for the man's blindness, but Jesus saw an opportunity for God's work. After he was healed, the man could not answer every theological question. He simply said, one thing I know: I was blind, and now I see. You do not need to be an expert to tell your story of what Jesus has done.",
    "prompt": "What is my one thing I know - a simple sentence about what Jesus has done for me?"
  },
  {
    "title": "The good shepherd",
    "refs": [
      "John 10",
      "Psalm 23"
    ],
    "devotion": "In the Gulf, many of us know what it is to be far from home and to feel like a number. Jesus says his sheep know his voice and he calls them by name. A hired worker runs when danger comes, but the good shepherd lays down his life. You are known, protected and wanted by the one who gave everything for you.",
    "prompt": "How have I heard the Shepherd's voice in this season?"
  },
  {
    "title": "Resurrection and life",
    "refs": [
      "John 11"
    ],
    "devotion": "Jesus loved Martha, Mary and Lazarus, and yet he waited two days before coming. When he arrived, he did not rush to explain; he wept with them. Then he called a dead man out of the tomb. Jesus' delays are never a lack of love, and his tears show that he enters our grief before he answers it.",
    "prompt": "Where am I waiting on Jesus, and can I trust his love while I wait?"
  },
  {
    "title": "Poured-out love",
    "refs": [
      "John 12",
      "Proverbs 3:5-6"
    ],
    "devotion": "Mary broke open perfume worth a year's wages and poured it on Jesus' feet. Some called it waste, but Jesus called it beautiful. A few days later he spoke of a seed that must fall into the ground and die to bear fruit. Real love for Jesus is often costly, and it is never wasted.",
    "prompt": "What would extravagant love for Jesus look like for me this week?"
  },
  {
    "title": "He washed their feet",
    "refs": [
      "John 13"
    ],
    "devotion": "Jesus knew he had come from God and was going to God - and so he picked up a towel. Security in who we are frees us to serve without needing recognition. He washed even the feet of Judas, who would betray him. Then he gave a new command: love one another as I have loved you.",
    "prompt": "Whose feet - in a practical way - could I wash this week?"
  },
  {
    "title": "Let not your heart be troubled",
    "refs": [
      "John 14",
      "Psalm 46"
    ],
    "devotion": "On the night before the cross, Jesus comforted his friends instead of being comforted. He promised a place prepared for them and a Helper who would never leave. When Thomas asked for directions, Jesus answered, I am the way, the truth, and the life. Our peace does not come from knowing every step, but from knowing the One who is the way.",
    "prompt": "What is troubling my heart today, and how does Jesus' promise speak to it?"
  },
  {
    "title": "Abide in the vine",
    "refs": [
      "John 15",
      "Psalm 1"
    ],
    "devotion": "A branch does not strain to produce grapes; it simply stays connected to the vine. Jesus invites us to abide - to remain, to make our home in him. Pruning can hurt, but the Father prunes in order to bring more fruit. Busy lives in Kuwait can pull us in a dozen directions; staying connected is the main thing.",
    "prompt": "What helps me stay connected to Jesus, and what tends to cut me off?"
  },
  {
    "title": "Take heart",
    "refs": [
      "John 16",
      "Psalm 121"
    ],
    "devotion": "Jesus never promised his followers an easy life. He said plainly, in the world you will have trouble. But he followed it with a stronger word: take heart, I have overcome the world. The Holy Spirit is with us to guide us into truth, and sorrow will one day turn into joy.",
    "prompt": "What trouble am I facing where I need to hear Jesus say, take heart?"
  },
  {
    "title": "Jesus prays for you",
    "refs": [
      "John 17"
    ],
    "devotion": "This whole chapter is Jesus praying, and part of his prayer is for those who would believe later - that means you. He asked the Father to keep us, make us holy through the truth, and make us one. In a church of many languages and nations, our unity is meant to show the world who Jesus is. Read his words slowly, knowing he had you in mind.",
    "prompt": "How can I help our church family be more united this week?"
  },
  {
    "title": "Arrested and denied",
    "refs": [
      "John 18"
    ],
    "devotion": "Jesus stepped forward in the garden and said, I am he - and the soldiers fell back. He was in control even as he was arrested. Meanwhile Peter, warming himself by a fire, denied him three times. If you have ever failed Jesus under pressure, take courage: the story of Peter does not end by that fire.",
    "prompt": "Where have I been tempted to hide my faith because of pressure?"
  },
  {
    "title": "It is finished",
    "refs": [
      "John 19",
      "Psalm 22:1-18"
    ],
    "devotion": "Jesus was mocked, whipped and crucified, and still he cared for his mother from the cross. His final cry was not a cry of defeat: it is finished. The debt was paid in full and nothing needs to be added. Sit for a moment with the cost of your forgiveness, and let gratitude rise.",
    "prompt": "What does it mean to me personally that Jesus said, it is finished?"
  },
  {
    "title": "He is risen",
    "refs": [
      "John 20",
      "Psalm 16:8-11"
    ],
    "devotion": "Mary Magdalene came to the tomb in the dark, weeping, and did not recognise Jesus until he said her name. Thomas doubted until Jesus showed him his hands. The risen Lord meets each person where they are - in grief, in fear, in doubt. John tells us he wrote all this so that we may believe and have life in his name.",
    "prompt": "How has the risen Jesus met me in my grief, fear or doubt?"
  },
  {
    "title": "Breakfast on the beach",
    "refs": [
      "John 21",
      "Psalm 103:1-12"
    ],
    "devotion": "After a long night of empty nets, the disciples found Jesus cooking breakfast over a fire. Beside a fire Peter had denied him three times; now, by another fire, Jesus asked him three times, do you love me? Each answer came with a fresh calling: feed my sheep. Jesus does not just forgive our failures; he restores us and sends us out again.",
    "prompt": "What is Jesus calling me to do next, now that I have walked through John's Gospel?"
  }
]$j$::jsonb,
  true, 1)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$psalms-for-anxious-days$t$, $t$Psalms for anxious days$t$, $t$14 days of peace$t$,
  $t$When worry keeps you up at night, the Psalms give you words to pray. Fourteen psalms to help you bring your fears to God and rest in his care.$t$,
  $t$adults$t$, $t$assets/img/woman-forest.jpg$t$, $t$#4CC3FF$t$,
  $j$[
  {
    "title": "The Lord is my shepherd",
    "refs": [
      "Psalm 23",
      "Matthew 6:25-34"
    ],
    "devotion": "David did not write Psalm 23 from a quiet resort; he knew dark valleys and real enemies. Notice that the shepherd is with us in the valley, not only after it. Jesus later told us to look at the birds and flowers and see how carefully the Father provides. Today, try reading Psalm 23 slowly, one line at a time, and breathe between the lines.",
    "prompt": "Which line of Psalm 23 do I most need to hold onto today?"
  },
  {
    "title": "A very present help",
    "refs": [
      "Psalm 46",
      "Philippians 4:4-9"
    ],
    "devotion": "Psalm 46 imagines the worst - mountains falling into the sea - and still says, we will not fear. God is not a distant help but a very present help. Paul adds a practical step: bring every worry to God in prayer with thanksgiving. Peace is not the absence of problems; it is a guard God places around our hearts and minds.",
    "prompt": "What worries can I name to God right now, one by one, with thanks?"
  },
  {
    "title": "Where does my help come from?",
    "refs": [
      "Psalm 121"
    ],
    "devotion": "Pilgrims sang this psalm as they walked toward Jerusalem, looking up at the hills. The hills were impressive, but they were not the source of help - the Maker of the hills was. The God who keeps you does not sleep, not even during your night shift. You can rest because he never has to.",
    "prompt": "What have I been looking to for help instead of looking to God?"
  },
  {
    "title": "I will lie down in peace",
    "refs": [
      "Psalm 4"
    ],
    "devotion": "Many anxious thoughts arrive at bedtime, just when the house goes quiet. David ends this psalm with a decision: I will both lay me down in peace, and sleep. He was not sleeping because everything was solved, but because the Lord makes us dwell in safety. Tonight, hand the day back to God before you hand your phone over to the charger.",
    "prompt": "What would it look like to give my worries to God before I sleep tonight?"
  },
  {
    "title": "How long, O Lord?",
    "refs": [
      "Psalm 13"
    ],
    "devotion": "Four times David asks, how long? God has given us permission to be honest in prayer, even when the honest words sound like complaint. Yet the psalm turns: but I have trusted in thy mercy. Lament is not a lack of faith; it is faith that keeps talking to God when life hurts.",
    "prompt": "What is my own 'how long' prayer, and can I end it with a 'but I will trust'?"
  },
  {
    "title": "Whom shall I fear?",
    "refs": [
      "Psalm 27"
    ],
    "devotion": "When the Lord is our light and salvation, fear loses its final word. David's deepest desire was not just to escape trouble but to dwell in God's house and see his beauty. Fear shrinks when our attention grows toward God. The psalm ends with simple advice for anxious hearts: wait on the Lord, be strong, take courage.",
    "prompt": "What fear would lose its grip if I focused more on God's beauty and nearness?"
  },
  {
    "title": "He delivered me from all my fears",
    "refs": [
      "Psalm 34"
    ],
    "devotion": "David wrote this psalm after a frightening, humiliating escape. I sought the Lord, he says, and he heard me and delivered me from all my fears. The Lord is near to the broken-hearted - not only to the strong and sorted. Taste and see that he is good, even when today feels bitter.",
    "prompt": "Can I remember a time God delivered me from a fear? How does that help me now?"
  },
  {
    "title": "Fret not",
    "refs": [
      "Psalm 37:1-11"
    ],
    "devotion": "It is easy to lose sleep over the success of people who cheat, or over unfair situations at work. Psalm 37 gives a gentle set of instructions: trust, delight, commit, rest, wait. Fretting only leads to harm, but trusting God frees us to keep doing good. Take one of those five words and practise it today.",
    "prompt": "Which of the five words - trust, delight, commit, rest, wait - do I most need today?"
  },
  {
    "title": "Why are you cast down?",
    "refs": [
      "Psalm 42",
      "Psalm 43"
    ],
    "devotion": "The psalmist talks to his own soul: why art thou cast down? Sometimes we need to stop listening to our feelings and start speaking truth to them. Many of us know the ache of being far from home and family, longing for familiar worship and faces. Hope in God; there are still songs of praise ahead.",
    "prompt": "What truth do I need to speak to my own soul today?"
  },
  {
    "title": "When I am afraid",
    "refs": [
      "Psalm 56"
    ],
    "devotion": "David wrote Psalm 56 when he had been captured by enemies. He did not pretend to be brave: what time I am afraid, I will trust in thee. Fear and faith can exist in the same moment - faith is what we do with our fear. God keeps count of our tossings and collects our tears; nothing you feel is ignored.",
    "prompt": "What am I afraid of today, and what would it look like to trust God with it?"
  },
  {
    "title": "Rest for the soul",
    "refs": [
      "Psalm 62",
      "Matthew 11:28-30"
    ],
    "devotion": "My soul waits in silence for God alone - this is a hard discipline in a noisy world. Psalm 62 invites us to pour out our hearts before him, because he is a refuge. Jesus extends the same invitation to all who are tired and heavy laden. Take five quiet minutes today with no screen, and simply rest in his presence.",
    "prompt": "What do I want to pour out before God in silence today?"
  },
  {
    "title": "Under his wings",
    "refs": [
      "Psalm 91"
    ],
    "devotion": "Psalm 91 paints God as a mother bird covering her young with her feathers. It does not promise that arrows will never fly, but that we have a place to hide. The final verses are God's own voice: I will be with him in trouble. His presence is the deepest promise of all.",
    "prompt": "What does it mean for me to dwell in the shelter of the Most High this week?"
  },
  {
    "title": "A quiet soul",
    "refs": [
      "Psalm 131",
      "1 Peter 5:6-7"
    ],
    "devotion": "This tiny psalm is about letting go of things too great for us. Like a weaned child who rests against its mother without demanding, our souls can learn to be quiet. Peter tells us to cast all our care on God, because he cares for us. Not some of it - all of it.",
    "prompt": "What 'great matter' am I trying to carry that is too big for me?"
  },
  {
    "title": "Fully known, fully held",
    "refs": [
      "Psalm 139"
    ],
    "devotion": "God knows when you sit and when you rise, and every word before you say it. There is no place - no country, no night - where his hand cannot hold you. That knowledge could feel frightening, but David finds it comforting. End this plan the way David ends his psalm: search me, O God, and know my heart, and lead me.",
    "prompt": "What has God shown me about anxiety and trust during these fourteen days?"
  }
]$j$::jsonb,
  true, 2)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$new-believer$t$, $t$First steps with Jesus$t$, $t$7 days for new believers$t$,
  $t$New to faith or new to Agape? A one-week guide to grace, prayer, the Bible, the Holy Spirit, church family and baptism.$t$,
  $t$adults$t$, $t$assets/img/sunrise-silhouettes.jpg$t$, $t$#2ED3A0$t$,
  $j$[
  {
    "title": "Saved by grace",
    "refs": [
      "Ephesians 2:1-10",
      "John 3:16-17"
    ],
    "devotion": "Welcome to the family! The first thing to know is that you did not earn your place, and you cannot lose it by having a bad day. Paul says we are saved by grace through faith, and it is the gift of God. Jesus did not come to condemn you but to save you. Let that settle deep before anything else.",
    "prompt": "How does it feel to know my salvation is a gift, not a reward?"
  },
  {
    "title": "A new creation",
    "refs": [
      "2 Corinthians 5:17-21",
      "Romans 8:1-2"
    ],
    "devotion": "If anyone is in Christ, they are a new creation. Your old record has been dealt with, and there is now no condemnation for those who belong to Jesus. You may still struggle with old habits, but your identity has changed. Growing as a Christian is learning to live like who you already are.",
    "prompt": "What old label do I need to stop wearing now that I am in Christ?"
  },
  {
    "title": "Learning to pray",
    "refs": [
      "Matthew 6:5-15"
    ],
    "devotion": "Prayer is simply talking with God, and you can do it in Malayalam, Tamil, Hindi, Arabic, English - any language you think in. Jesus taught his friends a pattern: honour God, ask for his will, bring your daily needs, forgive and ask forgiveness. You do not need impressive words. Start with five honest minutes a day.",
    "prompt": "What would I like to say to God today, in my own words and my own language?"
  },
  {
    "title": "Reading God's Word",
    "refs": [
      "Psalm 119:97-105",
      "2 Timothy 3:14-17"
    ],
    "devotion": "The Bible is God's word to us, and it is a lamp for our feet - enough light for the next step. You do not have to understand it all at once. Start with a Gospel, read a little each day, and ask: what does this show me about God, and what should I do? This app's reading plans are a good place to keep going.",
    "prompt": "What time and place each day could become my Bible-reading habit?"
  },
  {
    "title": "The Holy Spirit lives in you",
    "refs": [
      "Romans 8:9-17",
      "John 14:15-17"
    ],
    "devotion": "When you trusted Jesus, God gave you his Holy Spirit. He is not a force or a feeling, but a Person - the Helper who guides, comforts and changes us from the inside. Because of the Spirit we can call God Abba, Father. You are never alone, even when you are far from your family.",
    "prompt": "Where do I need the Holy Spirit's help this week?"
  },
  {
    "title": "You belong to a family",
    "refs": [
      "Acts 2:42-47",
      "Hebrews 10:23-25"
    ],
    "devotion": "The first Christians did life together: teaching, meals, prayer and sharing. Following Jesus was never meant to be a solo project. At Agape you will find people from many nations who are learning the same way you are. Join a small group, come on Fridays, and let people know your name.",
    "prompt": "What is one step I can take to get connected at Agape this month?"
  },
  {
    "title": "Baptism and the road ahead",
    "refs": [
      "Romans 6:1-11",
      "Matthew 28:18-20"
    ],
    "devotion": "Baptism is a public picture of an inward reality: we have died with Christ and been raised to new life. Jesus asked his followers to be baptised and to make other disciples. If you have not been baptised yet, talk to one of the pastors - we would love to walk with you. And remember the last promise of Matthew: I am with you always.",
    "prompt": "Who could I share my first steps with Jesus with, and what would I tell them?"
  }
]$j$::jsonb,
  true, 3)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$fruit-of-the-spirit$t$, $t$Fruit of the Spirit$t$, $t$9 days, 9 flavours$t$,
  $t$Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control - one day on each, and how the Spirit grows them in everyday life.$t$,
  $t$adults$t$, $t$assets/img/dove.jpg$t$, $t$#6E4BFF$t$,
  $j$[
  {
    "title": "Love",
    "refs": [
      "Galatians 5:22-23",
      "1 Corinthians 13:1-13"
    ],
    "devotion": "Paul speaks of the fruit of the Spirit, not the fruits - one harvest with nine flavours, and love comes first. Fruit is not manufactured by effort; it grows from a life connected to God. 1 Corinthians 13 shows love in everyday clothes: patient, kind, not keeping a record of wrongs. Read it today and put your own name in place of the word love - then ask God to grow what is missing.",
    "prompt": "Which description of love in 1 Corinthians 13 is hardest for me right now?"
  },
  {
    "title": "Joy",
    "refs": [
      "John 15:9-17",
      "Habakkuk 3:17-19"
    ],
    "devotion": "Jesus wants his joy to be in us, and our joy to be full. Habakkuk shows that joy is deeper than happiness: even if the fig tree does not blossom, yet I will rejoice in the Lord. Joy is rooted in who God is, not in what we have this month. That is good news for anyone waiting on a salary, a visa or a diagnosis.",
    "prompt": "What is one reason to rejoice in God today, even if circumstances are hard?"
  },
  {
    "title": "Peace",
    "refs": [
      "Philippians 4:6-9",
      "John 14:27"
    ],
    "devotion": "Jesus said his peace is not like the world's peace. The world's peace says everything is fine; Jesus' peace says I am with you even when it isn't. Paul shows that peace grows as we pray instead of worry and fill our minds with what is true and lovely. Peace is also something we carry into tense homes and offices.",
    "prompt": "Where can I be a peacemaker this week - at home, at work or in my group chats?"
  },
  {
    "title": "Patience",
    "refs": [
      "James 5:7-11",
      "Psalm 40:1-3"
    ],
    "devotion": "The old word is longsuffering - love that can suffer long without giving up. Farmers wait for rain they cannot control, and James tells us to be patient in the same way. Psalm 40 begins, I waited patiently for the Lord, and it ends in a new song. Patience is not passive; it is trust that keeps going.",
    "prompt": "Who or what is testing my patience, and how might God be growing me through it?"
  },
  {
    "title": "Kindness",
    "refs": [
      "Ephesians 4:29-32",
      "Luke 10:30-37"
    ],
    "devotion": "In Jesus' story, the one who showed kindness was the person no one expected - a Samaritan. Kindness crosses lines of nationality, language and status. In a city full of workers far from home, small kindnesses - a greeting, a cold drink, learning someone's name - matter more than we know. Be kind, tender-hearted, forgiving, as God forgave you.",
    "prompt": "Who is someone I usually walk past that I could show kindness to this week?"
  },
  {
    "title": "Goodness",
    "refs": [
      "Romans 12:9-21",
      "Micah 6:8"
    ],
    "devotion": "Goodness is love in action - doing what is right even when no one is watching. Paul says to hate what is evil, cling to what is good, and overcome evil with good. Micah sums it up: do justly, love mercy, walk humbly with your God. Goodness shows up in honest timesheets, fair treatment of staff and refusing to gossip.",
    "prompt": "Where is God asking me to overcome evil with good right now?"
  },
  {
    "title": "Faithfulness",
    "refs": [
      "Lamentations 3:22-24",
      "Matthew 25:14-30"
    ],
    "devotion": "Our faithfulness begins with God's: his mercies are new every morning, and great is his faithfulness. In Jesus' parable, the servants were not praised for being impressive but for being faithful with what they had. Faithfulness is showing up, keeping your word and finishing what you start. Small things done faithfully over many years make a beautiful life.",
    "prompt": "In what small area is God asking me to be faithful this season?"
  },
  {
    "title": "Gentleness",
    "refs": [
      "Matthew 11:28-30",
      "Proverbs 15:1",
      "Philippians 4:5"
    ],
    "devotion": "Jesus described himself as meek and lowly in heart. Gentleness is not weakness; it is strength under control. A soft answer turns away wrath - something every parent, manager and driver in rush-hour traffic could practise. Let your gentleness be known to all, because the Lord is near.",
    "prompt": "In which conversation do I most need a soft answer this week?"
  },
  {
    "title": "Self-control",
    "refs": [
      "Proverbs 25:28",
      "1 Corinthians 9:24-27",
      "Titus 2:11-14"
    ],
    "devotion": "A person without self-control is like a city with broken walls - anything can walk in. Paul compares the Christian life to athletes who train with discipline for a prize. Notice in Titus that it is grace itself that teaches us to say no to ungodliness. As this plan ends, ask the Spirit to keep growing all nine flavours of his fruit in you.",
    "prompt": "What is one habit where I want the Spirit to grow self-control in me?"
  }
]$j$::jsonb,
  true, 4)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$identity$t$, $t$Who God says you are$t$, $t$7 days for teens$t$,
  $t$Pressure, comparison, phones, friends, failure - one honest week about where your identity really comes from.$t$,
  $t$teens$t$, $t$assets/img/friends-teal.jpg$t$, $t$#FF3D7F$t$,
  $j$[
  {
    "title": "Made on purpose",
    "refs": [
      "Psalm 139:13-16",
      "Genesis 1:26-31"
    ],
    "devotion": "Before your first selfie, before anyone rated you, God was already forming you. You are not an accident, a mistake or a background character. You are made in God's image, and he called what he made very good. That is the starting point - not your grades, not your followers, not your body.",
    "prompt": "If I really believed I was made on purpose, what would change in how I see myself?"
  },
  {
    "title": "Loved before you perform",
    "refs": [
      "Romans 5:6-8",
      "1 John 3:1-3"
    ],
    "devotion": "School, sports and even church can make it feel like you have to earn love. But Jesus died for us while we were still a mess - not after we got it together. You are called a child of God, and that is what you are. You can work hard because you are loved, not so that you will be.",
    "prompt": "Where do I feel like I have to perform to be accepted?"
  },
  {
    "title": "Chosen, not compared",
    "refs": [
      "1 Peter 2:9-10",
      "Galatians 1:10"
    ],
    "devotion": "Comparison is exhausting: someone is always smarter, prettier, richer or funnier. God says you are chosen, royal and his own - and he did not choose you by comparing you. Paul asked himself honestly whether he was trying to please people or God. You do not need everyone's approval when you already have his.",
    "prompt": "Whose approval am I chasing most right now?"
  },
  {
    "title": "What's filling your mind?",
    "refs": [
      "Philippians 4:8",
      "Romans 12:1-2"
    ],
    "devotion": "Your phone is not evil, but it is not neutral either - it is shaping you every time you scroll. Romans 12 says do not be conformed to this world, but be transformed by renewing your mind. Philippians 4:8 is basically a filter for your feed: true, honourable, pure, lovely. Try checking what you watch against that list today.",
    "prompt": "What would my screen time look like if I ran it through Philippians 4:8?"
  },
  {
    "title": "Friends who make you better",
    "refs": [
      "Proverbs 13:20",
      "Ecclesiastes 4:9-12"
    ],
    "devotion": "You become like the people you spend the most time with - online and offline. Good friends pick you up when you fall, and they are honest even when it is awkward. That does not mean dropping everyone who does not believe; it means choosing your closest circle carefully. And it means becoming that kind of friend yourself.",
    "prompt": "Who in my life makes me better, and who could I be a better friend to?"
  },
  {
    "title": "When you mess up",
    "refs": [
      "1 John 1:9",
      "Luke 15:11-24",
      "Psalm 103:8-14"
    ],
    "devotion": "Failing a test, saying something cruel, going too far - shame tells you to hide. The son in Jesus' story rehearsed a speech, but the father ran to him before he could finish. If we confess our sins, God is faithful to forgive and cleanse. Your worst moment is not your identity.",
    "prompt": "Is there something I have been hiding that I need to bring to God - and maybe to a trusted adult?"
  },
  {
    "title": "Sent with a purpose",
    "refs": [
      "Ephesians 2:10",
      "1 Timothy 4:12",
      "Matthew 5:14-16"
    ],
    "devotion": "You are God's workmanship, created for good works he planned in advance. Paul told young Timothy not to let anyone look down on his youth, but to be an example. You do not have to wait until you are older to matter in God's story. Shine right where you are - at school, at home, in the group chat.",
    "prompt": "What is one way I can shine my light this week?"
  }
]$j$::jsonb,
  true, 5)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$proverbs-for-teens$t$, $t$Wisdom for real life$t$, $t$10 days in Proverbs$t$,
  $t$Ten days in the book of Proverbs about trust, words, friends, work, money, pride, parents and your future.$t$,
  $t$teens$t$, $t$assets/img/concert-lights.jpg$t$, $t$#FFC23D$t$,
  $j$[
  {
    "title": "Where wisdom starts",
    "refs": [
      "Proverbs 1:1-9"
    ],
    "devotion": "Proverbs was written to help young people make good choices in a confusing world - sound familiar? It says the fear of the Lord is the beginning of knowledge. That fear is not terror; it is taking God seriously. Knowing a lot of facts is not the same as being wise.",
    "prompt": "What is one decision I am facing where I need wisdom, not just information?"
  },
  {
    "title": "Trust over overthinking",
    "refs": [
      "Proverbs 3:1-12"
    ],
    "devotion": "Trust in the Lord with all your heart and lean not on your own understanding. If you are an overthinker, this is for you. It does not mean switching your brain off; it means not making your own understanding the final boss. In all your ways acknowledge him, and he will direct your paths.",
    "prompt": "What am I overthinking that I could hand to God today?"
  },
  {
    "title": "Guard your heart",
    "refs": [
      "Proverbs 4:20-27"
    ],
    "devotion": "Keep thy heart with all diligence, for out of it are the issues of life. What goes into your heart through your eyes and ears eventually comes out in your words and actions. Guarding your heart is not about being scared of everything; it is about being intentional. Look straight ahead and know where your feet are going.",
    "prompt": "What is one thing I let into my heart that I should guard against?"
  },
  {
    "title": "Words that build",
    "refs": [
      "Proverbs 15:1-4",
      "Proverbs 18:21",
      "Proverbs 12:18"
    ],
    "devotion": "Death and life are in the power of the tongue - and in the power of your thumbs. A reckless comment can cut like a sword, but a wise word brings healing. Before you post, reply or roast someone, ask: will this build up or tear down? You can change someone's whole day with one kind sentence.",
    "prompt": "Who could I send a message of encouragement to today?"
  },
  {
    "title": "Friends and influence",
    "refs": [
      "Proverbs 13:20",
      "Proverbs 27:5-6",
      "Proverbs 27:17"
    ],
    "devotion": "As iron sharpens iron, one friend sharpens another. Real friends tell you the truth even when it stings - the wounds of a friend are faithful. Flattery feels good, but it does not help you grow. Look for friends who make you sharper, and be one.",
    "prompt": "Do I have a friend who tells me the truth? Do I tell my friends the truth?"
  },
  {
    "title": "Work hard",
    "refs": [
      "Proverbs 6:6-11",
      "Colossians 3:23-24"
    ],
    "devotion": "Proverbs sends us to learn from an ant - no boss, yet it works and prepares. A little more sleep, a little more scrolling, and suddenly the assignment is due tomorrow. Paul says to do everything heartily, as for the Lord. Your homework, chores and practice can be a kind of worship.",
    "prompt": "Where am I procrastinating, and what is one step I can take today?"
  },
  {
    "title": "Money and enough",
    "refs": [
      "Proverbs 30:7-9",
      "Proverbs 11:24-25",
      "1 Timothy 6:6-10"
    ],
    "devotion": "One writer in Proverbs prayed for neither poverty nor riches - just enough. Living in the Gulf, it is easy to measure people by their car, phone or brand. Godliness with contentment is great gain. Generous people end up refreshed, not empty.",
    "prompt": "What does 'enough' look like for me, and how could I be generous this week?"
  },
  {
    "title": "Pride and humility",
    "refs": [
      "Proverbs 16:18-19",
      "Proverbs 11:2",
      "James 4:6-10"
    ],
    "devotion": "Pride goes before destruction - it is the trip before the fall. Pride is not just bragging; it is also refusing to ask for help or admit you were wrong. God resists the proud but gives grace to the humble. Humility is not thinking less of yourself, but thinking of yourself less.",
    "prompt": "Where is pride keeping me from asking for help or saying sorry?"
  },
  {
    "title": "Honouring your parents",
    "refs": [
      "Proverbs 1:8-9",
      "Ephesians 6:1-3",
      "Proverbs 23:22-25"
    ],
    "devotion": "Many of us live between two or three cultures, and that can make life at home complicated. Honouring your parents does not mean they are perfect, but it does mean treating them with respect. Listen first, explain calmly, and pray for them. God attached a promise to this command.",
    "prompt": "What is one way I can honour my parents this week?"
  },
  {
    "title": "Your plans, God's direction",
    "refs": [
      "Proverbs 16:1-9",
      "Proverbs 19:21"
    ],
    "devotion": "People ask you all the time what you want to be, and it is fine not to have a perfect answer. Proverbs says we make our plans, but the Lord directs our steps. Commit your work to him and your plans will be established. Make plans, work hard, and hold them with open hands.",
    "prompt": "What plan for my future can I commit to God today?"
  }
]$j$::jsonb,
  true, 6)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$heroes-of-the-bible$t$, $t$Heroes of the Bible$t$, $t$10 brave stories$t$,
  $t$Noah, Abraham, Joseph, Moses, Ruth, David, Daniel, Esther, Mary and Peter - ordinary people who trusted a great big God.$t$,
  $t$kids$t$, $t$assets/img/agape-kids-hearts.jpg$t$, $t$#FF5A1F$t$,
  $j$[
  {
    "title": "Noah",
    "refs": [
      "Genesis 6:9-22"
    ],
    "devotion": "God asked Noah to build a giant boat when there was no rain at all. People probably laughed, but Noah did everything God told him. God kept Noah, his family and the animals safe inside the ark. Afterwards God put a rainbow in the sky as a promise.",
    "prompt": "Draw the ark with your favourite animals inside!"
  },
  {
    "title": "Abraham",
    "refs": [
      "Genesis 12:1-9",
      "Genesis 15:1-6"
    ],
    "devotion": "God told Abraham to pack up and move to a new land. Abraham did not know where he was going, but he trusted God. God took him outside and said, count the stars - your family will be that big! Abraham believed God, even though it took a long time.",
    "prompt": "Can you count some stars tonight? What promise from God can you remember?"
  },
  {
    "title": "Joseph",
    "refs": [
      "Genesis 37:1-11",
      "Genesis 50:20"
    ],
    "devotion": "Joseph's brothers were jealous of him and sold him far away to Egypt. Joseph had a hard time, but God was with him the whole time. Later Joseph became a leader and saved his family from hunger. He forgave his brothers and said God turned the bad into good.",
    "prompt": "Is there someone you need to forgive today?"
  },
  {
    "title": "Moses",
    "refs": [
      "Exodus 14:10-31"
    ],
    "devotion": "God's people were trapped with the sea in front and an army behind them. Moses said, do not be afraid - God will fight for you! God sent a strong wind and made a dry path right through the sea. Everyone walked across safely.",
    "prompt": "Draw the path through the sea with water walls on both sides."
  },
  {
    "title": "Ruth",
    "refs": [
      "Ruth 1:1-18"
    ],
    "devotion": "Ruth's husband died, and her mother-in-law Naomi was very sad. Ruth could have gone home, but she said, where you go, I will go. Ruth was kind and loyal, and she worked hard to help Naomi. God blessed Ruth with a new family.",
    "prompt": "Who can you be kind and loyal to, like Ruth?"
  },
  {
    "title": "David",
    "refs": [
      "1 Samuel 17:32-50"
    ],
    "devotion": "Goliath was a giant soldier, and everyone was scared of him. David was just a shepherd boy, but he knew God was bigger than any giant. He used his sling and one smooth stone, and Goliath fell down. With God, we can be brave too.",
    "prompt": "What feels like a big giant for you? Ask God to help you be brave."
  },
  {
    "title": "Daniel",
    "refs": [
      "Daniel 6:10-23"
    ],
    "devotion": "A new rule said nobody could pray to God, but Daniel kept praying three times a day. He was thrown into a den full of hungry lions! God sent an angel to shut the lions' mouths. In the morning, Daniel came out without a scratch.",
    "prompt": "Draw the lions with their mouths shut tight!"
  },
  {
    "title": "Esther",
    "refs": [
      "Esther 4:12-17"
    ],
    "devotion": "Esther was a queen, and her people were in big danger. Going to the king without being called was very risky. Esther asked everyone to pray, and then she bravely went. God used Esther to save her people.",
    "prompt": "When is a time you need to be brave and speak up?"
  },
  {
    "title": "Mary",
    "refs": [
      "Luke 1:26-38"
    ],
    "devotion": "An angel named Gabriel visited a young woman called Mary. He said she would have a baby - God's own Son, Jesus! Mary was surprised, but she said yes to God. Nothing is impossible with God.",
    "prompt": "How can you say yes to God today?"
  },
  {
    "title": "Peter",
    "refs": [
      "Matthew 14:22-33"
    ],
    "devotion": "One night Jesus walked on the water toward his friends' boat. Peter said, Lord, let me come too - and he stepped out onto the waves! When he looked at the wind he started to sink, but Jesus caught him. Jesus always holds us when we are scared.",
    "prompt": "Draw Peter walking on the water toward Jesus."
  }
]$j$::jsonb,
  true, 7)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$jesus-miracles$t$, $t$Jesus' amazing miracles$t$, $t$7 days of wonder$t$,
  $t$Water into wine, a calm sea, a lunch that fed thousands and more - seven true stories that show Jesus can do anything.$t$,
  $t$kids$t$, $t$assets/img/agape-kids-church.jpg$t$, $t$#4CC3FF$t$,
  $j$[
  {
    "title": "Water into wine",
    "refs": [
      "John 2:1-11"
    ],
    "devotion": "Jesus went to a wedding party, and they ran out of drinks! Jesus told the helpers to fill big jars with water. When they poured it out, it had turned into the best wine. Jesus cares about the big things and the little things.",
    "prompt": "What little thing can you ask Jesus to help with today?"
  },
  {
    "title": "Jesus calms the storm",
    "refs": [
      "Mark 4:35-41"
    ],
    "devotion": "Jesus and his friends were in a boat when a huge storm came. The waves splashed in, and the friends were very scared. Jesus stood up and said, peace, be still - and the storm stopped! Even the wind and waves obey Jesus.",
    "prompt": "What makes you scared? Say, Jesus is with me!"
  },
  {
    "title": "Jesus feeds the crowd",
    "refs": [
      "John 6:1-14"
    ],
    "devotion": "Thousands of people were hungry, and there was no food. A boy shared his lunch: five little loaves and two fish. Jesus thanked God and shared it out - and everyone had enough, with leftovers! When we share, Jesus can do big things.",
    "prompt": "What could you share with someone this week?"
  },
  {
    "title": "Jesus walks on water",
    "refs": [
      "Matthew 14:22-33"
    ],
    "devotion": "In the middle of the night, Jesus walked across the lake on top of the water! His friends thought he was a ghost. Jesus said, take courage, it is I - do not be afraid. Jesus can do things nobody else can do.",
    "prompt": "Draw Jesus walking on the water under the moon."
  },
  {
    "title": "Blind Bartimaeus sees",
    "refs": [
      "Mark 10:46-52"
    ],
    "devotion": "Bartimaeus could not see, and he sat by the road every day. When he heard Jesus was coming, he shouted as loud as he could! People told him to be quiet, but he shouted even louder. Jesus healed him, and he could see!",
    "prompt": "What would you like to ask Jesus for? He always listens."
  },
  {
    "title": "Lazarus, come out!",
    "refs": [
      "John 11:38-44"
    ],
    "devotion": "Jesus' friend Lazarus died, and everyone was very sad - Jesus cried too. Then Jesus stood by the tomb and called, Lazarus, come out! And Lazarus walked out alive! Jesus is stronger than anything, even death.",
    "prompt": "Jesus cried with his friends. Who can you comfort when they are sad?"
  },
  {
    "title": "Ten men, one thank you",
    "refs": [
      "Luke 17:11-19"
    ],
    "devotion": "Ten men were very sick, and Jesus made all of them well. But only one man came back to say thank you. Jesus was happy he came back. Let's remember to say thank you to God every day!",
    "prompt": "Draw or write three things you want to thank God for."
  }
]$j$::jsonb,
  true, 8)
on conflict (slug) do nothing;

insert into public.reading_plans (slug, title, subtitle, description, audience, image, color, days, published, position)
values ($t$creation-week$t$, $t$God made everything$t$, $t$7 days of creation$t$,
  $t$Light, sky, seas, stars, fish, animals and you! Discover the week God made the world, one day at a time.$t$,
  $t$kids$t$, $t$assets/img/kids-play.jpg$t$, $t$#2ED3A0$t$,
  $j$[
  {
    "title": "Day 1: Light",
    "refs": [
      "Genesis 1:1-5"
    ],
    "devotion": "In the beginning there was nothing but darkness. Then God spoke: let there be light! And there was light. God made day and night, and he said it was good.",
    "prompt": "Turn off the light, then turn it on. What can you see now that you couldn't before?"
  },
  {
    "title": "Day 2: Sky",
    "refs": [
      "Genesis 1:6-8"
    ],
    "devotion": "On the second day God made the big blue sky. He put water up high for clouds and water down low. Look up - God made all of that! The sky shows us how big God is.",
    "prompt": "Go outside and look at the sky. What shapes can you see in the clouds?"
  },
  {
    "title": "Day 3: Land, sea and plants",
    "refs": [
      "Genesis 1:9-13"
    ],
    "devotion": "God gathered the water into seas, and dry land appeared. Then he made plants, trees, flowers and fruit - even date palms! Every seed was God's idea. God said, it is good.",
    "prompt": "What is your favourite fruit? Draw it!"
  },
  {
    "title": "Day 4: Sun, moon and stars",
    "refs": [
      "Genesis 1:14-19"
    ],
    "devotion": "God put the sun in the sky to shine in the day. He made the moon and the stars to light up the night. There are more stars than anyone can count, and God knows them all. He knows you too!",
    "prompt": "Draw the sun on one side of your paper and the moon and stars on the other."
  },
  {
    "title": "Day 5: Fish and birds",
    "refs": [
      "Genesis 1:20-23"
    ],
    "devotion": "God filled the sea with fish, whales and wiggly creatures. He filled the sky with birds that sing and fly. Some are tiny and some are huge! God loves making new things.",
    "prompt": "Can you flap like a bird and swim like a fish?"
  },
  {
    "title": "Day 6: Animals and people",
    "refs": [
      "Genesis 1:24-31",
      "Psalm 8"
    ],
    "devotion": "God made camels, cats, lions and every kind of animal. Then God made people - and he made them like himself! He made people from every country and every colour, and he loves them all. God said it was very good.",
    "prompt": "Draw yourself! God made you special."
  },
  {
    "title": "Day 7: God rested",
    "refs": [
      "Genesis 2:1-3"
    ],
    "devotion": "When God finished making everything, he rested on the seventh day. God was not tired - he was enjoying all he had made. He made the day special and holy. We can rest and enjoy God too.",
    "prompt": "What is your favourite thing God made this week? Say thank you to him!"
  }
]$j$::jsonb,
  true, 9)
on conflict (slug) do nothing;

-- Kids / Teens / Squad: Bible stories, memory verses, activities and challenges.
-- (No dated events or videos: the church adds its own real ones in /admin.)
insert into public.ministry_posts (ministry, kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, published, position)
select 'kids', x.kind, x.title, x.body, x.ref, x.youtube_id, x.image, x.color, x.starts_at, x.link, x.pinned, true, x.position
from (values
  ($t$verse$t$, $t$Memory verse of the week$t$,
   $t$And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.$t$,
   $t$Ephesians 4:32$t$, null, $t$assets/img/agape-kids-hearts.jpg$t$, $t$#FF3D7F$t$, null::timestamptz, null, true, 1),
  ($t$story$t$, $t$The boy who shared his lunch$t$,
   $t$One day a huge crowd followed Jesus up a hill to hear him teach. It got late, and everyone's tummies started to rumble. There were no shops nearby, and the disciples did not know what to do. Then a boy came forward with his lunch: five small loaves of bread and two little fish. It wasn't much, but he gave it all to Jesus. Jesus said thank you to God and started sharing it out. Everybody ate until they were full - and there were twelve baskets of leftovers! When we give what we have to Jesus, even if it is small, he can do something amazing with it.$t$,
   $t$John 6:1-14$t$, null, $t$assets/img/kids-play.jpg$t$, $t$#FFC23D$t$, null::timestamptz, null, false, 2),
  ($t$story$t$, $t$Zacchaeus climbs a tree$t$,
   $t$Zacchaeus was a short man, and he was not very popular. He collected taxes and took more money than he should. When Jesus came to his town, Zacchaeus could not see over the crowd. So he ran ahead and climbed up a sycamore tree! Jesus stopped right under the tree, looked up and said, Zacchaeus, come down - I am coming to your house today. Everyone was surprised that Jesus wanted to be his friend. Zacchaeus was so happy that he gave half his things to the poor and paid back everyone he had cheated. Jesus changes our hearts when we meet him.$t$,
   $t$Luke 19:1-10$t$, null, $t$assets/img/agape-kids-church.jpg$t$, $t$#2ED3A0$t$, null::timestamptz, null, false, 3),
  ($t$story$t$, $t$The lost sheep$t$,
   $t$Jesus told a story about a shepherd who had one hundred sheep. One evening he counted them: 97, 98, 99... one was missing! The shepherd did not say, oh well, I still have lots. He left the 99 safe and went looking over the hills and rocks. When he found his little lost sheep, he put it on his shoulders and carried it home. Then he called his friends and had a party! Jesus said God is just like that shepherd. He loves every single person - and that includes you.$t$,
   $t$Luke 15:3-7$t$, null, $t$assets/img/kids-play.jpg$t$, $t$#4CC3FF$t$, null::timestamptz, null, false, 4),
  ($t$activity$t$, $t$Craft: paper-plate lion$t$,
   $t$Remember Daniel in the lions' den? Let's make a lion with its mouth shut tight!
1. Colour a paper plate yellow or orange.
2. Cut strips of brown and orange paper and glue them all around the edge for the mane.
3. Draw two eyes, a nose and a closed, smiling mouth.
4. Write 'My God hath sent his angel' (Daniel 6:22) on the back.
5. Tell someone at home the story of Daniel using your lion!$t$,
   $t$Daniel 6:22$t$, null, $t$assets/img/agape-kids-church.jpg$t$, $t$#FFC23D$t$, null::timestamptz, null, false, 5),
  ($t$activity$t$, $t$Game: pass the blessing$t$,
   $t$A game for the whole family after dinner.
1. Sit in a circle and pick a soft toy or a cushion.
2. Play a worship song. Pass the toy around while the music plays.
3. When the music stops, whoever is holding the toy says one kind thing about the person on their left.
4. Then say a one-sentence prayer for them together.
5. Keep going until everyone has been blessed!$t$,
   $t$1 Thessalonians 5:11$t$, null, $t$assets/img/agape-kids-hearts.jpg$t$, $t$#2ED3A0$t$, null::timestamptz, null, false, 6),
  ($t$challenge$t$, $t$Kindness challenge: 5 in 5$t$,
   $t$Can you do five kind things in five days?
Day 1: Help with dinner without being asked.
Day 2: Draw a picture for someone who looks lonely.
Day 3: Say thank you to a teacher, driver or cleaner.
Day 4: Share a toy or a snack.
Day 5: Pray for someone in your family.
Tell your Kids Church teacher on Friday how it went!$t$,
   $t$Ephesians 4:32$t$, null, $t$assets/img/kids-play.jpg$t$, $t$#FF5A1F$t$, null::timestamptz, null, false, 7),
  ($t$event$t$, $t$Kids Church every Friday$t$,
   $t$Songs, Bible stories, games and crafts for ages 4-11, every Friday at 10:30 AM while the grown-ups are in the main service. Please sign your child in at the kids' desk 10 minutes early and tell us about any allergies.$t$,
   null, null, $t$assets/img/agape-kids-church.jpg$t$, $t$#6E4BFF$t$, ((date_trunc('week', (now() at time zone 'Asia/Kuwait') - interval '4 days 10 hours 30 minutes') + interval '7 days' + interval '4 days 10 hours 30 minutes') at time zone 'Asia/Kuwait')::timestamptz, null, false, 8),
  ($t$event$t$, $t$Kids camp$t$,
   $t$A fun-filled day of games, worship, stories and snacks! Registration opens soon - watch this space and ask at the kids' desk on Friday for details and permission forms.$t$,
   null, null, $t$assets/img/kids-play.jpg$t$, $t$#FF5A1F$t$, ((date_trunc('week', (now() at time zone 'Asia/Kuwait') - interval '4 days') + interval '11 days' + interval '43 days 9 hours') at time zone 'Asia/Kuwait')::timestamptz, null, false, 9),
  ($t$video$t$, $t$David and Goliath$t$,
   $t$Watch the story of the shepherd boy who trusted God against a giant, with Saddleback Kids. What giant do you need God's help with?$t$,
   $t$1 Samuel 17$t$, $t$QuLN7IWFJNY$t$, null, $t$#FF5A1F$t$, null::timestamptz, null, false, 10),
  ($t$video$t$, $t$Daniel and the lions' den$t$,
   $t$Daniel kept praying even when it was against the law. Watch what God did! (Crossroads Kids' Club)$t$,
   $t$Daniel 6$t$, $t$odcRHDqcVlc$t$, null, $t$#FFC23D$t$, null::timestamptz, null, false, 11),
  ($t$video$t$, $t$Jesus calms the storm$t$,
   $t$Wind, waves and a sleeping Jesus - watch this story and more of Jesus' miracles with Saddleback Kids.$t$,
   $t$Mark 4:35-41$t$, $t$XIPxefCrGMA$t$, null, $t$#4CC3FF$t$, null::timestamptz, null, false, 12)
) as x(kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, position)
where (x.kind in ('verse', 'story', 'activity', 'challenge') or (x.kind = 'post' and x.title not like 'Welcome%' and x.title not like 'Auditions%'))
  and not exists (select 1 from public.ministry_posts where ministry = 'kids');

insert into public.ministry_posts (ministry, kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, published, position)
select 'teens', x.kind, x.title, x.body, x.ref, x.youtube_id, x.image, x.color, x.starts_at, x.link, x.pinned, true, x.position
from (values
  ($t$post$t$, $t$Welcome to Agape Teens$t$,
   $t$Hey! This is your space. Agape Teens is for anyone in grades 7-12 - whatever school you go to, whatever language you speak at home, whatever you believe right now. We meet every Friday at 7 PM at Agape Church, Salmiya for worship, real talk, food and games. Bring a friend. Questions are welcome here, and so are you.$t$,
   null, null, $t$assets/img/friends-teal.jpg$t$, $t$#FF3D7F$t$, null::timestamptz, null, true, 1),
  ($t$verse$t$, $t$Verse of the week$t$,
   $t$Let no man despise thy youth; but be thou an example of the believers, in word, in conversation, in charity, in spirit, in faith, in purity.$t$,
   $t$1 Timothy 4:12$t$, null, $t$assets/img/concert-lights.jpg$t$, $t$#6E4BFF$t$, null::timestamptz, null, false, 2),
  ($t$challenge$t$, $t$7-day phone fast$t$,
   $t$For the next 7 days, try this: no phone for the first 30 minutes after you wake up and the last 30 minutes before you sleep. Use that time to read one chapter of a Gospel, pray, or just sit with God. Delete or mute one app that always leaves you feeling worse. Notice how your mind feels by day 7 - and tell us on Friday.$t$,
   $t$Psalm 46:10$t$, null, $t$assets/img/man-reading.jpg$t$, $t$#2ED3A0$t$, null::timestamptz, null, false, 3),
  ($t$challenge$t$, $t$Encourage-a-friend challenge$t$,
   $t$This week, send one genuine encouraging message every day to a different person. Not a meme - actual words. Tell them something you appreciate about them or something you have seen God do in them. It takes thirty seconds and it might be the only kind thing they hear all day.$t$,
   $t$1 Thessalonians 5:11$t$, null, $t$assets/img/friends-teal.jpg$t$, $t$#FFC23D$t$, null::timestamptz, null, false, 4),
  ($t$event$t$, $t$Youth night$t$,
   $t$Worship, a message, snacks and games. Every Friday, 7 PM, Agape Church, Salmiya. New? Just come - someone will be at the door to say hi.$t$,
   null, null, $t$assets/img/concert-lights.jpg$t$, $t$#FF5A1F$t$, ((date_trunc('week', (now() at time zone 'Asia/Kuwait') - interval '4 days 19 hours 0 minutes') + interval '7 days' + interval '4 days 19 hours 0 minutes') at time zone 'Asia/Kuwait')::timestamptz, null, false, 5),
  ($t$event$t$, $t$Teens worship night$t$,
   $t$A whole evening of worship and prayer led by Agape Squad and the youth band. Come ready to sing, pray for each other and meet God. Parents are welcome too.$t$,
   null, null, $t$assets/img/candle-hands.jpg$t$, $t$#6E4BFF$t$, ((date_trunc('week', (now() at time zone 'Asia/Kuwait') - interval '4 days') + interval '11 days' + interval '21 days 19 hours') at time zone 'Asia/Kuwait')::timestamptz, null, false, 6),
  ($t$post$t$, $t$It's okay to not be okay - but don't stay alone$t$,
   $t$A lot of us are carrying stuff no one sees: exam pressure, family stress, loneliness, comparing ourselves online. The Psalms are full of people telling God exactly how they feel, so you can too. But God also gave us people. If you are struggling, talk to a youth leader, a parent or a friend this week. You are not a burden.$t$,
   $t$Psalm 34:18$t$, null, $t$assets/img/woman-forest.jpg$t$, $t$#4CC3FF$t$, null::timestamptz, null, false, 7),
  ($t$post$t$, $t$Faith when you have doubts$t$,
   $t$Doubting doesn't mean you have failed at faith. Thomas doubted, and Jesus came to him and showed him his hands. A man in Mark 9 prayed, Lord, I believe; help thou mine unbelief - and Jesus helped him. Bring your questions on Friday. We would rather wrestle with them together than have you hide them.$t$,
   $t$Mark 9:24$t$, null, $t$assets/img/cross-mountain.jpg$t$, $t$#FF3D7F$t$, null::timestamptz, null, false, 8)
) as x(kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, position)
where (x.kind in ('verse', 'story', 'activity', 'challenge') or (x.kind = 'post' and x.title not like 'Welcome%' and x.title not like 'Auditions%'))
  and not exists (select 1 from public.ministry_posts where ministry = 'teens');

insert into public.ministry_posts (ministry, kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, published, position)
select 'squad', x.kind, x.title, x.body, x.ref, x.youtube_id, x.image, x.color, x.starts_at, x.link, x.pinned, true, x.position
from (values
  ($t$post$t$, $t$Welcome to Agape Squad$t$,
   $t$Agape Squad is our kids & teens worship team - band, singers, dancers and drama. We practise every Saturday at 4 PM at Agape Church, Salmiya. Please bring: a water bottle, your lyrics/chord sheet (or this app), comfortable shoes for dance, and your own instrument if you have one. Arrive 10 minutes early so we can start with prayer. Parents, pick-up is at 6 PM.$t$,
   null, null, $t$assets/img/concert-lights.jpg$t$, $t$#6E4BFF$t$, null::timestamptz, null, true, 1),
  ($t$event$t$, $t$Saturday rehearsal$t$,
   $t$Band, vocals, dance and drama all together this week. We will run the full Friday set twice, then split into teams. Don't forget your water bottle!$t$,
   null, null, $t$assets/img/concert-lights.jpg$t$, $t$#FF5A1F$t$, ((date_trunc('week', (now() at time zone 'Asia/Kuwait') - interval '5 days 16 hours 0 minutes') + interval '7 days' + interval '5 days 16 hours 0 minutes') at time zone 'Asia/Kuwait')::timestamptz, null, false, 2),
  ($t$event$t$, $t$Christmas program$t$,
   $t$Our big Christmas celebration - songs, a nativity drama and dance. Every Squad member has a part! Extra rehearsals will be announced in the Squad chat. Invite your families and friends.$t$,
   null, null, $t$assets/img/candle-hands.jpg$t$, $t$#FF3D7F$t$, ((date_trunc('year', now() at time zone 'Asia/Kuwait') + interval '11 months 24 days 18 hours') at time zone 'Asia/Kuwait')::timestamptz, null, false, 3),
  ($t$post$t$, $t$Auditions: join the Squad$t$,
   $t$Want to sing, play, dance or act? Auditions are open to kids and teens aged 8-17. Prepare one short song or a 1-minute piece (instrumental, dance or drama). It's not about being perfect - we're looking for a willing heart and someone who will show up. Talk to a Squad leader after Friday service to book a slot.$t$,
   null, null, $t$assets/img/friends-teal.jpg$t$, $t$#2ED3A0$t$, null::timestamptz, null, false, 4),
  ($t$activity$t$, $t$5-minute vocal warm-up$t$,
   $t$Do this before every practice and before you sing on Friday.
1. Stand tall, shoulders relaxed. Breathe in slowly for 4 counts, out for 8. Repeat 4 times.
2. Lip trills (brrr like a motorbike) sliding up and down, 1 minute.
3. Hum 'mmm' on a comfortable note, then slide up five notes and back down.
4. Sing 'mee-may-mah-moh-moo' on one note, moving up a step each time.
5. Tongue twister for diction: 'Red leather, yellow leather' five times, getting faster.
6. Finish by singing the first line of this week's song softly.$t$,
   null, null, $t$assets/img/concert-lights.jpg$t$, $t$#FFC23D$t$, null::timestamptz, null, false, 5),
  ($t$challenge$t$, $t$Learn this week's song$t$,
   $t$Before Saturday: listen to this week's song at least 5 times, learn the words of verse 1 and the chorus by heart, and know your part (melody, harmony, chords or moves). Bonus: read the Bible verse the song is based on and tell us what it means to you.$t$,
   null, null, $t$assets/img/man-reading.jpg$t$, $t$#4CC3FF$t$, null::timestamptz, null, false, 6),
  ($t$verse$t$, $t$Our Squad verse$t$,
   $t$And whatsoever ye do, do it heartily, as to the Lord, and not unto men.$t$,
   $t$Colossians 3:23$t$, null, $t$assets/img/dove.jpg$t$, $t$#6E4BFF$t$, null::timestamptz, null, false, 7)
) as x(kind, title, body, ref, youtube_id, image, color, starts_at, link, pinned, position)
where (x.kind in ('verse', 'story', 'activity', 'challenge') or (x.kind = 'post' and x.title not like 'Welcome%' and x.title not like 'Auditions%'))
  and not exists (select 1 from public.ministry_posts where ministry = 'squad');
