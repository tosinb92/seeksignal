-- Preserve customer action progress without changing existing finding states.
alter table public.findings
  add column if not exists workflow_status text not null default 'not_started';

alter table public.findings
  drop constraint if exists findings_workflow_status_check;

alter table public.findings
  add constraint findings_workflow_status_check
  check (workflow_status in ('not_started', 'ready_for_approval', 'implemented', 'measuring', 'reviewed'));

create unique index if not exists findings_project_title_unique
  on public.findings(project_id, title);

drop policy if exists "findings member insert" on public.findings;
create policy "findings member insert" on public.findings for insert to authenticated
with check (exists (
  select 1 from public.projects p
  join public.organization_members m on m.organization_id = p.organization_id
  where p.id = project_id
    and m.user_id = (select auth.uid())
    and m.role in ('owner', 'admin', 'member')
));
