begin;

alter table public.game_sessions enable row level security;

alter table public.game_sessions
  add column if not exists attempt_id uuid,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists student_email text,
  add column if not exists score_verification text not null default 'unverified_client';

alter table public.game_sessions drop constraint if exists game_sessions_score_bounds;
alter table public.game_sessions add constraint game_sessions_score_bounds check (
  score >= 0 and total_questions > 0 and score <= total_questions
  and accuracy between 0 and 100 and xp >= 0 and gold >= 0
) not valid;

create unique index if not exists game_sessions_user_attempt_idx
  on public.game_sessions (user_id, attempt_id)
  where user_id is not null and attempt_id is not null;

drop policy if exists "Allow game result submissions"
  on public.game_sessions;

revoke all privileges on table public.game_sessions
  from anon, authenticated;

grant insert on table public.game_sessions to authenticated;

drop policy if exists "Authenticated students submit own results"
  on public.game_sessions;

create policy "Authenticated students submit own results"
  on public.game_sessions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and attempt_id is not null
    and student_email = (select auth.jwt() ->> 'email')
    and split_part(lower(student_email), '@', 2) = 'queenscollege.edu.bb'
    and score_verification = 'unverified_client'
  );

commit;

-- Configuration-only verification: these queries do not read student rows.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'game_sessions'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'game_sessions'
order by cmd, policyname;
