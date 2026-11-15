begin;

alter table public.game_sessions enable row level security;

drop policy if exists "Allow game result submissions"
  on public.game_sessions;

revoke all privileges on table public.game_sessions
  from anon, authenticated;

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
