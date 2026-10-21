-- DevKunn Learn V2.8.1: phản hồi đề mơ hồ, KHÔNG tính phiếu đáp án.
create table if not exists public.hw_question_reports (
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id text not null,
 question_hash text not null check(length(question_hash) between 6 and 128),
 report_type text not null check(report_type in ('ambiguous','multiple_answers','missing_information')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id, question_id)
);
alter table public.hw_question_reports enable row level security;
drop policy if exists "hw_report_select_own" on public.hw_question_reports;
create policy "hw_report_select_own" on public.hw_question_reports for select to authenticated using(auth.uid()=user_id);
drop policy if exists "hw_report_insert_own" on public.hw_question_reports;
create policy "hw_report_insert_own" on public.hw_question_reports for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "hw_report_update_own" on public.hw_question_reports;
create policy "hw_report_update_own" on public.hw_question_reports for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create index if not exists hw_report_question_idx on public.hw_question_reports(question_id,question_hash,report_type);
