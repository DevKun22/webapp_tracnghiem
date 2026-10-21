-- DevKunn Learn V2.8: user contributed answers; apply AFTER 04_v22_hw_progress.sql.
-- Community consensus is NEVER a verified answer for official exams.
create table if not exists public.hw_answer_submissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  question_hash text not null check (length(question_hash) between 6 and 128),
  option_id text not null check (option_id in ('A','B','C','D')),
  source text not null default 'learner_selected' check (source in ('learner_selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,question_id)
);
create index if not exists hw_answer_submissions_question_idx on public.hw_answer_submissions(question_id,question_hash);
alter table public.hw_answer_submissions enable row level security;
drop policy if exists "hw_submissions_select_own" on public.hw_answer_submissions;
create policy "hw_submissions_select_own" on public.hw_answer_submissions for select to authenticated using (auth.uid()=user_id);
drop policy if exists "hw_submissions_insert_own" on public.hw_answer_submissions;
create policy "hw_submissions_insert_own" on public.hw_answer_submissions for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "hw_submissions_update_own" on public.hw_answer_submissions;
create policy "hw_submissions_update_own" on public.hw_answer_submissions for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

-- Execute on the server, not by reading other users' submissions.
-- 20 distinct account votes and >=80% gives a community-only label.
-- A hash mismatch naturally isolates differing question versions (not cryptographic verification).
create or replace function public.get_hw_answer_consensus(p_question_id text)
returns table(option_id text,votes integer,total integer,percentage numeric,status text)
language sql security definer set search_path = '' stable
as $$
 with last_version as (
   select s.question_hash from public.hw_answer_submissions s
   where s.question_id=p_question_id
   group by s.question_hash order by count(*) desc, max(s.updated_at) desc limit 1
 ), sample as (
   select s.option_id from public.hw_answer_submissions s
   join last_version v on s.question_hash=v.question_hash
   where s.question_id=p_question_id
 ), grouped as (
   select a.option_id,count(s.option_id)::integer as n from
   (values ('A'),('B'),('C'),('D')) as a(option_id)
   left join sample s on s.option_id=a.option_id
   group by a.option_id
 ), totals as(select sum(n)::integer as all_votes,max(n)::integer as top_votes from grouped)
 select g.option_id,g.n,t.all_votes,
   case when t.all_votes=0 then 0 else round(100.0*g.n/t.all_votes,1) end,
   case when t.all_votes>=20 and 100.0*t.top_votes/t.all_votes>=80
     and g.n=t.top_votes then 'community_accepted' else 'collecting' end
 from grouped g cross join totals t order by g.option_id;
$$;
revoke all on function public.get_hw_answer_consensus(text) from public;
grant execute on function public.get_hw_answer_consensus(text) to authenticated;
-- For managed Auth anon users (authenticated role), the one-person-one-account limit
-- does NOT prevent a bad actor from creating many accounts. Do not grant verified status.
