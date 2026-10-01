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

  const readinessScore = latestScan?.score != null ? Number(latestScan.score) : null;
  const readinessChecks = Array.isArray(latestScan?.raw_result?.checks) ? latestScan.raw_result.checks : [];
  const openIssues = readinessChecks.filter((item: any) => item.status === "warn");
  const strongSignals = readinessChecks.filter((item: any) => item.status === "good");
  const priorityActions = Array.isArray(latestScan?.raw_result?.opportunities)
    ? latestScan.raw_result.opportunities.slice(0, 3)
    : [];
  const biggestOpportunity = priorityActions[0] || null;
  const readinessLabel =
    readinessScore == null
      ? "No baseline yet"
      : readinessScore >= 80
        ? "Strong foundation. Important opportunities remain."
        : readinessScore >= 55
          ? "Good foundation. Several signals need attention."
          : "Important gaps are limiting how clearly machines can understand this site.";

  const activationStep =
    !latestScan ? 1 :
    !latestVisibility ? 2 :
    competitors.length === 0 ? 3 : 4;

  const activationTitle =
    activationStep === 1 ? "First, let’s understand your website." :
    activationStep === 2 ? "Now find out whether AI actually recommends you." :
    activationStep === 3 ? "Now compare yourself with the brands buyers may see instead." :
    "You have enough signal to start improving visibility.";

  const activationCopy =
    activationStep === 1 ? "We’ll scan the website you just added and turn the findings into a short, prioritised action plan." :
    activationStep === 2 ? "Website readiness is only the foundation. This test checks real provider-model responses so you can see whether your brand is being surfaced." :
    activationStep === 3 ? "Competitors make the results commercially useful. Add the brands you genuinely compete with so SeekSignal can show where the recommendation gap is." :
    "Your workspace now has readiness, AI visibility and competitor context. Focus on the highest-impact actions and re-test after changes.";

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

        <section className={styles.customerJourney}>
          <div className={styles.journeyIntro}>
            <span className={styles.eyebrow}>Your SeekSignal journey</span>
            <h2>Answer three questions, in the right order.</h2>
            <p>Don’t think of this as a dashboard. SeekSignal is here to answer: <strong>Are you visible?</strong> <strong>Who is winning instead?</strong> and <strong>What should you change next?</strong></p>
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
              <span className={styles.eyebrow}>Your next best action</span>
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
                <img
                  src={`/api/website-screenshot?url=${encodeURIComponent(project?.domain || "")}`}
                  alt={`Screenshot of ${project?.domain} analysed by SeekSignal`}
                />
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
                  <span className={styles.eyebrow}>Executive answer</span>
                  <h2>{readinessLabel}</h2>
                  <p>{latestScan.summary}</p>
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
                  <h2>Understand the commercial meaning before the technical detail.</h2>
                </div>
              </div>
              <div className={styles.meaningGrid}>
                <article>
                  <span>01</span>
                  <strong>{openIssues.length ? `${openIssues.length} readiness issues need attention` : "Your core readiness signals are strong"}</strong>
                  <p>{openIssues.length ? "These are observable website signals that may make the business harder for search and AI retrieval systems to interpret clearly." : "No major readiness warnings were found in the latest scan. The next step is controlled AI visibility testing."}</p>
                </article>
                <article>
                  <span>02</span>
                  <strong>{biggestOpportunity ? biggestOpportunity.title : "No critical readiness issue detected"}</strong>
                  <p>{biggestOpportunity?.problem || "Move from readiness into live provider-model testing and competitor benchmarking."}</p>
                </article>
                <article>
                  <span>03</span>
                  <strong>{latestVisibility ? `${latestVisibility.visibility_score}% observed model-level visibility` : "AI recommendation visibility has not been tested yet"}</strong>
                  <p>{latestVisibility ? `Latest controlled run recorded ${latestVisibility.mention_count} brand mentions and ${latestVisibility.citation_count} citations.` : "A readiness score tells you whether the site provides clear signals. Run a separate provider-model test to measure whether AI systems actually surface the brand."}</p>
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

        <section className={styles.prioritySection} id="readiness">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Your priority action plan</span>
              <h2>{latestScan ? "Fix these first." : "Run a baseline scan to create your action plan."}</h2>
              <p>{latestScan ? "Prioritised from the actual findings in your latest scan. Open each item for implementation guidance and verification steps." : "SeekSignal will rank genuine findings by impact after the first scan."}</p>
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

                  {item.evidence ? (
                    <div className={styles.actionRow}>
                      <span>What we observed</span>
                      <p>{item.evidence}</p>
                    </div>
                  ) : null}

                  {item.problem ? (
                    <div className={styles.actionRow}>
                      <span>Why this matters</span>
                      <p>{item.problem}</p>
                    </div>
                  ) : null}

                  <div className={styles.actionRowStrong}>
                    <span>What to do</span>
                    <p>{item.action}</p>
                  </div>

                  {item.expectedImpact ? (
                    <div className={styles.actionRow}>
                      <span>Expected benefit</span>
                      <p>{item.expectedImpact}</p>
                    </div>
                  ) : null}

                  {item.implementation?.length ? (
                    <details className={styles.implementation}>
                      <summary>Show implementation instructions</summary>
                      <ol>
                        {item.implementation.map((step: string, stepIndex: number) => <li key={stepIndex}>{step}</li>)}
                      </ol>
                    </details>
                  ) : null}

                  {item.verify ? (
                    <div className={styles.verifyRow}>
                      <span>Verify</span>
                      <p>{item.verify}</p>
                    </div>
                  ) : null}
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
