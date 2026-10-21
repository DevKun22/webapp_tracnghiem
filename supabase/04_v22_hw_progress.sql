-- DevKunnPy 2.2 incremental migration. Run AFTER 03_v2_migration.sql.
-- Does not delete existing questions, attempts, or profiles.
create table if not exists public.hw_study_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  progress jsonb not null default '{"index":0,"completed":[],"notes":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,document_id),
  constraint document_id_reasonable check (char_length(document_id) between 1 and 90),
  constraint progress_size_limit check (pg_column_size(progress) < 500000)
);
alter table public.hw_study_progress enable row level security;
grant select,insert,update on public.hw_study_progress to authenticated;
drop policy if exists hw_progress_select on public.hw_study_progress;
create policy hw_progress_select on public.hw_study_progress for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists hw_progress_insert on public.hw_study_progress;
create policy hw_progress_insert on public.hw_study_progress for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists hw_progress_update on public.hw_study_progress;
create policy hw_progress_update on public.hw_study_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
