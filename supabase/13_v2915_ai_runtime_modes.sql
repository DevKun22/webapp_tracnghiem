-- V2.9.15: Runtime modes. Run only after 12_v2915_ai_control.sql.
-- Changing runtime mode never changes Firebase billing plan.
alter table public.ai_system_control
  add column if not exists ai_runtime_mode text not null default 'spark';
alter table public.ai_system_control
  drop constraint if exists ai_system_control_runtime_mode_valid;
alter table public.ai_system_control
  add constraint ai_system_control_runtime_mode_valid check (ai_runtime_mode in ('spark','blaze'));
-- Safe initial condition for projects not previously configured for Blaze:
update public.ai_system_control
  set ai_runtime_mode = 'spark', firebase_learner_enabled=false, tutor_enabled=false, updated_at=now()
  where id=1;
