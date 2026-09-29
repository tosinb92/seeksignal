import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "../../lib/auth/session";
import { supabaseRest } from "../../lib/supabase/rest";
import styles from "./workspace.module.css";
import RunProjectScanButton from "../../components/RunProjectScanButton";

export default async function WorkspacePage() {
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  const store = await cookies();
  const accessToken = store.get("ss_access_token")?.value;
  if (!accessToken) redirect("/login");

  const membershipResponse = await supabaseRest(
    "/rest/v1/organization_members?select=organization_id,role&user_id=eq." + encodeURIComponent(user.id),
    { method: "GET" },
    accessToken
  );
  const memberships = membershipResponse.ok ? await membershipResponse.json() : [];

  if (!memberships?.length) redirect("/onboarding");

  const orgId = memberships[0].organization_id;
  const [orgResponse, projectResponse] = await Promise.all([
    supabaseRest("/rest/v1/organizations?select=id,name,slug&id=eq." + encodeURIComponent(orgId), { method: "GET" }, accessToken),
    supabaseRest("/rest/v1/projects?select=id,name,domain,market,category,status&organization_id=eq." + encodeURIComponent(orgId), { method: "GET" }, accessToken)
  ]);

  const organizations = orgResponse.ok ? await orgResponse.json() : [];
  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const organization = organizations?.[0];
  const project = projects?.[0];

  const scanResponse = project?.id
    ? await supabaseRest(
        "/rest/v1/scans?select=id,score,summary,created_at&project_id=eq." + encodeURIComponent(project.id) + "&order=created_at.desc&limit=1",
        { method: "GET" },
        accessToken
      )
    : null;
  const scans = scanResponse?.ok ? await scanResponse.json() : [];
  const latestScan = scans?.[0] || null;

  return (
    <main className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span>S</span>SeekSignal</Link>
        <div className={styles.org}>
          <small>Workspace</small>
          <strong>{organization?.name || "SeekSignal"}</strong>
        </div>
        <nav>
          <a className={styles.active}>Overview</a>
          <a>AI Visibility</a>
          <a>Website Readiness</a>
          <a>Competitors</a>
          <a>Opportunities</a>
          <a>Monitoring</a>
          <a>Reports</a>
        </nav>
        <div className={styles.sideFooter}>
          <a>Settings</a>
          <a>Billing</a>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Overview</span>
            <h1>{project?.name || organization?.name}</h1>
            <p>{project?.domain || "Add your first project"}</p>
          </div>
          <div className={styles.headerActions}>
            <RunProjectScanButton projectId={project?.id || ""} className={styles.secondary} label="Run scan" />
            <button className={styles.primary} disabled>Add competitor</button>
          </div>
        </header>

        <div className={styles.notice}>
          <div>
            <span>Workspace ready</span>
            <strong>Your monitoring foundation is live.</strong>
          </div>
          <p>Run your first saved scan to begin building visibility history and unlock prioritised opportunities.</p>
        </div>

        <div className={styles.metrics}>
          <article><span>AI Visibility</span><strong>—</strong><small>Start monitoring</small></article>
          <article><span>Website readiness</span><strong>{latestScan?.score ?? "—"}</strong><small>{latestScan ? "Latest saved scan" : "Run first scan"}</small></article>
          <article><span>Open opportunities</span><strong>0</strong><small>Nothing detected yet</small></article>
          <article className={styles.accent}><span>Competitors tracked</span><strong>0</strong><small>Add your first competitor</small></article>
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}><div><span>Next best action</span><h2>Run your baseline scan.</h2></div><b>High impact</b></div>
            <p>{latestScan?.summary || "SeekSignal needs a baseline before it can show progress, historical movement and the highest-priority fixes for this project."}</p>
            <RunProjectScanButton projectId={project?.id || ""} className={styles.primary} label={latestScan ? "Run another scan →" : "Run baseline scan →"} />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}><div><span>Project profile</span><h2>{project?.domain}</h2></div></div>
            <div className={styles.details}>
              <div><span>Market</span><strong>{project?.market || "Not set"}</strong></div>
              <div><span>Category</span><strong>{project?.category || "Not set"}</strong></div>
              <div><span>Status</span><strong>Active</strong></div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
