create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'team', 'enterprise')),
  created_at timestamptz not null default now()
);

-- Idempotent migration for projects created before plan_tier existed.
alter table public.users add column if not exists plan_tier text not null default 'free';

-- Ensure migrated databases get the same check constraint as fresh installs.
do $$
begin
  alter table public.users
    add constraint users_plan_tier_check
    check (plan_tier in ('free', 'pro', 'team', 'enterprise'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  github_url text not null,
  branch text not null default 'default',
  mode text not null check (mode in ('full-map', 'security-lens', 'onboarding')),
  status text not null check (status in ('queued', 'cloning', 'parsing', 'building_structure', 'security_analysis', 'retrieval', 'llm_synthesis', 'completed', 'failed', 'cancelled')),
  stage text not null,
  trace_id text not null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.findings (
  id text primary key,
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rule_id text not null,
  category text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  title text not null,
  file_path text not null,
  line_number int not null,
  evidence text not null,
  explanation text not null,
  suggested_fix text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'ignored')),
  related_node_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  report_json jsonb not null,
  report_markdown text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  report_id text not null references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, report_id)
);

create table if not exists public.chunk_metadata (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  file_path text not null,
  symbol text,
  language text,
  content_hash text not null,
  importance_score int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists scans_user_created_idx on public.scans(user_id, created_at desc);
create index if not exists findings_scan_severity_idx on public.findings(scan_id, severity);
create index if not exists reports_user_created_idx on public.reports(user_id, created_at desc);
create index if not exists chunk_metadata_scan_path_idx on public.chunk_metadata(scan_id, file_path);

alter table public.users enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;
alter table public.reports enable row level security;
alter table public.saved_reports enable row level security;
alter table public.chunk_metadata enable row level security;

drop policy if exists "users select self" on public.users;
create policy "users select self" on public.users for select using (auth.uid() = id);

drop policy if exists "users update self" on public.users;
create policy "users update self" on public.users for update using (auth.uid() = id);

drop policy if exists "scans owner read" on public.scans;
create policy "scans owner read" on public.scans for select using (auth.uid() = user_id);

drop policy if exists "scans owner insert" on public.scans;
create policy "scans owner insert" on public.scans for insert with check (auth.uid() = user_id);

drop policy if exists "scans owner update" on public.scans;
create policy "scans owner update" on public.scans for update using (auth.uid() = user_id);

drop policy if exists "findings owner read" on public.findings;
create policy "findings owner read" on public.findings for select using (auth.uid() = user_id);

drop policy if exists "findings owner update" on public.findings;
create policy "findings owner update" on public.findings for update using (auth.uid() = user_id);

drop policy if exists "reports owner read" on public.reports;
create policy "reports owner read" on public.reports for select using (auth.uid() = user_id);

drop policy if exists "saved reports owner all" on public.saved_reports;
create policy "saved reports owner all" on public.saved_reports using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chunk metadata owner read" on public.chunk_metadata;
create policy "chunk metadata owner read" on public.chunk_metadata for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

