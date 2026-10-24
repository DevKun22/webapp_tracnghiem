-- Review & backup before applying. Requires 09_v2912_admin_ai_settings.sql. Server-only access.
create table if not exists public.ai_provider_configs (
 provider text primary key check (provider in ('gemini','openai')),
 model text not null,
 encrypted_api_key text not null,
 enabled boolean not null default false,
 last_connected boolean not null default false,
 last_checked_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.ai_provider_configs enable row level security;
revoke all on public.ai_provider_configs from anon, authenticated;
-- Migrate existing OpenAI secret as-is (same AES encryption key), do not rotate the secret.
insert into public.ai_provider_configs(provider,model,encrypted_api_key,enabled,last_connected,last_checked_at)
select 'openai',model,encrypted_api_key,enabled,last_connected,last_checked_at
from public.admin_ai_settings where id=1 and encrypted_api_key is not null
on conflict (provider) do nothing;

create table if not exists public.ai_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 count integer not null default 0 check(count>=0),
 primary key(user_id,usage_day)
);
create table if not exists public.ai_guest_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 count integer not null default 0 check(count>=0)
);
alter table public.ai_daily_usage enable row level security;
alter table public.ai_guest_usage enable row level security;
revoke all on public.ai_daily_usage,public.ai_guest_usage from anon,authenticated;
-- Atomic server-only reservation. Counting attempts prevents unlimited cost during failures; explain to users.
create or replace function public.reserve_ai_request(p_user_id uuid,p_guest boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 if p_guest then
  insert into public.ai_guest_usage(user_id,count) values(p_user_id,1)
  on conflict(user_id) do update set count=ai_guest_usage.count+1 where ai_guest_usage.count<5
  returning count into n;
 else
  insert into public.ai_daily_usage(user_id,usage_day,count) values(p_user_id,(now() at time zone 'UTC')::date,1)
  on conflict(user_id,usage_day) do update set count=ai_daily_usage.count+1 where ai_daily_usage.count<15
  returning count into n;
 end if;
 return n is not null;
end $$;
revoke all on function public.reserve_ai_request(uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_ai_request(uuid,boolean) to service_role;
