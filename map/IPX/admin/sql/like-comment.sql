-- Run in the existing Supabase project SQL Editor.
begin;
create table if not exists public.page_feedback (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null,
 kind text not null check (kind in ('like', 'comment')),
 page_key text not null check (length(page_key) between 1 and 2048),
 page_url text not null check (length(page_url) <= 4096),
 page_name text not null check (length(page_name) <= 500),
 tower text not null default '', floor integer, unit integer,
 visitor_name text not null default '' check (length(visitor_name) <= 200),
 comment text not null default '' check (length(comment) <= 2000),
 created_at timestamptz not null default now(),
 check (kind <> 'comment' or length(trim(comment)) > 0)
);
create unique index if not exists page_feedback_like_unique on public.page_feedback(client_id, page_key) where kind = 'like';
create index if not exists page_feedback_date on public.page_feedback(created_at desc);
alter table public.page_feedback enable row level security;
revoke all on public.page_feedback from anon, authenticated;
grant select, delete on public.page_feedback to authenticated;
drop policy if exists feedback_admin_read on public.page_feedback;
create policy feedback_admin_read on public.page_feedback for select to authenticated using (true);
drop policy if exists feedback_admin_delete on public.page_feedback;
create policy feedback_admin_delete on public.page_feedback for delete to authenticated using (true);
-- Client UUID is an unguessable device token. Public users cannot read feedback or identities.
create or replace function public.submit_page_feedback(
 p_client uuid, p_kind text, p_context jsonb, p_name text default '',
 p_liked boolean default true, p_comment text default '', p_request uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_key text := p_context->>'page_key';
begin
 if p_client is null or p_kind not in ('like', 'comment') or p_kind is null
 or v_key is null or length(v_key) not between 1 and 2048 then
   raise exception 'Invalid feedback';
 end if;
 if p_kind = 'like' and not p_liked then
   delete from public.page_feedback where client_id = p_client and page_key = v_key and kind = 'like';
   return;
 end if;
 if p_kind = 'comment' and p_request is null then raise exception 'Missing request ID'; end if;
 insert into public.page_feedback(id, client_id, kind, page_key, page_url, page_name, tower, floor, unit, visitor_name, comment)
 values (case when p_kind = 'comment' then p_request else gen_random_uuid() end,
 p_client, p_kind, v_key, coalesce(p_context->>'page_url', ''), coalesce(p_context->>'page_name', ''),
 coalesce(p_context->>'tower', ''), (p_context->>'floor')::integer, (p_context->>'unit')::integer,
 coalesce(p_name, ''), case when p_kind = 'comment' then trim(p_comment) else '' end)
 on conflict do nothing;
end $$;
revoke all on function public.submit_page_feedback(uuid,text,jsonb,text,boolean,text,uuid) from public;
grant execute on function public.submit_page_feedback(uuid,text,jsonb,text,boolean,text,uuid) to anon, authenticated;
commit;
