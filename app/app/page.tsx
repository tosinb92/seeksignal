import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "../../lib/auth/session";
import { supabaseRest } from "../../lib/supabase/rest";
import styles from "./workspace.module.css";
import RunProjectScanButton from "../../components/RunProjectScanButton";
import WorkspaceControls from "../../components/WorkspaceControls";
import GenerateReportButton from "../../components/GenerateReportButton";
import RunVisibilityTest from "../../components/RunVisibilityTest";

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

  const [scanResponse, competitorResponse, reportResponse, visibilityResponse] = project?.id
    ? await Promise.all([
        supabaseRest(
          "/rest/v1/scans?select=id,score,summary,created_at,raw_result&project_id=eq." + encodeURIComponent(project.id) + "&order=created_at.desc&limit=20",
          { method: "GET" },
          accessToken
        ),
        supabaseRest(
          "/rest/v1/competitors?select=id,name,domain,created_at&project_id=eq." + encodeURIComponent(project.id) + "&order=created_at.asc",
          { method: "GET" },
          accessToken
        ),
        supabaseRest(
          "/rest/v1/reports?select=id,title,report_type,created_at&project_id=eq." + encodeURIComponent(project.id) + "&order=created_at.desc&limit=20",
          { method: "GET" },
          accessToken
        ),
        supabaseRest(
          "/rest/v1/visibility_snapshots?select=id,visibility_score,recommendation_share,mention_count,citation_count,engine_breakdown,captured_at&project_id=eq." + encodeURIComponent(project.id) + "&order=captured_at.desc&limit=10",
          { method: "GET" },
          accessToken
        )
      ])
    : [null, null, null, null];

  const scans = scanResponse?.ok ? await scanResponse.json() : [];
  const competitors = competitorResponse?.ok ? await competitorResponse.json() : [];
  const reports = reportResponse?.ok ? await reportResponse.json() : [];
  const visibilitySnapshots = visibilityResponse?.ok ? await visibilityResponse.json() : [];
  const latestScan = scans?.[0] || null;
  const previousScan = scans?.[1] || null;
  const latestVisibility = visibilitySnapshots?.[0] || null;
  const previousVisibility = visibilitySnapshots?.[1] || null;
  const readinessDelta = latestScan && previousScan ? Number(latestScan.score) - Number(previousScan.score) : null;
  const visibilityDelta = latestVisibility && previousVisibility
    ? Number(latestVisibility.visibility_score) - Number(previousVisibility.visibility_score)
    : null;
  const gatewayEnabled = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);

  const latestPromptSetResponse = project?.id
    ? await supabaseRest(
        "/rest/v1/prompt_sets?select=id,name,created_at&project_id=eq." + encodeURIComponent(project.id) + "&order=created_at.desc&limit=1",
        { method: "GET" },
        accessToken
      )
    : null;
  const latestPromptSets = latestPromptSetResponse?.ok ? await latestPromptSetResponse.json() : [];
  const latestPromptSet = latestPromptSets?.[0] || null;

  const promptTestsResponse = latestPromptSet?.id
    ? await supabaseRest(
        "/rest/v1/prompt_tests?select=id,prompt,engine,model,status,tested_at&prompt_set_id=eq." + encodeURIComponent(latestPromptSet.id) + "&order=created_at.asc",
        { method: "GET" },
        accessToken
      )
    : null;
  const latestPromptTests = promptTestsResponse?.ok ? await promptTestsResponse.json() : [];

  const promptTestIds = latestPromptTests.map((item: any) => item.id).filter(Boolean);
  const aiResponsesResponse = promptTestIds.length
    ? await supabaseRest(
        "/rest/v1/ai_responses?select=prompt_test_id,brand_mentioned,recommendation_detected,citations,competitors_mentioned,response_excerpt&prompt_test_id=in.(" +
          promptTestIds.map((id: string) => encodeURIComponent(id)).join(",") +
          ")",
        { method: "GET" },
        accessToken
      )
    : null;
  const latestAiResponses = aiResponsesResponse?.ok ? await aiResponsesResponse.json() : [];
  const aiResponseByTest = new Map(latestAiResponses.map((item: any) => [item.prompt_test_id, item]));

  return (
    <main className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span>S</span>SeekSignal</Link>
        <div className={styles.org}>
          <small>Workspace</small>
          <strong>{organization?.name || "SeekSignal"}</strong>
        </div>
        <nav>
          <a className={styles.active} href="#overview">Overview</a>
          <a href="#ai-visibility">AI Visibility</a>
          <a href="#readiness">Website Readiness</a>
          <a href="#competitors">Competitors</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
        </nav>
        <div className={styles.sideFooter}>
          <span style={{padding:"0 12px",color:"#59625c",fontSize:8}}>Provider-model tests are metered and run only with explicit confirmation.</span>
        </div>
      </aside>

      <section className={styles.main} id="overview">
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Overview</span>
            <h1>{project?.name || organization?.name}</h1>
            <p>{project?.domain || "Add your first project"}</p>
          </div>
          <div className={styles.headerActions}>
            <RunProjectScanButton projectId={project?.id || ""} className={styles.secondary} label="Run scan" />
            <a className={styles.primary} href="#competitors" style={{display:"inline-flex",alignItems:"center"}}>Add competitor</a>
          </div>
        </header>

        <div className={styles.notice}>
          <div>
            <span>Workspace active</span>
            <strong>Your readiness scanning workspace is ready.</strong>
          </div>
          <p>Run readiness scans, track competitors and use opt-in provider-model testing to measure whether AI systems actually surface the brand.</p>
        </div>

        <div className={styles.metrics}>
          <article><span>AI Visibility</span><strong>{latestVisibility?.visibility_score != null ? latestVisibility.visibility_score + "%" : "—"}</strong><small>{latestVisibility ? "Latest provider-model run" : "Run first AI visibility test"}</small></article>
          <article><span>Website readiness</span><strong>{latestScan?.score ?? "—"}</strong><small>{latestScan ? "Latest saved scan" : "Run first scan"}</small></article>
          <article><span>Open opportunities</span><strong>{latestScan?.raw_result?.checks?.filter((item: any) => item.status === "warn").length ?? 0}</strong><small>{latestScan ? "From latest readiness scan" : "Run first scan"}</small></article>
          <article className={styles.accent}><span>Competitors tracked</span><strong>{competitors.length}</strong><small>{competitors.length ? "Saved to this project" : "Add your first competitor"}</small></article>
        </div>

        {project ? <RunVisibilityTest projectId={project.id} gatewayEnabled={gatewayEnabled} /> : null}

        {latestVisibility ? (
          <section className={styles.panel} style={{marginTop:11,minHeight:0}}>
            <div className={styles.panelHead}>
              <div><span>Latest AI visibility snapshot</span><h2>{latestVisibility.visibility_score}% model-level visibility</h2></div>
              <b>{latestVisibility.recommendation_share}% tracked mention share</b>
            </div>
            <div className={styles.details}>
              <div><span>Brand mentions</span><strong>{latestVisibility.mention_count}</strong></div>
              <div><span>Citations observed</span><strong>{latestVisibility.citation_count}</strong></div>
              <div><span>Captured</span><strong>{new Date(latestVisibility.captured_at).toLocaleString()}</strong></div>
            </div>

            {latestPromptTests.length ? (
              <div style={{marginTop:22}}>
                <span className={styles.kicker}>Saved model evidence</span>
                <div style={{display:"grid",marginTop:9}}>
                  {latestPromptTests.map((test: any) => {
                    const response: any = aiResponseByTest.get(test.id);
                    return (
                      <div key={test.id} style={{padding:"14px 0",borderTop:"1px solid rgba(255,255,255,.055)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                          <strong style={{fontSize:10}}>{test.engine}</strong>
                          <span style={{fontSize:9,color:test.status==="complete"?(response?.brand_mentioned?"#c4f873":"#89928c"):"#ffaaaa"}}>
                            {test.status==="failed" ? "Failed" : response?.brand_mentioned ? "Brand mentioned" : "Not mentioned"}
                          </span>
                        </div>
                        <p style={{margin:"6px 0 0",color:"#68726b",fontSize:9,lineHeight:1.55}}>{response?.response_excerpt || "No response was saved for this test."}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(previousScan || previousVisibility) ? (
          <section className={styles.panel} style={{marginTop:11,minHeight:0}}>
            <div className={styles.panelHead}>
              <div>
                <span>Before vs after</span>
                <h2>Measure whether your changes are actually improving anything.</h2>
              </div>
            </div>
            <div className={styles.metrics} style={{marginTop:14}}>
              <article>
                <span>Website readiness change</span>
                <strong>{readinessDelta == null ? "—" : (readinessDelta > 0 ? "+" : "") + readinessDelta}</strong>
                <small>{previousScan ? `${previousScan.score} → ${latestScan?.score}` : "Run another scan to compare"}</small>
              </article>
              <article>
                <span>AI visibility change</span>
                <strong>{visibilityDelta == null ? "—" : (visibilityDelta > 0 ? "+" : "") + visibilityDelta + " pts"}</strong>
                <small>{previousVisibility ? `${previousVisibility.visibility_score}% → ${latestVisibility?.visibility_score}%` : "Run another AI visibility test to compare"}</small>
              </article>
              <article>
                <span>Brand mentions</span>
                <strong>{latestVisibility?.mention_count ?? "—"}</strong>
                <small>{previousVisibility ? `Previously ${previousVisibility.mention_count}` : "Latest controlled model run"}</small>
              </article>
              <article className={styles.accent}>
                <span>Citations observed</span>
                <strong>{latestVisibility?.citation_count ?? "—"}</strong>
                <small>{previousVisibility ? `Previously ${previousVisibility.citation_count}` : "Latest controlled model run"}</small>
              </article>
            </div>
            <p style={{marginTop:14,color:"#707a73",fontSize:10,lineHeight:1.6}}>
              Improvement here is evidence of movement, not proof that any single change caused it. Use the same prompts and comparable site conditions when re-testing.
            </p>
          </section>
        ) : null}

        <div className={styles.grid} id="readiness">
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span>Next best action</span>
                <h2>{latestScan ? "Fix the highest-impact readiness gaps." : "Run your baseline scan."}</h2>
              </div>
              <b>High impact</b>
            </div>
            <p>{latestScan?.summary || "SeekSignal needs a baseline before it can show progress, historical movement and the highest-priority fixes for this project."}</p>

            {latestScan?.raw_result?.opportunities?.length ? (
              <div style={{display:"grid",margin:"18px 0"}}>
                {latestScan.raw_result.opportunities.slice(0,3).map((item: any, index: number) => (
                  <div key={index} style={{padding:"11px 0",borderTop:"1px solid rgba(255,255,255,.055)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                      <strong style={{fontSize:10}}>{item.title}</strong>
                      <span style={{fontSize:8,color:item.impact==="High"?"#c4f873":"#d8bd87"}}>{item.impact} impact</span>
                    </div>
                    {item.evidence ? <p style={{margin:"5px 0 0",fontSize:9,color:"#7f8a83"}}><strong>Observed:</strong> {item.evidence}</p> : null}
                    <p style={{margin:"5px 0 0",fontSize:9}}><strong>Do this:</strong> {item.action}</p>
                    {item.expectedImpact ? <p style={{margin:"5px 0 0",fontSize:9,color:"#a9b3ac"}}><strong>Expected impact:</strong> {item.expectedImpact}</p> : null}
                    {item.implementation?.length ? (
                      <ol style={{margin:"7px 0 0 18px",padding:0,color:"#89938c",fontSize:9,lineHeight:1.55}}>
                        {item.implementation.slice(0,3).map((step: string, stepIndex: number) => <li key={stepIndex}>{step}</li>)}
                      </ol>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <RunProjectScanButton projectId={project?.id || ""} className={styles.primary} label={latestScan ? "Re-scan after changes →" : "Run baseline scan →"} />
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

        <section id="reports" className={styles.panel} style={{marginTop:11,minHeight:0}}>
          <div className={styles.panelHead}>
            <div>
              <span>Reports & scan history</span>
              <h2>Your saved intelligence history.</h2>
            </div>
            <GenerateReportButton projectId={project?.id || ""} disabled={!latestScan && !latestVisibility} />
          </div>

          <div className={styles.details}>
            {scans.length ? scans.map((scan: any) => (
              <div key={scan.id}>
                <span>{new Date(scan.created_at).toLocaleString()}</span>
                <strong>Readiness {scan.score ?? "—"}/100</strong>
              </div>
            )) : (
              <div><span>No scans saved yet</span><strong>Run your baseline scan</strong></div>
            )}
          </div>

          {reports.length ? (
            <div style={{marginTop:24}}>
              <span className={styles.kicker}>Generated reports</span>
              <div className={styles.details}>
                {reports.map((report: any) => (
                  <div key={report.id}>
                    <Link href={"/app/reports/" + report.id}>{report.title}</Link>
                    <strong>{new Date(report.created_at).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {project ? (
          <WorkspaceControls
            projectId={project.id}
            initialCompetitors={competitors}
            initialProject={{
              name: project.name,
              domain: project.domain,
              market: project.market,
              category: project.category
            }}
          />
        ) : null}
      </section>
    </main>
  );
}
