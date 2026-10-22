-- READ ONLY. Run in Supabase SQL Editor to REVIEW, not delete.
-- Only delete accounts after backup, ownership verification and explicit approval.
select is_anonymous, count(*) as accounts,
       count(*) filter (where created_at < now()-interval '30 days') as older_than_30_days
from auth.users group by is_anonymous;

-- Review how much application data anonymous accounts own.
select u.id as anonymous_user_id, u.created_at,
 (select count(*) from public.exam_attempts a where a.user_id=u.id) as exam_attempts,
 (select count(*) from public.hw_study_progress p where p.user_id=u.id) as hw_progress_rows,
 (select count(*) from public.hw_answer_submissions v where v.user_id=u.id) as answer_votes,
 (select count(*) from public.hw_question_reports r where r.user_id=u.id) as question_reports,
 (select count(*) from public.profiles p where p.id=u.id) as profile_rows
from auth.users u
where u.is_anonymous is true and u.created_at < now()-interval '30 days'
order by u.created_at asc limit 500;

-- Candidate count (NO deletes): only old, without progress, attempts, votes or reports.
select count(*) as old_anonymous_without_activity
from auth.users u
where u.is_anonymous is true and u.created_at < now()-interval '30 days'
 and not exists (select 1 from public.exam_attempts a where a.user_id=u.id)
 and not exists (select 1 from public.hw_study_progress p where p.user_id=u.id)
 and not exists (select 1 from public.hw_answer_submissions v where v.user_id=u.id)
 and not exists (select 1 from public.hw_question_reports r where r.user_id=u.id);
