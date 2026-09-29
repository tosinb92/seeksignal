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

  const readiness = report.payload?.readiness || report.payload?.scan || null;
  const visibility = report.payload?.visibility || null;
  const checks = Array.isArray(readiness?.raw_result?.checks) ? readiness.raw_result.checks : [];
  const evidence = Array.isArray(report.payload?.ai_evidence) ? report.payload.ai_evidence : [];

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
          <article><span>Website readiness</span><strong>{readiness?.score ?? "—"}</strong><small>{readiness ? "/100" : "No scan saved"}</small></article>
          <article><span>AI visibility</span><strong>{visibility?.visibility_score != null ? visibility.visibility_score + "%" : "—"}</strong><small>Provider-model evidence</small></article>
          <article><span>Tracked mention share</span><strong>{visibility?.recommendation_share != null ? visibility.recommendation_share + "%" : "—"}</strong><small>Brand vs tracked mentions</small></article>
          <article className={styles.accent}><span>AI citations</span><strong>{visibility?.citation_count ?? 0}</strong><small>Observed in latest run</small></article>
        </div>

        {readiness ? (
          <section className={styles.panel} style={{marginTop:12,minHeight:0}}>
            <div className={styles.panelHead}><div><span>Website readiness</span><h2>{readiness.summary || "Readiness report"}</h2></div></div>
            <p>{readiness.methodology || report.payload?.methodology?.readiness}</p>
            <div className={styles.details}>
              {checks.length ? checks.map((check: any, index: number) => (
                <div key={index}>
                  <span>{check.label}</span>
                  <strong>{check.status === "good" ? "Pass" : "Needs work"}</strong>
                </div>
              )) : <div><span>No detailed checks stored</span><strong>—</strong></div>}
            </div>
          </section>
        ) : null}

        <section className={styles.panel} style={{marginTop:12,minHeight:0}}>
          <div className={styles.panelHead}><div><span>AI visibility evidence</span><h2>{visibility ? "Latest saved model test" : "No AI visibility run in this report"}</h2></div></div>
          <p>{report.payload?.methodology?.visibility || "Provider-model evidence can differ from consumer AI interfaces."}</p>

          {evidence.length ? (
            <div style={{display:"grid",marginTop:18}}>
              {evidence.map((item: any, index: number) => (
                <div key={item.id || index} style={{padding:"14px 0",borderTop:"1px solid rgba(255,255,255,.055)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                    <strong style={{fontSize:10}}>{item.engine}</strong>
                    <span style={{fontSize:9,color:item.status==="complete"?(item.response?.brand_mentioned?"#c4f873":"#89928c"):"#ffaaaa"}}>
                      {item.status==="failed" ? "Failed" : item.response?.brand_mentioned ? "Brand mentioned" : "Not mentioned"}
                    </span>
                  </div>
                  <p style={{margin:"6px 0 0",color:"#68726b",fontSize:9,lineHeight:1.55}}>{item.response?.response_excerpt || "No saved response."}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.details}><div><span>AI evidence</span><strong>Run AI visibility from the workspace</strong></div></div>
          )}
        </section>
      </section>
    </main>
  );
}
