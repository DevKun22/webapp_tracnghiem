-- PyPrep v1 — run once in Supabase SQL Editor (new project recommended)
create extension if not exists pgcrypto;
create table if not exists public.topics(id text primary key,title text not null,description text not null default '',sort_order int not null default 0);
create table if not exists public.questions(id uuid primary key default gen_random_uuid(),topic_id text not null references public.topics(id),body text not null,code text,difficulty text not null default 'easy' check(difficulty in ('easy','medium','hard')),explanation text not null,source text not null default 'Biên soạn từ đề cương ôn tập Python',verified boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.question_options(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions(id) on delete cascade,label text not null check(label in ('A','B','C','D')),body text not null,is_correct boolean not null default false,unique(question_id,label));
create unique index if not exists one_correct_per_question on public.question_options(question_id) where is_correct;
create table if not exists public.exam_attempts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),mode text not null default 'exam' check(mode in ('exam','practice')),status text not null default 'in_progress' check(status in ('in_progress','submitted')),duration_minutes integer not null check(duration_minutes between 5 and 180),question_count integer not null check(question_count between 1 and 100),started_at timestamptz not null default now(),expires_at timestamptz not null,submitted_at timestamptz,score numeric(5,2),correct_count int,wrong_count int,unanswered_count int);
create index if not exists attempts_user_idx on public.exam_attempts(user_id,started_at desc);
create table if not exists public.exam_questions(attempt_id uuid not null references public.exam_attempts(id) on delete cascade,question_id uuid not null references public.questions(id),position int not null,option_order uuid[] not null,primary key(attempt_id,question_id),unique(attempt_id,position));
create table if not exists public.exam_answers(attempt_id uuid not null,question_id uuid not null,chosen_option_id uuid,flagged boolean not null default false,updated_at timestamptz not null default now(),primary key(attempt_id,question_id),foreign key(attempt_id,question_id) references public.exam_questions(attempt_id,question_id) on delete cascade);

alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_answers enable row level security;
-- Only the RPCs (SECURITY DEFINER) can read exam data; clients cannot directly read answers or modify scores.
revoke all on public.questions,public.question_options,public.exam_attempts,public.exam_questions,public.exam_answers from anon,authenticated;
grant select on public.topics to anon,authenticated;
drop policy if exists topics_read on public.topics;
create policy topics_read on public.topics for select to anon,authenticated using (true);

-- A stable JSON projection, never includes the answer key before submission.
create or replace function public.get_exam(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exam_attempts; q jsonb; result jsonb;
begin
 select * into a from public.exam_attempts where id=p_attempt_id and user_id=(select auth.uid());
 if not found then raise exception 'Không tìm thấy bài thi của bạn'; end if;
 if a.status='in_progress' and now()>=a.expires_at then perform public.submit_exam(p_attempt_id); select * into a from public.exam_attempts where id=p_attempt_id; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',q0.id,'topic_id',q0.topic_id,'body',q0.body,'code',q0.code,'difficulty',q0.difficulty,'position',eq.position,'options',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',chr(64+z.ord::int),'body',o.body) order by z.ord),'[]'::jsonb) from unnest(eq.option_order) with ordinality z(oid,ord) join public.question_options o on o.id=z.oid),'chosen_option_id',ea.chosen_option_id,'flagged',coalesce(ea.flagged,false)) order by eq.position),'[]'::jsonb) into q from public.exam_questions eq join public.questions q0 on q0.id=eq.question_id left join public.exam_answers ea on ea.attempt_id=eq.attempt_id and ea.question_id=eq.question_id where eq.attempt_id=a.id;
 result=jsonb_build_object('id',a.id,'status',a.status,'mode',a.mode,'started_at',a.started_at,'expires_at',a.expires_at,'submitted_at',a.submitted_at,'duration_minutes',a.duration_minutes,'question_count',a.question_count,'questions',q,'score',a.score,'correct_count',a.correct_count,'wrong_count',a.wrong_count,'unanswered_count',a.unanswered_count);
 return result;
end $$;

create or replace function public.start_exam(p_topic_ids text[],p_count int default 60,p_minutes int default 50,p_mode text default 'exam',p_random_questions boolean default true,p_random_options boolean default true) returns jsonb language plpgsql security definer set search_path = '' as $$
declare aid uuid; available int; uid uuid; picked record; opts uuid[]; pos int:=0;
begin
 uid=(select auth.uid());if uid is null then raise exception 'Bạn cần đăng nhập để tạo bài thi';end if;
 if p_topic_ids is null or cardinality(p_topic_ids)=0 then raise exception 'Hãy chọn ít nhất một chủ đề';end if;
 if p_count<1 or p_count>100 or p_minutes<5 or p_minutes>180 then raise exception 'Số câu hoặc thời gian ngoài giới hạn';end if;
 if p_mode not in ('exam','practice') then raise exception 'Chế độ không hợp lệ';end if;
 select count(*) into available from public.questions q where q.verified and q.topic_id=any(p_topic_ids) and (select count(*) from public.question_options o where o.question_id=q.id)=4 and (select count(*) from public.question_options o where o.question_id=q.id and o.is_correct)=1;
 if available<p_count then raise exception 'Ngân hàng câu hỏi chỉ có % câu phù hợp, vui lòng giảm số câu hoặc chọn thêm chủ đề',available;end if;
 insert into public.exam_attempts(user_id,mode,duration_minutes,question_count,expires_at) values(uid,p_mode,p_minutes,p_count,now()+make_interval(mins=>p_minutes)) returning id into aid;
 for picked in select q.id from public.questions q where q.verified and q.topic_id=any(p_topic_ids) and (select count(*) from public.question_options o where o.question_id=q.id)=4 and (select count(*) from public.question_options o where o.question_id=q.id and o.is_correct)=1 order by case when p_random_questions then random() else 0 end,q.created_at,q.id limit p_count loop
  pos:=pos+1;
  select array_agg(o.id order by case when p_random_options then random() else 0 end,o.label) into opts from public.question_options o where o.question_id=picked.id;
  insert into public.exam_questions(attempt_id,question_id,position,option_order) values(aid,picked.id,pos,opts);
 end loop;
 return public.get_exam(aid);
end $$;

create or replace function public.save_answer(p_attempt_id uuid,p_question_id uuid,p_option_id uuid default null,p_flagged boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exam_attempts;
begin
 select * into a from public.exam_attempts where id=p_attempt_id and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Không tìm thấy bài thi';end if;
 if a.status<>'in_progress' or now()>=a.expires_at then raise exception 'Bài thi đã kết thúc, không thể thay đổi đáp án';end if;
 if not exists(select 1 from public.exam_questions where attempt_id=p_attempt_id and question_id=p_question_id) then raise exception 'Câu hỏi không thuộc bài thi';end if;
 if p_option_id is not null and not exists(select 1 from public.question_options where id=p_option_id and question_id=p_question_id) then raise exception 'Đáp án không hợp lệ';end if;
 insert into public.exam_answers(attempt_id,question_id,chosen_option_id,flagged) values(p_attempt_id,p_question_id,p_option_id,p_flagged) on conflict(attempt_id,question_id) do update set chosen_option_id=excluded.chosen_option_id,flagged=excluded.flagged,updated_at=now();
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.submit_exam(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exam_attempts; correct_n int; answered_n int;
begin
 select * into a from public.exam_attempts where id=p_attempt_id and user_id=(select auth.uid()) for update;
 if not found then raise exception 'Không tìm thấy bài thi';end if;
 if a.status='submitted' then return jsonb_build_object('ok',true,'already_submitted',true);end if;
 select count(*) filter(where o.is_correct),count(ea.chosen_option_id) into correct_n,answered_n from public.exam_questions eq left join public.exam_answers ea on ea.attempt_id=eq.attempt_id and ea.question_id=eq.question_id left join public.question_options o on o.id=ea.chosen_option_id and o.question_id=eq.question_id where eq.attempt_id=p_attempt_id;
 update public.exam_attempts set status='submitted',submitted_at=now(),score=round(correct_n::numeric*10/a.question_count,2),correct_count=correct_n,wrong_count=answered_n-correct_n,unanswered_count=a.question_count-answered_n where id=p_attempt_id;
 return jsonb_build_object('ok',true,'already_submitted',false);
end $$;

create or replace function public.get_review(p_attempt_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.exam_attempts; items jsonb;
begin
 select * into a from public.exam_attempts where id=p_attempt_id and user_id=(select auth.uid());
 if not found or a.status<>'submitted' then raise exception 'Bài thi chưa được nộp hoặc không tồn tại';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'position',eq.position,'topic_id',q.topic_id,'body',q.body,'code',q.code,'chosen_option_id',ea.chosen_option_id,'correct_option_id',(select o2.id from public.question_options o2 where o2.question_id=q.id and o2.is_correct),'explanation',q.explanation,'is_correct',coalesce(ans.is_correct,false),'options',(select jsonb_agg(jsonb_build_object('id',o.id,'label',chr(64+z.ord::int),'body',o.body) order by z.ord) from unnest(eq.option_order) with ordinality z(oid,ord) join public.question_options o on o.id=z.oid)) order by eq.position),'[]'::jsonb) into items from public.exam_questions eq join public.questions q on q.id=eq.question_id left join public.exam_answers ea on ea.attempt_id=eq.attempt_id and ea.question_id=eq.question_id left join public.question_options ans on ans.id=ea.chosen_option_id where eq.attempt_id=a.id;
 return jsonb_build_object('attempt_id',a.id,'score',a.score,'correct_count',a.correct_count,'wrong_count',a.wrong_count,'unanswered_count',a.unanswered_count,'question_count',a.question_count,'submitted_at',a.submitted_at,'items',items);
end $$;

create or replace function public.list_my_attempts() returns jsonb language sql security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'started_at',started_at,'submitted_at',submitted_at,'question_count',question_count,'duration_minutes',duration_minutes,'score',score,'correct_count',correct_count) order by started_at desc),'[]'::jsonb) from (select * from public.exam_attempts where user_id=(select auth.uid()) order by started_at desc limit 30) a;
$$;

-- Grant only callable RPC interfaces; function bodies are never exposed to the browser by API.
revoke all on function public.get_exam(uuid),public.start_exam(text[],int,int,text,boolean,boolean),public.save_answer(uuid,uuid,uuid,boolean),public.submit_exam(uuid),public.get_review(uuid),public.list_my_attempts() from public,anon;
grant execute on function public.get_exam(uuid),public.start_exam(text[],int,int,text,boolean,boolean),public.save_answer(uuid,uuid,uuid,boolean),public.submit_exam(uuid),public.get_review(uuid),public.list_my_attempts() to authenticated;

create or replace function public.get_topic_counts() returns jsonb language sql security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('topic_id',t.id,'count',(select count(*) from public.questions q where q.topic_id=t.id and q.verified and (select count(*) from public.question_options o where o.question_id=q.id)=4 and (select count(*) from public.question_options o where o.question_id=q.id and o.is_correct)=1)) order by t.sort_order),'[]'::jsonb) from public.topics t;
$$;
revoke all on function public.get_topic_counts() from public,anon;
grant execute on function public.get_topic_counts() to authenticated;
