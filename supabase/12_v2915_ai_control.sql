-- V2.9.15: Manual review + backup. Run after migrations 10 and 11.
-- Server-side switches. The learner API rejects all calls while tutor_enabled=false.
create table if not exists public.ai_system_control (
 id integer primary key check (id = 1),
 tutor_enabled boolean not null default false,
 firebase_diagnostic_enabled boolean not null default true,
 firebase_learner_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.ai_system_control(id,tutor_enabled,firebase_diagnostic_enabled,firebase_learner_enabled)
 values(1,false,true,false) on conflict(id) do nothing;
alter table public.ai_system_control enable row level security;
revoke all on public.ai_system_control from anon, authenticated;
-- firebase_learner_enabled is deliberately not a learner routing permission;
-- browser-side SDK cannot enforce app quotas when invoked outside of the app.
