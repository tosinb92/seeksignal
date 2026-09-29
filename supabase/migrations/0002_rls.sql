-- SeekSignal RLS. Membership is the authorization boundary.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.leads enable row level security;
alter table public.scans enable row level security;
alter table public.scan_checks enable row level security;
alter table public.findings enable row level security;
alter table public.competitors enable row level security;
alter table public.prompt_sets enable row level security;
alter table public.prompt_tests enable row level security;
alter table public.ai_responses enable row level security;
alter table public.visibility_snapshots enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

create policy "profile self read" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profile self update" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "organization member read" on public.organizations for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id=id and m.user_id=(select auth.uid())));

create policy "membership member read" on public.organization_members for select to authenticated
using (exists (select 1 from public.organization_members mine where mine.organization_id=organization_id and mine.user_id=(select auth.uid())));

create policy "projects member read" on public.projects for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid())));
create policy "projects admin insert" on public.projects for insert to authenticated
with check (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "projects admin update" on public.projects for update to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));

create policy "scans project member read" on public.scans for select to authenticated
using (project_id is not null and exists (
  select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id
  where p.id=project_id and m.user_id=(select auth.uid())
));

create policy "scan checks member read" on public.scan_checks for select to authenticated
using (exists (
  select 1 from public.scans s join public.projects p on p.id=s.project_id join public.organization_members m on m.organization_id=p.organization_id
  where s.id=scan_id and m.user_id=(select auth.uid())
));

create policy "findings member read" on public.findings for select to authenticated
using (exists (
  select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id
  where p.id=project_id and m.user_id=(select auth.uid())
));
create policy "findings member update" on public.findings for update to authenticated
using (exists (
  select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id
  where p.id=project_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','member')
))
with check (exists (
  select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id
  where p.id=project_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','member')
));

create policy "competitors member read" on public.competitors for select to authenticated
using (exists (select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project_id and m.user_id=(select auth.uid())));

create policy "prompt sets member read" on public.prompt_sets for select to authenticated
using (exists (select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project_id and m.user_id=(select auth.uid())));

create policy "prompt tests member read" on public.prompt_tests for select to authenticated
using (exists (
  select 1 from public.prompt_sets ps join public.projects p on p.id=ps.project_id join public.organization_members m on m.organization_id=p.organization_id
  where ps.id=prompt_set_id and m.user_id=(select auth.uid())
));

create policy "ai responses member read" on public.ai_responses for select to authenticated
using (exists (
  select 1 from public.prompt_tests pt join public.prompt_sets ps on ps.id=pt.prompt_set_id join public.projects p on p.id=ps.project_id join public.organization_members m on m.organization_id=p.organization_id
  where pt.id=prompt_test_id and m.user_id=(select auth.uid())
));

create policy "snapshots member read" on public.visibility_snapshots for select to authenticated
using (exists (select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project_id and m.user_id=(select auth.uid())));

create policy "reports member read" on public.reports for select to authenticated
using (exists (select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=project_id and m.user_id=(select auth.uid())));

create policy "subscriptions member read" on public.subscriptions for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid())));

create policy "usage member read" on public.usage_counters for select to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=(select auth.uid())));

-- Leads are intentionally server-only. No anon/authenticated policies.
