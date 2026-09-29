-- SeekSignal core multi-tenant schema
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','admin','member','viewer');
create type public.finding_status as enum ('open','in_progress','fixed','ignored');
create type public.subscription_status as enum ('free','trialing','active','past_due','canceled');
create type public.ai_test_status as enum ('queued','running','complete','failed');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  domain text not null,
  market text,
  category text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, domain)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  business_name text not null,
  website text not null,
  source text not null default 'free_scan',
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  scan_type text not null default 'website_readiness',
  score integer check (score between 0 and 100),
  summary text,
  methodology text,
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.scan_checks (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  category text not null,
  label text not null,
  status text not null,
  score integer,
  detail text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  finding_type text not null,
  category text not null,
  severity text not null,
  title text not null,
  description text,
  evidence jsonb not null default '{}'::jsonb,
  recommendation text,
  status public.finding_status not null default 'open',
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  domain text,
  created_at timestamptz not null default now()
);

create table public.prompt_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.prompt_tests (
  id uuid primary key default gen_random_uuid(),
  prompt_set_id uuid not null references public.prompt_sets(id) on delete cascade,
  prompt text not null,
  engine text not null,
  model text,
  status public.ai_test_status not null default 'queued',
  tested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_test_id uuid not null references public.prompt_tests(id) on delete cascade,
  brand_mentioned boolean,
  recommendation_detected boolean,
  citations jsonb not null default '[]'::jsonb,
  competitors_mentioned jsonb not null default '[]'::jsonb,
  response_excerpt text,
  response_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.visibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  visibility_score numeric(5,2),
  recommendation_share numeric(5,2),
  mention_count integer not null default 0,
  citation_count integer not null default 0,
  engine_breakdown jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  report_type text not null default 'visibility',
  payload jsonb not null default '{}'::jsonb,
  share_token text unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan text not null default 'free',
  status public.subscription_status not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  scans_used integer not null default 0,
  prompt_tests_used integer not null default 0,
  reports_used integer not null default 0,
  primary key (organization_id, period_start)
);

create index idx_projects_org on public.projects(organization_id);
create index idx_scans_project_created on public.scans(project_id, created_at desc);
create index idx_findings_project_status on public.findings(project_id, status);
create index idx_visibility_project_captured on public.visibility_snapshots(project_id, captured_at desc);
create index idx_leads_email on public.leads(lower(email));
