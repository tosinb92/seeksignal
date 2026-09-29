import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";
import styles from "../../workspace.module.css";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) redirect("/login");

  const response = await supabaseRest(
    "/rest/v1/reports?select=id,title,report_type,payload,created_at&id=eq." + encodeURIComponent(id) + "&limit=1",
    { method: "GET" },
    token
  );
  const rows = response.ok ? await response.json() : [];
  const report = rows?.[0];
  if (!report) notFound();

  const scan = report.payload?.scan;
  const checks = Array.isArray(scan?.raw_result?.checks) ? scan.raw_result.checks : [];

  return (
    <main className={styles.app} style={{display:"block"}}>
      <section className={styles.main} style={{maxWidth:980,margin:"0 auto"}}>
        <Link href="/app" className={styles.kicker}>← Back to workspace</Link>
        <header className={styles.header} style={{marginTop:18}}>
          <div>
            <span className={styles.kicker}>{report.report_type}</span>
            <h1>{report.title}</h1>
            <p>{new Date(report.created_at).toLocaleString()}</p>
          </div>
        </header>

        <div className={styles.metrics}>
          <article><span>Readiness score</span><strong>{scan?.score ?? "—"}</strong><small>/100</small></article>
          <article><span>Website</span><strong style={{fontSize:18}}>{report.payload?.project?.domain || "—"}</strong><small>Audited domain</small></article>
          <article><span>Signals checked</span><strong>{checks.length}</strong><small>Latest report snapshot</small></article>
          <article className={styles.accent}><span>Status</span><strong style={{fontSize:22}}>Saved</strong><small>Report snapshot</small></article>
        </div>

        <section className={styles.panel} style={{marginTop:12,minHeight:0}}>
          <div className={styles.panelHead}><div><span>Summary</span><h2>{scan?.summary || "Website-readiness report"}</h2></div></div>
          <p>{scan?.methodology || "This report is based on observable website-readiness signals."}</p>
          <div className={styles.details}>
            {checks.length ? checks.map((check: any, index: number) => (
              <div key={index}>
                <span>{check.label}</span>
                <strong>{check.status === "good" ? "Pass" : "Needs work"}</strong>
              </div>
            )) : <div><span>No detailed checks stored</span><strong>—</strong></div>}
          </div>
        </section>
      </section>
    </main>
  );
}
