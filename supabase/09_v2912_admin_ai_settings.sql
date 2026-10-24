-- V2.9.12: Review, backup and run only once on the correct Supabase project.
-- The encryption key stays in Vercel environment, NEVER in SQL or frontend.
create table if not exists public.admin_ai_settings (
 id integer primary key check (id = 1),
 provider text not null check (provider = 'openai'),
 model text not null,
 encrypted_api_key text,
 enabled boolean not null default false,
 last_connected boolean not null default false,
 last_checked_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.admin_ai_settings enable row level security;
revoke all on public.admin_ai_settings from anon, authenticated;
create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;
-- No RLS policies for frontend users. Only the trusted backend service role accesses these tables.
