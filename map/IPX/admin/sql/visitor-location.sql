-- Run after visitor-analytics.sql in the Supabase SQL Editor.
begin;
alter table public.visitor_sessions add column if not exists ip_address inet;
alter table public.visitor_sessions add column if not exists detected_city text;
alter table public.visitor_sessions add column if not exists detected_state text;
alter table public.visitor_sessions add column if not exists detected_country text;
alter table public.visitor_sessions add column if not exists location_checked_at timestamptz;
-- Only the server may write detected location. Existing admin SELECT policy applies.
grant select, update on public.visitor_sessions to service_role;
notify pgrst, 'reload schema';
commit;
