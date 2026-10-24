-- V2.9.16. REVIEW AND BACK UP FIRST. Requires migrations 10, 11, 12 and 13.
-- Service-role-only policies and per-user overrides. Never grant direct client access.
create table if not exists public.ai_quota_policies (
 account_type text primary key check (account_type in ('guest','verified','admin')),
 limit_count integer not null check(limit_count between 0 and 10000),
 period text not null check(period in ('lifetime','daily','weekly','monthly')),
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
insert into public.ai_quota_policies(account_type,limit_count,period) values
 ('guest',5,'lifetime'),('verified',15,'daily'),('admin',50,'daily')
on conflict(account_type) do nothing;
create table if not exists public.ai_user_quota_overrides (
 user_id uuid primary key references auth.users(id) on delete cascade,
 limit_count integer check(limit_count between 0 and 10000),
 period text check(period in ('lifetime','daily','weekly','monthly')),
 blocked boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.ai_quota_policies enable row level security;
alter table public.ai_user_quota_overrides enable row level security;
revoke all on public.ai_quota_policies, public.ai_user_quota_overrides from anon, authenticated;
create index if not exists ai_request_reservations_recent_v2916 on public.ai_request_reservations(created_at desc,user_id);

-- Account type is derived from auth.users inside the DB, never accepted from clients.
-- Internal administrator role only affects quota after MFA-verified Admin API changes policies;
-- all requests still pass global controls. Admin's account group is selected by DB role.
create or replace function public.ai_quota_snapshot_v2916(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public,auth as $$
declare
 v_type text; v_policy public.ai_quota_policies%rowtype; v_over public.ai_user_quota_overrides%rowtype;
 v_period text; v_limit integer; v_enabled boolean; v_start timestamptz; v_used integer;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then return null; end if;
 select case when u.is_anonymous or u.email_confirmed_at is null then 'guest'
  when exists(select 1 from public.system_admin_roles r where r.user_id=u.id) then 'admin'
  else 'verified' end into v_type from auth.users u where u.id=p_user_id;
 select * into v_policy from public.ai_quota_policies where account_type=v_type;
 if not found then raise exception 'Quota policy missing'; end if;
 select * into v_over from public.ai_user_quota_overrides where user_id=p_user_id;
 v_period:=coalesce(v_over.period,v_policy.period);
 v_limit:=coalesce(v_over.limit_count,v_policy.limit_count);
 v_enabled:=v_policy.enabled and not coalesce(v_over.blocked,false);
 -- All daily/weekly/monthly boundaries are local to Vietnam, not UTC.
 v_start:=case v_period
  when 'daily' then date_trunc('day',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
  when 'weekly' then date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
  when 'monthly' then date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'
  else null end;
 select count(*)::integer into v_used from public.ai_request_reservations r
 where r.user_id=p_user_id and (v_start is null or r.created_at>=v_start);
 return jsonb_build_object('accountType',v_type,'period',v_period,'limit',v_limit,
   'used',v_used,'remaining',greatest(0,v_limit-v_used),'enabled',v_enabled,
   'blocked',coalesce(v_over.blocked,false),'periodStart',v_start,
   'resetAt',case v_period when 'daily' then v_start+interval '1 day'
     when 'weekly' then v_start+interval '7 days'
     when 'monthly' then (date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 month') at time zone 'Asia/Ho_Chi_Minh'
     else null end);
end $$;
revoke all on function public.ai_quota_snapshot_v2916(uuid) from public,anon,authenticated;
grant execute on function public.ai_quota_snapshot_v2916(uuid) to service_role;

-- Serialize per user, preserve historical reservations, reject duplicate IDs and burst abuse.
create or replace function public.reserve_ai_request_v2916(p_user_id uuid,p_request_id uuid,p_question_id text)
returns text language plpgsql security definer set search_path = public,auth as $$
declare v_snapshot jsonb;v_recent integer;
begin
 if auth.role() <> 'service_role' then raise exception 'Forbidden'; end if;
 if p_question_id is null or length(p_question_id)<5 or length(p_question_id)>80 then return 'invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,2916));
 if exists(select 1 from public.ai_request_reservations where user_id=p_user_id and request_id=p_request_id) then return 'duplicate'; end if;
 v_snapshot:=public.ai_quota_snapshot_v2916(p_user_id);
 if v_snapshot is null then return 'invalid'; end if;
 if not (v_snapshot->>'enabled')::boolean then return 'blocked'; end if;
 if (v_snapshot->>'remaining')::integer<=0 then return 'quota'; end if;
 select count(*)::integer into v_recent from public.ai_request_reservations where user_id=p_user_id and created_at>now()-interval '1 minute';
 if v_recent>=6 then return 'rate_limit'; end if;
 insert into public.ai_request_reservations(user_id,request_id,question_id) values(p_user_id,p_request_id,p_question_id);
 return 'reserved';
end $$;
revoke all on function public.reserve_ai_request_v2916(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_request_v2916(uuid,uuid,text) to service_role;
