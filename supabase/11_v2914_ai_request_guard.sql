-- V2.9.14: Execute after 10_v2913_ai_gateway.sql. Backup DB before applying.
-- Private reservation ledger. No authenticated client access.
create table if not exists public.ai_request_reservations (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 question_id text not null,
 created_at timestamptz not null default now(),
 primary key (user_id,request_id)
);
alter table public.ai_request_reservations enable row level security;
revoke all on public.ai_request_reservations from anon, authenticated;
create index if not exists ai_request_reservations_user_created on public.ai_request_reservations(user_id,created_at desc);

create or replace function public.reserve_ai_request_v2914(
 p_user_id uuid, p_guest boolean, p_request_id uuid, p_question_id text
) returns text language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if length(p_question_id) > 80 then return 'invalid'; end if;
 -- Lock prevents double-spend and race conditions on a per-user basis.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 2914));
 if exists(select 1 from public.ai_request_reservations where user_id=p_user_id and request_id=p_request_id) then return 'duplicate'; end if;
 if p_guest then
  insert into public.ai_guest_usage(user_id,count) values(p_user_id,1)
  on conflict(user_id) do update set count=ai_guest_usage.count+1 where ai_guest_usage.count<5
  returning count into n;
 else
  insert into public.ai_daily_usage(user_id,usage_day,count) values(p_user_id,(now() at time zone 'UTC')::date,1)
  on conflict(user_id,usage_day) do update set count=ai_daily_usage.count+1 where ai_daily_usage.count<15
  returning count into n;
 end if;
 if n is null then return 'quota'; end if;
 insert into public.ai_request_reservations(user_id,request_id,question_id) values(p_user_id,p_request_id,p_question_id);
 return 'reserved';
end $$;
revoke all on function public.reserve_ai_request_v2914(uuid,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_request_v2914(uuid,boolean,uuid,text) to service_role;
