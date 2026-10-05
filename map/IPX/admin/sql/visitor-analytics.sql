-- Run once in the SQL Editor of the existing Hero Homes Supabase project.
-- Re-running this file is safe. Existing registration and property tables are unchanged.
begin;

create table if not exists public.visitor_profiles (
  id uuid primary key default gen_random_uuid(),
  phone text check (phone ~ '^[0-9]{10}$'),
  name text not null,
  is_registered boolean not null default false,
  email text not null default '',
  city text not null default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  total_sessions bigint not null default 0,
  total_page_views bigint not null default 0
);

-- Upgrade existing installations without changing profile IDs or losing journeys.
alter table public.visitor_profiles alter column phone drop not null;
alter table public.visitor_profiles drop constraint if exists visitor_profiles_phone_key;
alter table public.visitor_profiles add column if not exists is_registered boolean not null default false;
update public.visitor_profiles set is_registered = true where phone is not null and not is_registered;
create index if not exists visitor_profiles_phone_idx on public.visitor_profiles(phone);
create index if not exists visitor_profiles_registration_idx on public.visitor_profiles(is_registered, last_seen desc, id);

create table if not exists public.visitor_sessions (
  id uuid primary key,
  visitor_id uuid not null references public.visitor_profiles(id) on delete cascade,
  started_at timestamptz not null,
  last_activity timestamptz not null,
  landing_page text not null,
  exit_page text not null,
  referrer text not null default '',
  duration_seconds integer not null default 0 check (duration_seconds >= 0)
);

create table if not exists public.visitor_page_views (
  id uuid primary key,
  visitor_id uuid not null references public.visitor_profiles(id) on delete cascade,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  page_key text not null,
  page_name text not null,
  page_url text not null,
  previous_page text not null default '',
  tower text not null default '',
  floor integer,
  unit integer,
  entered_at timestamptz not null,
  last_seen_at timestamptz not null,
  left_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  visit_number integer not null
);

create index if not exists visitor_profiles_last_seen_idx on public.visitor_profiles(last_seen desc, id);
create index if not exists visitor_sessions_visitor_idx on public.visitor_sessions(visitor_id, started_at desc, id);
create index if not exists visitor_page_views_session_idx on public.visitor_page_views(session_id, entered_at, id);
create index if not exists visitor_page_views_repeat_idx on public.visitor_page_views(visitor_id, page_key);

alter table public.visitor_profiles enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.visitor_page_views enable row level security;

-- Match the existing dashboard's Supabase Auth login. Public visitors cannot read leads.
revoke all on public.visitor_profiles, public.visitor_sessions, public.visitor_page_views from anon, authenticated;
grant select on public.visitor_profiles, public.visitor_sessions, public.visitor_page_views to authenticated;
drop policy if exists visitor_profiles_admin_read on public.visitor_profiles;
create policy visitor_profiles_admin_read on public.visitor_profiles for select to authenticated using (true);
drop policy if exists visitor_sessions_admin_read on public.visitor_sessions;
create policy visitor_sessions_admin_read on public.visitor_sessions for select to authenticated using (true);
drop policy if exists visitor_page_views_admin_read on public.visitor_page_views;
create policy visitor_page_views_admin_read on public.visitor_page_views for select to authenticated using (true);

-- Write-only ingestion. UUIDs identify one session/page, making retries idempotent.
create or replace function public.record_visitor_activity(p_event jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(p_event->>'phone', ''), '[^0-9]', '', 'g');
  v_name text := left(trim(coalesce(p_event->>'name', '')), 160);
  v_session uuid := (p_event->>'session_id')::uuid;
  v_page uuid := (p_event->>'id')::uuid;
  v_entered timestamptz := (p_event->>'entered_at')::timestamptz;
  v_seen timestamptz := (p_event->>'last_seen_at')::timestamptz;
  v_left timestamptz := nullif(p_event->>'left_at', '')::timestamptz;
  v_key text := left(coalesce(p_event->>'page_key', ''), 1000);
  v_page_name text := left(coalesce(p_event->>'page_name', ''), 240);
  v_seconds integer;
  v_visitor uuid := nullif(p_event->>'visitor_id', '')::uuid;
  v_registered boolean;
  v_session_row public.visitor_sessions%rowtype;
  v_page_row public.visitor_page_views%rowtype;
  v_new_session integer;
  v_new_page integer := 0;
  v_previous_seconds integer := 0;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := substr(v_phone, 3); end if;
  v_registered := v_phone ~ '^[0-9]{10}$' and v_name <> '';
  if (v_phone <> '' and not v_registered) or (v_visitor is null and not v_registered)
     or v_session is null or v_page is null
     or v_key = '' or v_page_name = '' or v_entered is null or v_seen is null
     or v_entered > now() + interval '5 minutes' or v_entered < now() - interval '30 days'
     or v_seen < v_entered or v_seen > now() + interval '5 minutes' then
    raise exception 'Invalid visitor activity' using errcode = '22023';
  end if;
  v_seconds := greatest(0, least(coalesce((p_event->>'duration_seconds')::integer, 0),
    ceil(extract(epoch from (v_seen - v_entered)))::integer));
  if v_left is not null then v_left := v_seen; end if;

  -- Keep older deployed clients working while the new website is rolled out.
  if v_visitor is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_phone)::bigint);
    select id into v_visitor from public.visitor_profiles where phone = v_phone order by first_seen, id limit 1;
    v_visitor := coalesce(v_visitor, gen_random_uuid());
  end if;

  -- Lock by the visitor ID. Registration enriches this same profile; delayed
  -- anonymous snapshots must never erase a registered person's details.
  insert into public.visitor_profiles as profile (id, phone, name, is_registered, email, city, first_seen, last_seen)
  values (v_visitor, nullif(v_phone, ''), case when v_registered then v_name else v_visitor::text end,
    v_registered, case when v_registered then left(coalesce(p_event->>'email', ''), 254) else '' end,
    case when v_registered then left(coalesce(p_event->>'city', ''), 160) else '' end, v_entered, v_seen)
  on conflict (id) do update set
    phone = case when excluded.is_registered and (not profile.is_registered or excluded.last_seen >= profile.last_seen) then excluded.phone else profile.phone end,
    name = case when excluded.is_registered and (not profile.is_registered or excluded.last_seen >= profile.last_seen) then excluded.name else profile.name end,
    is_registered = profile.is_registered or excluded.is_registered,
    email = case when excluded.is_registered and (not profile.is_registered or excluded.last_seen >= profile.last_seen) and excluded.email <> '' then excluded.email else profile.email end,
    city = case when excluded.is_registered and (not profile.is_registered or excluded.last_seen >= profile.last_seen) and excluded.city <> '' then excluded.city else profile.city end,
    first_seen = least(profile.first_seen, excluded.first_seen),
    last_seen = greatest(profile.last_seen, excluded.last_seen)
  returning id into v_visitor;

  insert into public.visitor_sessions (id, visitor_id, started_at, last_activity, landing_page, exit_page, referrer)
  values (v_session, v_visitor, v_entered, v_seen, v_page_name, v_page_name, left(coalesce(p_event->>'referrer', ''), 1000))
  on conflict (id) do nothing;
  get diagnostics v_new_session = row_count;
  select * into v_session_row from public.visitor_sessions where id = v_session for update;
  if v_session_row.visitor_id <> v_visitor then
    raise exception 'Session does not match visitor' using errcode = '22023';
  end if;

  select * into v_page_row from public.visitor_page_views where id = v_page for update;
  if found then
    if v_page_row.session_id <> v_session or v_page_row.visitor_id <> v_visitor or v_page_row.page_key <> v_key then
      raise exception 'Page does not match session' using errcode = '22023';
    end if;
    v_previous_seconds := v_page_row.duration_seconds;
    v_seconds := greatest(v_seconds, v_previous_seconds);
    update public.visitor_page_views set
      last_seen_at = greatest(last_seen_at, v_seen),
      left_at = case when v_seen >= last_seen_at then v_left else left_at end,
      duration_seconds = v_seconds where id = v_page;
  else
    insert into public.visitor_page_views (id, visitor_id, session_id, page_key, page_name, page_url,
      previous_page, tower, floor, unit, entered_at, last_seen_at, left_at, duration_seconds, visit_number)
    values (v_page, v_visitor, v_session, v_key, v_page_name, left(coalesce(p_event->>'page_url', ''), 1200),
      left(coalesce(p_event->>'previous_page', ''), 240), left(coalesce(p_event->>'tower', ''), 20),
      nullif(p_event->>'floor', '')::integer, nullif(p_event->>'unit', '')::integer,
      v_entered, v_seen, v_left, v_seconds,
      (select count(*) + 1 from public.visitor_page_views where visitor_id = v_visitor and page_key = v_key));
    v_new_page := 1;
  end if;

  update public.visitor_sessions set
    landing_page = case when v_entered < started_at then v_page_name else landing_page end,
    started_at = least(started_at, v_entered),
    exit_page = case when v_seen >= last_activity then v_page_name else exit_page end,
    last_activity = greatest(last_activity, v_seen),
    duration_seconds = duration_seconds + v_seconds - v_previous_seconds
  where id = v_session;
  update public.visitor_profiles set total_sessions = total_sessions + v_new_session,
    total_page_views = total_page_views + v_new_page where id = v_visitor;
end;
$$;
revoke all on function public.record_visitor_activity(jsonb) from public;
grant execute on function public.record_visitor_activity(jsonb) to anon, authenticated;

create or replace function public.visitor_analytics_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'visitors', (select count(*) from public.visitor_profiles),
    'returning_visitors', (select count(*) from public.visitor_profiles where total_sessions > 1),
    'sessions', (select count(*) from public.visitor_sessions),
    'page_views', (select count(*) from public.visitor_page_views),
    'average_session_seconds', (select coalesce(round(avg(duration_seconds)), 0) from public.visitor_sessions)
  );
$$;
revoke all on function public.visitor_analytics_summary() from public, anon;
grant execute on function public.visitor_analytics_summary() to authenticated;

-- Bring existing registrations into the profile list without inventing past journeys.
do $$
begin
  if to_regclass('public.visitors') is not null then
    insert into public.visitor_profiles (phone, name, email, city, first_seen, last_seen, is_registered)
    select distinct on (phone) phone,
      left(coalesce(nullif(row->>'name', ''), nullif(trim(concat_ws(' ', row->>'first_name', row->>'last_name')), ''), 'Visitor'), 160),
      left(coalesce(row->>'email', ''), 254), left(coalesce(row->>'city', ''), 160),
      min(seen) over (partition by phone), max(seen) over (partition by phone), true
    from (
      select row, case when length(digits) = 12 and left(digits, 2) = '91' then substr(digits, 3) else digits end as phone,
        coalesce(nullif(row->>'created_at', '')::timestamptz, now()) as seen
      from (select to_jsonb(v) as row, regexp_replace(coalesce(nullif(to_jsonb(v)->>'mobile', ''), to_jsonb(v)->>'phone', ''), '[^0-9]', '', 'g') as digits
        from public.visitors v) raw
    ) normalized
    where phone ~ '^[0-9]{10}$'
      and not exists (select 1 from public.visitor_profiles existing where existing.phone = normalized.phone)
    order by phone, seen desc;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
