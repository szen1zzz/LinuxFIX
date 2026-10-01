create extension if not exists pg_cron with schema pg_catalog;

create table public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  distribution text not null check (distribution in ('arch', 'debian')),
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index analysis_history_user_created_idx
  on public.analysis_history (user_id, created_at desc);

alter table public.analysis_history enable row level security;

revoke all on table public.analysis_history from anon, authenticated;
grant select, insert, delete on table public.analysis_history to authenticated;

create policy "Users can read their own analysis history"
  on public.analysis_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own analysis history"
  on public.analysis_history
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and created_at between now() - interval '5 minutes' and now() + interval '1 minute'
  );

create policy "Users can delete their own analysis history"
  on public.analysis_history
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

select cron.schedule(
  'linuxfix-delete-expired-analysis-history',
  '17 3 * * *',
  $$delete from public.analysis_history where created_at < now() - interval '7 days'$$
);

;
