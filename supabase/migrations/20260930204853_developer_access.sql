-- Developer access is assigned only by a trusted database administrator.
-- The mobile client can read its own row, but cannot create, update or delete it.
create table public.developer_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_level text not null default 'developer'
    check (access_level in ('developer', 'admin')),
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null
);

comment on table public.developer_access is
  'Server-managed allowlist for LinuxFIX developer and administrator tools.';

alter table public.developer_access enable row level security;

revoke all on table public.developer_access from anon, authenticated;
grant select on table public.developer_access to authenticated;

create policy "Users can read only their own developer access"
  on public.developer_access
  for select
  to authenticated
  using ((select auth.uid()) = user_id and enabled = true);
