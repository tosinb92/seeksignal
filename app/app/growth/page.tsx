import { cookies } from "next/headers";
import Link from "next/link";
import { getSessionUser } from "../../../lib/auth/session";
import { supabaseRest } from "../../../lib/supabase/rest";
import RunProjectScanButton from "../../../components/RunProjectScanButton";
import RunVisibilityTest from "../../../components/RunVisibilityTest";
import ContentEngine from "../../../components/ContentEngine";
import styles from "./growth.module.css";

type Summary = {
  generated_at: string;
  period_days: number;
  organic_visitors: number | null;
  organic_visitors_status: string;
  search_console: { status: string; impressions: number | null; clicks: number | null; ctr: number | null; position: number | null };
  ga4: { status: string; organic_sessions: number | null; conversions: number | null };
  tracked_page_views: number;
  tracked_sessions: number;
  free_audits_completed: number;
  audit_starts: number;
  audit_completion_events: number;
  registrations: number;
  signup_completions: number;
  active_paying_subscribers: number;
  monthly_recurring_revenue_gbp: number | null;
  mrr_status: string;
  customer_acquisition_cost: number | null;
  customer_acquisition_cost_status: string;
  cancellations: number;
  latest_readiness_scan: { score: number | null; created_at: string; raw_result?: { buyerIntentRadar?: unknown[] } } | null;
  latest_ai_visibility_snapshot: { visibility_score: number | null; mention_count: number; citation_count: number; captured_at: string } | null;
  competitors_tracked: number;
  open_growth_findings: number;
  buyer_query_hypotheses: number;
};

function displayMetric(value: number | null | undefined, unavailable: string) {
  return value == null ? unavailable : new Intl.NumberFormat("en-GB").format(value);
}

function percent(value: number | null | undefined) {
  return value == null ? "Not connected" : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)}%`;
}

export default async function GrowthHqPage({ searchParams }: { searchParams: Promise<{ project?: string; organization?: string }> }) {
  const user = await getSessionUser();
  if (!user?.id) {
    return <main className={styles.page}><section className={styles.gate}><span>SEEKSIGNAL GROWTH HQ</span><h1>Sign in to continue.</h1><Link href="/login">Sign in →</Link></section></main>;
  }

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) {
    return <main className={styles.page}><section className={styles.gate}><span>SEEKSIGNAL GROWTH HQ</span><h1>Your session has expired.</h1><Link href="/login">Sign in again →</Link></section></main>;
  }

  const adminCheck = await supabaseRest("/rest/v1/rpc/is_growth_hq_admin", { method: "POST", body: "{}" }, token);
  const isAdmin = adminCheck.ok ? await adminCheck.json().catch(() => false) : false;
  if (isAdmin !== true) {
    return (
      <main className={styles.page}>
        <section className={styles.gate}>
          <span>SEEKSIGNAL GROWTH HQ</span>
          <h1>This workspace is restricted.</h1>
          <p>Growth HQ is reserved for authorised SeekSignal administrators. No customer workspace data is exposed here.</p>
          <Link href="/app">Return to your workspace →</Link>
        </section>
      </main>
    );
  }

  const workspaceResponse = await supabaseRest("/rest/v1/rpc/ensure_growth_hq_workspace", { method: "POST", body: "{}" }, token);
  const workspace = workspaceResponse.ok ? await workspaceResponse.json().catch(() => ({})) : {};
  const projectId = typeof workspace?.project_id === "string" ? workspace.project_id : "";
  const organizationId = typeof workspace?.organization_id === "string" ? workspace.organization_id : "";

  if (!projectId || !organizationId) {
    return <main className={styles.page}><section className={styles.gate}><span>SEEKSIGNAL GROWTH HQ</span><h1>Could not prepare the internal workspace.</h1><p>Try refreshing. The customer workspaces remain unchanged.</p></section></main>;
  }

  const summaryResponse = await supabaseRest("/rest/v1/rpc/growth_hq_summary", {
    method: "POST",
    body: JSON.stringify({ p_project_id: projectId })
  }, token);
  const summary = summaryResponse.ok ? await summaryResponse.json().catch(() => null) as Summary | null : null;
  const workspaceUrl = `/app?project=${encodeURIComponent(projectId)}&organization=${encodeURIComponent(organizationId)}`;
  const latestScan = summary?.latest_readiness_scan || null;
  const visibility = summary?.latest_ai_visibility_snapshot || null;
  const reportDate = summary?.generated_at ? new Date(summary.generated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Unavailable";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.brand} href="/">S <b>SeekSignal</b></Link>
          <span className={styles.eyebrow}>Internal growth workspace</span>
          <h1>Growth HQ</h1>
          <p>Use SeekSignal to grow SeekSignal. Customer data stays in separate workspaces.</p>
        </div>
        <nav><Link href={workspaceUrl}>Open SeekSignal workspace →</Link><Link href="/experiment">View the experiment →</Link></nav>
      </header>

      {!summary ? (
        <section className={styles.notice} role="alert">
          <strong>Growth metrics could not be loaded.</strong>
          <p>The internal workspace is intact. Retry after checking the database connection.</p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHead}><div><span className={styles.eyebrow}>Last 30 days</span><h2>How SeekSignal is performing</h2></div><small>Updated {reportDate}</small></div>
            <div className={styles.metricGrid}>
              <article><span>Tracked site sessions</span><strong>{displayMetric(summary.tracked_sessions, "—")}</strong><small>Product analytics, not organic-only traffic</small></article>
              <article><span>Google impressions</span><strong>{displayMetric(summary.search_console.impressions, "Not connected")}</strong><small>Google Search Console</small></article>
              <article><span>AI visibility</span><strong>{visibility ? percent(visibility.visibility_score) : "No baseline"}</strong><small>{visibility ? `${visibility.mention_count} mentions · ${visibility.citation_count} citations` : "Run a controlled model test to establish a baseline"}</small></article>
              <article><span>Free audits completed</span><strong>{displayMetric(summary.free_audits_completed, "—")}</strong><small>Saved free-scan leads in this period</small></article>
              <article><span>New registrations</span><strong>{displayMetric(summary.registrations, "—")}</strong><small>Actual Supabase registrations</small></article>
              <article><span>Paid subscribers</span><strong>{displayMetric(summary.active_paying_subscribers, "—")}</strong><small>{summary.cancellations} cancellations recorded</small></article>
              <article><span>Monthly recurring revenue</span><strong>{summary.monthly_recurring_revenue_gbp == null ? "Unavailable" : `£${displayMetric(summary.monthly_recurring_revenue_gbp, "—")}`}</strong><small>{summary.mrr_status}</small></article>
              <article><span>Acquisition cost</span><strong>{summary.customer_acquisition_cost == null ? "Unavailable" : `£${displayMetric(summary.customer_acquisition_cost, "—")}`}</strong><small>{summary.customer_acquisition_cost_status}</small></article>
            </div>
            <p className={styles.limitNote}>Search Console, GA4 and marketing spend are not connected. Organic visitors and acquisition cost are therefore shown as unavailable. Recorded page views are product events and are not presented as organic traffic.</p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}><div><span className={styles.eyebrow}>SeekSignal as its own customer</span><h2>Visibility and product proof</h2></div></div>
            <div className={styles.summaryGrid}>
              <article><span>Website baseline</span><strong>{latestScan ? `${latestScan.score ?? "—"}/100` : "Not run yet"}</strong><small>{latestScan ? `Last scanned ${new Date(latestScan.created_at).toLocaleDateString("en-GB")}` : "Run the same readiness scan customers use."}</small></article>
              <article><span>Competitor monitoring</span><strong>{summary.competitors_tracked ? `${summary.competitors_tracked} tracked` : "No competitors tracked"}</strong><small>Competitor candidates require review before monitoring.</small></article>
              <article><span>Growth Blueprint</span><strong>{summary.open_growth_findings} open actions</strong><small>{summary.buyer_query_hypotheses} buyer-query hypotheses from the latest scan.</small></article>
              <article><span>Customer funnel</span><strong>{summary.audit_starts} audit starts</strong><small>{summary.audit_completion_events} completion events · {summary.signup_completions} sign-up completions in the last 30 days.</small></article>
            </div>
            <div className={styles.buttonRow}>
              <RunProjectScanButton projectId={projectId} className={styles.primary} label="Run website baseline" />
              <RunVisibilityTest projectId={projectId} gatewayEnabled={process.env.NODE_ENV === "production" || Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)} />
              <Link className={styles.secondaryLink} href={`${workspaceUrl}#readiness`}>Open Growth Blueprint →</Link>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}><div><span className={styles.eyebrow}>What needs my attention?</span><h2>Only the next useful actions</h2></div></div>
            <div className={styles.actionGrid}>
              <article><b>Connect Google Search Console</b><p>Needed for verified impressions, clicks, rankings and organic queries.</p><span>Unavailable until OAuth credentials and property access are configured.</span></article>
              <article><b>Connect Google Analytics 4</b><p>Needed for organic landing sessions and measurable conversions.</p><span>Unavailable until OAuth credentials and property access are configured.</span></article>
              <article><b>Review competitor candidates</b><p>Start with relevant AI-search and SEO tools; confirm competitors before monitoring.</p><span>Currently {summary.competitors_tracked} competitor records in the internal project.</span></article>
              <article><b>Prepare an evidence-backed content draft</b><p>Use the existing content engine against the internal SeekSignal project.</p><Link href={workspaceUrl}>Open the content workspace →</Link></article>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}><div><span className={styles.eyebrow}>Approval required before publishing</span><h2>Content preparation</h2></div></div>
            <p className={styles.limitNote}>The existing Authority Builder can prepare drafts in the SeekSignal workspace. This Growth HQ does not publish content or send outreach automatically.</p>
            <ContentEngine projectId={projectId} />
          </section>
        </>
      )}
      <footer className={styles.footer}>Internal SeekSignal workspace · First-party measurement · Customer workspaces are not included in the site-audit data.</footer>
    </main>
  );
}
