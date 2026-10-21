-- DevKunnPy V2 / upgrade existing V1 data IN PLACE; safe to re-run.
-- Run ONLY this migration on your existing V1 project. Do not re-run the V1 seed.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select,insert,update on public.profiles to authenticated;
drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert to authenticated with check (id=(select auth.uid()));
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

-- Intentional LEARNING-only endpoint. Do not use during timed exams:
-- returns explanations and correct answers for active study mode on topic-level bank.
create or replace function public.get_learning_questions(p_topic_id text,p_limit integer default 5)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if (select auth.uid()) is null then raise exception 'Yêu cầu đăng nhập'; end if;
 if p_limit not between 1 and 20 then raise exception 'Số câu không hợp lệ'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'body',s.body,'code',s.code,'explanation',s.explanation,
  'options',(select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'body',o.body,'is_correct',o.is_correct) order by o.label)
    from public.question_options o where o.question_id=s.id))),'[]'::jsonb)
 into result from (
   select q.id,q.body,q.code,q.explanation from public.questions q
   where q.topic_id=p_topic_id and q.verified
    and (select count(*) from public.question_options o where o.question_id=q.id)=4
    and (select count(*) from public.question_options o where o.question_id=q.id and o.is_correct)=1
   order by random() limit p_limit
 ) s;
 return result;
end $$;
revoke all on function public.get_learning_questions(text,integer) from public,anon;
grant execute on function public.get_learning_questions(text,integer) to authenticated;
