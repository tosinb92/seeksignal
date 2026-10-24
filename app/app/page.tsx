import WebsiteScreenshot from "../../components/WebsiteScreenshot";
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
import ProjectSwitcher from "../../components/ProjectSwitcher";
import ContentEngine from "../../components/ContentEngine";
import FindingWorkflowControl from "../../components/FindingWorkflowControl";

type TrendPoint = { value: number; date: string };

function TrendChart({ title, points, unit = "", change }: { title: string; points: TrendPoint[]; unit?: string; change?: string | null }) {
  const valid = points.filter((point) => Number.isFinite(point.value));
  if (!valid.length) return null;
  const values = valid.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const chartPoints = valid.map((point, index) => ({
    ...point,
    x: valid.length === 1 ? 164 : 24 + (index / (valid.length - 1)) * 268,
    y: 106 - ((point.value - minimum) / spread) * 76,
  }));
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${chartPoints[0].x},116 ${line} ${chartPoints[chartPoints.length - 1].x},116`;
  const gradientId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <article className={styles.trendCard}>
      <header className={styles.trendHead}>
        <div><span className={styles.eyebrow}>{title}</span><strong>{valid[valid.length - 1].value}{unit}</strong></div>
        <span className={styles.trendChange}>{change || (valid.length > 1 ? "History" : "Baseline")}</span>
      </header>
      <div className={styles.chartFrame}>
        <div className={styles.chartScale} aria-hidden="true"><span>{maximum}{unit}</span><span>{minimum}{unit}</span></div>
        <svg className={styles.trendSvg} viewBox="0 0 320 126" role="img" aria-label={`${title} over ${valid.length} recorded measurements`}>
          <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" /><stop offset="100%" /></linearGradient></defs>
          <line x1="24" y1="30" x2="300" y2="30" className={styles.chartGridline} />
          <line x1="24" y1="68" x2="300" y2="68" className={styles.chartGridline} />
          <line x1="24" y1="106" x2="300" y2="106" className={styles.chartGridline} />
          {valid.length > 1 ? <polygon points={area} className={styles.chartArea} style={{ fill: `url(#${gradientId})` }} /> : null}
          {valid.length > 1 ? <polyline points={line} className={styles.chartLine} /> : null}
          {chartPoints.map((point, index) => <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r={index === chartPoints.length - 1 ? 4 : 2.5} className={styles.chartPoint}><title>{dateLabel(point.date)}: {point.value}{unit}</title></circle>)}
        </svg>
      </div>
      <footer className={styles.chartDates}><span>{dateLabel(valid[0].date)}</span><span>{valid.length > 1 ? dateLabel(valid[valid.length - 1].date) : "Run again to compare"}</span></footer>
    </article>
  );
}

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ project?: string; organization?: string }> }) {
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

  const growthHqAdminResponse = await supabaseRest(
    "/rest/v1/rpc/is_growth_hq_admin",
    { method: "POST", body: "{}" },
    accessToken
  );
  const isGrowthHqAdmin = growthHqAdminResponse.ok ? await growthHqAdminResponse.json().catch(() => false) : false;

  const params = await searchParams;
  const selectedMembership = params.organization
    ? memberships.find((membership: any) => membership.organization_id === params.organization)
    : null;
  const orgId = selectedMembership?.organization_id || memberships[0].organization_id;
  const [orgResponse, projectResponse] = await Promise.all([
    supabaseRest("/rest/v1/organizations?select=id,name,slug&id=eq." + encodeURIComponent(orgId), { method: "GET" }, accessToken),
    supabaseRest("/rest/v1/projects?select=id,name,domain,market,category,status&organization_id=eq." + encodeURIComponent(orgId), { method: "GET" }, accessToken)
  ]);

  const organizations = orgResponse.ok ? await orgResponse.json() : [];
  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const organization = organizations?.[0];
  const project = projects?.find((item: any) => item.id === params.project) || projects?.[0];

  const [scanResponse, competitorResponse, reportResponse, visibilityResponse, findingResponse] = project?.id
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
        ),
        supabaseRest(
          "/rest/v1/findings?select=id,title,workflow_status&project_id=eq." + encodeURIComponent(project.id) + "&order=last_detected_at.desc&limit=100",
          { method: "GET" },
          accessToken
        )
      ])
    : [null, null, null, null, null];

  const scans = scanResponse?.ok ? await scanResponse.json() : [];
  const competitors = competitorResponse?.ok ? await competitorResponse.json() : [];
  const reports = reportResponse?.ok ? await reportResponse.json() : [];
  const visibilitySnapshots = visibilityResponse?.ok ? await visibilityResponse.json() : [];
  const savedFindings = findingResponse?.ok ? await findingResponse.json() : [];
  const latestScan = scans?.[0] || null;
  const previousScan = scans?.[1] || null;
  const latestVisibility = visibilitySnapshots?.[0] || null;
  const previousVisibility = visibilitySnapshots?.[1] || null;
  const readinessHistory = scans.filter((scan: any) => scan.score != null);
  const visibilityHistory = visibilitySnapshots.filter((snapshot: any) => snapshot.visibility_score != null);
  const readinessDelta = latestScan?.score != null && previousScan?.score != null ? Number(latestScan.score) - Number(previousScan.score) : null;
  const visibilityDelta = latestVisibility?.visibility_score != null && previousVisibility?.visibility_score != null
    ? Number(latestVisibility.visibility_score) - Number(previousVisibility.visibility_score)
    : null;
  const gatewayEnabled = process.env.NODE_ENV === "production" || Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);

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

  const readinessScore = latestScan?.score != null ? Number(latestScan.score) : null;
  const readinessChecks = Array.isArray(latestScan?.raw_result?.checks) ? latestScan.raw_result.checks : [];
  const openIssues = readinessChecks.filter((item: any) => item.status === "warn");
  const strongSignals = readinessChecks.filter((item: any) => item.status === "good");
  const priorityActions = Array.isArray(latestScan?.raw_result?.opportunities)
    ? latestScan.raw_result.opportunities.slice(0, 3)
    : [];
  const buyerIntentOpportunities = Array.isArray(latestScan?.raw_result?.buyerIntentRadar)
    ? latestScan.raw_result.buyerIntentRadar
    : [];
  const biggestOpportunity = priorityActions[0] || null;
  const readinessLabel =
    readinessScore == null
      ? "No baseline yet"
      : readinessScore >= 80
        ? "Strong technical readiness"
        : readinessScore >= 55
          ? "Good foundation, with gaps"
          : "Several readiness gaps found";

  const activationStep =
    !latestScan ? 1 :
    !latestVisibility ? 2 :
    competitors.length === 0 ? 3 : 4;

  const activationTitle =
    activationStep === 1 ? "Start with a website scan" :
    activationStep === 2 ? "Check if AI mentions you" :
    activationStep === 3 ? "Add your real competitors" :
    "Fix your top opportunity";

  const activationCopy =
    activationStep === 1 ? "Get a baseline and a short list of fixes." :
    activationStep === 2 ? "Run a controlled test on supported AI models." :
    activationStep === 3 ? "Compare the businesses customers consider." :
    "Apply a change, then measure what moved.";

  return (
    <main className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span>S</span>SeekSignal</Link>
        <div className={styles.org}>
          <small>Workspace</small>
          <strong>{organization?.name || "SeekSignal"}</strong>
        </div>
        <ProjectSwitcher
          currentProjectId={project?.id || ""}
          projects={projects.map((item: any) => ({ id: item.id, name: item.name, domain: item.domain }))}
        />
        <nav>
          <a className={styles.active} href="#overview">Overview</a>
          <a href="#ai-visibility">AI Visibility</a>
          <a href="#opportunities">Opportunities</a>
          <a href="#readiness">Website Readiness</a>
          <a href="#competitors">Competitors</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
          {isGrowthHqAdmin === true ? <Link href="/app/growth">Growth HQ</Link> : null}
        </nav>
        <div className={styles.sideFooter}>
          <span style={{padding:"0 12px",color:"#59625c",fontSize:8}}>Provider-model tests are metered and run only with explicit confirmation.</span>
        </div>
      </aside>

      <section className={styles.main} id="overview">
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Project overview</span>
            <h1>{project?.name || organization?.name}</h1>
            <div className={styles.domainIdentity}>
              <span>Reporting on</span>
              <strong>{project?.domain || "No website configured"}</strong>
            </div>
          </div>
          <div className={styles.headerActions}>
            <ProjectSwitcher
              currentProjectId={project?.id || ""}
              projects={projects.map((item: any) => ({ id: item.id, name: item.name, domain: item.domain }))}
            />
            <RunProjectScanButton projectId={project?.id || ""} className={styles.secondary} label="Run scan" />
            <a className={styles.primary} href="#competitors" style={{display:"inline-flex",alignItems:"center"}}>Add competitor</a>
          </div>
        </header>

        <section className={styles.customerJourney}>
          <div className={styles.journeyIntro}>
            <span className={styles.eyebrow}>Your growth plan</span>
            <h2>From visibility to action.</h2>
          </div>

          <div className={styles.journeySteps}>
            <div className={activationStep > 1 ? styles.journeyDone : activationStep === 1 ? styles.journeyActive : ""}>
              <span>01</span>
              <strong>Understand your website</strong>
              <small>{latestScan ? "Complete" : "Start here"}</small>
            </div>
            <div className={activationStep > 2 ? styles.journeyDone : activationStep === 2 ? styles.journeyActive : ""}>
              <span>02</span>
              <strong>Check real AI visibility</strong>
              <small>{latestVisibility ? "Complete" : activationStep === 2 ? "Next" : "Locked until step 1"}</small>
            </div>
            <div className={activationStep > 3 ? styles.journeyDone : activationStep === 3 ? styles.journeyActive : ""}>
              <span>03</span>
              <strong>Compare competitors</strong>
              <small>{competitors.length ? "Complete" : activationStep === 3 ? "Next" : "Add after visibility test"}</small>
            </div>
            <div className={activationStep === 4 ? styles.journeyActive : ""}>
              <span>04</span>
              <strong>Improve & re-test</strong>
              <small>{activationStep === 4 ? "Your focus now" : "Final step"}</small>
            </div>
          </div>

          <div className={styles.nextBestAction}>
            <div>
                <span className={styles.eyebrow}>Next action</span>
              <h3>{activationTitle}</h3>
              <p>{activationCopy}</p>
            </div>
            <div className={styles.nextActionControl}>
              {activationStep === 1 ? (
                <RunProjectScanButton projectId={project?.id || ""} className={styles.primaryLarge} label="Analyse my website →" />
              ) : activationStep === 2 ? (
                <a className={styles.primaryLarge} href="#ai-visibility">Check my AI visibility →</a>
              ) : activationStep === 3 ? (
                <a className={styles.primaryLarge} href="#competitors">Add competitors →</a>
              ) : (
                <a className={styles.primaryLarge} href="#readiness">See what to fix first →</a>
              )}
            </div>
          </div>
        </section>

        {latestScan ? (
          <>
            <section className={styles.resultHero}>
              <div className={styles.websitePreviewCard}>
                <div className={styles.websitePreviewBar}>
                  <span><i /> Website analysed</span>
                  <strong>{project?.domain}</strong>
                </div>
                <WebsiteScreenshot url={project?.domain || ""} />
                <div className={styles.websitePreviewCaption}>
                  <span>Actual website</span>
                  <strong>{project?.domain}</strong>
                </div>
              </div>

              <div className={styles.resultHeroStack}>
                <div className={styles.scoreCard}>
                  <span className={styles.eyebrow}>Your AI readiness score</span>
                  <div className={styles.scoreValue}>{readinessScore}<small>/100</small></div>
                  <div className={styles.scoreTrack}><i style={{width: `${readinessScore}%`}} /></div>
                  <span className={styles.scoreFoot}>Website-readiness signals only — not proof of AI recommendation.</span>
                </div>

                <div className={styles.resultStory}>
                  <span className={styles.eyebrow}>Website readiness</span>
                  <h2>{readinessLabel}</h2>
                  <details className={styles.moreInfo}><summary>Read scan summary</summary><p>{latestScan.summary}</p></details>
                  <div className={styles.signalSummary}>
                    <span><b>{strongSignals.length}</b> strong signals</span>
                    <span><b>{openIssues.length}</b> opportunities</span>
                    <span><b>{competitors.length}</b> competitors tracked</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.meaningPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>What this means for your business</span>
                  <h2>Key signals</h2>
                </div>
              </div>
              <div className={styles.meaningGrid}>
                <article>
                  <span>READINESS GAPS</span>
                  <strong>{openIssues.length ? `${openIssues.length} readiness issues need attention` : "Your core readiness signals are strong"}</strong>
                  <p>{openIssues.length ? "Observed on your website. See the action plan below." : "No major warnings in the latest scan."}</p>
                </article>
                <article>
                  <span>TOP OPPORTUNITY</span>
                  <strong>{biggestOpportunity ? biggestOpportunity.title : "No critical readiness issue detected"}</strong>
                  <p>{biggestOpportunity?.action || "Run an AI visibility test to continue."}</p>
                </article>
                <article>
                  <span>AI VISIBILITY</span>
                  <strong>{latestVisibility ? `${latestVisibility.visibility_score}% observed` : "Not tested yet"}</strong>
                  <p>{latestVisibility ? `${latestVisibility.mention_count} mentions · ${latestVisibility.citation_count} citations` : "Run a controlled test to set a baseline."}</p>
                </article>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.emptyHero}>
            <span className={styles.eyebrow}>Start with a baseline</span>
            <h2>Find out how clearly your website explains the business to machines.</h2>
            <p>SeekSignal checks observable website-readiness signals, turns weaknesses into a prioritised action plan, then lets you re-scan to verify improvement.</p>
            <RunProjectScanButton projectId={project?.id || ""} className={styles.primaryLarge} label="Run baseline scan →" />
          </section>
        )}

        {(readinessHistory.length > 0 || visibilityHistory.length > 0) ? (
          <section className={styles.trendSection} aria-label="Performance trends">
            <div className={styles.trendSectionHead}><div><span className={styles.eyebrow}>Measured over time</span><h2>Progress</h2></div><span>Only recorded results are plotted</span></div>
            <div className={styles.trendGrid}>
              <TrendChart
                title="Website readiness"
                points={[...readinessHistory].slice(0, 10).reverse().map((scan: any) => ({ value: Number(scan.score), date: scan.created_at }))}
                change={readinessDelta == null ? null : `${readinessDelta > 0 ? "+" : ""}${readinessDelta} since previous scan`}
              />
              <TrendChart
                title="AI visibility"
                unit="%"
                points={[...visibilityHistory].slice(0, 10).reverse().map((snapshot: any) => ({ value: Number(snapshot.visibility_score), date: snapshot.captured_at }))}
                change={visibilityDelta == null ? null : `${visibilityDelta > 0 ? "+" : ""}${visibilityDelta} pts since previous test`}
              />
            </div>
          </section>
        ) : null}

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
              <details className={styles.moreInfo} style={{marginTop:20}}>
                <summary>View {latestPromptTests.length} model responses</summary>
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
              </details>
            ) : null}
          </section>
        ) : null}

        {(previousScan || previousVisibility) ? (
          <section className={styles.panel} style={{marginTop:11,minHeight:0}}>
            <div className={styles.panelHead}>
              <div>
                <span>Progress over time</span>
                <h2>Before &amp; after</h2>
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
            <details className={styles.moreInfo} style={{marginTop:14}}><summary>How to read this comparison</summary><p>These figures show movement over time. They do not prove that a single change caused it. Use the same prompts and comparable site conditions when re-testing.</p></details>
          </section>
        ) : null}

        <section className={styles.prioritySection} id="readiness">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Your priority action plan</span>
              <h2>{latestScan ? "Fix these first." : "Run a baseline scan to create your action plan."}</h2>
              <p>{latestScan ? "Start with the highest priority. Open a task for its evidence." : "Run a scan to create your action list."}</p>
            </div>
            {latestScan ? <RunProjectScanButton projectId={project?.id || ""} className={styles.secondary} label="Re-scan website" /> : null}
          </div>

          {priorityActions.length ? (
            <div className={styles.priorityGrid}>
              {priorityActions.map((item: any, index: number) => (
                <article className={styles.priorityCard} key={item.title}>
                  <div className={styles.priorityTop}>
                    <span className={styles.priorityNumber}>{String(index + 1).padStart(2,"0")}</span>
                    <div className={styles.badges}>
                      <span>{item.impact} impact</span>
                      {item.effort ? <span>{item.effort} effort</span> : null}
                    </div>
                  </div>
                  <h3>{item.title}</h3>

                  <div className={styles.actionRowStrong}>
                    <span>Recommended action</span>
                    <p>{item.action}</p>
                  </div>

                  {item.evidence || item.problem || item.expectedImpact || item.verify ? (
                    <details className={styles.moreInfo}>
                      <summary>See evidence &amp; impact</summary>
                      {item.evidence ? <div className={styles.actionRow}><span>Observed</span><p>{item.evidence}</p></div> : null}
                      {item.problem ? <div className={styles.actionRow}><span>Why it matters</span><p>{item.problem}</p></div> : null}
                      {item.expectedImpact ? <div className={styles.actionRow}><span>Expected benefit</span><p>{item.expectedImpact}</p></div> : null}
                      {item.verify ? <div className={styles.verifyRow}><span>How to verify</span><p>{item.verify}</p></div> : null}
                    </details>
                  ) : null}

                  {item.implementation?.length ? (
                    <details className={styles.implementation}>
                      <summary>Show implementation instructions</summary>
                      <ol>
                        {item.implementation.map((step: string, stepIndex: number) => <li key={stepIndex}>{step}</li>)}
                      </ol>
                    </details>
                  ) : null}

                  {(() => {
                    const savedFinding = savedFindings.find((finding: any) => finding.title === item.title);
                    return <FindingWorkflowControl findingId={savedFinding?.id} initialStatus={savedFinding?.workflow_status || "not_started"} />;
                  })()}
                </article>
              ))}
            </div>
          ) : latestScan ? (
            <div className={styles.allClear}>
              <strong>No fundamental readiness warnings were found.</strong>
              <p>Move on to controlled AI visibility testing, competitor benchmarking and deeper content/authority analysis.</p>
            </div>
          ) : null}
        </section>

        <section className={styles.opportunitySection} id="opportunities">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Buyer Intent Radar · search hypotheses</span>
              <h2>Searches your buyers may use</h2>
              <p>Suggested searches. Demand still needs to be verified.</p>
            </div>
            <span className={styles.opportunityCount}>{buyerIntentOpportunities.length} suggestions</span>
          </div>
          {buyerIntentOpportunities.length ? (
            <div className={styles.opportunityGrid}>
              {buyerIntentOpportunities.map((item: any) => (
                <article key={item.query}>
                  <div className={styles.opportunityTags}><span>{item.intent}</span><b>{item.evidenceClass} · {item.confidence} confidence</b></div>
                  <h3>{item.query}</h3>
                  <div className={styles.opportunityAction}><strong>Next step</strong><span>{item.recommendedAction}</span></div>
                  <details className={styles.moreInfo}>
                    <summary>Evidence &amp; data</summary>
                    <p>{item.supportingEvidence}</p>
                    <dl>
                      <div><dt>Search volume</dt><dd>Not measured</dd></div>
                      <div><dt>Competition</dt><dd>Not measured</dd></div>
                      <div><dt>Data source</dt><dd>{item.dataSource}</dd></div>
                    </dl>
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.allClear}>
              <strong>{latestScan ? "No search hypotheses were generated." : "Run your first website scan."}</strong>
              <p>{latestScan ? "Add your business category and service area in project settings, then re-scan to get more relevant ideas." : "SeekSignal will suggest commercial searches based on the website and business details."}</p>
            </div>
          )}
        </section>

        {latestScan ? (
          <details className={styles.technicalEvidence}>
            <summary>
              <div>
                <span className={styles.eyebrow}>Technical evidence</span>
                <strong>See every signal checked in the latest scan</strong>
              </div>
              <b>{readinessChecks.length} checks</b>
            </summary>
            <div className={styles.evidenceList}>
              {readinessChecks.map((check: any) => (
                <div className={styles.evidenceItem} key={check.label}>
                  <i className={check.status === "good" ? styles.goodDot : styles.warnDot} />
                  <div>
                    <strong>{check.label}</strong>
                    <p>{check.evidence}</p>
                    <small>{check.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {project ? <ContentEngine projectId={project.id} /> : null}

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
