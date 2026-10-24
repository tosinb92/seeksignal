-- Dedicated, isolated first-party workspace for SeekSignal growth work.
alter table public.organizations
  add column if not exists is_internal boolean not null default false;

create unique index if not exists organizations_internal_owner_unique
  on public.organizations(owner_user_id)
  where is_internal = true;

create table if not exists public.growth_hq_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.growth_hq_admins enable row level security;

create or replace function public.is_growth_hq_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.growth_hq_admins a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_growth_hq_admin() from public, anon;
grant execute on function public.is_growth_hq_admin() to authenticated;

create or replace function public.ensure_growth_hq_workspace()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_project_id uuid;
  v_slug text;
begin
  if v_user_id is null or not exists (
    select 1 from public.growth_hq_admins a where a.user_id = v_user_id
  ) then
    raise exception 'Growth HQ access denied' using errcode = '42501';
  end if;

  v_slug := 'seeksignal-growth-' || replace(v_user_id::text, '-', '');

  insert into public.organizations (name, slug, owner_user_id, is_internal)
  values ('SeekSignal Growth HQ', v_slug, v_user_id, true)
  on conflict (owner_user_id) where is_internal = true do nothing;

  select o.id into v_organization_id
  from public.organizations o
  where o.owner_user_id = v_user_id and o.is_internal = true
  limit 1;

  if v_organization_id is null then
    raise exception 'Could not create the internal workspace';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner')
  on conflict (organization_id, user_id) do update set role = 'owner';

  insert into public.projects (organization_id, name, domain, market, category, status, created_by)
  values (v_organization_id, 'SeekSignal', 'seek-signal.com', 'United Kingdom', 'AI search visibility software', 'active', v_user_id)
  on conflict (organization_id, domain) do nothing;

  select p.id into v_project_id
  from public.projects p
  where p.organization_id = v_organization_id and p.domain = 'seek-signal.com'
  limit 1;

  insert into public.subscriptions (organization_id, plan, status)
  values (v_organization_id, 'free', 'free')
  on conflict (organization_id) do nothing;

  return pg_catalog.jsonb_build_object('organization_id', v_organization_id, 'project_id', v_project_id);
end;
$$;
revoke all on function public.ensure_growth_hq_workspace() from public, anon;
grant execute on function public.ensure_growth_hq_workspace() to authenticated;

create or replace function public.growth_hq_summary(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_project public.projects%rowtype;
  v_active_paid bigint;
  v_canceled bigint;
  v_free_audits_30d bigint;
  v_page_views_30d bigint;
  v_sessions_30d bigint;
  v_registrations_30d bigint;
  v_signup_completions_30d bigint;
  v_audit_starts_30d bigint;
  v_audit_completions_30d bigint;
  v_open_findings bigint;
  v_competitors bigint;
  v_latest_scan jsonb;
  v_latest_visibility jsonb;
  v_query_hypotheses integer;
begin
  if v_user_id is null or not exists (
    select 1 from public.growth_hq_admins a where a.user_id = v_user_id
  ) then
    raise exception 'Growth HQ access denied' using errcode = '42501';
  end if;

  select p.* into v_project
  from public.projects p
  join public.organizations o on o.id = p.organization_id
  where p.id = p_project_id and o.owner_user_id = v_user_id and o.is_internal = true;
  if v_project.id is null then
    raise exception 'Internal SeekSignal project not found' using errcode = 'P0002';
  end if;

  select count(*) into v_active_paid
  from public.subscriptions s
  join public.organizations o on o.id = s.organization_id
  where o.is_internal = false and s.status = 'active' and s.plan <> 'free';

  select count(*) into v_canceled
  from public.subscriptions s
  join public.organizations o on o.id = s.organization_id
  where o.is_internal = false and s.status = 'canceled';

  select count(*) into v_free_audits_30d
  from public.leads l
  where l.source = 'free_scan' and l.created_at >= now() - interval '30 days';

  select count(*) filter (where e.event_name = 'page_view'),
         count(distinct e.session_id) filter (where e.event_name = 'page_view'),
         count(*) filter (where e.event_name = 'signup_completed'),
         count(*) filter (where e.event_name = 'audit_started'),
         count(*) filter (where e.event_name = 'audit_completed')
  into v_page_views_30d, v_sessions_30d, v_signup_completions_30d, v_audit_starts_30d, v_audit_completions_30d
  from public.product_events e
  where e.created_at >= now() - interval '30 days';

  select count(*) into v_registrations_30d
  from auth.users u
  where u.created_at >= now() - interval '30 days';

  select count(*) into v_open_findings
  from public.findings f
  where f.project_id = p_project_id and f.status = 'open';

  select count(*) into v_competitors
  from public.competitors c
  where c.project_id = p_project_id;

  select pg_catalog.to_jsonb(s) into v_latest_scan
  from public.scans s
  where s.project_id = p_project_id
  order by s.created_at desc limit 1;

  select pg_catalog.to_jsonb(s) into v_latest_visibility
  from public.visibility_snapshots s
  where s.project_id = p_project_id
  order by s.captured_at desc limit 1;

  select coalesce(pg_catalog.jsonb_array_length(s.raw_result -> 'buyerIntentRadar'), 0)
  into v_query_hypotheses
  from public.scans s
  where s.project_id = p_project_id
  order by s.created_at desc limit 1;

  return pg_catalog.jsonb_build_object(
    'generated_at', now(),
    'period_days', 30,
    'organic_visitors', null,
    'organic_visitors_status', 'Connect Google Analytics 4 to measure visitors.',
    'search_console', pg_catalog.jsonb_build_object('status', 'not_connected', 'impressions', null, 'clicks', null, 'ctr', null, 'position', null),
    'ga4', pg_catalog.jsonb_build_object('status', 'not_connected', 'organic_sessions', null, 'conversions', null),
    'tracked_page_views', v_page_views_30d,
    'tracked_sessions', v_sessions_30d,
    'free_audits_completed', v_free_audits_30d,
    'audit_starts', v_audit_starts_30d,
    'audit_completion_events', v_audit_completions_30d,
    'registrations', v_registrations_30d,
    'signup_completions', v_signup_completions_30d,
    'active_paying_subscribers', v_active_paid,
    'monthly_recurring_revenue_gbp', case when v_active_paid = 0 then 0 else null end,
    'mrr_status', case when v_active_paid = 0 then 'No active paid subscriptions recorded.' else 'Stripe price data is required to calculate verified MRR.' end,
    'customer_acquisition_cost', null,
    'customer_acquisition_cost_status', 'Marketing spend is not connected.',
    'cancellations', v_canceled,
    'latest_readiness_scan', v_latest_scan,
    'latest_ai_visibility_snapshot', v_latest_visibility,
    'competitors_tracked', v_competitors,
    'open_growth_findings', v_open_findings,
    'buyer_query_hypotheses', coalesce(v_query_hypotheses, 0)
  );
end;
$$;
revoke all on function public.growth_hq_summary(uuid) from public, anon;
grant execute on function public.growth_hq_summary(uuid) to authenticated;
