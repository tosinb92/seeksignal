# SeekSignal backend

Core model:

auth.users -> profiles -> organization_members -> organizations -> projects -> scans/findings/competitors/prompt tests/visibility snapshots/reports.

Rules:
- Organizations own customer data; individual users gain access through memberships.
- Free-scan leads are server-only and are later claimed by a user/organization after signup.
- Scan rows are immutable historical snapshots.
- AI prompt testing is separate from website-readiness scanning.
- Billing is organization-level.
- Public-schema tables must have RLS enabled.
- Privileged inserts (free leads, scanner results, billing, AI runs) are server-side only.
- Never expose Supabase secret/service-role credentials to the browser.
