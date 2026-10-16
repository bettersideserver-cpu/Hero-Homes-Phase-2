-- Run once in the Hero Homes Supabase SQL Editor after visitor-analytics.sql.
-- Matches the existing dashboard's authenticated-user access policy.
begin;
grant delete on public.visitor_profiles to authenticated;
drop policy if exists visitor_profiles_admin_delete on public.visitor_profiles;
create policy visitor_profiles_admin_delete on public.visitor_profiles
  for delete to authenticated using (true);
-- Foreign keys cascade deletion to sessions and page views.
-- One transaction resets all analytics, regardless of dashboard pagination.
create or replace function public.delete_all_visitor_details()
returns bigint language plpgsql security invoker set search_path = '' as $$
declare deleted_count bigint;
begin
  delete from public.visitor_profiles;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_all_visitor_details() from public, anon;
grant execute on function public.delete_all_visitor_details() to authenticated;
notify pgrst, 'reload schema';
commit;
